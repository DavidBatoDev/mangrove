---
from: orchestrator
to: david
sent: 2026-10-03T23:30+08:00
phase: P0
branch: master (kickoff docs, not yet committed)
type: request
reply_to: none
---

# P0 handoff for David: build the frontend, the whole demo story clickable on fixtures

## What changed / what I need

**Phase 0 = "The story, end to end"** (ADR-041). It ends at **01:30** with an integration merge.
**You own the frontend (`web/`).** Ethan owns the backend (`api/`, `db/`, `data/`). The orchestrator owns `infra/`.

**Goal:** every screen of the demo exists, and the whole storyboard clicks through on mock fixtures. No real
API calls yet; you switch to the real API in P1.

**The storyboard you are building toward** (cast and ids: `data/sites/README.md`):
1. `/` public map of the Philippines, one pin for site A's published promise ("awaiting"), "Demo data" label.
2. Sign in as the demo funder (`funder@demo.mangrove.test`).
3. `/sites`: the 5 Manila Bay polygons on the map plus a list with name and area in ha.
4. `/compare?sites=B,D,E`: three columns; on "What do people on the ground say?" B = supported, D = missing, E = **conflicting** (proposal says open, partner reports an active fishpond) in red.
5. `/sites/B`: the dossier, every evidence item with its provenance (source, version, dates, method, resolution, limitation, link).
6. `/sites/B/lock`: the lock form (hydrological_repair, 8 ha, expected 6 ha vegetated, checks 2027-04-01 and 2029-10-01, rationale, known unknowns), then the "this can never be edited or deleted" confirmation.
7. `/records/{id}`: the new record: promise, evidence snapshot, content hash, "Verify" → intact, work check = missing, outcome check = "Too early to tell (checkable from 2029-10-01)", the disclaimer footer.
8. Back on `/`: a new pin for B.
9. `/evidence/new`: the funder adds a project report (work done, 8 ha); the partner adds field evidence with the mapped boundary `data/sites/demo/B-mapped-boundary-5ha.geojson` (5 ha) → B's work check turns **conflicting** (8 vs 5 shown with their sources) and **B's pin turns red**.
10. (Not your screen) Amazon Quick answers "Why does Site B differ from Site E?" from the MCP tools.

**Your P0 scope**

1. **Scaffold** a Next.js App Router app with TypeScript in `web/`, on the Node.js runtime (no edge runtime). MapLibre GL JS for the map. Basemap: EOxCloudless 2016, URL and attribution string in `docs/prd.md` §7. Verify every library against its current docs before coding (`AGENTS.md` "Stack currency").
2. **One data module** (e.g. `web/lib/api.ts`) that every screen uses:
   - `NEXT_PUBLIC_USE_MOCKS=true` → read from fixtures; otherwise fetch the real API.
   - In the browser, call relative URLs: `/api/v1/...`. In server components, call `${API_INTERNAL_URL}/api/v1/...` (default `http://localhost:8000`).
   - For local dev against Ethan's API later, add Next.js rewrites: `/api/:path*` → `http://localhost:8000/api/:path*`.
3. **Fixtures in `web/mocks/`**, one file per operation, in **exactly** the shapes of `docs/api.md` §3:
   - `api-004-sites.json` (the 5 sites; geometry from `data/sites/candidates.geojson`)
   - `api-005-site-a.json` … `api-005-site-e.json` (three answers in the order history, current, ground; evidence list)
   - `api-006-compare-b-d-e.json`, `api-010-records.json`, `api-011-record-a.json`, `api-013-verify-a.json`
   - Every number is `{value, unit, eq_id, confidence}`; every entity has `is_demo: true`.
   - Ground evidence follows the cast table in `data/sites/README.md`. For history and current you may use placeholder satellite items, but mark them `"source_version": "fixture-placeholder"`. Fixtures are never deployed (ADR-038).
   - **In-memory fakes** for the writes, so steps 2, 6 and 9 work: sign-in (API-001 response shape), lock (API-009 → adds a record and its pin), evidence (API-008 → appends to the record timeline and recomputes the work check with EQ-009: conflict when |reported − mapped| / reported > 0.20).
4. **Screens and routes** (`docs/prd.md` §5.1, `docs/design-brief.md` §3): `/`, `/records/[id]`, `/sign-in`, `/sites`, `/sites/[id]`, `/compare?sites=`, `/sites/[id]/lock`, `/evidence/new`. Each with at least its loading, empty and error states from the PRD table.
5. **UI rules that cannot be broken:**
   - "Demo data" label on every seeded site, organization and record, including pins (BR-006).
   - A status always shows its finding, the word (supported / conflicting / missing), and the source count. Color is extra, never the only signal.
   - Red is reserved for conflict (pin state and conflicting status). No other red.
   - Every record page shows: "This record is not a certification of restoration success or approval of funding."
   - No score, rank, probability or percent anywhere. Banned copy: `docs/design-brief.md` §4 ("certified", "verified restoration", "tamper-proof", "the satellite shows 5 hectares", …).
6. **`web/Dockerfile`**: Node 22, `npm ci && npm run build`, `next start -p 3000`.

**Not in P0:** real API calls (P1), real sign-in or uploads (P1), Playwright TC-020 (P2), `docs/design.md` (optional, P2).

## Why

P0 proves the whole demo exists on screen while Ethan builds the backend in parallel (ADR-038). At 01:30 the
orchestrator checks your fixtures against Ethan's real responses. If the shapes match, P1's switch to the
real API is a configuration change, not a rewrite.

## What you need to do

- `git fetch && git switch person/david`, then build the scope above. Commit as you go; commit messages follow ADR-035.
- Do not edit `api/`, `db/`, `data/` or `infra/`.
- If you need something from Ethan's API, or you find `docs/api.md` wrong or unclear, **send a note** (`notes/TEMPLATE.md`, ADR-040). Do not change the contract on your branch.
- Push `person/david` by **01:30** and tell the orchestrator.

## Affects

`web/` only. Reads `docs/api.md` §3 (API-001, 004, 005, 006, 008, 009, 010, 011, 013), `docs/prd.md` §4–§5 (US-001…US-014, BR-001…BR-006), `docs/design-brief.md`, `data/sites/`. Env: `NEXT_PUBLIC_USE_MOCKS`, `NEXT_PUBLIC_BASEMAP_URL`, `API_INTERNAL_URL`.

## How to check

- `NEXT_PUBLIC_USE_MOCKS=true npm run dev`, then walk storyboard steps 1–9 without a dead end.
- `npm run build` passes; `docker build -t mangrove-web web/` succeeds.
- `grep -riE "certified|tamper-proof|score|probability|will succeed" web/` finds nothing in UI copy.
- Every fixture's keys match the example shapes in `docs/api.md` §3.
