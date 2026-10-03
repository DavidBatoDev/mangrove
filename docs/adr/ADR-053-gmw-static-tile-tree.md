# ADR-053 — GMW map tiles are a static tile tree served by Caddy, as on Global Mangrove Watch

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (built by the orchestrator at the team's request)
- **Related:** DEC-023, ADR-052, ADR-048, ADR-050, API-024, API-025, TC-029

### Context

ADR-052 kept rendered tiles on disk, but every tile request still went through Python and its thread limits.
The team still found the map slow and asked to do it the way Global Mangrove Watch does: pre-rendered tiles
served as plain files.

### Why now

The map is the first screen of the demo.

### Options considered

1. **Keep ADR-052 (API reads its disk cache)** — pros: done / cons: Python on every tile; slow under load on 2 CPUs.
2. **Upload a tile pyramid to S3 behind CloudFront** — pros: a real CDN / cons: new distribution, DNS and IAM tonight; the full pyramid takes hours to render.
3. **The disk cache laid out as the public URL, served by Caddy as files; the API only fills gaps** — pros: GMW's model on the host we have; misses still work / cons: the first view of an unrendered tile is still a render.

### Decision

- Tile URLs are `/tiles/gmw/<style>/extent/<year>/<z>/<x>/<y>.png` and `/tiles/gmw/<style>/change/<base>/<year>/<gain|loss>/<z>/<x>/<y>.png`. The tile tree on disk (`/opt/bon/gmw-tile-cache`) has the same layout.
- Caddy serves a stored tile from disk with `Cache-Control: public, max-age=31536000, immutable` and CORS `*`. A missing tile is rewritten to API-024/API-025, which renders it once and stores it, including tiles above zoom 12 (enlarged from the zoom-12 parent).
- `app.gmw_prerender` fills the tree after deploy: the default view to zoom 12, then every other year and baseline to zoom 10.
- The `<style>` segment versions the look; a rebuilt layer needs its subtree deleted. API-024/API-025 URLs stay valid.

### Why this option

It is how GMW serves tiles, and it ships tonight without new AWS resources.

### Overrides

- **Prior ADRs:** ADR-052's cache key (file-list hash) and its API-only serving path.
- **Doc or plan truth:** `docs/api.md` caching note. Updated in the same change.
- **Out of scope:** tile content and colors.

### Consequences

- **Easier:** stored tiles are served at file-server speed and cached by browsers for a year.
- **Harder or owed:** deleting the tree is how a rebuilt layer is refreshed; CloudFront in front is the next step if the host is still slow.
