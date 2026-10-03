# ADR-038 — Frontend and backend are built in parallel against the API contract

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-008, ADR-039, F-001…F-012, API-004…API-015

### Context

The build window opened at 10:00 PM with two people and no code. The demo path judges see (compare →
lock → pin → red conflict, TC-020) is mostly screens, and `docs/prd.md` §5.1 lists eight of them with their
states. The data path (Neon schema, engine, GMW ingest, Sentinel-2) and the MCP server for Amazon Quick are
the other half, and Quick is a hard requirement (5-point deduction if missing). The REST and MCP contracts
are already written in `docs/api.md`.

### Why now

Both people start coding in the first hour. Whether the frontend waits for the backend decides the shape of
the whole night.

### Options considered

1. **Backend first, then the UI** — pros: the UI only ever talks to real data / cons: the screens start hours late and the visible demo is the thing left unfinished.
2. **UI first on mock data, backend after** — pros: a clickable demo early / cons: the data path and the Quick MCP server start late; a demo that still runs on mocks at 8 AM would claim features the repo does not have.
3. **Both at once: the UI runs on fixtures that equal `docs/api.md`, and switches to the real API screen by screen** — pros: neither half waits; the switch is a configuration change, not a rewrite / cons: fixtures can drift from the real responses; needs a contract check at every merge.

### Decision

Frontend and backend are built at the same time, from the first hour.

- **Fixtures equal the contract.** `web/mocks/` holds one JSON fixture per read operation the screens use (API-004, API-005, API-006, API-010, API-011, API-013), in exactly the shapes of `docs/api.md` §3: every number as `{value, unit, eq_id, confidence}`, `is_demo` on every entity, three answers in the order history, current, ground. Writes (lock, evidence) are faked in memory only.
- **One switch.** `NEXT_PUBLIC_USE_MOCKS` selects fixtures or `fetch('/api/v1/…')`. It is off in the deployed build.
- **Same demo data on both sides.** Fixtures are built from the same demo content as `db/seed.sql`: the five sketched Manila Bay polygons, fictional organization names (BR-006), and the 8 ha reported vs 5 ha mapped conflict (ADR-033). The backend turns that content into the seed; it is not invented twice.
- **Cut-over rule.** A screen switches to the real API in the phase its endpoint lands on `master` (ADR-039). By code freeze no screen reads a fixture, and the demo runs on the seeded Neon database with "Demo data" labels.
- **The backend does not wait for the UI.** The MCP server's read tools land with the first API endpoints, so Amazon Quick is connected and tested early (F-011).
- **Fixture drift is a contract bug.** If a fixture and the real response differ, `docs/api.md` is corrected first, then whichever side is wrong.

### Why this option

Two people and eleven hours cannot afford a waiting half. The contract already exists, so the mocks can be
exact rather than guessed, and the cut-over rule keeps the demo honest about what the repository implements.

### Overrides

- **Prior ADRs:** none.
- **Doc or plan truth:** none. `docs/api.md` stays the contract; this ADR says how the frontend uses it before the endpoints exist.
- **Out of scope:** Does not change any endpoint, payload or MCP tool.

### Consequences

- **Easier:** both people are productive from minute one; the demo is clickable early; Quick can be tested before the UI is done.
- **Harder or owed:** fixtures must be checked against real responses at every integration merge (ADR-039); a fixture left wired in at the demo would misrepresent the build.
- **Follow-up:** add `NEXT_PUBLIC_USE_MOCKS` to `.env.example` (done in the same change).
