"""The backend for the Playwright tests, on a throwaway database they can start over."""

import os
import tempfile
from pathlib import Path

from backend import db
from backend.main import app

DB = Path(tempfile.gettempdir()) / "undercover-e2e.db"
os.environ["UNDERCOVER_DB"] = str(DB)
DB.unlink(missing_ok=True)


@app.post("/api/test/reset", operation_id="reset")
def reset() -> None:
    """Put every claim back to waiting, as the seed data has it."""
    with db.connect() as conn:
        conn.executescript(
            "DELETE FROM claims; DELETE FROM policies; DELETE FROM customers;"
            " DELETE FROM plans; DELETE FROM handlers; DELETE FROM steps;"
        )
        db.seed(conn)
