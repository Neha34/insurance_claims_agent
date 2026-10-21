"""The UnderCover Agent, which decides one claim through the backend's API."""

import json
import os
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any, Literal

import httpx
from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_core.tools import BaseTool, tool
from langchain_openrouter import ChatOpenRouter

DEFAULT_MODEL = "openai/gpt-6-luna"
RESULT_LENGTH = 300


def model() -> BaseChatModel:
    return ChatOpenRouter(
        model=os.environ.get("MODEL_NAME", DEFAULT_MODEL), reasoning={"effort": "low"}
    )


@contextmanager
def api() -> Iterator[httpx.Client]:
    base_url = os.environ.get("UNDERCOVER_API_URL", "http://127.0.0.1:8000")
    with httpx.Client(base_url=base_url, timeout=30) as http:
        yield http


def tools(http: httpx.Client, claim_id: str) -> list[BaseTool]:
    """The agent's tools, each one API call. Deciding and paying act on this claim."""

    def call(method: str, path: str, body: dict[str, Any] | None = None) -> str:
        response = http.request(method, path, json=body)
        if response.is_error:
            return f"Refused ({response.status_code}): {response.text}"
        return response.text

    @tool
    def get_claim(claim_id: str) -> str:
        """Get a claim in full: the story, the items claimed and the documents."""
        return call("GET", f"/api/claims/{claim_id}")

    @tool
    def get_policy(policy_id: str) -> str:
        """Get a policy: its plan and limits, add-ons, trip and travelers."""
        return call("GET", f"/api/policies/{policy_id}")

    @tool
    def get_claim_history(customer_id: str) -> str:
        """Get a customer's earlier claims."""
        return call("GET", f"/api/customers/{customer_id}/claims")

    @tool
    def decide_claim(
        decision: Literal["approve", "decline", "refer"],
        payout: float,
        reason: str,
        policy_section: str,
    ) -> str:
        """Record your decision on the claim, with the payout, reason and section.

        The payout is 0 unless you approve. The reason is two or three sentences.
        The policy section is the one the decision rests on, such as
        "Section 5, Baggage and Personal Effects".
        """
        return call(
            "POST",
            f"/api/claims/{claim_id}/decision",
            {
                "decision": decision,
                "payout": payout,
                "reason": reason,
                "policy_section": policy_section,
            },
        )

    @tool
    def pay_claim(amount: float) -> str:
        """Pay the approved payout on the claim."""
        return call("POST", f"/api/claims/{claim_id}/payment", {"amount": amount})

    return [get_claim, get_policy, get_claim_history, decide_claim, pay_claim]


def describe(message: BaseMessage) -> Iterator[tuple[str, str]]:
    """Turn one message from the agent's run into steps the team can read."""
    if isinstance(message, AIMessage):
        if text := str(message.text).strip():
            yield "message", text
        for call in message.tool_calls:
            args = ", ".join(f"{k}={json.dumps(v)}" for k, v in call["args"].items())
            yield "tool_call", f"{call['name']}({args})"
    elif isinstance(message, ToolMessage):
        result = str(message.text)
        if len(result) > RESULT_LENGTH:
            result = result[:RESULT_LENGTH] + "…"
        yield "tool_result", f"{message.name}: {result}"


def run(claim_id: str, thread_id: str) -> None:
    """Decide one claim, posting each step to the backend as the agent works."""
    with api() as http:
        instructions = http.get("/api/instructions").raise_for_status().json()
        agent = create_agent(
            model(), tools(http, claim_id), system_prompt=instructions["instructions"]
        )
        updates = agent.stream(
            {"messages": [{"role": "user", "content": f"Decide claim {claim_id}."}]},
            {"configurable": {"thread_id": thread_id}},
            stream_mode="updates",
        )
        for update in updates:
            for node in update.values():
                for message in node["messages"]:
                    for kind, text in describe(message):
                        http.post(
                            f"/api/claims/{claim_id}/steps",
                            json={"thread_id": thread_id, "kind": kind, "text": text},
                        ).raise_for_status()
