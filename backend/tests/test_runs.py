from fastapi.testclient import TestClient


def test_get_instructions_ends_with_the_policy_wording(client: TestClient) -> None:
    instructions = client.get("/api/instructions").json()["instructions"]
    assert instructions.startswith("# The UnderCover Agent")
    assert "Version 2026.1, for policies bought on or after January 1, 2026." in (
        instructions
    )
    assert "## 10. How we work out your payment" in instructions
    assert instructions.rstrip().endswith(
        "**Traveling companion:** a person named as a traveler on your policy record."
    )


def test_add_and_list_steps(client: TestClient) -> None:
    for kind, text in [
        ("tool_call", 'get_claim(claim_id="CLM-1001")'),
        ("message", "Done."),
    ]:
        response = client.post(
            "/api/claims/CLM-1001/steps",
            json={"thread_id": "thread-1", "kind": kind, "text": text},
        )
        assert response.status_code == 200
    recorded = client.get("/api/claims/CLM-1001/steps").json()
    assert [(s["kind"], s["text"]) for s in recorded] == [
        ("tool_call", 'get_claim(claim_id="CLM-1001")'),
        ("message", "Done."),
    ]
    assert recorded[0]["step_id"] < recorded[1]["step_id"]
    assert client.get("/api/claims/CLM-1002/steps").json() == []


def test_a_step_of_an_unknown_kind(client: TestClient) -> None:
    response = client.post(
        "/api/claims/CLM-1001/steps",
        json={"thread_id": "thread-1", "kind": "thought", "text": "Hmm."},
    )
    assert response.status_code == 422


def test_steps_of_a_claim_that_does_not_exist(client: TestClient) -> None:
    assert client.get("/api/claims/CLM-9999/steps").status_code == 404
    response = client.post(
        "/api/claims/CLM-9999/steps",
        json={"thread_id": "thread-1", "kind": "message", "text": "Hello."},
    )
    assert response.status_code == 404
