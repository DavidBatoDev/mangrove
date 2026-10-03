---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-04
doc: design
owns: routes and URLs · component inventory · visual states · pin colors · accessibility target · pointers to the brand kit for tokens, type and voice
---

# Design — AIDE-M

> **Purpose:** how each screen in [`prd.md`](prd.md) §5.1 looks and where it lives.
> Written from [`design-brief.md`](design-brief.md). Why there is a brand at all: ADR-043.
> Tokens, type, components and voice live in [`brand/`](../brand/BRAND.md); this file points to them and does not copy them.

## 1. Sources

| Concern | Home |
|---------|------|
| Tokens (color, type, space, motion) | [`brand/tokens.css`](../brand/tokens.css) (also `brand/tokens.json`) |
| Components (CSS classes) | [`brand/mangrove.css`](../brand/mangrove.css); reference page [`brand/starter.html`](../brand/starter.html) |
| Voice, keywords, banned copy | [`brand/BRAND.md`](../brand/BRAND.md) §2–§3 |
| Status, confidence and pin encoding | [`brand/BRAND.md`](../brand/BRAND.md) §6 |
| Page layout from the deck | [`brand/WEB.md`](../brand/WEB.md); slide images in `brand/slides/` |
| Figma deck | `https://www.figma.com/design/tk6Ja5pTo6eFjC25uHHawB/Mangrove` |

Next.js: copy the whole `brand/` folder to `web/public/brand/`, import `/brand/mangrove.css` once in the root layout, and load the three fonts with `next/font/google` (`Newsreader`, `Schibsted_Grotesk`, `IBM_Plex_Mono`). Icons: `lucide-react` at `strokeWidth={1.75}`.

## 2. Routes

Auth per route follows [`security.md`](security.md) §4; this table states the expectation only.

| Screen (PRD §5.1) | Route | Auth | Ground (WEB.md §2) |
|-------------------|-------|------|--------------------|
| Public map | `/` | public | full-bleed MapLibre map; Night Roots intro band above it; a toggle for sites with a commitment, sites without one, or both. A guided tour (react-joyride) runs once per browser on first visit, remembered in localStorage (`aide-m-home-tour-v1`); a **Help** button in the header, shown on `/` only, replays it. Its last stop opens the Ask AIDE-M panel |
| Record | `/records/{id}` | public | plain; the partner's terms above the Waterline, the two checks below (T07). Early: field inputs and the line "not yet observable". After the outcome date: partner report and EQ-012 |
| Sign in | `/sign-in` | public | plain, centered card is allowed here only |
| Sites | `/sites` | public | plain; map + list. Each row shows whether a funder has committed |
| Site dossier | `/sites/{id}` | public | plain; the three questions first, then the partner's benefit text, then every evidence item. GMW is the history row |
| Compare | `/compare?sites=` | public | plain; root profile (BRAND.md §6), then the columns table |
| Propose | `/sites/{id}/propose` | signed-in partner | plain; benefit text, timeline, milestones |
| Commit | `/sites/{id}/lock` | signed-in funder, and only when a proposal exists | plain; the partner's terms, then the irreversible confirmation. The funder does not type the benefit |
| Submit evidence | `/evidence/new` | signed-in partner (funder for a project report) | plain; form |

## 3. Principles (from the brief, kept)

- **Show, don't explain.** Each screen is built on one visual device from `brand/BRAND.md` §0 and passes the glance test. Compare is a table (`mg-table`) plus the root profile; the dossier is three rows of question · mark · finding · sources, then the partner's benefit text; the record is the Waterline split with the two checks as chips. Words are labels. The partner's benefit text, limitations, the disclaimer and errors are the prose.
- **The status is the interface.** Finding, status word and source count are visible without opening a detail view (`mg-chip--*` + text). Color is never the only carrier.
- **A conflict is the loudest thing on the page.** `--mg-conflict` is used only for `pin_state = conflict` and a conflicting status (BR-004).
- **Demo data cannot be mistaken for a real project.** `mg-demo` on every seeded site, record, organization and pin tooltip (BR-006).
- **The record reads as a document, not a dashboard.** The partner's terms, then the evidence, then the two checks. No chart that is not a number from [`methods.md`](methods.md). Agreement is the word "supported" with the finding. The page does not say the project was successful.

