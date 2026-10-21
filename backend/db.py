"""UnderCover's records in SQLite, seeded from data/ on first start."""

import json
import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parent.parent
DATA = ROOT / "data"

SCHEMA = """
CREATE TABLE claims (
    claim_id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    record TEXT NOT NULL,
    status TEXT NOT NULL,
    thread_id TEXT,
    decision TEXT,
    payout REAL,
    reason TEXT,
    policy_section TEXT,
    decided_at TEXT,
    signed_off_by TEXT,
    signed_off_at TEXT,
    paid_amount REAL,
    paid_at TEXT
);
CREATE TABLE policies (policy_id TEXT PRIMARY KEY, record TEXT NOT NULL);
CREATE TABLE customers (customer_id TEXT PRIMARY KEY, record TEXT NOT NULL);
CREATE TABLE plans (plan TEXT PRIMARY KEY, record TEXT NOT NULL);
CREATE TABLE handlers (handler_id TEXT PRIMARY KEY, record TEXT NOT NULL);
CREATE TABLE steps (
    step_id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def path() -> Path:
    return Path(os.environ.get("UNDERCOVER_DB", ROOT / "undercover.db"))


def load(name: str) -> Any:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Open the database in a transaction that commits when the block ends."""
    conn = sqlite3.connect(path())
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def seed(conn: sqlite3.Connection) -> None:
    """Fill the tables from data/, with every claim waiting."""
    claims = load("claims.json")
    for claim in claims:
        del claim["status"]
    conn.executemany(
        "INSERT INTO claims (claim_id, policy_id, customer_id, record, status)"
        " VALUES (?, ?, ?, ?, 'waiting')",
        [
            (c["claim_id"], c["policy_id"], c["customer_id"], json.dumps(c))
            for c in claims
        ],
    )
    conn.executemany(
        "INSERT INTO policies VALUES (?, ?)",
        [(p["policy_id"], json.dumps(p)) for p in load("policies.json")],
    )
    conn.executemany(
        "INSERT INTO customers VALUES (?, ?)",
        [(c["customer_id"], json.dumps(c)) for c in load("customers.json")],
    )
    conn.executemany(
        "INSERT INTO plans VALUES (?, ?)",
        [(p["plan"], json.dumps(p)) for p in load("plans.json")["plans"]],
    )
    conn.executemany(
        "INSERT INTO handlers VALUES (?, ?)",
        [(h["handler_id"], json.dumps(h)) for h in load("handlers.json")],
    )


def create() -> None:
    """Create and seed the database, unless it exists already."""
    if path().exists():
        return
    with connect() as conn:
        conn.executescript(SCHEMA)
        seed(conn)
