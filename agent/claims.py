"""Triage for incoming insurance claims."""

from dataclasses import dataclass
from enum import StrEnum

AUTO_APPROVE_LIMIT = 1_000.0
REVIEW_LIMIT = 25_000.0


class Decision(StrEnum):
    APPROVE = "approve"
    REVIEW = "review"
    INVESTIGATE = "investigate"


@dataclass(frozen=True)
class Claim:
    reference: str
    policy_number: str
    amount: float
    description: str


@dataclass(frozen=True)
class Triage:
    claim: Claim
    decision: Decision
    reason: str


def triage(claim: Claim) -> Triage:
    """Route a claim by its value, until a real model takes over."""
    if claim.amount < 0:
        raise ValueError(f"Claim {claim.reference} has a negative amount")
    if claim.amount <= AUTO_APPROVE_LIMIT:
        return Triage(claim, Decision.APPROVE, "Under the auto-approval limit")
    if claim.amount <= REVIEW_LIMIT:
        return Triage(claim, Decision.REVIEW, "Needs a handler to look at it")
    return Triage(claim, Decision.INVESTIGATE, "Over the review limit")
