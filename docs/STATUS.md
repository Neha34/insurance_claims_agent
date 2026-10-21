# Status

The pilot is being built from `docs/PLAN.md`. Phases 1 to 4 of 6 are done.

## What's built

- `backend/db.py`: the SQLite database, created and seeded from `data/` on first start, with the 25 claims waiting. It reads only the files it names, never `data/evals/` or `data/security/`.
- `backend/main.py`: the read operations `health`, `list_claims`, `get_claim`, `get_policy`, `get_claim_history` and `list_handlers`, and the operations that change a claim: `decide_claim`, `pay_claim` and `sign_off_claim`.
- The payment rule: `pay_claim` pays only the approved payout, once, and refuses a payout over the $1,000 limit in `data/company.json` with a 403. A handler's `sign_off_claim` makes that payment.
- `agent/agent.py`: the UnderCover Agent. `run(claim_id, thread_id)` fetches its instructions from the API, runs LangChain's `create_agent` on OpenRouter with five tools (`get_claim`, `get_policy`, `get_claim_history`, `decide_claim` and `pay_claim`), and posts each step back to the API. It uses `openai/gpt-6-luna` with low reasoning effort, or the model in `MODEL_NAME`.
- `backend/instructions.md`: the agent's instructions. `get_instructions` serves them followed by `data/policy_wording.md`.
- The run operations: `start_run` starts the agent on a waiting claim in the background, `work_queue` works through the waiting claims one at a time, and `add_step` and `list_steps` record and show the steps. A run that fails or ends undecided puts the claim back to waiting, with a step that says why.
- `agent/tests/stub.py`: the stub model every test uses.
- `dashboard/`: in the brand, in light and dark mode. The queue page (`#/`) shows where each claim stands and has a Work the queue button. The claim page (`#/claims/CLM-1001`) shows the claim in full, its policy, the customer's earlier claims, the agent's decision and payment, and the agent's steps, with a Run the agent button on a waiting claim. Both refresh every second while the agent works.
- `e2e/`: Playwright tests of the queue, a claim's run and working the queue, against `backend/tests/e2e_app.py` on port 8001 with a throwaway database and the stub agent, and Vite on 5174.

## Running it

```bash
npm run dev    # backend on :8000 and dashboard on :5173
npm run check  # every check
```

The agent needs `OPENROUTER_API_KEY` in `.env`. Without it, a run fails and the claim goes back to waiting.

The database is `undercover.db` at the repo root, or the path in `UNDERCOVER_DB`. To start over, stop the backend and delete the file.
