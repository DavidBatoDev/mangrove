# AIDE-M Brand

> Single source of truth for how the product looks, sounds and names things.
> If you are an AI agent and someone said **"use our branding"**, read this whole file, then `brand/tokens.css`, then `brand/IMAGERY.md` if you are making images. Building screens? Then `brand/WEB.md`.
> **AIDE-M** is the public product name (`docs/ledger.md` §1, ADR-051). It stands for *Accountability In Delivery & Evidence · Mangrove*; that line appears only in small type under the wordmark and at a document's first mention. "Mangrove" in this kit otherwise means the ecosystem. Product behaviour lives in `docs/prd.md`; when this file and the PRD disagree about what the product does, the PRD wins and this file gets fixed. Why the product has a brand at all: ADR-043.

---

## 0. Show, don't explain (the rule above the others)

**The brand speaks through color, shape, texture, icons, marks and layout, not through sentences about the brand.** A screen, slide or section must make sense in one glance. If it needs a paragraph to be understood, redesign it.

**The glance test** (run it on everything before you ship):

1. Blur the screenshot (or squint). Can you still tell what it is about, what matters most, and what is in conflict? If not, the visuals aren't doing the work.
2. Count the words. Headline ≤ 8. Any other block ≤ 20. A slide ≤ 25 words of body. Product screens use labels, not paragraphs.
3. Cover the text. The colors, marks and layout alone should still say "agree / disagree / missing", "promise above, evidence below", "this one is different".

**Pick the visual device first, write the words last.** Every section, slide and screen is built on one of these devices. Name it before you design (the Figma frame names already do: `G04 · Color · Band stack`).

| Device | What it is | Use it for |
|---|---|---|
| **Drench** | One full ground (texture or brand color), one big line | Covers, section openers, closing, CTA |
| **Band stack** | Stacked full-width color bands with tiny mono labels | Palettes, ranges, the waterline split, timelines by period |
| **Specimen** | One thing, big, with 2–3 tiny labels | The mark, a typeface, one status, one number |
| **Table / matrix** | Rows × columns, a mark in every cell, words only in headers | **Any comparison**: sites, questions, sources, options |
| **Root profile** | Our signature compare: one trunk per site, one root per question | Comparing candidate sites (§6) |
| **Rail** | Numbered dots on one line, a word under each | Steps, lifecycles, the keywords (G06) |
| **Contact sheet** | Even grid of images or icons, no captions | Icons, photos, field evidence |
| **Motif wall** | The texture or pattern repeated, almost no words | Moods, dividers, "this is the brand" moments |
| **Type field** | The words *are* the visual: 2–3 huge words, one accent | Voice, a claim, a big number |
| **Duel** | Two things side by side, same scale | Reported vs mapped, before vs after, do vs don't |
| **Surface** | The real UI in use | "How it works", product slides |

**Don't explain → show:**

| Instead of writing… | Show… |
|---|---|
| "Site E's sources disagree about whether it is open for restoration." | A compare table: Site E's ground cell has a red ◆ and "Active fishpond". |
| "Supported means the sources agree." | A ● Canopy chip with "2 sources" beside it. |
| "The report claims 8 ha but only 5 ha were mapped." | A duel: **8** vs **5**, a red mark, two mono source labels. |
| "Our palette is inspired by the coast…" | A band stack of the colors with their names. |
| "First you compare, then lock, then check." | A rail: three numbered dots, one word each, the brand icons. |
| "This evidence item is from Sentinel-2, observed 28 Sep 2026, 10 m resolution." | A mono meta line: `Sentinel-2 · 28 Sep 2026 · 10 m`. |
| A paragraph about what the brand means | A motif wall or a drench. Nothing else. |

**What stays as words:** the funder's own rationale and known unknowns (that is user content), limitations, the record disclaimer, and errors. Sources and dates never disappear; they become small mono labels instead of sentences.

**In the product:**

- **Compare** = root profile + a table (sites as columns, the three questions as rows, a status chip in each cell). Never paragraphs per site.
- **Site dossier** = three rows: question · mark · finding · source count. Evidence items as a list of mono meta lines.
- **Record** = the Waterline split: the promise above, the two checks below as chips, the timeline as a rail.
- **Map** = pins carry the state; the legend is three marks with one word each.

