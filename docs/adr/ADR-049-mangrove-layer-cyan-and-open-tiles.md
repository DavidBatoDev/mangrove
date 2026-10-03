# ADR-049 — The mangrove extent layer is GMW-style cyan, and its tiles are readable from any origin

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (built by the orchestrator at the team's request)
- **Related:** DEC-019, ADR-048, ADR-043, API-024, F-025

### Context

ADR-048 drew the Philippines mangrove extent in brand Tidal lift (#4DB3AB) at partial opacity. On the
satellite map the team found it too faint to see next to Global Mangrove Watch's own viewer, and asked for
cyan. The team also looked at the map in fixtures mode (local dev), where ADR-048 hid the layer because there
is no API to serve tiles, and read that as "no tiles".

### Why now

The map is the first thing judges see, and the team is checking it now.

### Options considered

1. **Keep Tidal lift, raise opacity** — pros: no new color / cons: still reads as a UI accent, and is low-contrast on satellite and on Google's light water.
2. **A dedicated data color, GMW-style cyan, near-opaque, with fringes grown by one pixel when zoomed out** — pros: matches what funders know from GMW; reads on satellite / cons: one more token, reserved for this layer.

For fixtures mode: (a) keep the layer hidden / (b) read the real tiles from the live API, which needs CORS on API-024.

### Decision

- New brand token `--mg-data-mangrove` (#1FCFCF) in `brand/tokens.css`, used **only** for the mangrove extent layer (tiles and legend swatch); never a status, pin or accent. Red stays conflict-only.
- Tiles: opacity 215–250 of 255; at zoom ≤ 10 each mangrove pixel is grown by one screen pixel so thin coastal fringes read. A `style` version is part of the tile URL (`?s=cyan-1`), so browsers do not keep the old look from cache.
- API-024 responses carry `Access-Control-Allow-Origin: *` (public map data). The web app reads tiles from its own origin when deployed, and from the live API in fixtures mode or local dev (`NEXT_PUBLIC_GMW_TILES_ORIGIN` overrides). The tiles are real GMW data, so this does not break ADR-038's rule that fixtures never ship: no fixture is involved.

### Why this option

It is the look the team asked for and the one funders already recognize from GMW, and it removes the
"no tiles" surprise when building locally.

### Overrides

- **Prior ADRs:** ADR-048, its color (brand Tidal lift) and its "hidden when not installed" behavior in fixtures mode.
- **Doc or plan truth:** `docs/api.md` API-024, `docs/security.md` §4 row for API-024. Updated in the same change.
- **Out of scope:** data, years, endpoints and zoom range are unchanged.

### Consequences

- **Easier:** the layer reads on every basemap and in every mode.
- **Harder or owed:** a dev machine needs the live API reachable to see the layer in fixtures mode.
- **Follow-up:** none.
