---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-03
doc: design-brief
owns: the brief a teammate uses to write docs/design.md · not routes, tokens, or components (those belong to design.md once it exists)
---

# Design brief — Mangrove

> **Purpose:** what the design doc has to decide, and the constraints it cannot reopen.
> The teammate who owns design writes `docs/design.md` from this. This file is not that doc.
> Traces back to: [`prd.md`](prd.md) §5, [`security.md`](security.md) §6, ADR-032, ADR-033, ADR-034.

There is no brand seed. Do not invent a brand story. The product is a public record.

## 1. What you own, and what you do not

`docs/design.md` owns routes and URLs, the component inventory, tokens, visual states, voice, and
accessibility. [`prd.md`](prd.md) §5.1 already lists the screens and §5.2 already lists the flow. Do not
add or drop a screen. Do not restate the user stories.

Auth expectations, so the route table has somewhere to point: public for the map, a record, and compare;
signed-in funder for lock and Sentinel-2 refresh; signed-in partner for field evidence. The model is
[`security.md`](security.md) §4. The design doc states the expectation per route and does not redefine it.

## 2. Principles

Write these as choices, then keep or replace them in `design.md` with the reason:

- **The status is the interface.** A finding, a status word, and the source count are visible without
  opening a detail view. Color is extra, never the only carrier.
- **A conflict is the loudest thing on the page.** Red is reserved for `pin_state = conflict` and for a
  conflicting status (BR-004). No other element uses that red.
- **Demo data cannot be mistaken for a real project.** A "Demo data" label is on every site, record, and
  organization that is seeded (BR-006), including on the map pin.
- **The record reads as a document, not a dashboard.** One promise, then the evidence, then the two checks.
  No charts that are not a number from [`methods.md`](methods.md).

## 3. Screens to cover

Use the inventory in [`prd.md`](prd.md) §5.1. Every screen there needs a route in `design.md` §2, and every
pattern needs an empty, loading, and error state. Suggested paths, which you may change if you record why:

| Screen | Suggested route |
|--------|-----------------|
| Public map | `/` |
| Record | `/records/{id}` |
| Sign in | `/sign-in` |
| Candidate sites | `/sites` |
| Site dossier | `/sites/{id}` |
| Compare | `/compare?sites=` |
| Lock promise | `/sites/{id}/lock` |
| Submit evidence | `/evidence/new` |

## 4. Copy that must not ship

These come from [`context.md`](../context.md) §5 and from ADR-033 and ADR-034. A button label is where an
overclaim ships first.

- Do not write "certified", "verified restoration", "approved", "investment-ready", or "will succeed".
- Do not write a score, a percent chance, or "impact score".
- Do not write "the satellite shows 5 hectares" for a recent planting. The work-check comparison is the
  reported area against the mapped area (ADR-033).
- Do not write "tamper-proof" or "impossible to alter". The honest line is that the record cannot be edited
  through Mangrove and that any change breaks the published hash (ADR-034).
- Do not write "80–90% of projects fail" or "nobody monitors survival".
- Prefer "sources agree", "sources disagree", and "no evidence yet" over "good site" and "bad site".
- Every record page shows: "This record is not a certification of restoration success or approval of funding."

## 5. Map

MapLibre GL JS, decided in [`system-design.md`](system-design.md). Polygons for candidate sites, one pin per
published record. The pin has three states (BR-004): conflict (red), awaiting evidence, on track. You choose
the non-red colors and the pin shape. Zoom runs from the Philippines to a site without a mode switch.

## 6. Accessibility

Set a target in `design.md` and do not claim conformance from an automated check. Minimum for the demo:
text status as well as color, keyboard reach to a pin's record, and contrast that survives a projector.

## 7. When you are done

`docs/design.md` exists, follows `fmd/templates/design.md` with its §0 stripped, and every screen in the PRD
has a route. Then add a row to [`index.md`](index.md) §0 and §1. Until that file exists, this brief is the
pointer, not the design.