---

## 1. The idea in one line

**Above the waterline is the promise. Below it is the evidence.**

A mangrove only stands because of what you can't see from the boat: prop roots arching into the mud. A funding promise is the same. It is only as strong as the evidence holding it up, so we keep that evidence visible, dated and traceable, and we lock the promise in public before the money moves.

- **Tagline:** Evidence that holds ground.
- **One sentence (pitch, about page):** Companies fund mangrove restoration and announce the planting. We make the promise public before the money moves, then show everyone whether it came true.
- **Descriptor (under the logo, meta descriptions):** A public map of mangrove restoration promises in the Philippines. See the evidence before the money moves, then check whether the promise came true.
- **What we are:** a public record of mangrove restoration funding promises, with the evidence beside each one.
- **What we are not:** a certifier, a funding approver, a success score or ranking, a marketplace, a carbon-credit verifier, or proof of land title or permits. Never describe us as any of those. And never "just a map": maps show data; AIDE-M locks a promise before the money moves and checks it afterwards.

The brand motif everything comes back to is **the Waterline**: a single horizontal rule that splits a composition into *promise* (above) and *evidence* (below). Use it in heroes, slide layouts, section dividers, charts (the baseline), and the record page.

---

## 2. Seven keywords

These are our vocabulary. Use these exact words in UI, copy and decks. Each one is tied to a real part of the product (`docs/prd.md`); the last column is what the data model calls it.

| # | Keyword | Means (in AIDE-M) | Say it like | Don't swap for | Product / code |
|---|---|---|---|---|---|
| 1 | **Restoration** | What the money is for: bringing mangroves back to a site in Manila Bay, by natural regeneration, hydrological repair or planting. The reason everything else exists. | "A restoration promise for 8 ha at Pamarawan." | reforestation, tree planting, greening, offsetting | `planned_action`: `natural_regeneration`, `hydrological_repair`… |
| 2 | **Evidence** | A dated item with its source, version, method, resolution and limitation: Global Mangrove Watch history, Sentinel-2 condition, a field partner's photo and mapped area, a project report. | "3 evidence items. Latest observed 28 Sep 2026." | data, info, proof, insights | `evidence_item`, evidence dossier |
| 3 | **Traceable** | Every finding, status and number links back to its evidence items, and every number to its `EQ-###` and confidence. Nothing appears that a source didn't say. | "Every status is traceable to its sources." | transparent, verified, trusted | BR-005 provenance, BR-003 |
| 4 | **Baseline** | What was known when the promise was locked: the site geometry, every evidence item and every status, frozen in the record's snapshot. Later evidence is read against it. | "Baseline locked 4 Oct 2026 with 4 evidence items." | starting point, before | the record's snapshot (US-007) |
| 5 | **Promise** | What the funder commits to before the money moves: why this site, planned action, planned area, expected outcome, check dates, known unknowns. Locked in public; it cannot be edited through AIDE-M. | "The promise: 8 ha of hydrological repair, work check after 1 Apr 2027." | goal, KPI, target, pledge | `promise_record`, `/records/{id}` |
| 6 | **Confidence** | How exact a *number* can be shown: **High** (point value), **Medium** ("approximate", limitation shown), **Low** (direction only). Statuses don't have a confidence; the evidence behind them does. | "Mapped area 5.0 ha, high confidence." | certainty, accuracy, score, rating | `docs/methods.md` §2 |
| 7 | **Follow-through** | The two later checks on a record: **Did the work happen?** and **Did the mangroves come back?** The second reads "Too early to tell" until its check date. | "Follow-through: work check after 1 Apr 2027." | monitoring, audit, impact report | `work_check_after`, `outcome_check_after` (US-011) |

**What the evidence says together** is a status, not a keyword. Use exactly these words (BR-001):

| Status | Say it like | Means |
|---|---|---|
| **Supported** | "Sources agree" | All usable evidence gives the same finding. Not "good site": the finding is always shown with it. |
| **Conflicting** | "Sources disagree" | Usable evidence gives different findings, or a reported and mapped area differ beyond tolerance. The loudest thing on the page; the only red. |
| **Missing** | "No evidence yet" | No usable evidence for this question or check. |
| **Too early to tell** | "Checkable from 1 Oct 2029" | The outcome check before its date. Not failure; say so. |

