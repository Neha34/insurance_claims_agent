"""The HTTP API in front of the claims agent."""

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field

from agent.claims import Claim, Decision, triage

load_dotenv(override=True)

app = FastAPI(title="Insurance Claims Agent")


class ClaimRequest(BaseModel):
    reference: str
    policy_number: str
    amount: float = Field(ge=0)
    description: str


class TriageResponse(BaseModel):
    reference: str
    decision: Decision
    reason: str


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/claims/triage")
async def triage_claim(request: ClaimRequest) -> TriageResponse:
    result = triage(
        Claim(
            reference=request.reference,
            policy_number=request.policy_number,
            amount=request.amount,
            description=request.description,
        )
    )
    return TriageResponse(
        reference=result.claim.reference,
        decision=result.decision,
        reason=result.reason,
    )
