# ADR-050 — Mangrove gain and loss are map layers, toggled from a compact legend

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (built by the orchestrator at the team's request)
- **Related:** DEC-020, ADR-048, ADR-049, ADR-043, API-024, API-025, F-025, US-017, DS-008, TC-027, TC-028

### Context

The extent layer (ADR-048, ADR-049) shows where mangroves are in a year. The team asked for GMW's change
view too: where mangroves were gained and lost against a baseline year, from the GMW v4.1.12 change rasters
already in the project bucket. They also asked for a smaller legend whose rows switch layers on and off,
and for the mangrove layers to stay visible (faded) when zoomed in past the data's resolution, instead of
disappearing.

### Why now

Change since 1985 is the clearest picture of why restoration matters, and the map is the first thing a judge sees.

### Options considered

1. **Show change as numbers only (DS-007 country stats)** — pros: nothing new to serve / cons: not on the map, which is what was asked.
2. **Precompute PNG tile pyramids** — pros: fastest serving / cons: four baselines × eight years × zooms is many files; a rebuild tonight is hours.
3. **Same pattern as API-024: per-year GeoTIFFs rendered to tiles by the API** — pros: reuses the extent renderer, cache and prewarm; both map engines draw it natively / cons: cold tiles take seconds once.

### Decision

- **Data (DS-008):** `data/ingest/gmw_change_tiles.py` reads the GMW change stacks for baselines 1985, 1990, 2000 and 2010 over the Philippines and writes, per baseline and later layer year, a 2-band GeoTIFF (gain, loss; 0/255) with averaged overviews, plus `change_index.json`. Output lives under `/opt/bon/gmw-tiles/change/` with a copy in `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/derived/ph-extent-tiles/change/`.
- **API-025:** `GET /api/v1/layers/gmw-change/tiles` (baselines, years, default baseline 1985, URL template) and `GET /api/v1/layers/gmw-change/tiles/{base}/{year}/{z}/{x}/{y}.png?only=gain|loss`. Same rendering, caching and CORS as API-024.
- **Colors:** gain `--mg-data-gain` #9ED33A; loss `--mg-data-loss` #E4473A, red like GMW's viewer. This is a named exception to ADR-043 (red is for conflict only): loss is a data color on the mangrove layers only, never on a pin, status or record. `brand/BRAND.md` "Map data" records it.
- **Maps:** gain and loss are on by default, baseline 1985, for the chosen map year. The legend is compact: one line per row, each row toggles its layer (pins filter by state), with the year, the baseline and a layer-opacity slider inline; settings keep only the basemap. Tiles are served up to zoom 22 (overzoomed past 30 m); past zoom 13 the mangrove layers fade to 0.3 of their opacity by zoom 16 so the imagery shows through. The site page shows extent plus change since 1985.
- **Meaning:** context only. No status, finding, pin state or number is derived from a change tile (BR-001, BR-003).

### Why this option

It reuses what already works for the extent layer and ships tonight from data we hold.

### Overrides

- **Prior ADRs:** ADR-043 for the loss color only (above). ADR-048's zoom limit of 16 for API-024 (now 22) and its layer controls in map settings (now in the legend).
- **Doc or plan truth:** `docs/api.md` (API-024, API-025), `docs/methods.md` DS-008, `docs/tests.md` (TC-028), `docs/security.md` §4, `brand/BRAND.md`, `data/ingest/README.md`. Updated in the same change.
- **Out of scope:** no change to any EQ or status.

### Consequences

- **Easier:** gain and loss are visible on every map, and every layer can be switched from the legend.
- **Harder or owed:** the host must keep `/opt/bon/gmw-tiles/change` (rebuild from the bucket if replaced); red now appears on the map for loss, so the legend must label it.
- **Follow-up:** prewarm low-zoom change tiles after deploy if cold tiles feel slow.