**Supporting terms (also fixed):**

| Use | Not | Why |
|---|---|---|
| candidate site, site | opportunity, project, listing, deal | The Manila Bay demo sites a funder compares (US-001), and the real Eastern Visayas case sites (ADR-056). |
| record | decision record, report, dossier, case file | The locked, public promise and its timeline (`/records/{id}`). |
| evidence dossier | data room, profile | Everything known about one site (US-002). |
| evidence item | dataset, input, evidence source | One piece of evidence with its provenance. |
| the three questions | criteria, dimensions, scores | "Was this mangrove before?", "What's there now?", "What do people on the ground say?" (US-003) |
| finding | result, verdict, rating | One of the fixed findings, e.g. `active_fishpond`, `mostly_bare_soil` (PRD §4.1). |
| funder · field partner · public reader | investor, buyer, client, user, NGO user | The three personas (PRD §2). |
| mapped area | "the satellite shows N ha" | The work check compares reported and mapped hectares (ADR-033). |
| known unknowns | risks, caveats | What nobody knew when the promise was locked. |
| locked | sealed, certified, tamper-proof | "Cannot be edited through AIDE-M; any change breaks the published hash" (ADR-034). |
| limitation | caveat, disclaimer | Every evidence item has one; show it. |
| rationale | reason, notes | Why the funder picked this site. |
| the funder decides | we recommend, approved, decides | Humans decide. AIDE-M never approves funding. |
| Demo data | sample, example, test | Mandatory label on every seeded site, record, organization and pin (BR-006). |
| Real case · sourced | verified, certified, real data | Tag on a real record rebuilt from cited public reports (`is_demo = false`, ADR-056). Mono, solid neutral outline; never red. |

**Banned outright:** guarantee, certified, verified (unless a named third party verified it), verified restoration, approved, investment-ready, will succeed, qualified (for a remotely screened site), offset, carbon-neutral, impact (as a vague noun), any score / rank / percent chance / "impact score", "the satellite shows N hectares" for a recent planting, tamper-proof, impossible to alter, "80–90% of projects fail", "nobody monitors survival", good site / bad site / best site, revolutionary, AI-powered (as a headline), "save the planet", "game-changer", "seamless", "unlock". Source: `docs/design-brief.md` §4 and `idea.md` §9.

---

## 3. Voice and tone

**Voice (never changes):** a field ecologist reading the public record aloud, to a funding committee and to the town hall. Precise, plain, unhurried, receipts attached. Warm about the coast, cool about the numbers.

Five voice rules:

1. **Show the source.** If a sentence makes a claim, it carries a date and a source. On product screens that is the evidence item (`Global Mangrove Watch · 2020`); in decks and the pitch, the research register id `[R04]` from `context.md`. Every number names its `EQ-###` and confidence.
2. **Name the uncertainty.** Say what we don't know: missing evidence, known unknowns, a Low-confidence number shown as a direction. Never hide it, never dramatise it.
3. **People decide.** We show and record. Copy always leaves the decision with the funder, and the record never enforces anything; it makes deviations visible.
4. **Plain words, short sentences.** Grade 8 reading level on every public page (map, record) and in marketing; grade 10 inside funder and partner screens. No jargon without a one-line explanation the first time.
5. **Say what the record is not.** Every record page shows: "This record is not a certification of restoration success or approval of funding."

**Tone (shifts with the moment):**

