# ADR-042 — Sentinel-2 comes from Earth Search COGs, not the Copernicus Statistical API

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-012, DS-002, EQ-005, EQ-006, EQ-007, F-003, API-007, US-005, TC-005

### Context

"What's there now?" reads Sentinel-2 L2A scene classification (SCL) over each site polygon. The plan
(ADR-030, `docs/methods.md` DS-002, `docs/system-design.md` §4–§5) used the Copernicus Data Space
Statistical API, which needs a CDSE account and an OAuth client. On 2026-10-04 the team could not register
a CDSE account: the registration form's captcha did not complete, so no client id or secret exists. The
Copernicus services themselves were up.

The same Sentinel-2 L2A products are published as Cloud-Optimized GeoTIFFs (COGs) on public AWS S3 and
indexed by Element 84's Earth Search STAC API, with no account. Checked on 2026-10-04:
`https://earth-search.aws.element84.com/v1`, collection `sentinel-2-c1-l2a` (Sentinel-2 Collection 1 L2A),
returned a scene over site B acquired 2026-10-03 (processing baseline 05.13) with an `scl` asset at 20 m
and `red` / `nir` bands at 10 m.

### Why now

P1 builds the Sentinel-2 adapter and the refresh endpoint (API-007). Without credentials the planned
adapter cannot run, and "What's there now?" would stay missing in the demo.

### Options considered

1. **Keep the Statistical API; another teammate registers** — pros: no doc or method change; Copernicus computes the histograms / cons: depends on a registration nobody has completed yet, inside a 12-hour window; the same captcha may fail again.
2. **Read Sentinel-2 L2A COGs found through Earth Search** — pros: no account, no secret, no quota; the same ESA L2A product and SCL classes; pixel counts are fully under our control and auditable / cons: we compute the per-polygon counts ourselves (STAC search plus windowed COG reads), more P1 code; a new dependency to read rasters; Element 84 is a third-party distributor.
3. **Microsoft Planetary Computer** — pros: also no account for reads / cons: needs a SAS token step per asset; no advantage over option 2 for this region.
4. **Drop Sentinel-2 for the demo** — pros: no work / cons: "What's there now?" is always missing; the three-question story loses a source.

### Decision

DS-002 becomes Sentinel-2 L2A Collection 1 COGs (`scl`, `red` = B04, `nir` = B08), discovered with the Earth
Search STAC API and read with HTTP range requests from the public bucket. The Sentinel-2 adapter:

1. searches `sentinel-2-c1-l2a` for scenes intersecting the site polygon in `[t − S2_WINDOW_DAYS, t]`;
2. for each candidate scene, reads the SCL pixels whose centre lies inside the polygon (one MGRS tile that
   contains the whole polygon);
3. computes EQ-005 per scene and keeps the scene with the highest `f_valid` (the per-polygon equivalent of
   the Statistical API's `leastCC` mosaic), then EQ-006 (and EQ-007 for context) on that scene;
4. stores the STAC item id, its `self` link as `provenance_url`, the processing baseline as
   `source_version`, and the counts in `raw`.

No Copernicus credentials are needed. `CDSE_*` environment names stay in `.env.example` unused, so the
Statistical API can come back if an account is obtained. The equations, thresholds and confidences do not
change.

### Why this option

It removes the only blocker (an account) without changing what is measured: the same ESA L2A product and
SCL codes feed the same equations. Counting pixels ourselves is more code but no less defensible, and every
count is reproducible from a public URL.

### Overrides

- **Prior ADRs:** ADR-030, only where it names the Copernicus Statistical API as the Sentinel-2 access path. The three-source decision stands.
- **Doc or plan truth:** `docs/methods.md` §3 EQ-005 (method text) and §4 DS-002; `docs/system-design.md` §1 context diagram, §3 data flow, §4 Sentinel-2 row, §5 integration row. Updated in the same change.
- **Out of scope:** EQ-002/003 (GMW), thresholds in `docs/methods.md` §3.1, API-007's contract (path, roles, 502 `UPSTREAM_UNAVAILABLE` on source failure).

### Consequences

- **Easier:** no secret to manage for Sentinel-2 (T-007's Copernicus part no longer applies); no request quota; works from the EC2 host and from laptops alike.
- **Harder or owed:** the adapter needs a raster reader (e.g. `rasterio`) and a STAC search; reads cross regions (data in `us-west-2`, host in `ap-southeast-1`), so a refresh takes seconds, not milliseconds. Tests stub the STAC search and the COG read.
- **Follow-up:** text that still says "Copernicus" for the live source, meaning the refresh's upstream, should read "the Sentinel-2 source": `docs/prd.md` US-005 and §7 dependencies, `docs/tests.md` TC-005, `docs/security.md` §3/§5/§7 secret lists, `docs/api.md` §4–§5 notes, `AGENTS.md` stack facts. The attribution line ("Contains modified Copernicus Sentinel data <year>") is unchanged; Element 84 is credited as distributor.
