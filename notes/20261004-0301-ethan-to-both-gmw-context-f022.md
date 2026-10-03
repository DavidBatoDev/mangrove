---
from: ethan
to: both
sent: 2026-10-04T03:01+08:00
phase: P1
branch: person/ethan @ d170833
type: change
reply_to: none
---

# F-022 GMW context is in, the demo sites read "no mangrove recorded", and I touched web/

## What changed / what I need

- **Real GMW history (ADR-044):** the GMW v4.1.12 ingest ran on Neon `main` and `test`. Inside the five demo
  polygons GMW records **no mangrove in any year 1985–2025** (about 1 ha inside B in 2025), so "Was this
  mangrove before?" now reads **supported · `no_mangrove_recorded`** for every site, with the limitation
  "GMW starts in 1985; ponds converted earlier are not visible". The GMW items are real data, so `is_demo: false`.
- **Mangrove within 1 km, 1985 → 2025** (EQ-014): A 3.6 → 1.2 ha, B 4.5 → 6.8 ha, C 5.2 → 0.1 ha, **D 0.3 → 19.4 ha**, E 0 → 0.
- **New endpoints** (docs/api.md, commit fe9a1e7): API-019 `/sites/{id}/gmw-timeline`, API-020
  `/context/countries/PHL`, API-021 `/layers/gmw-extent?year=` (1985…2025 every 5 years).
- **David: I edited web/ on your phase** (the user asked me to build both halves): new
  `web/components/GmwContext.tsx`; the dossier gets a "Mangrove around this site" card and the map layer chips;
  `/sites` gets the Philippines card; `MapView` gets an optional `extent` prop; api.ts, types, mock-store
  (+stub) and three fixtures in `web/mocks/api-019..021`. A brand-review pass was applied. Please look it over
  and change anything that fights your layout.
- **Copied GMW data:** `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/` holds both Zenodo records and the JAXA
  regional zips (78 objects, 13.97 GB, `MANIFEST.csv` with MD5/SHA-256 per file).

## Why

The real data does not support "this site was mangrove" for any demo site, and the data-honesty rule forbids
moving polygons or thresholds. The nearby trend and the national card give the context that is true.

## What you need to do

- **Orchestrator:** merge `person/ethan` (fe9a1e7 contract first) at the next integration; the API image now
  ships `api/app/context_data/` (1.4 MB). No DB step on deploy: `main` already has the GMW items.
- **David:** review the web changes above; the dossier's three questions now show history = supported for all
  sites, so any fixture or copy that assumes "missing" history needs an update.
- **Pitch owner:** "a site that looks restorable on GMW" no longer matches the data; use the nearby trend
  (D's 0.3 → 19.4 ha) and the 1985 limit instead (ADR-044 Consequences).

## Affects

F-022, US-016, EQ-002/003/014/015/016, DS-007, API-019/020/021, TC-021; `api/`, `data/ingest/`, `web/`
(GmwContext, MapView, sites pages, api/types/mocks). Neon `main` and `test` (append-only GMW items).

## How to check

- `pytest` in `api/` → 56 passed (test branch).
- `curl /api/v1/sites/00000000-0000-4000-8000-0000000000d0/gmw-timeline` → 41 years, D nearby 2025 ≈ 19.4 ha.
- Open `/sites/D` → the card and the 2025 chip draws mangrove along the Orani shore; `/sites` → the Philippines card.