| Moment | Tone | Example |
|---|---|---|
| Public map / landing | Grounded, clear, a little lyrical about the coast, never preachy | "Companies fund mangrove restoration. Here are their promises, and whether they came true." |
| Site dossier (three questions) | Neutral, exact | "What's there now? Mostly bare soil. Supported: 2 sources agree, latest 28 Sep 2026." |
| Compare | Side by side, no ranking | "Site E: the proposal says open for restoration; the field partner reports an active fishpond." |
| Locking a promise | Calm, formal, the irreversible part stated plainly | "Once locked, this promise cannot be edited or deleted. Corrections appear as new dated entries." |
| Record | Past tense, document-like | "Locked 4 Oct 2026 by Demo Coastal Fund." |
| Follow-through, too early | Patient, dated | "Did the mangroves come back? Too early to tell. Checkable from 1 Oct 2029." |
| Conflict | Direct, factual, no blame | "Sources disagree. Reported 8 ha; mapped 5 ha." |
| Live source failed | Specific, fallback named | "Sentinel-2 didn't respond. Showing the stored snapshot from 28 Sep 2026." |
| Errors | Specific, fixable, no apology theatre | "The outcome check date must be after the work check date." |
| Empty states | Inviting, short | "No evidence yet. Field partners can add the first item." |

**Do / don't**

| Do | Don't |
|---|---|
| "Sources disagree on what's there now. Here are both." | "This is the best site to fund." |
| "Two sources agree: open for restoration." | "Our AI found the answer." |
| "Too early to tell. Checkable from 1 Oct 2029." | "The project failed." |
| "Locked 4 Oct 2026." | "Recently updated." |
| "8 ha reported, 5 ha mapped." | "The satellite shows 5 hectares." |
| "This record cannot be edited through AIDE-M." | "Tamper-proof." |
| "We help funders compare evidence before they commit." | "We're revolutionising blue finance." |

**Mechanics**

- Sentence case for everything: headings, buttons, nav. Never Title Case, never ALL CAPS except eyebrow labels (styled via CSS, written in sentence case in source).
- Buttons are verbs + object: `Compare sites`, `Lock a promise`, `Add evidence`, `Refresh Sentinel-2`, `Verify this record`.
- Dates: `14 Mar 2026` in prose and UI, `2026-03-14` in data, exports and filenames.
- Numbers: digits always (`3 sources`, not "three"). Units with a space: `40 ha`, `1.2 km`, `18 %` in tables, `18%` in prose.
- Citations: on product screens, the evidence item's source and date in mono (`Sentinel-2 · 28 Sep 2026`), linked to the item; in decks and the pitch, `[R03]` in square brackets.
- No exclamation marks. No emoji in product UI. One per deck at most, and only in speaker notes.
- Oxford comma: yes.

---

## 4. Color

Pulled from the coast itself: deep canopy, tidal turquoise, new-leaf chartreuse, wet bark, the lavender haze over the water. Neutrals are cool and brackish (a hint of green-grey), never warm cream.

### Primary

| Token | Hex | Name | Use |
|---|---|---|---|
| `--mg-canopy` | `#173A2E` | Canopy | Brand anchor. Headings on light, primary buttons, logo, dark surfaces. |
| `--mg-tidal` | `#2B8C86` | Tidal | Interactive: links, focus rings, selected states, the Waterline, charts series 1. |

### Secondary

| Token | Hex | Name | Use |
|---|---|---|---|
| `--mg-propagule` | `#C8D545` | Propagule | New growth. Reserved for *recovery detected*, highlights, the one thing to look at. Max ~5% of any screen. Never for body text on light. |
| `--mg-root` | `#7A4E33` | Prop Root | Evidence, below-the-waterline content, citations accents, charts series 2. |
| `--mg-haze` | `#B7BFD9` | Haze | Atmosphere: backgrounds of heroes and slides, "above the waterline" areas, tags. |

### Neutrals (brackish scale)

| Token | Hex | Name | Use |
|---|---|---|---|
| `--mg-ink` | `#0E1A17` | Ink | Body text on light. |
| `--mg-mudflat` | `#34413D` | Mudflat | Secondary text, dark-mode surfaces. |
| `--mg-brackish` | `#6B7974` | Brackish | Muted text, captions, icons at rest. |
| `--mg-saltmarsh` | `#C5CEC9` | Salt Marsh | Borders, dividers. |
| `--mg-tideline` | `#E4EAE6` | Tideline | Subtle fills, table stripes, input backgrounds. |
| `--mg-mist` | `#F4F7F5` | Mist | Page background (light). |
| `--mg-night` | `#0B1714` | Night Tide | Page background (dark). |

### Semantic

