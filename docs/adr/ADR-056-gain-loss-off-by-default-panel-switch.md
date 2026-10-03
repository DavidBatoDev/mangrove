# ADR-056 — Gain and loss are off by default, switched on from the side panel

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (orchestrator)
- **Related:** DEC-026, ADR-050, API-025, F-025

### Context

ADR-050 showed GMW gain and loss on every map by default, toggled from the legend. The team wants the map to open
on the extent only, with one switch in the side panel to show change.

### Why now

The default map reads more clearly for the demo with less on it.

### Options considered

1. **Keep legend toggles, default off** — pros: no new control / cons: the legend stays long; change is hidden in a corner.
2. **One switch on the national card in the side panel, next to the gain/loss chart** — pros: the switch sits beside the numbers it maps; the legend only explains / cons: only the map pages with that card offer it.

### Decision

- Gain and loss are off by default. One switch on the national card (`/` and `/sites`), "Show gain and loss since 1985 on the map", turns both on, against the default baseline (1985) for the map year. The choice is kept in the viewer's map preferences.
- The legend no longer toggles gain, loss or the baseline; when change is on it shows the Gain and Loss keys.
- The site page shows extent only.

### Why this option

The switch lives next to the chart it maps, and the default map is simpler.

### Overrides

- **Prior ADRs:** ADR-050's default (on), legend toggles and baseline picker.

### Consequences

- **Easier:** a calmer default map; one clear control.
- **Harder or owed:** other baselines (1990, 2000, 2010) are no longer selectable in the UI; API-025 still serves them.
