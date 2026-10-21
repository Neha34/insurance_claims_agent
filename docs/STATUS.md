# Status

The pilot is built from `docs/PLAN.md`. Phases 1 to 5 are done and checked. In Phase 6, the documents are up to date, but the run with a real model is still to do: it needs `OPENROUTER_API_KEY` in `.env`.

## What's built

- `backend/db.py`: the SQLite database, created and seeded from `data/` on first start, with the 25 claims waiting. It reads only the files it names, never `data/evals/` or `data/security/`.
- `backend/main.py`: the API. Every operation has an operation id, a one-line docstring and no optional inputs.
  - Reading: `health`, `list_claims`, `get_claim`, `get_policy`, `get_claim_history`, `list_handlers` and `get_instructions`. The API never returns a customer's contact details or date of birth.
  - Deciding: `decide_claim`, `pay_claim` and `sign_off_claim`. `pay_claim` pays only the approved payout, once, and refuses a payout over the $1,000 limit in `data/company.json` with a 403. A handler's `sign_off_claim` makes that payment.
  - Running: `start_run` starts the agent on a waiting claim in the background, `work_queue` works through the waiting claims one at a time, and `add_step` and `list_steps` record and show the steps. A run that fails or ends undecided puts the claim back to waiting, with a step that says why.
- `backend/instructions.md`: the agent's instructions. `get_instructions` serves them followed by `data/policy_wording.md`.
- `agent/agent.py`: the UnderCover Agent. `run(claim_id, thread_id)` fetches its instructions from the API, runs LangChain's `create_agent` on OpenRouter with five tools (`get_claim`, `get_policy`, `get_claim_history`, `decide_claim` and `pay_claim`), and posts each step back to the API. `decide_claim` and `pay_claim` act only on the claim the run was given. It uses `openai/gpt-6-luna` with low reasoning effort, or the model in `MODEL_NAME`.
- `agent/tests/stub.py`: the stub model every test uses. No test calls a real model.
- `dashboard/`: in the brand, in light and dark mode.
  - The queue (`#/`) shows where each claim stands, with a Work the queue button.
  - A claim (`#/claims/CLM-1001`) shows the claim in full, its policy, the customer's earlier claims, the agent's decision and payment, and the agent's steps, with a Run the agent button while it waits. On a claim waiting for sign-off, a handler picks their name and signs off, which makes the payment.
  - The instructions (`#/instructions`) show what the agent reads, read only.
  - The queue and the claim refresh every second while the agent works.
- `e2e/`: Playwright tests of the queue, a claim's run, working the queue, sign-off and the instructions. They run against `backend/tests/e2e_app.py` on port 8001, with a throwaway database and the stub agent, and Vite on port 5174, so they never touch the development database or a real model.

## Running it

```bash
npm run dev    # backend on :8000 and dashboard on :5173
npm run check  # every check
```

The agent needs `OPENROUTER_API_KEY` in `.env`. Without it, a run fails and the claim goes back to waiting. Set `MODEL_NAME=openrouter/free` in `.env` to use a free model, and run a few claims rather than the whole queue to stay inside its daily allowance.

The database is `undercover.db` at the repo root, or the path in `UNDERCOVER_DB`. To start over, stop the backend and delete the file.

## Still to do

- Phase 6's run with a real model: work the queue, check every decision has a reason and a policy section, and check that approvals over $1,000 wait for sign-off.
- Scoring the agent against the handlers' decisions in `data/evals/`, which the plan leaves for a later build.
