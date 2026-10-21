# Insurance Claims Agent

An agent that triages incoming insurance claims, behind a FastAPI API, with a
React dashboard in front of it.

## Setup

```bash
uv sync      # Python packages from uv.lock into .venv
npm install  # Node packages, the git pre-commit hook, and Playwright's chromium
cp .env.example .env
```

## Running it

```bash
npm run dev  # backend on :8000 and dashboard on :5173, both with reload
```

Vite proxies `/api` to the backend, so the dashboard calls it on the same
origin in development.

## The checks

```bash
npm run check   # check:python, then check:ts, then the end-to-end test
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
hook in `lefthook.yml` — whichever matches the files you staged.

## Layout

| Path                                                        | What's in it                                              |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `agent/`                                                    | The claims agent: triage logic and its tests              |
| `backend/`                                                  | The FastAPI app that exposes it                           |
| `dashboard/`                                                | The React dashboard, its Vite config and its vitest tests |
| `e2e/`                                                      | The Playwright tests, which drive the two together        |
| `pyproject.toml`                                            | Python packages and the settings for every Python check   |
| `package.json`                                              | Node packages and the `npm run` scripts                   |
| `eslint.config.js`, `tsconfig.json`, `playwright.config.ts` | The TypeScript check settings                             |
