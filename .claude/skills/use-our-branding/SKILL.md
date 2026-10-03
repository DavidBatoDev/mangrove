---
name: use-our-branding
description: Apply the Mangrove brand (public map of mangrove restoration promises) to any UI, page, component, copy, deck, chart or image prompt. Use whenever the user says "use our branding", "on brand", "brand it", or builds anything user-facing in this repo.
---

# Use our branding

1. Read `brand/BRAND.md` fully. It is the source of truth and wins over your defaults.
2. **Look at the target before designing.** Open the PNGs in `brand/slides/` (T01–T08 deck templates, G-slides guidelines) with your image-reading tool. Whatever you build should look like these slides.
3. **Pages, sites and UI:** read `brand/WEB.md`, then start from `brand/starter.html` and the classes in `brand/mangrove.css` (which imports `tokens.css`). Map each section to its slide per WEB.md §2. Copy the whole `brand/` folder into the app's static dir so texture and icon URLs resolve. Missing a component? Add it to `mangrove.css`, not to your feature.
4. Use only tokens from `brand/tokens.css` (or `brand/tokens.json`). No raw hex, no other fonts.
5. Copy: use the seven keywords (Restoration, Evidence, Traceable, Baseline, Promise, Confidence, Follow-through), the status words (supported, conflicting, missing, too early to tell) and the supporting terms in BRAND.md §2. Never use the banned words. Follow the voice rules and tone table in §3. Product behaviour comes from `docs/prd.md`; never invent a number (`docs/methods.md`).
6. Status, confidence and pin state are mark + word (§6). Red is only for a conflict. "Demo data" on every seeded item; the disclaimer on every record page.
7. Icons: `lucide-react` at 1.75 stroke, plus custom SVGs in `brand/icons/` (reference the files via `.mg-icon`; don't copy their path data, they are still being revised). Logo in `brand/logo/`.
8. Images or illustrations: follow `brand/IMAGERY.md` and paste its Style Block. There is no mascot; use the marker illustrations in `brand/illustration/` for empty states, onboarding and 404s.
9. Backgrounds: use the three textures in `brand/textures/` (dark Night Roots, green Canopy Contours, light Survey Tide) per BRAND.md §8 instead of flat fills on heroes, dividers and slides (on the web via the `mg-band--*` classes). The website hero is Night Roots, never Haze. Decks start from the Figma template linked in BRAND.md §11.
10. Use the Waterline device (BRAND.md §1, §8) at most once per section.
11. Before finishing, run the checklist in BRAND.md §13 and WEB.md §5 (screenshot your page next to the matching slide), and fix anything that fails.

Visual references: `brand/slides/*.png` (what it should look like), `brand/starter.html` (the same look as a web page), `brand/index.html` (the brand guide page).
