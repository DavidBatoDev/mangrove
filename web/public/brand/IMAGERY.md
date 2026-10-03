# AIDE-M Imagery: illustration and photo rules

Read `BRAND.md` first. This file is for anyone generating images (Midjourney, DALL·E, Firefly, Ideogram, Canva, Gemini, etc.) or drawing assets by hand. **Always paste the Style Block below into every prompt.** That's what keeps images consistent across four people.

---

## 1. The Style Block (paste into every illustration prompt)

```
STYLE: Hand-drawn marker illustration, like confident sketches in a coastal ecologist's notebook. Bold, slightly uneven marker outlines with round ends; pale flat fills inside each shape; one or two quick white highlight streaks inside every leaf, root and water shape. Palette: leaf green #2F6B3A outlines with pale chartreuse #E3EBA6 fills, brown #7A4E33 roots and trunks, turquoise #2B8C86 and pale #BFE3DE water strokes, soft lavender #9DA6C6 hills, one small chartreuse #C8D545 dot as the only accent. Plain cool off-white #F4F7F5 background. A loose waterline often crosses the scene; mangrove leaves are long and pointed and prop roots are visible. Calm, warm, human. Lots of empty space. Small hand-lettered-looking mono labels are allowed.
NEGATIVE: no gradients, no shading, no 3D, no photorealism, no thin technical linework, no thick black outlines, no faces or characters, no neon, no purple, no text paragraphs, no logos, no hands holding seedlings, no globe, no lightbulb, no smiling sun.
```

**Aspect ratios:** website hero 21:9, slides 16:9, cards 4:3, social 1:1 and 4:5, spot illustrations 1:1 on transparent or Mist background.

**Rule of thirds for the waterline:** place it at 55-65% of the height. Promise/canopy above, evidence/roots below.

---

## 2. Marker illustrations (no mascot)

We don't use a mascot. Spot illustrations are **hand-drawn marker drawings** of the coast: a bold confident outline, a pale fill, one or two quick white highlight streaks, and a single chartreuse pop. No illustration files ship in the repo; when a screen needs one, generate it from the Style Block above.

Rules:
- Ink: leaf green `#2F6B3A` for plants, Prop Root `#7A4E33` for roots and trunks, Tidal `#2B8C86` for water, Haze `#9DA6C6` for hills. Stroke about 7-9% of the subject size, round caps, slightly uneven.
- Fills: leaf tint `#E3EBA6`, water tint `#BFE3DE`, root tint `#D9B99F`. Flat, never gradients.
- Highlights: one or two white streaks inside each leaf or root, drawn quickly along the shape.
- Pop: one chartreuse `#C8D545` dot with a Canopy ring per drawing at most (a bud, a seed tip, the sun).
- Leaves are long and pointed and open in fans at branch tips. Never round or heart-shaped.
- Never: faces, characters, mascots, thick black outlines, gradients, or drawings on a record, dossier or comparison.

Image-generation prompt for new drawings in the same style:
```
Hand-drawn marker illustration on a plain cool off-white #F4F7F5 background. Bold, confident, slightly uneven marker outlines with round ends; pale flat fills inside each shape; one or two quick white highlight streaks inside every leaf. Subject: [a mangrove leaf sprig / a young mangrove on stilt roots standing in water / ...]. Leaves are long and pointed, mangrove-like, outlined in leaf green #2F6B3A and filled pale chartreuse #E3EBA6. Roots and trunk in brown #7A4E33 marker. Water as loose turquoise #2B8C86 and #BFE3DE marker strokes. One small chartreuse #C8D545 dot as the only accent. No gradients, no shading, no faces, no text. Lots of empty space. 1:1.
```

## 3. Key figures (for decks and the website)

Generate each with the Style Block. Reuse; don't regenerate per slide.

