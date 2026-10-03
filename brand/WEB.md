# Mangrove on the web: build it like the deck

> The Figma deck is the visual target. A Mangrove website should look like the deck turned into a scrolling page: same grounds, same type scale, same waterline, same evidence styling.
> If you are an AI agent building any page, read this file after `BRAND.md`, **open the slide PNGs in `brand/slides/` and look at them**, then start from `brand/starter.html` + `brand/mangrove.css`.

---

## 1. Start here (in this order)

1. **Look at the target.** `brand/slides/T01–T08` are the deck templates (1920×1080 exports from Figma). `G01–G12` are the brand guideline slides. G09 (icons) and G11 (illustration) are left out on purpose while those are still changing; use `brand/icons/` and `brand/illustration/` directly. If a slide ever disagrees with `BRAND.md`, `BRAND.md` wins.
2. **Copy the starter.** `brand/starter.html` is a full page built only from `mangrove.css`, one section per deck template. Copy its sections; replace the copy; don't restyle.
3. **Use the component classes.** `brand/mangrove.css` imports `tokens.css`. If you need something it lacks, add it to `mangrove.css` (so all four features get it), never as one-off styles in your feature.
4. **Ship the assets with the page.** Copy the whole `brand/` folder into your static directory (`public/brand/` in Next.js or Vite). `mangrove.css` uses relative URLs for textures, so they resolve wherever the folder lives. Don't copy single files out of it.

React or Tailwind? Import `brand/mangrove.css` once at the root and use the same class names. Tailwind v4 users can also uncomment the `@theme` block in `tokens.css`. Icons: `lucide-react` with `strokeWidth={1.75}`.

---

## 1b. Show, don't explain

Read `BRAND.md` §0 first. Every section is one visual device (drench, band stack, specimen, table, root profile, rail, contact sheet, motif wall, type field, duel, surface), chosen **before** the copy. Comparisons are always a table (`mg-table`) or the root profile, never prose. Headline ≤ 8 words, any other block ≤ 20. If a section needs a paragraph to be understood, change the device, not the paragraph.

## 2. Map page sections to slides

| Page section | Slide to match | Ground | Classes |
|---|---|---|---|
| Hero / first screen | **T01** Title | Night Roots | `mg-band mg-band--night mg-hero` |
| Problem or mission statement | **T03** Statement | Survey Tide | `mg-band mg-band--survey mg-statement` |
| Claim with sources, "how it works" | **T04** Claim and evidence | Plain Mist | `mg-band--plain` + `mg-waterline` + `mg-evidence-row` |
| Section divider, chapter opener | **T02** Section | Canopy Contours | `mg-band mg-band--canopy` + `mg-ghost-mark` |
| One key figure | **T06** Big number | Night Roots | `mg-hero mg-hero--short` + `mg-display` |
| Compare (`/compare?sites=`) | **T05** Root profile | Plain Mist | inline SVG, one root per question; see starter and BRAND.md §6 |
| Record (`/records/{id}`): promise, two checks | **T07** Follow-through | Plain Mist | `mg-split`, `mg-chip--*`, `mg-progress`, `mg-disclaimer` |
| Closing call to action | **T08** Closing | Canopy Contours | `mg-band--canopy` + mark + `mg-headline` |
| Dense product screens (tables, forms, maps) | none | Plain `--mg-bg` | `mg-card`, tokens only. No textures. |

**Rhythm:** alternate grounds down the page (dark, light, plain, green, dark, plain…). Never put two textured bands of the same texture back to back, and never stack two textures in one band.

---

## 3. The look in numbers (measured from the 1920px slides)

