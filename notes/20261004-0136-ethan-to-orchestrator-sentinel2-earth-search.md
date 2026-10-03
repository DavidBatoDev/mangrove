---
from: ethan
to: orchestrator
sent: 2026-10-04T01:36+08:00
phase: P0
branch: person/ethan @ 861de89
type: change
reply_to: none
---

# Sentinel-2 now comes from Earth Search COGs, not the Copernicus Statistical API (ADR-042)

## What changed / what I need

- **ADR-042 / DEC-012:** DS-002 is now Sentinel-2 L2A Collection 1 COGs found with Element 84 Earth Search
  (`https://earth-search.aws.element84.com/v1`, collection `sentinel-2-c1-l2a`, assets `scl`, `red`, `nir`).
  The P1 adapter searches scenes in `[t − 90 d, t]`, counts the SCL pixels inside the site polygon, and keeps
  the scene with the highest valid fraction. No account and no secret are needed.
- **Unchanged:** EQ-005/006/007 math, the §3.1 thresholds, confidences, and API-007's contract (path, roles,
  502 `UPSTREAM_UNAVAILABLE` on source failure).
- **Docs updated in commit 861de89:** `docs/methods.md` (DS-002, EQ-005 method text), `docs/system-design.md`
  (§1, §3, §4, §5 Sentinel-2 rows), `docs/ledger.md` (DEC-012), `docs/adr/README.md`, `AGENTS.md` (stack
  facts; next free ADR-043 / DEC-013), `.cursor/rules/stack-currency.mdc`, `.env.example` (`CDSE_*` kept,
  marked unused).
- **Global Mangrove Watch data** (history, EQ-002/003) is being mirrored to
  `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/` by a job on the EC2 host (logs in
  `/var/tmp/gmw-mirror/`). The v4.1.12 extent stack is already there and MD5-verified. The full mirror should
  finish about 03:10–03:40.

## Why

No Copernicus Data Space account could be registered: the registration captcha would not complete. The
Copernicus services were up; Earth Search serves the same ESA L2A product with no account. The reasons and
options are in ADR-042.

## What you need to do

- Put commit 861de89 on `master` at the next integration, since it changes contract docs.
- Nothing to set on EC2 for Sentinel-2: `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` can stay empty.
- Deliver this note to David (FYI: the dossier still shows "What's there now?" as missing until the P1 adapter lands).

## Affects

DS-002, EQ-005 (method text), F-003, API-007, US-005, TC-005. Follow-up wording ("Copernicus" meaning the
live source) listed in ADR-042's Consequences: `docs/prd.md`, `docs/tests.md`, `docs/security.md`, `docs/api.md`.

## How to check

- `py -3.12 tools/check-doc-status.py docs` and `py -3.12 tools/check-context-overlay.py --index docs/index.md --ledger docs/ledger.md` both APPROVE.
- `curl "https://earth-search.aws.element84.com/v1/search?collections=sentinel-2-c1-l2a&bbox=120.80,14.75,120.84,14.77&limit=1"` returns a scene with an `scl` asset.
