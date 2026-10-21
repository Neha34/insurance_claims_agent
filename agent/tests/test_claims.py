import pytest

from agent.claims import Claim, Decision, triage


def make_claim(amount: float) -> Claim:
    return Claim(
        reference="CLM-1",
        policy_number="POL-1",
        amount=amount,
        description="Rear-ended at a junction",
    )


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        (0.0, Decision.APPROVE),
        (1_000.0, Decision.APPROVE),
        (1_000.01, Decision.REVIEW),
        (25_000.0, Decision.REVIEW),
        (25_000.01, Decision.INVESTIGATE),
    ],
)
def test_triage_routes_by_amount(amount: float, expected: Decision) -> None:
    assert triage(make_claim(amount)).decision == expected


def test_triage_rejects_a_negative_amount() -> None:
    with pytest.raises(ValueError, match="negative amount"):
        triage(make_claim(-1.0))
