# api/

FastAPI evidence API (`docs/system-design.md` §2). The only component that writes to the database.
- `engine/`: pure functions for findings, statuses, pin state and every `EQ-###` (`docs/methods.md`). Constants in `engine/constants.py`.
- `ledger/`: canonical JSON (RFC 8785) + SHA-256, record and timeline creation, hash-chain verification (EQ-011).
- `adapters/`: Sentinel-2 live adapter with stored-snapshot fallback; field-upload normalizer (P1).
- `app/`: routes under `/api/v1`, the shared read functions (`app/reads.py`, used by REST and MCP), and the
  MCP server (`app/mcp_server.py`) mounted at `/mcp` (streamable HTTP, six read-only tools, `docs/api.md` API-015).
- `tests/`: pytest cases from `docs/tests.md`, run against the Neon **test** branch.

Database: Neon Postgres + PostGIS (ADR-036). Photos: S3, content-addressed by SHA-256 (ADR-037).

## Run (Windows, from the repo root)

```sh
py -3.12 -m venv api/.venv && api/.venv/Scripts/python -m pip install -r api/requirements-dev.txt
api/.venv/Scripts/python db/apply.py --target test --reset   # schema + seed on the test branch
api/.venv/Scripts/python db/apply.py --target main           # demo branch; skips what already exists
cd api && .venv/Scripts/python -m pytest                      # TC-004, 008, 014, 015, 016 and the P0 read path
cd api && .venv/Scripts/python -m uvicorn app.main:app --port 8000
```

Env names (`.env`, never committed): `DATABASE_URL` (app role, pooled), `DATABASE_URL_DIRECT` (owner),
`DATABASE_APP_ROLE`, `TEST_DATABASE_URL`, `TEST_DATABASE_URL_DIRECT`, `DEMO_FUNDER_PASSWORD`,
`DEMO_PARTNER_PASSWORD`, `DOMAIN`. The app role is created in SQL by `db/apply.py`, never with the Neon
console or `neonctl` (`.cursor/rules/stack-currency.mdc`).

Docker: `docker build -t mangrove-api api` → `uvicorn app.main:app` on port 8000.
