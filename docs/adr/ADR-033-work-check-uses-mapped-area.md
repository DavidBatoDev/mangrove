# ADR-033 — "Did the work happen?" is checked against a mapped area, not satellite pixels

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-003, F-010, EQ-009, EQ-010

### Context

The demo's conflict is "the NGO says 8 hectares, the satellite shows 5." Months after planting, Sentinel-2
at 10 m and its scene classification at 20 m cannot see seedlings (ADR-006, ADR-023). A satellite area of
5 ha in that scene would be a made-up reading.

### Why now

The conflict flag is a Must feature. Building it on a measurement the sensor cannot make would fail the
demo's own honesty rule.

### Options considered

1. **Compare the reported area with a Sentinel-2 vegetated area** — pros: sounds like the one-line demo / cons: the number would not mean what we say it means.
2. **Compare the reported area with a partner's GPS-mapped boundary** — pros: both numbers are things a person actually produced, and the gap is checkable / cons: the demo needs a mapped polygon, not a satellite trick.
3. **Show the disagreement as prose with no measurement** — pros: cannot be wrong / cons: drops the flag the demo exists to show.

### Decision

The implementation check compares the reported hectares with the partner's mapped hectares (EQ-009, EQ-010).
Sentinel-2 vegetated area (EQ-008) is used only for the outcome check, and only once the record's outcome
date has passed. The demo copy says "mapped area", not "the satellite shows 5 hectares", unless a site is
old enough that canopy is visible and we have computed it.

### Why this option

The product's claim is that it does not invent a measurement. Option 1 invents one. Option 2 is a real
disagreement between two sources, which is what the red pin is for.

### Overrides

- **Prior ADRs:** applies ADR-006 to this specific demo beat.
- **Doc or plan truth:** `docs/methods.md` EQ-009 and EQ-012. `docs/prd.md` §7 records the open question this closes for the demo script.
- **Out of scope:** Does not claim the mapped polygon was surveyed to a stated accuracy. GPS error stays in the evidence limitation.

### Consequences

- **Easier:** the conflict fixture is two numbers we control, and the test does not need a live satellite.
- **Harder or owed:** the pitch must not say the satellite counted the seedlings.
- **Follow-up:** none
