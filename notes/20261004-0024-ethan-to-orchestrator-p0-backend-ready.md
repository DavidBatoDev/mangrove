---
from: ethan
to: orchestrator
sent: 2026-10-04T00:24+08:00
phase: P0
branch: person/ethan @ d3ccb18
type: heads-up
reply_to: 20261003-2330-orchestrator-to-ethan-p0-handoff.md
---

# P0 backend: Neon is up, read path and MCP live locally, plus additive response fields

## What changed / what I need

- **Neon project created with the CLI** (instead of David doing it): project `mangrove`, `aws-ap-southeast-1`,
  branches `main` (demo) and `test` (pytest only). Connection strings are in my local `.env` only; I share
  them privately for the EC2 `.env`. David's handoff step "create the Neon project" is done.
- `db/init/001…005.sql` and `db/apply.py` + `db/seed.py`. Both branches are migrated and seeded with the cast
  from `data/sites/README.md`. Fixed ids hold. The A record `…0001a0` verifies `intact: true`.
- API-004, 005, 006, 010, 011, 013, 016, the 405 `RECORD_IMMUTABLE` routes, and the six-tool MCP at `/mcp`.
  `api/Dockerfile` builds and serves `/mcp` with `Host: $DOMAIN` (a foreign host gets 421).
- **Contract additions (additive only, nothing renamed or removed).** Please put them in `docs/api.md` on `master`:
  - Evidence item (API-005, timeline): `location` (GeoJSON or null), `note`, `created_at`, and `mapped_area`
    (`EQ-010`, only when the item has a mapped boundary).
  - Answers and checks: `source_count` (`EQ-013`) and `disagreeing_evidence_ids` on every answer and check.
    The outcome check also has `vegetated_area` (`EQ-008`, null until P1).
  - API-011: top-level `site` (same shape as API-005 `site`); `record.site_id`, `record.is_demo`;
    timeline entries carry `prev_hash`.
  - API-010: `properties.site_id`. API-004 `properties` unchanged.
  - MCP `compare_sites` adds `differing_questions` (as API-015 describes).
- **New env names:** `TEST_DATABASE_URL`, `TEST_DATABASE_URL_DIRECT` (in `.env.example`; the server doesn't need them).
- **Seeded ids, for David's fixtures:** funder org `…00000000f001`, partner org `…00000000f002`, funder user
  `…00000000f101`, partner user `…00000000f102`. Evidence ids are `00000000-0000-4000-8000-0000000e0<site><nn>`
  (e.g. `…0000000e0e02` = E's field item, `active_fishpond`).

## Why

- Neon roles created with the console/API/neonctl are members of `neon_superuser` and inherit UPDATE/DELETE
  on every table, which silently defeats the grant layer of BR-002 (ADR-034). `db/apply.py` therefore creates
  the app role in SQL and refuses to continue if the role inherits anything. TC-008 now checks both layers
  (grant: "permission denied for table"; trigger: `RECORD_IMMUTABLE` even for the owner).
- The added fields are what the record and dossier screens and Quick need to show "both values and their
  sources" (US-012) without a second request.

## What you need to do

- Copy the Neon strings (sent privately) into the EC2 `.env`: `DATABASE_URL` (app role, pooled),
  `DATABASE_URL_DIRECT`, `DATABASE_APP_ROLE`, plus `DEMO_FUNDER_PASSWORD` / `DEMO_PARTNER_PASSWORD`. The
  password hashes in the seed come from these values, so use the same ones.
- Merge the contract additions above into `docs/api.md` on `master`, then deliver this note to David.

## Affects

`api/`, `db/`, `.env.example`, `.cursor/rules/stack-currency.mdc`; API-004, 005, 006, 010, 011, 013, 015, 016;
TC-004, 008, 014, 015, 016.

## How to check

- `cd api && .venv/Scripts/python -m pytest` → 55 passed (test branch).
- The handoff's curl checks and the MCP Inspector `tools/list` all pass against `main` locally.
