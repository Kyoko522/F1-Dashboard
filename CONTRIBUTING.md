# Contributing

Thanks for taking the time to look at this project. This document covers everything you need to get a working dev environment, the conventions the codebase follows, and how to ship a change.

---

## Development Setup

You'll need:

- **Python 3.11+**
- **Node.js 20+**
- **Docker** (optional, only for full-stack containerized dev)

### One-time setup

```bash
git clone https://github.com/Kyoko522/f1-dashboard.git
cd f1-dashboard

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env

# Frontend
cd ../frontend
npm install
```

### Running

In two terminals:

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

Backend: http://localhost:8000 (docs at `/docs`)
Frontend: http://localhost:5173

---

## Code Style

| Layer | Tool | Config |
|---|---|---|
| Python | **Ruff** (lint + format) | `backend/pyproject.toml` |
| JS / JSX | **ESLint** | `frontend/eslint.config.js` |
| JS / JSX / CSS / JSON | **Prettier** | `frontend/.prettierrc` |

These are enforced in CI — any PR that fails lint or format checks will be blocked.

### Run formatters before committing

```bash
# Backend
cd backend && ruff format . && ruff check --fix .

# Frontend
cd frontend && npm run format && npm run lint
```

### Pre-commit hooks (recommended)

Install once and the hooks run automatically before every `git commit`:

```bash
pip install pre-commit
pre-commit install
```

Skip a single commit (rarely needed): `git commit --no-verify`.

---

## Architecture Conventions

These rules exist so the codebase stays predictable as it grows. Please keep to them.

### Backend (`backend/`)

- **`main.py`** is the FastAPI bootstrap. Only `FastAPI()`, `add_middleware()`, `include_router()`. **No business logic.**
- **`app/routes/`** — thin HTTP handlers. Validate input → call service → return response. No data manipulation.
- **`app/services/`** — all business logic, caching, and FastF1 interaction.
- **`app/models/schemas.py`** — Pydantic schemas only. No methods, no logic.

When adding a new endpoint:

1. Add the response schema to `app/models/schemas.py`
2. Put the data logic in `app/services/`
3. Add a thin route in `app/routes/`
4. Add at least one test in `backend/tests/` (or document why it can't have one — e.g. requires live FastF1 data, in which case mark with `@pytest.mark.integration`)

### Frontend (`frontend/src/`)

- **`services/api.js`** is the only file that calls `fetch()`. Don't bypass it.
- **`hooks/`** own all state and side effects.
- **`components/`** are pure display. They receive props, they render. They don't fetch, they don't mutate state directly.
- **`utils/`** has no React imports. Pure functions only.

---

## Testing

### Backend

```bash
cd backend
pytest                          # all unit tests
pytest -m "not integration"     # what CI runs (no network)
pytest -m integration           # FastF1 integration tests (slow, hits the network)
pytest tests/test_app.py -v     # specific file
```

### Frontend

There is no frontend test suite yet — Vite's build + ESLint are the current CI gates. PRs that add tests are very welcome.

---

## Commit Messages

No strict format, but please follow these patterns so the git log stays readable:

- **Imperative mood**: `fix race start detection` not `fixed race start detection`
- **Scope first when useful**: `backend: cache eviction off-by-one`
- **One concept per commit** — split unrelated changes into separate commits

Examples from this repo's history:

```
backend: thread-safe LRU cache with load deduplication
frontend: switch TrackCanvas to refs so rAF loop doesn't restart
docs: clarify session-key format
ci: add ruff format check to pipeline
```

---

## Pull Request Workflow

1. **Branch from `main`** — `feat/`, `fix/`, `docs/`, `ci/` prefixes are nice but not required
2. **Push and open a PR** — the [PR template](.github/PULL_REQUEST_TEMPLATE.md) loads automatically
3. **Fill in the test plan** — at minimum verify the local checks listed there pass
4. **Wait for CI** — three jobs run in parallel (backend, frontend, docker)
5. **Address review feedback** — push more commits, don't force-push unless asked
6. **Squash on merge** — keeps the main branch history tidy

---

## What I Look At During Review

- Does it follow the architecture rules above?
- Are tests added or updated where they should be?
- Is the code clearer than what was there before?
- Are there any new dependencies, and are they justified?
- Does the description explain the *why*, not just the *what*?

---

## Reporting Issues

Open an issue with:

- What you were doing
- What you expected to happen
- What actually happened
- Browser + OS for frontend issues, Python version for backend

A minimal reproduction (a session key + driver number, or a curl command) makes everything easier.

---

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