| Token | Hex | Use |
|---|---|---|
| `--mg-conflict` | `#B4462F` | Red-mangrove tannin. **Only** for a conflict: `pin_state = conflict` and a *conflicting* status (design brief §2, BR-004). No other element uses this red: not errors, not destructive buttons, not links. |
| `--mg-caution` | `#C99A2E` | Dry-season ochre. Form errors, failed live sources, outdated evidence. Always with an icon and words. |
| `--mg-ok` | `#2E7D4F` | Reserved; not used for statuses (supported is Canopy). |

### Map data (layers, not UI)

| Token | Hex | Use |
|---|---|---|
| `--mg-data-mangrove` | `#1FCFCF` | GMW mangrove extent layer only (ADR-049). |
| `--mg-data-gain` | `#9ED33A` | GMW mangrove gain since a baseline year, map layer only (ADR-050). |
| `--mg-data-loss` | `#E4473A` | GMW mangrove loss since a baseline year, map layer only (ADR-050). The one exception to "only red is conflict": it lives only in that map layer and its legend row, which always says "Mangrove loss since <year>". A conflict on the map is a pin, never a filled area. |

**Proportions on a typical screen:** Mist/neutrals 70%, Canopy 15%, Tidal 8%, Haze/Root 5%, Propagule 2%.

**Contrast (WCAG):** Ink on Mist 16.5:1. Canopy on Mist 11.5:1. Tidal on Mist 3.7:1 (large text, icons, borders only; use Canopy for small link text if needed, or `--mg-tidal-ink: #1F6E69`, 5.6:1). Propagule only behind Canopy/Ink text, never as text on light.

**Dark mode:** background Night Tide, surfaces Mudflat-tinted (`#13231F`, `#1A2E29`), text `#E4EAE6`, Tidal lifts to `#4DB3AB`, Propagule stays. All values live in `brand/tokens.css`.

---

## 5. Typography

| Role | Family | Why | Weights |
|---|---|---|---|
| Display / headings | **Newsreader** (Production Type, Google Fonts) | Built for reading news: an editorial serif with optical sizes. It says "this is the record" without feeling like a law firm. Its italic is soft and organic, like a root. | 400, 500, 600; italic 400 |
| Body / UI | **Schibsted Grotesk** (Bakken & Bæck for Schibsted, Google Fonts) | A sturdy grotesk made for a news organisation. Reads well small, has character in the `g` and `R` without being quirky. Pairs with Newsreader on the same journalistic DNA. | 400, 500, 600, 700 |
| Data / citations / labels | **IBM Plex Mono** (Google Fonts) | Scientific, neutral, excellent tabular figures. Used for `[R03]`, coordinates, hectares, dates in tables, eyebrow labels. | 400, 500 |

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400&family=Schibsted+Grotesk:wght@400..700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Next.js: `next/font/google` with `Newsreader`, `Schibsted_Grotesk`, `IBM_Plex_Mono`.

**Scale (1.25 ratio, 16px base)**

| Token | Size / line-height | Face | Use |
|---|---|---|---|
| `display` | 64 / 1.02, -0.02em | Newsreader 500 | Hero only. One per page. |
| `h1` | 48 / 1.08, -0.015em | Newsreader 500 | Page title |
| `h2` | 36 / 1.15 | Newsreader 500 | Section |
| `h3` | 24 / 1.25 | Schibsted 600 | Card / panel titles |
| `h4` | 18 / 1.35 | Schibsted 600 | Sub-sections |
| `body` | 16 / 1.6 | Schibsted 400 | Running text, max 68ch |
| `small` | 14 / 1.5 | Schibsted 400 | Secondary |
| `label` | 12 / 1.3, +0.08em, uppercase | Plex Mono 500 | Eyebrows, table heads, chips |
| `data` | 14 / 1.4, tabular-nums | Plex Mono 400 | Numbers, dates, coordinates, citations |

Rules: Use Newsreader *italic* for the one emotional word in a headline ("Evidence that *holds* ground"). Never set body in the serif inside the product. Never use more than these three families.

---

## 6. Status, confidence and pins (product-critical)

