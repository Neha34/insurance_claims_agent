# Insurance Claims Agent

An agent that triages incoming insurance claims, behind a FastAPI API.

## Setup

```bash
uv sync      # Python packages from uv.lock into .venv
npm install  # Node dev tools, and the git pre-commit hook
cp .env.example .env
```

## Running it

```bash
npm run dev  # uvicorn on http://127.0.0.1:8000, with reload
```

## The checks

```bash
npm run check   # ruff format, ruff check, pyright, pytest
npm run format  # format everything
```

They also run on every commit, through the lefthook hook in `lefthook.yml`.

## Layout

| Path             | What's in it                                     |
| ---------------- | ------------------------------------------------ |
| `agent/`         | The claims agent: triage logic and its tests     |
| `backend/`       | The FastAPI app that exposes it                  |
| `pyproject.toml` | Python packages and the settings for every check |
| `package.json`   | Node dev tools and the `npm run` scripts         |