| File | Use | Prompt subject |
|---|---|---|
| `fig-cross-section.png` | Hero, "how it works", title slides | A single red mangrove tree in cutaway cross-section. Above the waterline: canopy and a small annotation "promise". Below: an arching prop-root system in the mud, five roots each ending in a small dark node with thin leader lines to mono labels: "Global Mangrove Watch", "Sentinel-2", "field photo", "mapped area", "project report". 21:9. |
| `fig-fragmented.png` | Problem slide | Scattered evidence items floating separately on a survey grid: a satellite tile, a folded map, a polaroid of mangroves, a clipboard, a PDF report, a tide chart. Thin dashed lines that don't connect. Muted, slightly disordered. 16:9. |
| `fig-assembled.png` | Solution slide | The same six evidence items now arranged neatly below a waterline, each connected by a root-like brown line up into one mangrove trunk, which supports a single document card above the waterline labelled "promise". 16:9. |
| `fig-timeline.png` | Follow-through slide | Three panels of the same coastal site, left to right: "baseline" (bare mudflat with a few propagules), "year 2" (saplings with prop roots), "year 5" (young mangrove stand). A continuous waterline runs through all three. 21:9. |
| `fig-compare.png` | Compare feature | Two side-by-side restoration sites in cross-section, one with dense root evidence and nodes below the waterline, one with sparse roots and hollow dashed nodes (weaker evidence). 16:9. |
| `fig-funder-desk.png` | Audience slide | Top-down flat illustration of a desk: an open promise record, a tablet showing a coastal map, a cup of tea, a mangrove propagule as a paperweight. No people's faces. 4:3. |
| `fig-coast-wide.png` | Section backgrounds | Panoramic coastline at low tide in lavender haze: distant hills, a fringe of mangroves, scattered saplings standing on their prop roots in shallow water, perfect reflections. Very calm, lots of empty sky. 21:9. |

**People:** if people are needed, draw them small, in mid-distance, no facial detail, simple flat shapes, diverse, doing real fieldwork (wading with a quadrat frame, measuring a trunk, photographing roots). Never "hands holding a seedling".

---

## 4. Photography rules

- **Subject:** real mangroves with roots visible. Prop roots, pneumatophores, propagules, tidal channels, mudflats, field teams measuring.
- **Angle:** eye-level at the waterline or slightly below; reflections welcome.
- **Light:** soft morning, overcast, or hazy. Avoid harsh noon and over-saturated sunsets.
- **Grade:** lift shadows slightly toward `#173A2E`, cool the highlights toward `#B7BFD9`, keep leaf greens natural (don't push to neon). Saturation -10.
- **Overlay:** when text sits on a photo, use a Canopy (`#173A2E`) scrim at 55-70% or a Night Tide gradient from the bottom. Text in Mist.
- **Crop:** keep the waterline in frame where possible, at 55-65% height.
- **Credit:** every photo has a source and date in the caption (Plex Mono, Brackish). It's evidence, treat it that way.
- **Avoid:** stock "eco" clichés, drone-only shots with no roots, planting-ceremony group photos, images of dead mangroves used for shock.

AI photo prompt add-on (only for mood images, never presented as evidence):
```
Documentary nature photograph, red mangrove saplings standing on arching prop roots in calm shallow tidal water, eye-level at the waterline, soft hazy morning light, lavender-blue sky, distant hills, mirror reflections, natural greens, muted, 35mm, no people, no text.
```
**Never use AI-generated photos as evidence of a real site.** Label mood images "Illustrative" in the caption.

---

## 5. Pattern and texture assets

- **Survey grid:** 32px squares, `#E4EAE6` lines at 1px on `#F4F7F5`. Dark mode: `#1A2E29` on `#0B1714`.
- **Root lines:** generative brown arcs (`#7A4E33`, 1.5px) that grow from a waterline downward. Use as section dividers. See the live version in `brand/index.html`.
- **Waterline reflection:** mirror the element above the line, 8% opacity, 2px vertical blur.
- **Confidence patterns:** solid, 45° hatch (2px lines every 4px), dots (1.5px every 4px), dashed outline. Same everywhere (maps, charts, cards).

---

## 6. Consistency checklist for any generated image

- [ ] Style Block pasted verbatim.
- [ ] Only palette colors (eyedropper check: nothing purple, neon, or warm cream).
- [ ] Waterline present and at 55-65% height.
- [ ] Roots visible.
- [ ] Line weight matches the others in the same deck.
- [ ] No text baked in except short mono labels (add real text in code/slides instead).
- [ ] Saved with the file naming above, in `brand/` subfolders.
