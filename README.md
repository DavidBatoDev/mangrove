# Mangrove Restoration Evidence Platform (working title)

Build Over Nights 2026 (Kiro x Amazon Quick), Climate Change track.

> **Status: repository skeleton only.** Application code is written during the build window
> (Sat Oct 3, 2026, 10:00 PM to Sun Oct 4, 10:00 AM, Asia/Manila), with Kiro as the primary development environment.

## What we are building

A decision tool for mangrove restoration funders. It gathers fragmented evidence (Global Mangrove Watch history,
recent Sentinel-2 satellite signals, and project or field reports) around a few candidate restoration sites
in the Philippines. Deterministic rules, not an AI score, show where that evidence supports a site, conflicts, or is missing.
The funder chooses a site. The system then publishes a versioned, hashed public decision record of what was promised and why.
Later evidence is attached to the same record to answer two separate questions: did the restoration work happen,
and did the environmental recovery appear?

## Repository layout

| Path | Purpose |
|---|---|
| `apps/web/` | Next.js web app: site comparison, evidence inspector, public decision record page |
| `services/api/` | FastAPI evidence API and deterministic rules engine |
| `services/mcp/` | Read-only MCP server for the Amazon Quick analyst agent (calls the API's read endpoints only) |
| `services/ingest/` | Evidence source adapters: `gmw/`, `sentinel2/`, `field/` |
| `data/snapshots/` | Traceable data snapshots plus `manifest.csv` (source, version, retrieval time, sha256) |
| `infra/` | `docker-compose.yml` and `Caddyfile` (`/` → web, `/api` → api, `/mcp` → mcp) |
| `.kiro/specs/`, `.kiro/steering/` | Kiro specs and steering (created in Kiro during the build) |

## Build provenance (disclosure)

- **Before the build window (Oct 3, about 7:00 PM UTC+8):** this empty folder skeleton was created by the team's pre-event setup agent.
  It contains placeholder READMEs, `.gitignore`/`.gitattributes`, `.env.example` (variable names only), and infra routing config
  (`infra/Caddyfile`, `infra/docker-compose.yml`). No application code, database schema, UI, rules, adapters, MCP tools, or Kiro specs
  existed before 10:00 PM.
- **Outside this repository, before the window:** cloud provisioning (EC2, S3, IAM, DNS), API credential smoke tests, public-data
  provenance records, and planning notes. None of that was copied into this repo as code.
- **During the window:** everything else, built in Kiro.

## Tools used

_[TEAM: complete honestly before submission.]_
- **Kiro** (IDE + CLI): primary development environment (specs, steering, agents, MCP testing)
- **Amazon Quick**: analyst chat agent over our read-only MCP tools
- **AWS**: EC2 (Docker Compose + Caddy), S3, IAM
- **Neon** (Postgres + PostGIS), **Copernicus Data Space** (Sentinel-2 Statistical and Catalog APIs), **OpenAI** (in-app explanations only; explanations never set decision flags)
- **Claude Code**: pre-event setup agent (cloud provisioning, smoke tests, planning drafts, this skeleton)

## Data sources and licenses

_[TBD during build. Every dataset and snapshot is listed in `data/snapshots/manifest.csv`.]_

## Run locally

_[TBD during build.]_ Copy `.env.example` to `.env` and fill in values. Never commit `.env`.