## 4. Map (MapLibre GL JS)

| Pin state (BR-004) | Fill | Outline | Label |
|--------------------|------|---------|-------|
| `conflict` | `--mg-pin-conflict` | Mist, 2px | "Sources disagree" |
| `awaiting` | Mist | `--mg-pin-awaiting`, 2px dashed | "Awaiting evidence" |
| `on_track` | `--mg-pin-on-track` | Mist, 2px | "On track" |

Sites with no commitment are polygons, not record pins: Tidal 2px outline, Tidal 12% fill; selected: Canopy 3px. A pin exists only for a commitment, and it opens the record. Basemap is satellite by default (ADR-063); light and dark stay in the map settings. Pins and polygons keep their colors on it. Zoom runs from the Philippines to a site without a mode switch. A pin and a polygon are keyboard-focusable; Enter opens the record or the site. The toggle does not use red.

## 5. Components per screen

| Pattern | Class / element | Used on |
|---------|-----------------|---------|
| Comparison (sites × questions) | `mg-table` with a `mg-chip--*` in every cell, words only in headers | compare |
| Question or check status | `mg-chip--supported / --conflicting / --missing / --too-early` + finding + source count | dossier, compare, record |
| Satellite line before the outcome date | `mg-chip--too-early` + the words "not yet observable". Not red. Not a fail | record |
| Number with confidence | value rendered per methods §2 + `mg-conf--high / --medium / --low` + `EQ-###` | dossier, record |
| Evidence item | `mg-evidence` (source · observed date meta, limitation in the body) | dossier, record |
| Program card (API-026) | `ProgramCard`: "₱1 billion · DENR · Post-Yolanda MBFDP" title, quoted figures as stat tiles (EQ-017 · Low · as published, source link, the exact sentence on hover), need vs targets vs reported as an `mg-table` with bars on one scale, the line "The program verified planting, not outcomes.", and the §11 not-found items. Never red | record page of the real records the program card lists (the MBFDP records, Naungan and Bungtod; not Paraiso, which Japan funded, nor Cancabato Bay; ADR-059), above the promise; a compact `ProgramCallout` on the public map panel linking to them |
| Waterline | `mg-waterline` once per section | record, dossier |
| Demo data label | `mg-demo` | everywhere seeded data appears |
| Record disclaimer | `mg-disclaimer` | record page footer |
| Form error, live source failed | `mg-alert` (caution, never red) | lock, submit evidence, dossier refresh |
| Buttons | `mg-btn--primary / --secondary`, verb + object | all |

## 6. States

Every screen in PRD §5.1 has loading, empty and error states. Copy follows the tone table in `brand/BRAND.md` §3:

| State | Treatment |
|-------|-----------|
| Loading | Skeleton hairlines in Tideline; no spinners on the map (pins fade in) |
| Empty | Short inviting line + one action ("No evidence yet. Field partners can add the first item.") |
| Error | `mg-alert` with what failed and what still works |
| Live source failed (Sentinel-2) | `mg-alert`: "Sentinel-2 didn't respond. Showing the stored snapshot from {date}." |
| Not yet observable | `mg-chip--too-early` + "not yet observable". Shown on an early milestone and on the outcome check before its date. Does not turn the pin red |
| Conflict | `mg-chip--conflicting` with both values and their sources side by side. The funder notice is a separate line for the signed-in funder, not a second red treatment |
| Commit confirmation | The partner's benefit text, then a plain statement that the record can never be edited or deleted; primary button "Commit to this proposal" |

## 7. Accessibility

Target: WCAG 2.2 AA for the demo screens, not claimed from an automated check alone. Text status beside every color, keyboard reach from a pin to its record, focus ring 2px Tidal with 2px offset, contrast checked on a projector before the pitch.
