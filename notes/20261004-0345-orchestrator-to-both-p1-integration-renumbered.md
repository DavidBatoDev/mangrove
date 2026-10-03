---
from: orchestrator
to: both
sent: 2026-10-04T03:45+08:00
phase: P1
branch: master @ 27c8e3f
type: change
reply_to: 20261004-0301-ethan-to-both-gmw-context-f022.md
---

# Your new work is on master. Several IDs were renumbered; use the new numbers from now on

## What changed / what I need

- **Merged into `master`:** David's Google Maps display layer and Ethan's GMW context. Split recorded as David frontend, Ethan backend; Ethan's `web/` edits for the GMW cards and extent layer are accepted as a one-off cross-layer exception.
- **`master` had moved under you.** A docs-only "partner proposal pivot" landed first (ADR-044 / DEC-014; see `notes/20261004-0212-orchestrator-to-both-partner-proposal-pivot.md`). It took IDs that both of you also used, so **your** work was renumbered. `master`'s meanings were kept.

| Was (your branch) | Now (master) | Whose | Why |
|---|---|---|---|
| ADR-044 / DEC-014, `ADR-044-gmw-context-widgets.md` | **ADR-045 / DEC-015**, `ADR-045-gmw-context-widgets.md` | Ethan | ADR-044 / DEC-014 = partner proposal pivot |
| F-022 | **F-025** | Ethan | F-022 = "inspector dispatch" (Won't) |
| US-016 | **US-017** | Ethan | US-016 = partner proposes a site |
| API-019 / API-020 / API-021 | **API-021 / API-022 / API-023** | Ethan | API-019 = proposal POST, API-020 = funder notice |
| `web/mocks/api-019-…`, `api-020-…`, `api-021-…` | `api-021-gmw-timelines.json`, `api-022-country-phl.json`, `api-023-gmw-extent-2025.json` | Ethan | follow the API ids |
| TC-021 / TC-022 | **TC-025 / TC-026** | Ethan | `docs/security.md` T-011 already cites TC-021 / TC-022 |
| ADR-043 / DEC-013 (Proposed) | **ADR-046 / DEC-016 (Accepted)** | David | ADR-043 / DEC-013 = brand kit |
| "ADR-042" for the brand kit | **ADR-043** | David | on `master`, ADR-042 = Sentinel-2 from Earth Search |

  EQ-014, EQ-015, EQ-016 and DS-007 did not clash and are unchanged. **Next free: ADR-047 / DEC-017.** Ethan's
  note (03:01) still says F-022 and ADR-044; read them as F-025 and ADR-045. Sent notes are never edited.
- **David's Google Maps ADR is accepted** as ADR-046. `docs/prd.md` §7 now names Google Maps as the display
  map when a key is set, with MapLibre + EOxCloudless 2016 as the fallback.
- **Conflicts I resolved:** `web/app/pages.css` (place card + 3D styles kept, GMW chart styles added),
  `web/components/MapView.tsx` (both `extent` and `onPinClick` kept), `web/app/sites/[id]/page.tsx` (David's
  3D view kept; its MapLibre fallback now gets Ethan's `extent`), and the docs (`prd.md` personas from the pivot
  plus US-017 on the Funder; `methods.md` EQ-012 from the pivot plus EQ-014…016; `tests.md` US-017 row).
- **Gap, for David:** when a Google key is set, the map engine is Google, and the GMW extent layer (API-023) is
  only drawn by `MapView` (MapLibre). With a key, the extent layer does not show on `/`, `/sites` or the site
  page. Either draw it in `GoogleMapView` (a `google.maps.Data` layer from the same GeoJSON) or show it only in
  MapLibre mode and say so in the legend. Your call; send a note either way.

## Why

ADR-039 integration, on request. ID collisions make the docs say two things with one number, and the
pre-commit discipline (`AGENTS.md`) forbids reusing a number.

## What you need to do

- **Both:** commit your work in progress, then `git merge origin/master` into your person branch before you
  continue, so your next commits use the new numbers and file names.
- **Ethan:** your in-progress files may still say F-022 / API-019…021 / TC-021; after the merge, use the new ids.
- **David:** decide the GMW extent layer on the Google map (above).

## Affects

`docs/adr/` (ADR-045, ADR-046), `docs/ledger.md` (DEC-015, DEC-016), `AGENTS.md` (next free), `docs/prd.md`,
`docs/methods.md`, `docs/tests.md`, `docs/api.md`, `idea.md`, `api/app/reads.py`, `api/app/routes.py`,
`api/tests/test_api.py`, `data/ingest/`, `web/mocks/`, `web/lib/`, `web/components/`, `web/app/`.

## How to check

`git grep -nE "F-022|API-019|API-020" -- api web` shows nothing of yours. `pytest` and `npm run lint && npx tsc
--noEmit && npm run build` pass on `master` (see the integration commit).
