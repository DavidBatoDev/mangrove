# ADR-043 — Google Maps for visualization only; evidence stays with GMW and Sentinel-2

- **Date:** 2026-10-04
- **Status:** Proposed
- **Owners:** David (frontend, P0); for acceptance by the team at the P0/P1 integration
- **Related:** DEC-013, `docs/prd.md` §7 (basemap), `docs/design.md` §4 (map), ADR-033, ADR-038, ADR-042

### Context

`docs/prd.md` §7 sets the basemap to EOxCloudless 2016 (CC BY 4.0), shown with MapLibre GL JS. The team wants a
sharper, current-looking backdrop and a 3D moment in the demo: flying into a selected site, and a slow orbit at
the top of a public record. Google's imagery is current and its 3D Maps in the Maps JavaScript API render
draped polygons over that imagery. Google's terms restrict analysing, tracing or storing its content.

### Why now

The demo is judged on the map. The 3D fly-in has to be built and tested in the build window, with a fallback
in place before the recording.

### Options considered

1. **Keep MapLibre + EOxCloudless only** — pros: free, no key, no new terms / cons: 2016 imagery, no 3D.
2. **Google Maps as the display layer, MapLibre as the fallback** — pros: current imagery and 3D; the demo never depends on Google / cons: a billed key, Google's terms, two map engines to keep in step.
3. **Replace MapLibre with Google Maps everywhere** — pros: one engine / cons: no working fallback without Google; a rewrite of every map screen.
4. **Map Tiles API + CesiumJS** — pros: most control / cons: the most integration work.

### Decision

Option 2. When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set and the browser has WebGL, the map screens use the
Google Maps JavaScript API (2D, hybrid satellite) and 3D Maps (`maps3d`) for the site fly-in (dossier and the
selected-pin card) and the record-page orbit. Otherwise, or if Google fails to load or rejects the key, the
existing MapLibre views render.

Google is **display only**:

- No analysis, measurement or tracing from Google imagery. Areas stay EQ-001 / EQ-010 on our own geometry.
- No screenshot or tile from Google is stored, or used as an evidence item.
- Every Google view carries the line "Imagery: Google. Evidence: GMW and Sentinel-2." and Google's own
  attribution stays visible, including in the demo video.
- The before/after (promise vs reality) stays on GMW and Sentinel-2. Google's imagery is the present only.
- 3D boundaries use the same state tokens as pins and status chips (`brand/BRAND.md` §6). Red is for conflict only.

### Why this option

It gives the demo current imagery and one strong 3D moment, without making the demo depend on a key, the
network or a GPU. The display-only rule keeps every number and status traceable to sources we can cite.

### Overrides

- **Prior ADRs:** none.
- **Doc or plan truth:** `docs/prd.md` §7 "Basemap tiles for MapLibre: EOxCloudless 2016" becomes the fallback
  basemap; Google Maps is the primary display when configured. `docs/design.md` §4 "Basemap muted (light…)"
  applies to the fallback.
- **Out of scope:** does not change any evidence source, equation, threshold, status rule or API contract.

### Consequences

- **Easier:** a current-looking, 3D map for the demo and the public record link.
- **Harder or owed:** a Google Cloud project with billing, a key restricted to our referrers and to the Maps
  JavaScript API, and a budget alert (prep checklist). `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and the optional
  `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` join the env list. Check the 3D Maps SKU pricing. Two map engines must stay
  in step (shared pin element, shared tokens). Coastal sites may show flat imagery in 3D, not buildings; site
  choice stays evidence-driven.
- **Follow-up:** update `docs/prd.md` §7 and `docs/design.md` §4 when accepted; record the demo video with 3D
  loaded beforehand.
