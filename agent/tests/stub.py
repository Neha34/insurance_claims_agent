"""Stubs for the tests: a chat model that never calls a real model, and the API."""

import json
import re
from collections.abc import Callable, Sequence
from itertools import count
from typing import Any, cast

import httpx
from fastapi.testclient import TestClient
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel, LanguageModelInput
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.runnables import Runnable
from langchain_core.tools import BaseTool

Respond = Callable[[list[BaseMessage]], AIMessage]

call_ids = count(1)


def as_httpx(client: TestClient) -> httpx.Client:
    # TestClient is built on httpx2 here, which has the same API as httpx.
    return cast(httpx.Client, client)


class StubModel(BaseChatModel):
    """Answers each turn with what its respond function returns."""

    respond: Respond

    @property
    def _llm_type(self) -> str:
        return "stub"

    def bind_tools(
        self,
        tools: Sequence[dict[str, Any] | type | Callable[..., Any] | BaseTool],
        *,
        tool_choice: str | None = None,
        **kwargs: Any,
    ) -> Runnable[LanguageModelInput, AIMessage]:
        return self

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=self.respond(messages))])


def calls(*tool_calls: tuple[str, dict[str, Any]]) -> AIMessage:
    return AIMessage(
        content="",
        tool_calls=[
            {
                "name": name,
                "args": args,
                "id": f"call-{next(call_ids)}",
                "type": "tool_call",
            }
            for name, args in tool_calls
        ],
    )


def scripted(*turns: AIMessage) -> Respond:
    queue = iter(turns)
    return lambda _: next(queue)


def fails(_: list[BaseMessage]) -> AIMessage:
    raise RuntimeError("The model is down")


def approve_in_full(messages: list[BaseMessage]) -> AIMessage:
    """Read the claim, its policy and history, then approve and pay what is claimed."""
    results = {m.name: m for m in messages if isinstance(m, ToolMessage)}
    if "get_claim" not in results:
        request = next(m for m in messages if isinstance(m, HumanMessage))
        claim_id = re.findall(r"CLM-\d+", str(request.text))[0]
        return calls(("get_claim", {"claim_id": claim_id}))
    claim = json.loads(str(results["get_claim"].text))
    if "get_policy" not in results:
        return calls(
            ("get_policy", {"policy_id": claim["policy_id"]}),
            ("get_claim_history", {"customer_id": claim["customer_id"]}),
        )
    if "decide_claim" not in results:
        return calls(
            (
                "decide_claim",
                {
                    "decision": "approve",
                    "payout": claim["amount_claimed"],
                    "reason": "The policy wording covers the claim in full.",
                    "policy_section": "Section 5, Baggage and Personal Effects",
                },
            )
        )
    if "pay_claim" not in results:
        return calls(("pay_claim", {"amount": claim["amount_claimed"]}))
    return AIMessage(content="The claim is approved in full.")