Three different things, never mixed. All of them use **mark + word**, never color alone (color-blind safe, prints in grayscale, survives a projector).

**Status** (what the evidence says together, BR-001). On every question, check and comparison column, with the finding and the source count beside it:

| Status | Mark | Color | Chip class |
|---|---|---|---|
| Supported | ● solid | Canopy | `mg-chip--supported` |
| Conflicting | ◆ solid diamond | Conflict red | `mg-chip--conflicting` |
| Missing | ○ dashed outline | Brackish | `mg-chip--missing` |
| Too early to tell | ◷ clock, outline | Haze border, Mudflat text | `mg-chip--too-early` |

**Confidence** (how exact a number is, `docs/methods.md` §2). Next to numbers only:

| Level | Mark | Renders the number as |
|---|---|---|
| High | ● solid, Canopy | Point value: `5.0 ha` |
| Medium | ◕ 45° hatch, Tidal | "approx. 5 ha", limitation shown |
| Low | ◔ dotted, Root | Direction only: "well below the expected area" |

**Pin states** (map, BR-004). The text label is always available on focus and in the record:

| Pin state | Look | Word |
|---|---|---|
| `conflict` | Conflict red fill, Mist outline | "Sources disagree" |
| `awaiting` | Mist fill, Brackish dashed outline | "Awaiting evidence" |
| `on_track` | Tidal fill, Mist outline | "On track" |

Seeded content also carries the **Demo data** label (mono, dashed outline, `mg-demo`), in the pin's tooltip too (BR-006). Never percentages, never traffic lights, never a score.

### Root profile (how to compare sites)

Don't compare sites in rows of text with dots. Draw them as mangrove cross-sections side by side, one trunk per site, **one root per question**, in the PRD's order: *Was this mangrove before?*, *What's there now?*, *What do people on the ground say?*

- Waterline across the top of the panel. Site name, area (EQ-001) and "Demo data" sit above it, each with a small trunk and two Propagule leaves.
- Below the waterline: a ground gradient (Tideline to `--mg-mud`) with one dashed "evidence line" near the bottom.
- **Supported:** a solid Prop Root root reaching the evidence line, ending in a solid Canopy node. **Conflicting:** a red root that splits into two tips (the disagreeing findings), ending in red diamonds. **Missing:** a short dashed Brackish stub that stops well above the line, ending in an empty dashed node.
- Under each node: the finding in words and the source count. Under each site: its evidence items in Prop Root mono.
- No depth-as-score: the root shows agreement, not quality.

Reference: Figma slide T05 "Compare · Root profile" and the compare section of `brand/starter.html`. Use the same structure for the web compare view (`/compare?sites=`).

---

## 7. Logo

Files: `brand/logo/mangrove-mark.svg`, `brand/logo/mangrove-mark-dark.svg`, `brand/logo/mangrove-lockup.svg` (file names predate the name AIDE-M and stay).

**Name and wordmark (ADR-051).** The name is **AIDE-M**: capitals, one hyphen, set in Newsreader 500. In the lockup, the site header and the deck cover, the meaning sits directly under it in IBM Plex Mono, small and Brackish: `ACCOUNTABILITY IN DELIVERY & EVIDENCE · MANGROVE` (uppercase eyebrow style), or in sentence-style capitals in running text the first time the name appears. Nowhere else: after the first mention it is AIDE-M alone. Never "Aide-M", "AIDEM" or "Aide M".

The mark: a young mangrove. Five pointed leaves climb a single trunk (top and lower-left in Propagule `#C8D545`, upper-left and lower-right in Tidal `#2B8C86`, upper-right in light Tidal `#4DB3AB`), and six prop roots arch from the trunk into the ground, all in Canopy `#173A2E`. New growth above is the promise; the roots holding it up are the evidence. Readable at 20px.

- Clear space: one leaf length on all sides.
- Minimum size: 20px mark, 96px lockup.
- On dark: trunk and roots turn Mist `#F4F7F5`; leaf colors stay the same.
- Don't: rotate, add gradients or outlines, recolor or reorder the leaves, or put it on photos without a Canopy or Night scrim.

---

## 8. Layout, shape, motion

