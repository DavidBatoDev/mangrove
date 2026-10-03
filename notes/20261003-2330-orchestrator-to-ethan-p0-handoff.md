---
from: orchestrator
to: ethan
sent: 2026-10-03T23:30+08:00
phase: P0
branch: master (kickoff docs, not yet committed)
type: request
reply_to: none
---

# P0 handoff for Ethan: build the backend foundation, the read path and the MCP server

## What changed / what I need

**Phase 0 = "The story, end to end"** (ADR-041). It ends at **01:30** with an integration merge.
**You own the backend (`api/`, `db/`, `data/`).** David owns the frontend (`web/`). The orchestrator owns `infra/`.

**Goal:** the database exists on Neon with the append-only rules, the demo data is seeded, and every read
endpoint and all six MCP tools return real data in the shapes of `docs/api.md`. At 01:30 this goes live on
`https://18-140-211-157.sslip.io` so Amazon Quick can connect.

**The demo this serves** (cast, fixed ids and evidence: `data/sites/README.md`): a public map with site A's
published promise; compare B, D, E where the ground question reads supported / missing / **conflicting**
(E: proposal says open, partner reports an active fishpond); lock B; later 8 ha reported vs 5 ha mapped turns
B's pin red; Quick answers "Why does Site B differ from Site E?". In P0 you build the read side of all of it;
writes come in P1.

**Your P0 scope**

1. **Database (Neon Postgres + PostGIS, ADR-036)**: `db/init/*.sql`, applied in filename order with `DATABASE_URL_DIRECT` (owner role):
   - extensions (`postgis`, `citext`, and whatever `gen_random_uuid()` needs on Neon), the enums, the five tables, and every check, foreign key and index in `docs/data-model.md` §2–§3.
   - `trg_<table>_append_only` (`BEFORE UPDATE OR DELETE` → raise) on `evidence_item`, `promise_record`, `record_event`.
   - An application role (name in `DATABASE_APP_ROLE`) with `SELECT, INSERT` only on those three tables (ADR-034). **The API connects as this role**, so `DATABASE_URL` is that role's pooled connection string.
   - Site geometry is `MultiPolygon`; the GeoJSON in `data/sites/` is `Polygon`, so wrap it with `ST_Multi`.
2. **Seed** (`db/seed.sql`, or a small seed script if passwords must be hashed from env), straight from `data/sites/README.md`:
   - The two fictional organizations and two users (Argon2id hashes of `DEMO_FUNDER_PASSWORD` / `DEMO_PARTNER_PASSWORD`).
   - The five sites with their **fixed ids**.
   - The demo ground evidence per site (`source_type` `proposal` or `field`, `question = ground`, full provenance fields, `is_demo = true`, `content_hash` by EQ-011).
   - The published record on site A with id `…0000000001a0`, created **through the ledger** so its `content_hash` is real.
   - **No satellite evidence.** History and current stay "missing" until real GMW / Sentinel-2 ingest in P1.
3. **API (`api/`, FastAPI, Python 3.12)**, all routes under `/api/v1`:
   - `engine/` (pure functions): BR-001 statuses per question and check, BR-004 pin state, EQ-001 (`ST_Area(geom::geography)/10000`), EQ-009, EQ-010, EQ-013, and the code paths for EQ-003 and EQ-006 ready for P1 data. Constants from `docs/methods.md` §3.1 in `api/engine/constants.py`.
   - `ledger/`: canonical JSON per RFC 8785 + SHA-256 (EQ-011), record creation and timeline hash chain, verification.
   - Endpoints: API-004, API-005, API-006, API-010, API-011, API-013, API-016. Error envelope and codes from `docs/api.md` §4. Every number as `{value, unit, eq_id, confidence}`; `is_demo` on every entity; three answers always in the order history, current, ground.
   - Any `PUT` / `PATCH` / `DELETE` on evidence, records or timeline → `405 RECORD_IMMUTABLE`.
