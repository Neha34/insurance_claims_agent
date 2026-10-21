"""The UnderCover claims API."""

import json
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Self

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, model_validator

from backend import db

load_dotenv(override=True)

APPROVAL_LIMIT: float = db.load("company.json")["payout_approval_limit"]


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


class DecisionRequest(BaseModel):
    decision: Decision
    payout: float = Field(ge=0)
    reason: str = Field(min_length=1)
    policy_section: str = Field(min_length=1)

    @model_validator(mode="after")
    def payout_fits_the_decision(self) -> Self:
        if self.decision == Decision.APPROVE and self.payout <= 0:
            raise ValueError("An approval needs a payout above $0")
        if self.decision != Decision.APPROVE and self.payout != 0:
            raise ValueError("A decline or a referral has a payout of $0")
        return self


class PaymentRequest(BaseModel):
    amount: float = Field(gt=0)


class SignOffRequest(BaseModel):
    handler_id: str


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


def claim_state(row: sqlite3.Row) -> dict[str, Any]:
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
        "claim_id": row["claim_id"],
        "status": row["status"],
        "thread_id": row["thread_id"],
        "decision": decision,
        "sign_off": sign_off,
        "payment": payment,
    }


def claim_view(row: sqlite3.Row) -> dict[str, Any]:
    return {**json.loads(row["record"]), **claim_state(row)}


def dollars(amount: float) -> str:
    return f"${amount:,.2f}"


def now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def pay(conn: sqlite3.Connection, claim_id: str, amount: float) -> None:
    paid = conn.execute(
        "UPDATE claims SET paid_amount = ?, paid_at = ?"
        " WHERE claim_id = ? AND paid_at IS NULL",
        (amount, now(), claim_id),
    ).rowcount
    if not paid:
        raise HTTPException(409, f"Claim {claim_id} is already paid")


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


@app.post("/api/claims/{claim_id}/decision", operation_id="decide_claim")
def decide_claim(claim_id: str, request: DecisionRequest) -> dict[str, Any]:
    """Record the decision on a claim, with its payout, reason and policy section."""
    payout = round(request.payout, 2)
    status = Status.WAITING_FOR_SIGN_OFF if payout > APPROVAL_LIMIT else Status.DECIDED
    with db.connect() as conn:
        one(conn, CLAIM, claim_id, "claim")
        decided = conn.execute(
            "UPDATE claims SET status = ?, decision = ?, payout = ?, reason = ?,"
            " policy_section = ?, decided_at = ?"
            " WHERE claim_id = ? AND status IN (?, ?)",
            (
                status,
                request.decision,
                payout,
                request.reason,
                request.policy_section,
                now(),
                claim_id,
                Status.WAITING,
                Status.IN_PROGRESS,
            ),
        ).rowcount
        if not decided:
            raise HTTPException(409, f"Claim {claim_id} is already decided")
        return claim_state(one(conn, CLAIM, claim_id, "claim"))


@app.post("/api/claims/{claim_id}/payment", operation_id="pay_claim")
def pay_claim(claim_id: str, request: PaymentRequest) -> dict[str, Any]:
    """Pay the approved payout on a claim, unless it waits for a handler's sign-off."""
    with db.connect() as conn:
        row = one(conn, CLAIM, claim_id, "claim")
        if row["decision"] != Decision.APPROVE:
            raise HTTPException(409, f"Claim {claim_id} is not approved")
        if row["paid_at"] is not None:
            raise HTTPException(409, f"Claim {claim_id} is already paid")
        if round(request.amount, 2) != row["payout"]:
            raise HTTPException(
                409,
                f"The approved payout on claim {claim_id} is {dollars(row['payout'])}",
            )
        if row["payout"] > APPROVAL_LIMIT and row["signed_off_by"] is None:
            raise HTTPException(
                403,
                f"A payout over {dollars(APPROVAL_LIMIT)} waits for a handler's"
                f" sign-off. Claim {claim_id} is waiting for sign-off.",
            )
        pay(conn, claim_id, row["payout"])
        return claim_state(one(conn, CLAIM, claim_id, "claim"))


@app.post("/api/claims/{claim_id}/sign-off", operation_id="sign_off_claim")
def sign_off_claim(claim_id: str, request: SignOffRequest) -> dict[str, Any]:
    """Sign off an approval over the limit as a handler, which makes the payment."""
    with db.connect() as conn:
        one(conn, CLAIM, claim_id, "claim")
        handler = Handler.model_validate_json(
            one(
                conn,
                "SELECT record FROM handlers WHERE handler_id = ?",
                request.handler_id,
                "handler",
            )["record"]
        )
        if not handler.can_approve_over_limit:
            raise HTTPException(
                403,
                f"{handler.name} can't sign off payouts over {dollars(APPROVAL_LIMIT)}",
            )
        signed = conn.execute(
            "UPDATE claims SET status = ?, signed_off_by = ?, signed_off_at = ?"
            " WHERE claim_id = ? AND status = ?",
            (
                Status.DECIDED,
                handler.handler_id,
                now(),
                claim_id,
                Status.WAITING_FOR_SIGN_OFF,
            ),
        ).rowcount
        if not signed:
            raise HTTPException(409, f"Claim {claim_id} is not waiting for sign-off")
        pay(conn, claim_id, one(conn, CLAIM, claim_id, "claim")["payout"])
        return claim_state(one(conn, CLAIM, claim_id, "claim"))
