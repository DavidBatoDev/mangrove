# ADR-042 — Adopt the Mangrove brand kit as the design system

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-012, `docs/design-brief.md`, `docs/design.md`, BR-004, BR-006

### Context

`docs/design-brief.md` says "There is no brand seed. Do not invent a brand story." and leaves tokens, voice
and components to `docs/design.md`, which did not exist. In parallel, the team's designer built a brand kit and
a Figma deck (`brand/`, Figma file `tk6Ja5pTo6eFjC25uHHawB`): colors, type, textures, a logo, a deck template,
web components and a starter page. Its first wording came from a one-line brief, under the working name
"Rootline", and contradicted the product docs in places: it called the product "not a map", rated evidence
Strong/Moderate/Limited/Unknown, used red for errors, and banned the word "snapshot".

### Why now

Two builders are writing screens tonight. Without one look and one vocabulary, `web/` gets two of each, and
copy that overclaims ("certified", a score) ships first in a button label.

### Options considered

1. **Keep "no brand seed" and write a plain `design.md`** — pros: no story to defend / cons: no visual identity for a judged demo and pitch; each builder picks styles; the deck and the product look unrelated.
2. **Adopt the kit, and re-ground its wording and status visuals in the product docs** — pros: one look across web, deck and pitch, already built; the metaphor (promise above the waterline, evidence below) describes the product / cons: one more folder to keep in sync with the PRD.

### Decision

Adopt `brand/` as the design system, named **Mangrove** (ledger §1). Its wording follows the product docs:

- Keywords (the team's choice): Restoration, Evidence, Traceable, Baseline, Promise, Confidence, Follow-through, each defined by the PRD object it names. Baseline = the snapshot frozen at lock; Confidence = `docs/methods.md` §2 High/Medium/Low on numbers; Follow-through = the two checks.
- Status words are BR-001's: supported, conflicting, missing, too early to tell.
- Red (`--mg-conflict`) is only for a conflict (BR-004, design brief §2). Errors use caution ochre.
- The design brief's banned copy is merged into the kit's banned list. "Demo data" and the record disclaimer are components.

`docs/design.md` owns routes, states and pin colors, and points to `brand/` for tokens, components and voice
instead of copying them.

### Why this option

Option 1 would leave the most visible part of a judged demo to chance. The kit's risks were all wording and
status semantics, and those are fixed by making the PRD win, which the kit now states in its header.

### Overrides

- **Prior ADRs:** none.
- **Doc or plan truth:** `docs/design-brief.md` "There is no brand seed. Do not invent a brand story." The brief's other constraints (§2 principles, §4 copy, §5 map, §6 accessibility) stand and are carried into `brand/BRAND.md` and `docs/design.md`.
- **Out of scope:** does not change any feature, story, rule, route requirement or number. If `brand/` and the PRD disagree about behaviour, the PRD wins.

### Consequences

- **Easier:** builders import `brand/mangrove.css` and copy `brand/starter.html`; agents (Kiro steering `.kiro/steering/branding.md`) apply the same rules.
- **Harder or owed:** wording changes in the PRD must be mirrored in `brand/BRAND.md` §2. The logo is still being redrawn; the Figma deck and `brand/logo/` must be re-synced when it lands.
- **Follow-up:** re-export `brand/slides/` after Figma changes.
