# ADR-048 — The mangrove extent layer covers the Philippines and is served as map tiles

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (built by the orchestrator at the team's request)
- **Related:** DEC-018, F-025, US-017, ADR-045, ADR-046, ADR-043, DS-001, API-023, API-024, TC-027

### Context

ADR-045 added a Global Mangrove Watch extent layer for the Manila Bay demo area only, as GeoJSON polygons
(API-023), drawn in brown on the MapLibre map of the site page after a year was picked. The team now uses
Google Maps as the display map (ADR-046), which did not draw that layer, and asked for the mangrove areas to be
visible on every map, for the whole Philippines, in the brand's teal, like GMW's own viewer.

### Why now

The data is already in the project bucket (all GMW v4.1.12 regional archives), and the map is the first
thing a judge sees.

### Options considered

1. **Grow the GeoJSON (API-023) to the whole country** — pros: no new endpoint / cons: tens of megabytes per year; too heavy for the browser and for Google's `Data` layer.
2. **Vector tiles (PMTiles)** — pros: crisp at every zoom / cons: Google Maps cannot draw them without another library; a tile build toolchain we do not have tonight.
3. **Raster map tiles rendered by the API from per-year GeoTIFFs** — pros: both map engines draw XYZ image tiles natively (`ImageMapType` on Google, a raster source on MapLibre); one small endpoint; the data stays a picture of GMW, not a new measurement / cons: a cold low-zoom tile reads many files (seconds the first time), so tiles are cached in memory and warmed after each deploy.

### Decision

- **Data:** `data/ingest/gmw_tiles.py` turns the 93 GMW v4.1.12 tiles that touch the Philippines (116–127°E, 4–22°N) into one single-band GeoTIFF per tile and year for 1985, 1990, …, 2025 (0 = none, 255 = mangrove), tiled and compressed, with *averaged* overviews, plus `index.json`. It runs once on the demo host; the output (73 MB) lives in `/opt/bon/gmw-tiles`, mounted read-only into the API, with a copy in `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/derived/ph-extent-tiles/`.
- **API-024:** `GET /api/v1/layers/gmw-extent/tiles` (years and URL template) and `GET /api/v1/layers/gmw-extent/tiles/{year}/{z}/{x}/{y}.png` (256 px Web Mercator tiles, zoom 0–16). Reprojection uses *max* resampling, so a zoomed-out pixel shows mangrove if any is under it. Public, cached one week by the browser and in memory by the API; `503` when the layer is not installed.
- **Color:** brand Tidal lift (`--mg-tidal-lift`, #4DB3AB), baked into the PNG, with opacity rising with how much of the pixel is mangrove. Never red (red is for conflict only, ADR-043).
- **Maps:** on by default at the latest year on `/`, `/sites` and the site page, on both the Google 2D map and the MapLibre fallback, with an on/off and year choice in map settings and a legend row ("context only, not a status"). The site page opens on the 2D satellite map with the layer; its 3D view (ADR-046) is a toggle and does not show the layer.
- **Meaning:** context only. No status, finding, pin state or number is derived from a tile (BR-001, BR-003). API-023 stays for the Manila Bay polygons; the web app no longer draws it.

### Why this option

It is the only one both map engines draw without extra libraries, and it ships tonight from data we already
hold. The picture stays GMW's classification, credited to GMW.

### Overrides

- **Prior ADRs:** ADR-045, its decision that the map layer covers the Manila Bay demo area and is drawn from API-023 in Root brown. The rest of ADR-045 (site series, national card, honest history) stands.
- **Doc or plan truth:** `docs/prd.md` F-025 and US-017, `idea.md` F-025, `docs/api.md` (API-024), `docs/methods.md` DS-001, `docs/tests.md` (TC-027), `docs/security.md` §4. Updated in the same change.
- **Out of scope:** no change to EQ-002/EQ-003/EQ-014 or to any status.

### Consequences

- **Easier:** the mangrove coast of the whole country is visible on every map, on Google and MapLibre alike.
- **Harder or owed:** the API image now carries rasterio (and `libexpat1`); the host must keep `/opt/bon/gmw-tiles` (rebuild with `gmw_tiles.py` from the bucket if the instance is replaced); a rebuilt layer can be cached by browsers for up to a week.
- **Follow-up:** the Google Maps key must allow the demo domain as a referrer; layer on the 3D view if Google adds tile overlays there.
