from fastapi.testclient import TestClient

from backend import db
from backend.main import app


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_every_operation_has_an_id_a_docstring_and_no_optional_inputs() -> None:
    schema = app.openapi()
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            where = f"{method.upper()} {path}"
            assert operation.get("operationId"), where
            assert operation.get("description"), where
            assert "\n" not in operation["description"], where
            assert all(p["required"] for p in operation.get("parameters", [])), where
            if "requestBody" in operation:
                ref = operation["requestBody"]["content"]["application/json"]["schema"][
                    "$ref"
                ]
                body = schema["components"]["schemas"][ref.split("/")[-1]]
                assert set(body["required"]) == set(body["properties"]), where


def test_starting_up_creates_the_database_once(client: TestClient) -> None:
    assert db.path().exists()
    db.create()
    assert len(client.get("/api/claims").json()) == 25


def test_the_queue_is_the_claims_file_and_nothing_else(client: TestClient) -> None:
    claims = client.get("/api/claims").json()
    assert [c["claim_id"] for c in claims] == [
        c["claim_id"] for c in db.load("claims.json")
    ]
    assert "CLM-1901" not in {c["claim_id"] for c in claims}


def test_list_claims(client: TestClient) -> None:
    claims = client.get("/api/claims").json()
    assert claims[0]["claim_id"] == "CLM-1001"
    assert claims[-1]["claim_id"] == "CLM-1025"
    assert {c["status"] for c in claims} == {"waiting"}
    assert claims[0] == {
        "claim_id": "CLM-1001",
        "customer_name": "Maya Patel",
        "claim_type": "trip_delay",
        "summary": "Flight home canceled by the airline, rebooked the next morning",
        "amount_claimed": 420.0,
        "submitted_on": "2026-06-24",
        "status": "waiting",
        "decision": None,
        "payout": None,
    }


def test_get_claim(client: TestClient) -> None:
    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["policy_id"] == "POL-2001"
    assert claim["status"] == "waiting"
    assert claim["story"].startswith("My flight home from Rome")
    assert len(claim["items"]) == 3
    assert len(claim["documents"]) == 4
    assert claim["decision"] is None
    assert claim["sign_off"] is None
    assert claim["payment"] is None


def test_get_claim_that_does_not_exist(client: TestClient) -> None:
    response = client.get("/api/claims/CLM-9999")
    assert response.status_code == 404
    assert response.json() == {"detail": "There is no claim CLM-9999"}


def test_get_policy_with_its_plan_limits(client: TestClient) -> None:
    policy = client.get("/api/policies/POL-2001").json()
    assert policy["plan"] == "premium"
    assert policy["travelers"] == ["Maya Patel"]
    assert policy["plan_limits"]["deductible"] == 50.0
    assert policy["plan_limits"]["per_item_limit"] == 300.0


def test_get_policy_that_does_not_exist(client: TestClient) -> None:
    assert client.get("/api/policies/POL-9999").status_code == 404


def test_claim_history_leaves_out_contact_details(client: TestClient) -> None:
    history = client.get("/api/customers/CUS-3001/claims").json()
    assert history["name"] == "Maya Patel"
    assert [c["claim_id"] for c in history["previous_claims"]] == ["CLM-0412"]
    assert set(history) == {"customer_id", "name", "customer_since", "previous_claims"}


def test_claim_history_of_a_customer_who_does_not_exist(client: TestClient) -> None:
    assert client.get("/api/customers/CUS-9999/claims").status_code == 404


def test_list_handlers(client: TestClient) -> None:
    handlers = client.get("/api/handlers").json()
    assert [h["name"] for h in handlers] == [
        "Dana Whitfield",
        "Marcus Oyelaran",
        "Priya Raman",
    ]
    assert "email" not in handlers[0]
