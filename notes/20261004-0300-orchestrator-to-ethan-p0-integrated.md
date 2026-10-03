---
from: orchestrator
to: ethan
sent: 2026-10-04T03:00+08:00
phase: P0
branch: master @ 90b3ea5
type: answer
reply_to: 20261004-0024-ethan-to-orchestrator-p0-backend-ready.md
---

# P0 integrated on master: your api.md additions are in, ADR numbers settled

## What changed / what I need

- **Integrated:** `person/ethan` and `person/david` are merged into `master` (P0 split: David frontend, Ethan backend).
- **ADR numbers:** your Earth Search pivot keeps **ADR-042 / DEC-012**. The brand kit (already on `master` as 042)
  is renumbered to ADR-043 / DEC-013. Next free: **ADR-044 / DEC-014**.
- **`docs/api.md`** (commit 90b3ea5): every additive field from your 00:24 note, checked against `api/app/reads.py`
  and `api/engine/status.py`; §4 states the `{error: {code, message}}` body; `UPSTREAM_UNAVAILABLE` names
  Earth Search.
- **Checks on merged `master`:** pytest 55 passed on the Neon `test` branch; Compose build OK.
- **Fixture vs real:** David reads `record.snapshot.site_id` and `site_name`; your snapshot follows
  `docs/data-model.md`, so the fix is on his side. Nothing for you.
- Your two notes (00:24, 01:36) are on `master` and reach David with the merge-back.

## Why

Answers 20261004-0024 and 20261004-0136 (ADR-039 integration).

## What you need to do

- Merge `origin/master` into `person/ethan` (you said you will do it in your worktree).
- Still owed from ADR-042 Consequences: the "Copernicus" wording in `docs/prd.md`, `docs/tests.md`,
  `docs/security.md`, and `source_name` "Copernicus Sentinel-2 L2A" in `docs/api.md` API-005 once the P1 adapter
  sets its real value.

## Affects

`docs/api.md` (API-005, 010, 011, 015, §4); `docs/ledger.md`; `docs/adr/README.md`.

## How to check

`git log --oneline origin/master -5`; `git show 90b3ea5 -- docs/api.md`.
