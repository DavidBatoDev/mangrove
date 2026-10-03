# ADR-044 — Mangrove context from Global Mangrove Watch: site and nearby trend, bay layer, national card

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-014, F-022, US-016, EQ-002, EQ-003, EQ-014, EQ-015, EQ-016, DS-001, DS-007, API-019, API-020, API-021, TC-021

### Context

The team wants Global Mangrove Watch-style context in the product: an extent map layer, a yearly extent
series, and national extent and change. The GMW v4.1.12 files (Zenodo 21346457) are now mirrored to the
project bucket (`s3://bon-mangrove-evidence-baf5cf/datasets/gmw/`).

Running EQ-002 on the five demo polygons with the real extent stack (2026-10-04) gave: **no mangrove inside
any site in any year 1985–2025**, except about 1 ha inside site B in 2025. By EQ-003 every site reads
`no_mangrove_recorded`. GMW starts in 1985, and most Manila Bay ponds were cut from mangrove before then, so
the history question cannot see that conversion. Around the sites the record is different: inside a ~2 km
box, mangrove grew from 5.6 to 22.5 ha near A, 16.6 to 34.8 ha near B and 0.7 to 37.9 ha near D, and fell
from 9.7 to 0.7 ha near C.

### Why now

The history ingest (EQ-002/003) is P1 work, and its first real result changes what "Was this mangrove
before?" shows for every demo site. The widgets and the honest reading have to be decided together.

### Options considered

1. **Honest history plus a nearby trend** — the history answer keeps EQ-003's result and states the 1985 limit; a new context number (mangrove near the site, per year) and a bay extent layer show the trend around the site; a national card shows Philippine extent and change from GMW's published statistics / pros: true to the data, and the most informative picture for a funder / cons: three new numbers to document, more build.
2. **Honest history, inside-site series only** — pros: no new equation / cons: the series is flat zero for four of five sites and says nothing.
3. **Change the polygons or the threshold so history reads `mangrove_recorded`** — rejected outright: it breaks the data-honesty rule in `docs/methods.md` §3.1.
4. **Copy every GMW dashboard widget (alerts, Red List, global rankings)** — pros: looks complete / cons: alerts and Red List are other datasets we do not have; global rankings do not help a Manila Bay funder.

### Decision

Option 1. F-022 (Should) adds:

- **Per-site GMW series** (API-019): EQ-002 inside the site and EQ-014 within `NEARBY_BUFFER_M` of it, for
  every year 1985–2025, stored as metrics on the site's single GMW history evidence item (no schema change).
- **Bay extent layer** (API-021): GMW extent polygons for the Manila Bay demo area every 5 years (1985, 1990,
  …, 2025), generated offline from the stack and served as GeoJSON.
- **Philippines card** (API-020): national extent per year with GMW's 95% bounds (EQ-015) and year-on-year
  gain, loss and net change (EQ-016), read as published from DS-007.

None of these numbers sets a status, finding or pin (BR-001); they are context. The history answer reads
`no_mangrove_recorded` wherever EQ-003 says so, and the dossier shows the limit "GMW starts in 1985; ponds
converted earlier are not visible".

### Why this option

It is the only option that keeps the history answer honest and still gives funders the trend that matters:
whether mangroves are coming back next to a site, or disappearing.

### Overrides

- **Prior ADRs:** none.
- **Doc or plan truth:** adds F-022 to `idea.md` §7 and `docs/prd.md` §3, US-016 to `docs/prd.md`; EQ-014…EQ-016, DS-007 and `NEARBY_BUFFER_M` to `docs/methods.md`; API-019…API-021 to `docs/api.md`; TC-021 to `docs/tests.md`. Updated in the same change.
- **Out of scope:** GMW Alerts and IUCN Red List widgets; global rankings; any change to EQ-003 or its threshold.

### Consequences

- **Easier:** a funder sees each site against the mangrove trend beside it, from one cited source.
- **Harder or owed:** the pitch line "a site that looks restorable on GMW" no longer matches the data for the demo sites; it has to talk about the nearby trend and the 1985 limit instead. The ingest needs `rasterio` (offline only; the API image does not).
- **Follow-up:** if the team wants pre-1985 history, a source such as historical maps or the Global Mangrove Alliance restoration-potential layer [R04] would need its own ADR.