| Element | Slide value | Web value |
|---|---|---|
| Side margin | 120px | `--mg-page-x: clamp(16px, 6.25vw, 120px)` |
| Eyebrow | Plex Mono 500, 20px, uppercase, ~0.12em tracking, Brackish | `.mg-eyebrow` (12px) |
| Headline | Newsreader 500, ~120px, line-height 1.0, -0.02em, max 2–3 lines | `.mg-headline` (40–116px fluid), `--md` for longer claims |
| Accent word | One word per headline, Newsreader *italic 400* | `<em>`: Propagule on dark/green, Tidal on light, Root (`.mg-em--root`) when the word is about roots or evidence |
| Big number | Newsreader 400, ~330px | `.mg-display` |
| Waterline | 2px Tidal rule + dashed reflection 7px below (28/17 dashes, 45%) | `.mg-waterline` |
| Evidence item | 3px Root top rule, mono Root meta `Source · observed date` (product) or `[R03] · Type · Year` (marketing, decks), plain sentence | `.mg-evidence` |
| Citation | Mono, Root. Product screens: the evidence item's source and date. Marketing and decks: `[R##]` from `context.md`, boxed on statements | `.mg-cite`, `.mg-cite--box` |
| Status | 2px outline chip with mark, mono, radius 4; finding + source count beside it | `.mg-chip--supported / --conflicting / --missing / --too-early` |
| Confidence (numbers only) | Mark + word | `.mg-conf--high / --medium / --low` |
| Pin legend | Pin mark + word | `.mg-pin--conflict / --awaiting / --on-track` |
| Demo data | Mono, dashed outline | `.mg-demo` on every seeded site, record, organization and pin |
| Footer | Mark 44px left, mono Brackish citations right | `.mg-foot` |
| Alignment | Everything left-aligned to the margin. Lots of empty space. Nothing centered except the root-profile diagram. | |

**Night Roots geometry:** the texture's waterline sits at **59.26%** of its height. `.mg-band--night` uses `background-position: 50% 59.26%` so the line stays at 59.26% of any band height. Headline and buttons go **above** it (`.mg-hero__copy`), and a single mono meta or citation line goes just **below** it (`.mg-hero__meta`). Never put body text over the roots.

**Survey Tide geometry:** its waterline is at ~66%. `.mg-statement` splits the band 66/34: headline above, source row below. Body text never sits on the tide bands.

---

## 4. Rules that make it look official (and the usual misses)

- Hero is **dark Night Roots**, not Haze, not a photo, not a gradient. (Haze is for atmosphere fills and tags only.)
- **One** italic accent word per headline. Not bold, not underlined, not a second color elsewhere in the line.
- Eyebrows are mono uppercase **via CSS**. Write them in sentence case in the source.
- Every claim carries a date and a source, styled as `.mg-cite`. Every number names its `EQ-###` and renders per its confidence (High: value, Medium: "approx.", Low: direction only).
- **Red is conflict only.** `--mg-conflict` appears on a conflicting status and a conflict pin, nowhere else. Form errors and failed live sources use `.mg-alert` (caution).
- Every record page ends with `.mg-disclaimer`: "This record is not a certification of restoration success or approval of funding."
- Buttons: Canopy on light, **Propagule on dark grounds** (the band classes switch this for you). Verb + object, sentence case.
- Propagule appears at most once per screen besides the dark-ground button: an accent word or a "Recovery seen" chip.
- No card shadows, no rounded hero images, no centered marketing layouts, no emoji, no stock photos.
- Logo: `logo/mangrove-mark-dark.svg` on Night and Canopy, `logo/mangrove-mark.svg` on light. Don't redraw it.
- Brand icons (`brand/icons/*.svg`): use them through `.mg-icon` with `style="--mg-icon:url(/brand/icons/NAME.svg)"`, or inline the file. Don't copy their path data into your code, because icons are still being revised and the files are the source of truth.
- Dark mode: Night and Canopy bands are dark in both themes. Survey Tide switches to the dark survey grid automatically. Check the page at 375px and in dark mode.

---

## 5. Done means

- [ ] Glance test (`BRAND.md` §0): blur the screenshot; it still says what matters, what agrees and what conflicts. Count the words.
- [ ] Put a screenshot of your page next to the matching `brand/slides/T0x.png`. Same ground, same headline scale, same margins, same waterline, same footer.
- [ ] No raw hex, no new fonts, no inline restyling of `mg-*` classes.
- [ ] BRAND.md §13 checklist passes.
