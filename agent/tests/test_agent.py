from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from agent import agent
from agent.tests.stub import (
    Respond,
    approve_in_full,
    as_httpx,
    calls,
    fails,
    scripted,
)

Stub = Callable[[Respond], None]


def steps(client: TestClient, claim_id: str) -> list[tuple[str, str]]:
    return [
        (step["kind"], step["text"])
        for step in client.get(f"/api/claims/{claim_id}/steps").json()
    ]


def test_the_agent_decides_and_pays_a_claim_through_the_api(
    client: TestClient, stub: Stub
) -> None:
    stub(approve_in_full)
    agent.run("CLM-1001", "thread-1")

    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["status"] == "decided"
    assert claim["decision"]["decision"] == "approve"
    assert claim["decision"]["payout"] == 420.0
    assert claim["payment"]["amount"] == 420.0

    recorded = client.get("/api/claims/CLM-1001/steps").json()
    assert {step["thread_id"] for step in recorded} == {"thread-1"}
    kinds = [step["kind"] for step in recorded]
    texts = [step["text"] for step in recorded]
    assert kinds == [
        "tool_call",
        "tool_result",
        "tool_call",
        "tool_call",
        "tool_result",
        "tool_result",
        "tool_call",
        "tool_result",
        "tool_call",
        "tool_result",
        "message",
    ]
    assert texts[0] == 'get_claim(claim_id="CLM-1001")'
    assert texts[1].startswith('get_claim: {"claim_id":"CLM-1001"')
    assert texts[2] == 'get_policy(policy_id="POL-2001")'
    assert texts[3] == 'get_claim_history(customer_id="CUS-3001")'
    assert texts[6].startswith('decide_claim(decision="approve", payout=420.0')
    assert texts[8] == "pay_claim(amount=420.0)"
    assert texts[10] == "The claim is approved in full."


def test_the_agent_cannot_pay_over_the_limit(client: TestClient, stub: Stub) -> None:
    stub(approve_in_full)
    agent.run("CLM-1012", "thread-1")

    claim = client.get("/api/claims/CLM-1012").json()
    assert claim["status"] == "waiting_for_sign_off"
    assert claim["decision"]["payout"] == 2900.0
    assert claim["payment"] is None
    assert ("tool_call", "pay_claim(amount=2900.0)") in steps(client, "CLM-1012")
    assert any(
        text.startswith("pay_claim: Refused (403)")
        and "waits for a handler's sign-off" in text
        for _, text in steps(client, "CLM-1012")
    )


def test_deciding_and_paying_take_no_claim_id(client: TestClient) -> None:
    by_name = {t.name: t for t in agent.tools(as_httpx(client), "CLM-1001")}
    assert list(by_name) == [
        "get_claim",
        "get_policy",
        "get_claim_history",
        "decide_claim",
        "pay_claim",
    ]
    assert set(by_name["decide_claim"].args) == {
        "decision",
        "payout",
        "reason",
        "policy_section",
    }
    assert set(by_name["pay_claim"].args) == {"amount"}


def test_start_run_runs_the_agent_in_the_background(
    client: TestClient, stub: Stub
) -> None:
    stub(approve_in_full)
    response = client.post("/api/claims/CLM-1001/runs")
    assert response.status_code == 202
    thread_id = response.json()["thread_id"]

    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["status"] == "decided"
    assert claim["thread_id"] == thread_id
    recorded = client.get("/api/claims/CLM-1001/steps").json()
    assert {step["thread_id"] for step in recorded} == {thread_id}

    again = client.post("/api/claims/CLM-1001/runs")
    assert again.status_code == 409
    assert again.json()["detail"] == "Claim CLM-1001 is not waiting"


