# ADR-063 — Satellite is the default basemap

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (orchestrator)
- **Related:** DEC-033, F-008, docs/design.md

### Context

The maps opened on a muted light basemap so the pins carried the color (docs/design.md). Satellite was one
click away in the map settings. The team wants readers to land on the satellite view.

### Why now

The product is about what is on the coast: ponds, water and mangrove read at a glance on imagery, not on a street map.

### Options considered

1. **Keep light by default** — pros: pins stand out most / cons: the coast itself is hidden until the reader finds the setting.
2. **Satellite by default, light and dark still in the settings** — pros: the evidence context is visible at once / cons: pins sit on busier imagery.

### Decision

- `DEFAULT_BASEMAP` is `satellite` (Google hybrid; EOxCloudless 2016 on the MapLibre fallback).
- The saved map preferences move to a new key (`mangrove-map-prefs-v2`), so earlier visitors, whose saved "light" was only the old default, also get satellite once. Their other map settings reset to defaults.

### Why this option

The reader should see the place before the symbols; the pins already have lifted colors for dark and satellite maps.

### Overrides

- **Prior docs:** docs/design.md map section, "Basemap muted (light, low saturation)" — updated in this change.

### Consequences

- **Easier:** the coast and ponds are visible on first load.
- **Harder or owed:** a one-time reset of saved map settings for returning visitors.
