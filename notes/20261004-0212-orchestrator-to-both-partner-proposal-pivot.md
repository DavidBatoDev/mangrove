---
from: orchestrator
to: both
sent: 2026-10-04T02:12+08:00
phase: P0
branch: docs/partner-proposal-pivot @ e03aa87
type: change
reply_to: none
---

# Partner proposal pivot is docs only; P0's screen list is behind the PRD

## What changed / what I need

ADR-044 (DEC-014) is the contract. A partner proposes the site, the benefit text, the timeline and the milestones. A funder commits. The public map toggles sites with a commitment and sites without one. Early milestones use the partner's photo, GPS and mapped area; the satellite line is "not yet observable" and is not a fail. After the outcome date, the partner's report and Sentinel-2 vegetated area (EQ-012) are both required. Disagreement flags the record and notifies the funder.

P0's screen list in ADR-041 is behind the PRD until a later build. This change ships no code.

The fact lives in `docs/adr/ADR-044-partner-proposals-and-milestone-gate.md` and the owning docs it names. This note only points at them.

The number is ADR-044 because `master` already used ADR-043 and DEC-013 for the brand kit. Do not reuse those.

## Why

The meeting replaced who writes the proposal. ADR-041 still tells P0 to build the old eight screens. Those screens stay the build list until a later build. They are not the product flow when they disagree with `docs/prd.md`.

## What you need to do

Nothing to build from this note. Read ADR-044 before treating ADR-041's P0 screen list as the flow. Do not retarget `person/david` or `person/ethan` in this change.

## Affects

`docs/adr/ADR-044-partner-proposals-and-milestone-gate.md`, `docs/ledger.md` (DEC-014), `docs/prd.md`, `idea.md`, `docs/methods.md`, `docs/data-model.md`, `docs/security.md`, `docs/api.md`, `docs/tests.md`, `docs/pitch.md`, `docs/design.md`, `data/sites/README.md`, `AGENTS.md` (next free ADR-045, DEC-015). No `api/`, `web/`, `db/`, `infra/` or `brand/` files.

## How to check

Read ADR-044. `python3 tools/check-doc-status.py docs` and `python3 tools/check-context-overlay.py --index docs/index.md --ledger docs/ledger.md`. No screen and no endpoint to open: this change ships no code.
