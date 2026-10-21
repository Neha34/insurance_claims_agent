# UnderCover Claims

The UnderCover Agent decides travel insurance claims for UnderCover Travel
Insurance: it approves, declines or refers each claim, works out the payout and
explains the decision. A FastAPI backend holds the claims in SQLite, and a React
dashboard shows the handlers the queue, each claim, the agent's steps and its
instructions. A payout over $1,000 waits for a handler's sign-off.

## Setup

```bash
uv sync      # Python packages from uv.lock into .venv
npm install  # Node packages, the git pre-commit hook, and Playwright's chromium
cp .env.example .env  # then fill in OPENROUTER_API_KEY
```

## Running it

```bash
npm run dev  # backend on :8000 and dashboard on :5173, both with reload
```

Vite proxies `/api` to the backend, so the dashboard calls it on the same
origin in development. The backend creates `undercover.db` from `data/` on
first start; delete it to start over.

## The checks

```bash
npm run check   # check:python, then check:ts, then the end-to-end tests
npm run format  # format everything
```

| Check                   | Python                 | TypeScript |
| ----------------------- | ---------------------- | ---------- |
| Formatting              | `ruff format`          | Prettier   |
| Linting                 | `ruff check`           | ESLint     |
| Types                   | pyright                | `tsc`      |
| Unit tests and coverage | pytest with pytest-cov | vitest     |
| End to end              | Playwright             | Playwright |

`check:python` and `check:ts` also run on every commit, through the lefthook
hook in `lefthook.yml`, whichever matches the files you staged. No test calls a
real model: they use the stub in `agent/tests/stub.py`.

## Layout

| Path                                                        | What's in it                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `agent/`                                                    | The UnderCover Agent, its stub model and its tests                |
| `backend/`                                                  | The FastAPI app, its SQLite database and the agent's instructions |
| `dashboard/`                                                | The React dashboard, its Vite config and its vitest tests         |
| `e2e/`                                                      | The Playwright tests, which drive the two together                |
| `data/`                                                     | UnderCover's records, which seed the database                     |
| `docs/`                                                     | The spec, the plan and the status of the build                    |
| `pyproject.toml`                                            | Python packages and the settings for every Python check           |
| `package.json`                                              | Node packages and the `npm run` scripts                           |
| `eslint.config.js`, `tsconfig.json`, `playwright.config.ts` | The TypeScript check settings                                     |