4. **MCP server mounted inside the API at `/mcp`** (API-015). Facts already verified against the current SDK (`mcp` 2.3.0):
   - `FastMCP` is gone in 2.x: use `from mcp.server.mcpserver import MCPServer`. Transport options (`stateless_http`, `json_response`, `streamable_http_path`, `transport_security`) go to `run()` / `streamable_http_app()`, not the constructor.
   - Mount it as `Mount("/", app=mcp.streamable_http_app(stateless_http=True, transport_security=...))` so the endpoint stays exactly `/mcp`. The FastAPI `lifespan` must run `async with mcp.session_manager.run(): yield`, or you get "Task group is not initialized".
   - Always pass `transport_security` (`mcp.server.transport_security.TransportSecuritySettings`). The default allows only localhost, and every public request gets **421**. Allow `DOMAIN`, `DOMAIN:*`, `localhost:*`, `api:*`, or turn the rebinding check off: the endpoint is public, unauthenticated and read-only by design.
   - Don't use `Mount("/mcp", ...)` with `streamable_http_path="/"`: it 307-redirects to `/mcp/`.
   - Exactly six tools: `list_sites`, `get_site_dossier`, `compare_sites`, `list_records`, `get_record`, `verify_record`. Each `inputSchema` is JSON Schema Draft 7 with `required` as a root-level array (Quick rejects anything else). Mark each tool read-only (`ToolAnnotations(read_only_hint=True, destructive_hint=False)`).
   - Tools call the same engine and read functions as REST, from the database only (no Copernicus), and answer in seconds. Output carries `is_demo`, `eq_id`, `confidence`. Tool descriptions say statuses mean "sources agree", not "good site" (BR-001).
5. **`api/Dockerfile`**: Python 3.12 slim, `uvicorn <app> --host 0.0.0.0 --port 8000`.
6. **Tests (pytest)**, run against a **Neon test branch**, never the demo branch: TC-004 (three answers, no score), TC-008 (UPDATE/DELETE rejected as the app role, plus 405 over HTTP), TC-014 (`tools/list` = the six names, `required` arrays), TC-015 (hash chain verify catches a flipped byte), TC-016 (engine numbers that need no satellite data).

**Not in P0:** sign-in and sessions (API-001…003), all writes (API-007, 008, 009, 012), S3 and assets (API-014), GMW ingest and Sentinel-2 (P1), rate limits (P1). **Stretch** if you finish early: the GMW v4.1.12 ingest script in `data/ingest/` (EQ-002, EQ-003).

## Why

P0 puts the contract and the append-only rules in place first, because everything in P1 writes on top of
them. The read path plus MCP live at 01:30 lets Amazon Quick, a hard requirement worth 5 points, be connected
and tested hours before the demo.

## What you need to do

- `git fetch && git switch person/ethan`, then build the scope above. Commit as you go; commit messages follow ADR-035.
- **Neon:** David creates the project (AWS `ap-southeast-1`, PostGIS) and sends you the connection strings **privately**. Never put them in the repo, a note or a log. Put them in your local `.env` (git-ignored). The free plan sleeps after 5 minutes idle; the first request after that is slow.
- Do not edit `web/` or `infra/`.
- If the API must differ from `docs/api.md` or `docs/data-model.md`, **send a note first** (ADR-040). The orchestrator puts the contract change on `master` before David's fixtures depend on it.
- Push `person/ethan` by **01:30** and tell the orchestrator.

## Affects

`api/`, `db/`, `data/`. Contract: `docs/api.md` (API-004, 005, 006, 010, 011, 013, 015, 016), `docs/data-model.md`, `docs/methods.md` (EQ-001, 003, 006, 009, 010, 011, 013; §3.1 constants), `docs/security.md` §4 and §8, `docs/tests.md`. Env names: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `DATABASE_APP_ROLE`, `DEMO_FUNDER_PASSWORD`, `DEMO_PARTNER_PASSWORD`, `DOMAIN`.

## How to check

- `curl localhost:8000/api/v1/health` → `{"status":"ok"}`.
- `curl localhost:8000/api/v1/sites` → 5 features with the fixed ids and `is_demo: true`.
- `curl "localhost:8000/api/v1/compare?site_ids=<B>,<D>,<E>"` → ground status supported / missing / conflicting.
- `curl localhost:8000/api/v1/records/00000000-0000-4000-8000-0000000001a0/verify` → `"intact": true`.
- `npx -y @modelcontextprotocol/inspector --cli http://localhost:8000/mcp --transport http --method tools/list` → exactly the six tools.
- `pytest` green for TC-004, 008, 014, 015, 016.