- **Grid:** 12 columns, 1200px max content, 24px gutters, 16px mobile gutters. Spacing scale 4/8/12/16/24/32/48/64/96.
- **Radius:** 4px for inputs and chips, 8px for cards, 0 for images and charts. Don't round everything; most dividers are plain hairlines.
- **Borders over shadows.** 1px Salt Marsh hairlines. One shadow token (`--mg-shadow`) for floating things only (popovers, dialogs).
- **The Waterline device:** a 1px Tidal rule, optionally with a faint reflection (the content above mirrored at 8% opacity, or a 2-line wave). Use once per page section at most.
- **Reflections (web only):** on the website, things that would really reflect in water get a reflection: the 3D hero tree and roots, with drifting bands of still water crossing it. Type never reflects. Decks and other Figma slides use no reflections at all.
- **Texture:** a faint survey grid (Tideline lines, 32px) behind maps and hero areas. Signals "measured", not "decorated".
- **Motion:** slow and tidal. Ease `cubic-bezier(0.22, 1, 0.36, 1)`, 240ms for UI, 600-900ms for reveals. Lines *draw* (stroke-dashoffset) rather than fade, like roots growing. Respect `prefers-reduced-motion`. No bounce, no spring.
- **Data viz:** series order Tidal, Root, Canopy, Haze, Propagule (highlight only). The baseline in time charts is drawn as the Waterline. Mark the decision date with a vertical Canopy rule labelled `Baseline`. Gridlines Tideline. Axis labels Plex Mono 12.


### Textures (backgrounds)

Three grounds so a surface is never just flat color. Files in `brand/textures/` (1920×1080 SVG, regenerate with `node brand/scripts/make-textures.js`). Also components in Figma (`Texture/…`).

| Texture | Ground | Use | Rule |
|---|---|---|---|
| **Night Roots** `night-roots.svg` | Night Tide, dark | Covers, big-number slides, closing, website hero on dark | Roots live below the waterline (y≈60%). Put text above it. |
| **Canopy Contours** `canopy-contours.svg` | Canopy, green | Section dividers, keyword and quote slides, CTA bands | Bathymetry rings read as "measured ground". Keep text left, rings sit in corners. |
| **Survey Tide** `survey-tide.svg` | Mist, light | Content slides, statements, website sections | Grid and tide bands stay faint. Never put body text on the tide bands. |

On the web use the band classes in `brand/mangrove.css` (`mg-band--night`, `--canopy`, `--survey`), which set the right position (Night Roots must keep its waterline at 59.26%) and the on-dark colors. How to lay out a whole page from the deck: **`brand/WEB.md`**. Don't stack two textures, don't tint them, and use plain backgrounds for dense data screens.

---

## 9. Icons

