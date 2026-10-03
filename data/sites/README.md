# data/sites/ — demo sites and the demo cast

> **Demo data.** The five polygons were sketched on 2026-10-03, before the build window, as prep research
> from OpenStreetMap features and imagery quick-looks. Nobody has visited them. They are "sketched for demo,
> not field-verified" (BR-006, R09). Map data © OpenStreetMap contributors (ODbL), used for placement only.

This file is the **single home of the demo cast and fixed ids** until `db/seed.sql` exists; after that the
seed is authoritative and this table follows it. The frontend fixtures (`web/mocks/`, ADR-038) and the
backend seed both build from it, so the two halves line up at the merge (ADR-039).

## Files

| File | What it is |
|------|------------|
| `candidates.geojson` | The five candidate polygons (EPSG:4326). Each feature carries `id` (fixed UUID below), `site_id` (A–E), `is_demo: true`, name, municipality, province, rationale, constraints, basis, and `area_ha_epsg32651` (prep check only; the product computes area with EQ-001). |
| `SITES.md` | Why each polygon was drawn, the public sources consulted, and what would invalidate each site. |
| `demo/B-mapped-boundary-5ha.geojson` | The demo partner's mapped worked area inside site B: 5.00 ha. Used for the work-check conflict (8 ha reported vs 5 ha mapped, ADR-033, EQ-009, EQ-010). Generated, not surveyed. |

## Fixed ids

| Entity | id |
|--------|----|
| Site A — Macabebe bayfront ponds | `00000000-0000-4000-8000-0000000000a0` |
| Site B — Pamarawan breached-dike pond complex | `00000000-0000-4000-8000-0000000000b0` |
| Site C — Hagonoy outer pond belt near Tibaguin | `00000000-0000-4000-8000-0000000000c0` |
| Site D — Orani bayfront eroded pond enclosure | `00000000-0000-4000-8000-0000000000d0` |
| Site E — Paombong (Masukol) coastal pond belt | `00000000-0000-4000-8000-0000000000e0` |
| Seeded promise record on site A | `00000000-0000-4000-8000-0000000001a0` |

Organizations and users need no fixed ids. Use these names (fictional, BR-006):

| Kind | Name / login | Role |
|------|--------------|------|
| organization | Demo Coastal Fund | `funder` |
| organization | Demo Bayside Partners | `partner` |
| user | `funder@demo.mangrove.test` (Demo Coastal Fund) | `funder`, password from `DEMO_FUNDER_PASSWORD` |
| user | `partner@demo.mangrove.test` (Demo Bayside Partners) | `partner`, password from `DEMO_PARTNER_PASSWORD` |

## The demo cast

| Site | Role in the demo | Ground evidence to seed (demo, `question = ground`) | Expected ground status |
|------|------------------|------------------------------------------------------|------------------------|
| A | Already has a published promise (the seeded record) → pin "awaiting" on the public map | proposal `open_for_restoration`; partner field item `open_for_restoration` | supported |
| B | The funder locks it live in the demo; later evidence (project report 8 ha vs mapped 5 ha) turns its pin red | proposal `open_for_restoration`; partner field item `open_for_restoration` | supported |
| C | Background candidate | proposal `open_for_restoration` only | supported (one source) |
| D | Shows what "no evidence yet" looks like | none | missing |
| E | The "aha": the proposal says open, the partner reports an active fishpond | proposal `open_for_restoration`; partner field item `active_fishpond` | **conflicting** |

**Seeded record on A** (published by Demo Coastal Fund): planned action `natural_regeneration`, planned
area 10 ha, expected vegetated 7 ha, `work_check_after` 2027-04-01, `outcome_check_after` 2029-10-01,
with rationale, expected outcome and known unknowns written as demo text. No later evidence yet, so its
checks read work = missing and outcome = too early → pin "awaiting".

**Live lock on B** (typed during the demo): planned action `hydrological_repair`, planned area 8 ha, expected
vegetated 6 ha, `work_check_after` 2027-04-01, `outcome_check_after` 2029-10-01. Later in the demo: the
funder adds a project report (`question = work`, `work_done`, reported 8 ha) and the partner adds a field item
(`question = work`, `work_done`) with `demo/B-mapped-boundary-5ha.geojson` as its boundary → work check
conflicting (|8 − 5| / 8 = 0.375 > `AREA_TOLERANCE` 0.20) → pin red.

**Compare in the demo:** B, D, E → the ground question reads supported / missing / conflicting.

## Honesty rules for this data

- "Was this mangrove before?" and "What's there now?" come only from real Global Mangrove Watch v4.1.12 and
  Sentinel-2 data (P1). Until those are ingested, the real API shows them as **missing**. Never seed made-up
  satellite numbers.
- Frontend fixtures may carry placeholder satellite values so the UI can be built; they must say
  `"source_version": "fixture-placeholder"` and are never deployed (ADR-038).
- Whatever the real data shows is what the demo shows. Do not move a polygon or change a threshold to make
  the story come out (data-honesty rule, `docs/methods.md` §3.1).
- Demo ground evidence describes site conditions only, never people (`docs/security.md` §6).
