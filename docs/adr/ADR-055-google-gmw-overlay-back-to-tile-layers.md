# ADR-055 — The Google map goes back to per-zoom GMW tile layers

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (orchestrator)
- **Related:** DEC-025, ADR-054, ADR-053

### Context

ADR-054's fixed-tile overlay on Google Maps repositioned every tile on each frame and felt laggy to the team.
It was reverted within minutes of deploying.

### Why now

The demo map must feel smooth.

### Options considered

1. **Keep the fixed overlay and optimise it** — pros: no tile swaps / cons: untested under the demo's conditions; more risk tonight.
2. **Go back to Google's own tile layers (`ImageMapType`) on the static tiles of ADR-053** — pros: Google's tuned tile pipeline; known to work / cons: a short swap from enlarged to sharp tiles on zoom.

### Decision

Option 2. Google Maps draws the extent, gain and loss layers as `ImageMapType` tile layers again, from the static tile
files (ADR-053). The `coverage` field in the API-024 info stays (unused by the web app). MapLibre keeps its raster
sources capped at zoom 10 (it enlarges them itself).

### Why this option

It is the known-good path; smoothness matters more than avoiding the brief swap.

### Overrides

- **Prior ADRs:** ADR-054 for the Google map.

### Consequences

- **Easier:** Google handles tile loading and animation.
- **Harder or owed:** on zoom, tiles show enlarged for a moment before the sharp ones load.
