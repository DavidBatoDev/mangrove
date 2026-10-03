# Mangrove Restoration Evidence Platform (working title)

Build Over Nights 2026 (Kiro x Amazon Quick), Climate Change track.

> **Status: repository skeleton only.** Application code is written during the build window
> (Sat Oct 3, 2026, 10:00 PM to Sun Oct 4, 10:00 AM, Asia/Manila), with Kiro as the primary development environment.

## What we are building

A public map of mangrove funding promises in the Philippines (`idea.md`). For funders, it puts Global Mangrove Watch history, current Sentinel-2 condition and field-partner evidence side by side
for a few candidate Manila Bay sites, answering three questions, each marked supported, conflicting or missing,
by deterministic rules and with no score. When a funder picks a site, Mangrove publishes a locked, hash-chained
promise as a pin on a public map. Later evidence lands on the same record and answers two separate checks:
did the work happen, and did the mangroves come back. When sources disagree, the pin turns red.

## Repository layout

Follows `docs/system-design.md` §2 and `docs/tests.md` §6.

| Path | Purpose |
|---|---|
| `web/` | Next.js + MapLibre web app; Playwright spec in `web/e2e/` |
| `api/` | FastAPI evidence API: `engine/` (rules, every `EQ-###`), `ledger/` (append-only records, hash chain), `adapters/` (Sentinel-2, field uploads), `tests/`; MCP server mounted at `/mcp` |
| `data/ingest/` | Offline Global Mangrove Watch ingest |
| `data/snapshots/` | Traceable data snapshots plus `manifest.csv` |
| `db/` | `init/*.sql` (schema, triggers, grants) and `seed.sql` (demo data) for Neon Postgres + PostGIS |
| `infra/` | `docker-compose.yml` (`web`, `api`, `caddy`) and `Caddyfile` (`/mcp*`, `/api/*` → api; rest → web) |
| `docs/`, `idea.md`, `context.md`, `AGENTS.md` | The build contract; start at `docs/index.md` |
| `.kiro/specs/`, `.kiro/steering/` | Kiro specs and steering (created in Kiro during the build) |

## Build provenance (disclosure)

- **Before the build window (Oct 3, about 7:00 PM UTC+8):** this empty folder skeleton was created by the team's pre-event setup agent.
  It contains placeholder READMEs, `.gitignore`/`.gitattributes`, `.env.example` (variable names only), and infra routing config
  (`infra/Caddyfile`, `infra/docker-compose.yml`). After 10:00 PM it was restructured to match the team's `docs/` layout. No application code, database schema, UI, rules, adapters, MCP tools, or Kiro specs
  existed before 10:00 PM.
- **Outside this repository, before the window:** cloud provisioning (EC2, S3, IAM, DNS), API credential smoke tests, public-data
  provenance records, and planning notes. None of that was copied into this repo as code.
- **During the window:** everything else, built in Kiro.

## Tools used

_[TEAM: complete honestly before submission.]_
- **Kiro** (IDE + CLI): primary development environment (specs, steering, agents, MCP testing)
- **Amazon Quick**: analyst chat agent over our read-only MCP tools
- **AWS**: EC2 (Docker Compose + Caddy), S3, IAM
- **Neon** (Postgres + PostGIS), **Copernicus Data Space** (Sentinel-2 Statistical API); an LLM only if F-013 is built (it narrates, never sets a status)
- **Claude Code**: pre-event setup agent (cloud provisioning, smoke tests, planning drafts, this skeleton)

## Data sources and licenses

_[TBD during build. Every dataset and snapshot is listed in `data/snapshots/manifest.csv`.]_

## Run locally

_[TBD during build.]_ Copy `.env.example` to `.env` and fill in values. Never commit `.env`.