@pytest.mark.parametrize(
    ("claim_id", "settled"),
    [("CLM-1001", "decided"), ("CLM-1012", "waiting_for_sign_off")],
)
def test_the_claim_stays_in_progress_until_the_run_ends(
    client: TestClient, stub: Stub, claim_id: str, settled: str
) -> None:
    seen: list[str] = []

    def respond(messages: list[BaseMessage]) -> AIMessage:
        if any(
            isinstance(m, ToolMessage) and m.name == "decide_claim" for m in messages
        ):
            seen.append(client.get(f"/api/claims/{claim_id}").json()["status"])
        return approve_in_full(messages)

    stub(respond)
    client.post(f"/api/claims/{claim_id}/runs")

    assert seen == ["in_progress", "in_progress"]
    assert client.get(f"/api/claims/{claim_id}").json()["status"] == settled


def test_start_run_on_a_claim_that_does_not_exist(client: TestClient) -> None:
    assert client.post("/api/claims/CLM-9999/runs").status_code == 404


def test_a_run_that_fails_puts_the_claim_back_to_waiting(
    client: TestClient, stub: Stub
) -> None:
    stub(fails)
    client.post("/api/claims/CLM-1001/runs")

    assert client.get("/api/claims/CLM-1001").json()["status"] == "waiting"
    assert steps(client, "CLM-1001") == [
        ("error", "The run failed: The model is down"),
        (
            "error",
            "The run ended without a decision, so the claim is back to waiting.",
        ),
    ]


def test_a_run_that_ends_without_deciding_puts_the_claim_back_to_waiting(
    client: TestClient, stub: Stub
) -> None:
    stub(scripted(AIMessage(content="I need more time with this one.")))
    client.post("/api/claims/CLM-1001/runs")

    assert client.get("/api/claims/CLM-1001").json()["status"] == "waiting"
    assert steps(client, "CLM-1001") == [
        ("message", "I need more time with this one."),
        (
            "error",
            "The run ended without a decision, so the claim is back to waiting.",
        ),
    ]


def test_a_refusal_goes_back_to_the_model(client: TestClient, stub: Stub) -> None:
    stub(
        scripted(
            calls(("pay_claim", {"amount": 420.0})),
            AIMessage(content="I can't pay a claim before it's decided."),
        )
    )
    agent.run("CLM-1001", "thread-1")
    assert steps(client, "CLM-1001")[1] == (
        "tool_result",
        'pay_claim: Refused (409): {"detail":"Claim CLM-1001 is not approved"}',
    )


def test_work_queue_decides_every_waiting_claim(client: TestClient, stub: Stub) -> None:
    stub(approve_in_full)
    client.post("/api/claims/CLM-1001/runs")
    response = client.post("/api/queue/runs")
    assert response.status_code == 202
    assert len(response.json()["claim_ids"]) == 24
    assert "CLM-1001" not in response.json()["claim_ids"]

    statuses = {c["status"] for c in client.get("/api/claims").json()}
    assert statuses == {"decided", "waiting_for_sign_off"}


def test_the_default_model_is_gpt_6_luna_with_low_reasoning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test")
    monkeypatch.delenv("MODEL_NAME", raising=False)
    model = agent.model()
    assert model.model_dump()["model_name"] == "openai/gpt-6-luna"
    assert model.model_dump()["reasoning"] == {"effort": "low"}


def test_model_name_picks_another_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test")
    monkeypatch.setenv("MODEL_NAME", "openrouter/free")
    assert agent.model().model_dump()["model_name"] == "openrouter/free"


def test_the_agent_calls_the_api_on_port_8000(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("UNDERCOVER_API_URL", raising=False)
    with agent.api() as http:
        assert str(http.base_url) == "http://127.0.0.1:8000"


def test_a_long_tool_result_is_cut_short() -> None:
    message = ToolMessage(content="x" * 500, name="get_claim", tool_call_id="call-1")
    [(kind, text)] = agent.describe(message)
    assert kind == "tool_result"
    assert text == "get_claim: " + "x" * agent.RESULT_LENGTH + "…"


def test_a_tool_call_keeps_its_punctuation() -> None:
    message = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "decide_claim",
                "args": {"reason": "Exceeds the plan’s waiting period."},
                "id": "call-1",
                "type": "tool_call",
            }
        ],
    )
    [(kind, text)] = agent.describe(message)
    assert kind == "tool_call"
    assert text == 'decide_claim(reason="Exceeds the plan’s waiting period.")'
