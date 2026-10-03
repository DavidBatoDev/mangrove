---
from: orchestrator
to: david
sent: 2026-10-04T03:00+08:00
phase: P0
branch: master @ 90b3ea5
type: request
reply_to: 20261004-0201-david-to-orchestrator-p0-frontend-ready.md
---

# P0 integrated on master: brand kit is ADR-043, one record-page fix, and the look-choices ADR

## What changed / what I need

- **Integrated:** `person/ethan` and `person/david` are merged into `master` (P0 split: David frontend, Ethan backend).
- **Brand kit renumbered:** the designer had already pushed the brand kit to `master` as ADR-042 / DEC-012, and Ethan's
  Earth Search pivot also used ADR-042 / DEC-012. Earth Search keeps ADR-042 / DEC-012. The brand kit is now
  **ADR-043 / DEC-013** (`docs/adr/ADR-043-adopt-brand-kit.md`). Comments in `web/app/globals.css`,
  `web/app/layout.tsx`, `web/scripts/sync-brand.mjs` and `web/public/brand/BRAND.md` now say ADR-043. Your note
  20261004-0201 still says ADR-042; read it as ADR-043. Next free: **ADR-044 / DEC-014**.
- **Error body:** confirmed `{ "error": { "code", "message" } }` (`api/app/errors.py`); `docs/api.md` §4 now says so.
  You can drop the bare `{code, message}` fallback in `web/lib/api.ts` when convenient.
- **Fixture vs real responses** (local API against Neon `main`):
  - API-004, API-006, API-013: same keys.
  - API-005, API-010, API-011: the real responses add fields (`location`, `note`, `created_at`,
    `submitted_by_org {name, is_demo}`, `mapped_area`, `properties.site_id`, `record.site_id`, `record.is_demo`,
    top-level `site`, `checks[].source_count`, `checks[].disagreeing_evidence_ids`, `vegetated_area`,
    timeline `prev_hash`). All are in `docs/api.md` now.
  - **Mismatch to fix:** `record.snapshot` in the real API is `{site, answers, evidence}` (`docs/data-model.md`
    `promise_record.snapshot`), not `{site_id, site_name, site_answers, evidence_ids}`. In real mode
    `app/records/[id]/page.tsx` shows "Record · Site" with no site link, and "use site centre" in
    `app/evidence/new/page.tsx` fails for a record target.
  - Seed has no Sentinel-2 or GMW items yet (Ethan's P1 adapters), so real A, B, C, E show history and
    current as missing, and D has no evidence. Expected until P1.
- **Your `web/.env.local`** in the main checkout sets `NEXT_PUBLIC_USE_MOCKS=true`, so a local `npm run build`
  there is a mock build. The Docker image ignores `.env.*` and is clean (only the fixed demo ids and the
  `fixture-placeholder` check are in the bundle).

## Why

ADR-039 integration step 3 (fixture-versus-real check) and your note's three asks.

## What you need to do

1. Read the site from `record.site_id` and the top-level `site` (name, geometry) instead of `record.snapshot`,
   in `app/records/[id]/page.tsx` and `app/evidence/new/page.tsx`. Update `web/mocks/api-011-record-a.json` to
   the real shape.
2. **Request:** write the ADR for your four look choices (OpenFreeMap basemaps, one typeface, 16px card radius,
   Philippines map bounds) as **ADR-044 / DEC-014** on `person/david`, with the `brand/BRAND.md` §5 update.
   Reply with an `answer` note when it is pushed.
3. Merge `origin/master` into `person/david` before you continue.

## Affects

`web/` (records and evidence pages, `lib/api.ts`, `mocks/api-011-record-a.json`); API-011; `brand/BRAND.md` §5;
`docs/adr/`, `docs/ledger.md`.

## How to check

- With `NEXT_PUBLIC_USE_MOCKS=false` and the API on `:8000`, open `/records/00000000-0000-4000-8000-0000000001a0`:
  the header names site A and links to `/sites/00000000-0000-4000-8000-0000000000a0`.
- `py -3.12 tools/check-doc-status.py docs` approves after the ADR.
