# Status

The pilot is being built from `docs/PLAN.md`. Phases 1 and 2 of 6 are done.

## What's built

- `backend/db.py`: the SQLite database, created and seeded from `data/` on first start, with the 25 claims waiting. It reads only the files it names, never `data/evals/` or `data/security/`.
- `backend/main.py`: the read operations `health`, `list_claims`, `get_claim`, `get_policy`, `get_claim_history` and `list_handlers`, and the operations that change a claim: `decide_claim`, `pay_claim` and `sign_off_claim`.
- The payment rule: `pay_claim` pays only the approved payout, once, and refuses a payout over the $1,000 limit in `data/company.json` with a 403. A handler's `sign_off_claim` makes that payment.
- `dashboard/`: the queue page, in the brand, in light and dark mode.
- `e2e/`: Playwright tests of the queue, against `backend/tests/e2e_app.py` on port 8001 with a throwaway database, and Vite on 5174.

## Running it

```bash
npm run dev    # backend on :8000 and dashboard on :5173
npm run check  # every check
```

The database is `undercover.db` at the repo root, or the path in `UNDERCOVER_DB`. To start over, stop the backend and delete the file.
