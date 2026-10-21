from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_triage_a_small_claim() -> None:
    response = client.post(
        "/api/claims/triage",
        json={
            "reference": "CLM-2",
            "policy_number": "POL-2",
            "amount": 250,
            "description": "Cracked windscreen",
        },
    )
    assert response.status_code == 200
    assert response.json()["decision"] == "approve"


def test_triage_rejects_a_negative_amount() -> None:
    response = client.post(
        "/api/claims/triage",
        json={
            "reference": "CLM-3",
            "policy_number": "POL-3",
            "amount": -1,
            "description": "Impossible",
        },
    )
    assert response.status_code == 422
