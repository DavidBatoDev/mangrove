# ADR-052 — GMW map tiles are rendered once, kept on disk, and enlarged past zoom 12

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (built by the orchestrator at the team's request)
- **Related:** DEC-022, ADR-048, ADR-050, API-024, API-025, TC-029

### Context

API-024 and API-025 rendered every tile on request from up to 93 GeoTIFFs and kept it only in memory. On the
2-CPU demo host, gain and loss tripled the requests per map square; renders queued for over 90 s, Google Maps
showed blurry enlarged tiles while waiting, and every deploy emptied the cache. Global Mangrove Watch's viewer is
fast because its tiles are made ahead of time and served as files.

### Why now

The map was unusable when zoomed in with the change layer on, hours before the demo.

### Options considered

1. **Bigger instance** — pros: no code / cons: still renders per request; cost; resizing tonight is risky.
2. **Static tile pyramid built offline, served by Caddy** — pros: GMW's approach / cons: every year × baseline × zoom ahead of time is hours on this host.
3. **Render once into a disk cache, prerender the default view, enlarge above zoom 12** — pros: GMW-like speed for what the demo shows, other years fill in on first view, cache survives deploys / cons: the first view of a rarely used year is still slow once.

### Decision

- Tiles at zoom ≤ 12 are written to `GMW_TILE_CACHE` (`/opt/bon/gmw-tile-cache` on the host, owned by the API user) after their first render and read from there afterwards. The cache key includes the layer's file list and the style, so a rebuilt layer is never served stale.
- Above zoom 12 a tile is cut from its zoom-12 parent and enlarged (nearest neighbour). GMW's 30 m pixels hold no more detail there.
- After each deploy, `infra/prewarm-tiles.sh` runs `python -m app.gmw_prerender` in the API container at the lowest CPU priority: zoom 4–12, the latest extent year and gain/loss since the default baseline, only tiles that touch a GMW file. Tiles already on disk are skipped.
- At most two renders run at once in the API, and health/info routes run on the event loop so they never wait behind renders.

### Why this option

It gives GMW's "serve a file" speed for the view everyone sees, tonight, on the host we have.

### Overrides

- **Prior ADRs:** ADR-048's in-memory cache and its zoom 4–8 prewarm through Caddy.
- **Doc or plan truth:** `docs/api.md` API-024/API-025 notes, `docs/tests.md` (TC-029). Updated in the same change.
- **Out of scope:** no change to tile content, colors or any status.

### Consequences

- **Easier:** warm tiles return in milliseconds and survive deploys.
- **Harder or owed:** the host keeps a cache directory (delete it to force re-render); disk use grows with the years viewed.
- **Follow-up:** prerender other years if the demo uses them.
