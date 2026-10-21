"""The UnderCover claims API."""

import json
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from enum import StrEnum
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend import db

load_dotenv(override=True)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    db.create()
    yield


app = FastAPI(title="UnderCover Claims", lifespan=lifespan)


class Status(StrEnum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    WAITING_FOR_SIGN_OFF = "waiting_for_sign_off"
    DECIDED = "decided"


class Decision(StrEnum):
    APPROVE = "approve"
    DECLINE = "decline"
    REFER = "refer"


class ClaimSummary(BaseModel):
    claim_id: str
    customer_name: str
    claim_type: str
    summary: str
    amount_claimed: float
    submitted_on: str
    status: Status
    decision: Decision | None
    payout: float | None


class ClaimHistory(BaseModel):
    customer_id: str
    name: str
    customer_since: str
    previous_claims: list[dict[str, Any]]


class Handler(BaseModel):
    handler_id: str
    name: str
    role: str
    can_approve_over_limit: bool


CLAIM = """
SELECT claims.*, json_extract(handlers.record, '$.name') AS signed_off_by_name
FROM claims LEFT JOIN handlers ON handlers.handler_id = claims.signed_off_by
WHERE claim_id = ?
"""


def one(conn: sqlite3.Connection, sql: str, key: str, what: str) -> sqlite3.Row:
    row = conn.execute(sql, (key,)).fetchone()
    if row is None:
        raise HTTPException(404, f"There is no {what} {key}")
    return row


def claim_summary(row: sqlite3.Row) -> ClaimSummary:
    record = json.loads(row["record"])
    return ClaimSummary(
        claim_id=row["claim_id"],
        customer_name=row["name"],
        claim_type=record["claim_type"],
        summary=record["summary"],
        amount_claimed=record["amount_claimed"],
        submitted_on=record["submitted_on"],
        status=row["status"],
        decision=row["decision"],
        payout=row["payout"],
    )


def claim_view(row: sqlite3.Row) -> dict[str, Any]:
    decision = None
    if row["decision"] is not None:
        decision = {
            "decision": row["decision"],
            "payout": row["payout"],
            "reason": row["reason"],
            "policy_section": row["policy_section"],
            "decided_at": row["decided_at"],
        }
    sign_off = None
    if row["signed_off_by"] is not None:
        sign_off = {
            "handler_id": row["signed_off_by"],
            "name": row["signed_off_by_name"],
            "signed_off_at": row["signed_off_at"],
        }
    payment = None
    if row["paid_at"] is not None:
        payment = {"amount": row["paid_amount"], "paid_at": row["paid_at"]}
    return {
        **json.loads(row["record"]),
        "status": row["status"],
        "thread_id": row["thread_id"],
        "decision": decision,
        "sign_off": sign_off,
        "payment": payment,
    }


@app.get("/api/health", operation_id="health")
def health() -> dict[str, str]:
    """Say whether the API is up."""
    return {"status": "ok"}


@app.get("/api/claims", operation_id="list_claims")
def list_claims() -> list[ClaimSummary]:
    """List the claims queue, with where each claim stands."""
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT claims.*, json_extract(customers.record, '$.name') AS name"
            " FROM claims JOIN customers USING (customer_id) ORDER BY claim_id"
        ).fetchall()
    return [claim_summary(row) for row in rows]


@app.get("/api/claims/{claim_id}", operation_id="get_claim")
def get_claim(claim_id: str) -> dict[str, Any]:
    """Get a claim in full: the story, the items, the documents and where it stands."""
    with db.connect() as conn:
        return claim_view(one(conn, CLAIM, claim_id, "claim"))


@app.get("/api/policies/{policy_id}", operation_id="get_policy")
def get_policy(policy_id: str) -> dict[str, Any]:
    """Get a policy, with the limits of its plan."""
    with db.connect() as conn:
        row = one(
            conn,
            "SELECT policies.record, plans.record AS plan FROM policies"
            " JOIN plans ON plans.plan = json_extract(policies.record, '$.plan')"
            " WHERE policy_id = ?",
            policy_id,
            "policy",
        )
    return {**json.loads(row["record"]), "plan_limits": json.loads(row["plan"])}


@app.get("/api/customers/{customer_id}/claims", operation_id="get_claim_history")
def get_claim_history(customer_id: str) -> ClaimHistory:
    """Get a customer's name and earlier claims, without their contact details."""
    with db.connect() as conn:
        row = one(
            conn,
            "SELECT record FROM customers WHERE customer_id = ?",
            customer_id,
            "customer",
        )
    return ClaimHistory.model_validate(json.loads(row["record"]))


@app.get("/api/handlers", operation_id="list_handlers")
def list_handlers() -> list[Handler]:
    """List the claims handlers."""
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT record FROM handlers ORDER BY handler_id"
        ).fetchall()
    return [Handler.model_validate(json.loads(row["record"])) for row in rows]
