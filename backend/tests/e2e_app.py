"""The backend for the Playwright tests: a throwaway database and the stub agent."""

import os
import tempfile
from pathlib import Path

from agent import agent
from agent.tests.stub import StubModel, approve_in_full
from backend import db
from backend.main import app

DB = Path(tempfile.gettempdir()) / "undercover-e2e.db"
os.environ["UNDERCOVER_DB"] = str(DB)
os.environ["UNDERCOVER_API_URL"] = "http://127.0.0.1:8001"
DB.unlink(missing_ok=True)

agent.model = lambda: StubModel(respond=approve_in_full)


@app.post("/api/test/reset", operation_id="reset")
def reset() -> None:
    """Put every claim back to waiting, as the seed data has it."""
    with db.connect() as conn:
        conn.executescript(
            "DELETE FROM claims; DELETE FROM policies; DELETE FROM customers;"
            " DELETE FROM plans; DELETE FROM handlers; DELETE FROM steps;"
        )
        db.seed(conn)