Style: **24px grid, 1.75px stroke, round caps and joins, no fills** (except confidence marks). Color `currentColor`. Default library: **[Lucide](https://lucide.dev)** (`lucide-react`), which matches this spec. Custom brand icons in `brand/icons/` follow the same rules.

**Custom (in `brand/icons/`):** `propagule`, `prop-roots`, `waterline`, `evidence-trace`, `baseline`, `promise`, `follow-through`, `satellite-pass`, `field-observation`, `confidence`.

**Lucide set we use (name → meaning):**

| Area | Lucide icons |
|---|---|
| Navigation | `layout-dashboard`, `search`, `list-filter`, `arrow-left-right` (compare), `bookmark`, `settings`, `user-round`, `bell` |
| Evidence sources | `satellite`, `map`, `layers`, `file-text` (report), `camera` (field photo), `clipboard-list` (survey), `database`, `link-2` (citation), `paperclip` |
| Ecology | `waves`, `droplets` (hydrology), `sprout`, `trees`, `fish` (fisheries), `bird`, `mountain` (sediment/elevation), `thermometer` |
| Record | `scale` (weigh), `scroll-text` (record), `pen-line` (rationale), `lock` (locked promise, baseline), `history` (timeline), `shield-check` (verify integrity), `git-compare` |
| Status | `circle-check` (supported), `diamond` (conflicting), `circle-dashed` (missing), `clock` (too early to tell), `triangle-alert` (form error, live source failed), `flask-conical` (Demo data) |
| Money & people | `hand-coins` (funding), `landmark` (foundation), `building-2` (corporate), `users` (community), `handshake` |
| Actions | `plus`, `upload`, `download`, `share-2`, `external-link`, `calendar-clock` (check date), `info` |

---

## 10. Imagery and illustration

Full generation prompts and rules: **`brand/IMAGERY.md`**. Summary:

- **Photography:** real mangroves, eye-level at the waterline, roots visible. Soft morning or hazy light. Never stock-photo hands-holding-seedling, never drone shots without the roots.
- **Illustration: hand-drawn marker, no mascot.** Bold marker outlines, pale fills, white highlight streaks and one chartreuse pop, drawn from the coast: leaf sprigs, saplings, roots, channels, propagules. For empty states, onboarding, 404s, decks and social; never on a record, dossier or comparison.

---

## 11. Decks (PPT / Slides)

**Figma template:** https://www.figma.com/design/tk6Ja5pTo6eFjC25uHHawB/Mangrove (page "AIDE-M deck": Brand guidelines G01–G12, Deck template T01–T08, Assets panel with components, textures, paint and text styles). Duplicate a T-slide; never restyle from scratch.

16:9, 1920×1080. Eight templates, all built on the Waterline. PNG exports live in `brand/slides/` so agents without Figma access can see them; re-export when Figma changes.

| # | Template | Ground | Device (§0) | Layout |
|---|---|---|---|---|
| T01 | Title | Night Roots | Drench | Mark + wordmark top left, two-line title above the waterline with one Propagule italic word, mono presenter · team · date just below it. |
| T02 | Section | Canopy Contours | Drench | Mono eyebrow, section title in Mist Newsreader with one Propagule italic word, faint ghost mark right. No "01 / 02" numerals. |
| T03 | Statement | Survey Tide | Type field | Eyebrow, one-sentence statement with one Tidal italic word, boxed `[R##]` + source line below the tide waterline. |
| T04 | Claim and evidence | Mist | Type field + columns | Claim in Newsreader, Waterline, 2–4 evidence columns (Root rule, mono `[R##] · type · year`, one sentence). |
| T05 | Compare · Root profile | Mist | Root profile | See §6 Root profile. |
| T06 | Big number | Night Roots | Duel | Eyebrow, Newsreader number, one-line descriptor right, mono citation line below the waterline. |
| T07 | Follow-through | Mist | Duel | Promise (Tidal label) above the Waterline, the work check below (Root label) with its status chip, and a reported vs mapped area bar. |
| T08 | Closing | Canopy Contours | Drench | Mark, tagline with Propagule italic word, mono contact line. |

Footer on every slide: logo mark left, source citations right in Plex Mono Brackish. Max 25 words of body per slide. Margins 120px. On the web these become page sections: see `brand/WEB.md`.

---

## 12. Accessibility and data honesty

- WCAG 2.2 AA minimum. Focus ring: 2px Tidal, 2px offset.
- Every chart has a text summary and a data table toggle.
- Every evidence item shows: source, source version, observed and retrieved dates, method, resolution, limitation, link (BR-005).
- Every displayed number cites its `EQ-###` and renders per its confidence (`docs/methods.md`).
- Never round a number up to make a case. Show ranges when sources give ranges.
- Alt text describes what the evidence shows, not what we hope it shows.

---

## 13. Quick checklist before you ship a screen

- [ ] Passes the glance test (§0): blurred, it still reads; headline ≤ 8 words, blocks ≤ 20; comparisons are tables or the root profile, not paragraphs.
- [ ] Built on one named device from §0.
- [ ] Only tokens from `tokens.css`; no raw hex.
- [ ] Three fonts max, roles respected.
- [ ] Uses the seven keywords and the status words, no banned words.
- [ ] Every claim has a date and a source; every number its `EQ-###` and confidence.
- [ ] Status, confidence and pin state shown as mark + word. Red appears only for a conflict.
- [ ] "Demo data" on every seeded item; the disclaimer on every record page.
- [ ] Propagule used once, for the thing that matters.
- [ ] Buttons are verb + object, sentence case.
- [ ] Works in dark mode and at 375px.
