import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend import db


def decide(
    client: TestClient,
    claim_id: str,
    decision: str,
    payout: float,
    reason: str = "Covered by the policy wording.",
) -> dict[str, Any]:
    response = client.post(
        f"/api/claims/{claim_id}/decision",
        json={
            "decision": decision,
            "payout": payout,
            "reason": reason,
            "policy_section": "Section 3, Trip Delay",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def pay(client: TestClient, claim_id: str, amount: float) -> tuple[int, dict]:
    response = client.post(f"/api/claims/{claim_id}/payment", json={"amount": amount})
    return response.status_code, response.json()


def sign_off(client: TestClient, claim_id: str, handler_id: str) -> tuple[int, dict]:
    response = client.post(
        f"/api/claims/{claim_id}/sign-off", json={"handler_id": handler_id}
    )
    return response.status_code, response.json()


def test_an_approval_up_to_the_limit_is_decided_and_paid_once(
    client: TestClient,
) -> None:
    state = decide(client, "CLM-1001", "approve", 420.0)
    assert state["status"] == "decided"
    assert state["payment"] is None

    status, state = pay(client, "CLM-1001", 420.0)
    assert status == 200
    assert state["payment"]["amount"] == 420.0

    status, body = pay(client, "CLM-1001", 420.0)
    assert status == 409
    assert body["detail"] == "Claim CLM-1001 is already paid"


def test_the_claim_shows_its_decision_and_payment(client: TestClient) -> None:
    decide(client, "CLM-1001", "approve", 420.0, "The delay was covered.")
    pay(client, "CLM-1001", 420.0)
    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["story"].startswith("My flight home")
    assert claim["decision"]["decision"] == "approve"
    assert claim["decision"]["payout"] == 420.0
    assert claim["decision"]["reason"] == "The delay was covered."
    assert claim["decision"]["policy_section"] == "Section 3, Trip Delay"
    assert claim["payment"]["amount"] == 420.0
    summary = client.get("/api/claims").json()[0]
    assert (summary["status"], summary["decision"], summary["payout"]) == (
        "decided",
        "approve",
        420.0,
    )


def test_an_approval_over_the_limit_waits_for_sign_off(client: TestClient) -> None:
    state = decide(client, "CLM-1012", "approve", 2900.0)
    assert state["status"] == "waiting_for_sign_off"

    status, body = pay(client, "CLM-1012", 2900.0)
    assert status == 403
    assert body["detail"].startswith(
        "A payout over $1,000.00 waits for a handler's sign-off"
    )
    claim = client.get("/api/claims/CLM-1012").json()
    assert claim["payment"] is None
    assert claim["status"] == "waiting_for_sign_off"


def test_a_handler_signs_off_and_the_payment_is_made(client: TestClient) -> None:
    decide(client, "CLM-1012", "approve", 2900.0)
    status, state = sign_off(client, "CLM-1012", "HND-01")
    assert status == 200
    assert state["status"] == "decided"
    assert state["payment"]["amount"] == 2900.0
    assert state["sign_off"]["handler_id"] == "HND-01"
    assert state["sign_off"]["name"] == "Dana Whitfield"

    status, body = pay(client, "CLM-1012", 2900.0)
    assert status == 409
    assert body["detail"] == "Claim CLM-1012 is already paid"


def test_sign_off_by_a_handler_who_does_not_exist(client: TestClient) -> None:
    decide(client, "CLM-1012", "approve", 2900.0)
    status, body = sign_off(client, "CLM-1012", "HND-99")
    assert status == 404
    assert body["detail"] == "There is no handler HND-99"


def test_sign_off_by_a_handler_who_cannot_approve_over_the_limit(
    client: TestClient,
) -> None:
    handler = db.load("handlers.json")[2] | {"can_approve_over_limit": False}
    with db.connect() as conn:
        conn.execute(
            "UPDATE handlers SET record = ? WHERE handler_id = 'HND-03'",
            (json.dumps(handler),),
        )
    decide(client, "CLM-1012", "approve", 2900.0)
    status, body = sign_off(client, "CLM-1012", "HND-03")
    assert status == 403
    assert body["detail"] == "Priya Raman can't sign off payouts over $1,000.00"


def test_sign_off_on_a_claim_that_is_not_waiting_for_it(client: TestClient) -> None:
    decide(client, "CLM-1001", "approve", 420.0)
    status, body = sign_off(client, "CLM-1001", "HND-01")
    assert status == 409
    assert body["detail"] == "Claim CLM-1001 is not waiting for sign-off"


@pytest.mark.parametrize(
    ("payout", "status"), [(1000.0, 200), (1000.01, 403), (1000.004, 200)]
)
def test_the_limit_is_on_payouts_over_1000(
    client: TestClient, payout: float, status: int
) -> None:
    decide(client, "CLM-1002", "approve", payout)
    assert pay(client, "CLM-1002", payout)[0] == status


def test_payment_must_be_the_approved_payout(client: TestClient) -> None:
    decide(client, "CLM-1001", "approve", 420.0)
    status, body = pay(client, "CLM-1001", 400.0)
    assert status == 409
    assert body["detail"] == "The approved payout on claim CLM-1001 is $420.00"


@pytest.mark.parametrize("decision", ["decline", "refer"])
def test_only_an_approval_is_paid(client: TestClient, decision: str) -> None:
    state = decide(client, "CLM-1001", decision, 0)
    assert state["status"] == "decided"
    status, body = pay(client, "CLM-1001", 420.0)
    assert status == 409
    assert body["detail"] == "Claim CLM-1001 is not approved"


def test_an_undecided_claim_is_not_paid(client: TestClient) -> None:
    assert pay(client, "CLM-1001", 420.0)[0] == 409


@pytest.mark.parametrize(
    "body",
    [
        {"decision": "decline", "payout": 50.0},
        {"decision": "refer", "payout": 50.0},
        {"decision": "approve", "payout": 0},
        {"decision": "approve", "payout": -5.0},
        {"decision": "pay", "payout": 0},
        {"decision": "approve", "payout": 420.0, "reason": ""},
        {"decision": "approve", "payout": 420.0, "policy_section": ""},
    ],
)
def test_a_decision_that_does_not_hold_together(
    client: TestClient, body: dict[str, object]
) -> None:
    request = {"reason": "Because.", "policy_section": "Section 3"} | body
    response = client.post("/api/claims/CLM-1001/decision", json=request)
    assert response.status_code == 422


def test_a_claim_is_decided_once(client: TestClient) -> None:
    decide(client, "CLM-1001", "decline", 0)
    response = client.post(
        "/api/claims/CLM-1001/decision",
        json={
            "decision": "approve",
            "payout": 420.0,
            "reason": "Changed my mind.",
            "policy_section": "Section 3",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Claim CLM-1001 is already decided"


def test_deciding_a_claim_that_does_not_exist(client: TestClient) -> None:
    response = client.post(
        "/api/claims/CLM-9999/decision",
        json={
            "decision": "decline",
            "payout": 0,
            "reason": "Not covered.",
            "policy_section": "Section 9",
        },
    )
    assert response.status_code == 404


def test_a_decision_during_a_run_keeps_the_claim_in_progress(
    client: TestClient,
) -> None:
    with db.connect() as conn:
        conn.execute(
            "UPDATE claims SET status = 'in_progress', thread_id = 'thread-1'"
            " WHERE claim_id = 'CLM-1001'"
        )
    state = decide(client, "CLM-1001", "approve", 420.0)
    assert state["status"] == "in_progress"
    assert state["decision"]["payout"] == 420.0

    response = client.post(
        "/api/claims/CLM-1001/decision",
        json={
            "decision": "decline",
            "payout": 0,
            "reason": "Changed my mind.",
            "policy_section": "Section 3",
        },
    )
    assert response.status_code == 409

    status, state = pay(client, "CLM-1001", 420.0)
    assert status == 200
    assert state["status"] == "in_progress"
    assert state["payment"]["amount"] == 420.0
