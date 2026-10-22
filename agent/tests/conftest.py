from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from agent import agent
from agent.tests.stub import Respond, StubModel, as_httpx
from backend.main import app


@contextmanager
def through(client: TestClient) -> Iterator[httpx.Client]:
    yield as_httpx(client)


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """The API on a fresh database, which the agent reaches through the test client."""
    monkeypatch.setenv("UNDERCOVER_DB", str(tmp_path / "undercover.db"))
    with TestClient(app) as client:
        monkeypatch.setattr(agent, "api", lambda: through(client))
        yield client


@pytest.fixture
def stub(monkeypatch: pytest.MonkeyPatch) -> Callable[[Respond], None]:
    """Give the agent a stub model that answers with a respond function."""

    def use(respond: Respond) -> None:
        monkeypatch.setattr(agent, "model", lambda: StubModel(respond=respond))

    return use
