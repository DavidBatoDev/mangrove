# ADR-054 — The map draws GMW layers from one fixed tile level, scaled, not reloaded per zoom

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (built by the orchestrator at the team's request)
- **Related:** DEC-024, ADR-053, ADR-050, API-024, API-025

### Context

With static tiles (ADR-053), Google Maps still requested a new tile set at every zoom step and showed the old
tiles enlarged and blurred until the new ones arrived. The team asked for one set of tiles that is not swapped
when zooming.

### Why now

The blurry swap is visible on every zoom in the demo.

### Options considered

1. **Keep per-zoom tiles** — pros: sharpest detail / cons: a wait and a blurry swap on every zoom.
2. **One fixed zoom-10 tile set, placed once and scaled with the map** — pros: no requests or swaps while zooming; about 150 m pixels / cons: blocky when zoomed far in; all data tiles load at country view.

### Decision

- The extent info (API-024) lists `coverage`: the zoom-10 tiles over the Philippines that touch GMW data.
- On Google Maps (`web/lib/fixed-tile-overlay.ts`), the extent, gain and loss layers are an overlay of only those zoom-10 tiles, created as they come into view and scaled with the map, drawn with crisp pixels. On MapLibre the raster sources stop at zoom 10, and MapLibre enlarges them itself.
- Tiles are the static files of ADR-053.

### Why this option

It is what the team asked for: the layer stays put while zooming.

### Overrides

- **Prior ADRs:** ADR-048 and ADR-050's per-zoom `ImageMapType` overlays on Google.
- **Doc or plan truth:** none beyond `docs/api.md` (coverage field). Updated in the same change.

### Consequences

- **Easier:** zooming never waits for the mangrove layers.
- **Harder or owed:** detail is limited to zoom-10 pixels (about 150 m at the equator).
