---
name: adapt-brand-to-repo
description: Re-ground the Mangrove brand wording (descriptor, tagline, keywords, supporting terms, voice and tone, sample copy) in what the product actually is, by reading the product repo, then update the brand files and the Figma deck text to match. Use when the brand kit is moved into a new repo, when the product scope changes, or when someone says the brand keywords or description don't fit the product.
---

# Adapt the brand wording to the real product

The brand kit in `brand/` was written from a one-line product brief. The **visual system is final**; the **words** are a first draft. This skill replaces the draft words with ones grounded in the actual codebase and docs.

## Scope

| Change (wording) | Never change (visual system) |
|---|---|
| Product name only if the team asks (BRAND.md header explains the rename) | Colors, tokens, fonts, type scale |
| Tagline, descriptor, "what we are / are not" (BRAND.md §1) | Logo, icons, textures, illustrations |
| The keywords, their meanings, examples, "don't swap for" (§2) | Layouts, slide structure, `mangrove.css` classes |
| Supporting terms and banned words (§2) | The Waterline motif and the confidence encoding (§6) |
| Voice, tone table, do/don't examples (§3) | |
| Sample copy in decks, `starter.html`, `index.html`, WEB.md examples | |
| Field-plate/annotation labels in IMAGERY.md prompts | |

If the product turns out to be something the visual metaphor no longer fits (for example, not about evidence or restoration at all), stop and report that. Don't force it.

## Step 1. Read the product (no edits yet)

Read broadly, then deeply. Note `file:line` for everything you learn.

1. `README*`, `docs/`, `*.md` at any depth, ADRs, PRDs, pitch or grant text, `CONTRIBUTING`, issue and PR templates.
2. Domain model: database schema and migrations, ORM models, API routes or OpenAPI specs, GraphQL schema, TypeScript types and enums. **These names are the product's real vocabulary.**
3. User-facing strings: UI components, i18n/locale files, emails, error messages, onboarding, empty states, page titles, meta descriptions.
4. `package.json` / `pyproject` names and descriptions, landing page copy, existing marketing pages.
5. Who the users and roles are (auth roles, permissions, personas in docs).

From this, write down:
- **What the product does**, in the team's own words (quote them).
- **Who uses it**: primary and secondary roles.
- **Core objects and their lifecycle**: the nouns and states in the code, in order.
- **What it explicitly does not do**: scope limits, disclaimers, non-goals.
- **Existing tone**: how current copy sounds, and the words it already uses.

## Step 2. Compare against the brand draft

For each of these, mark **keep / adjust / replace** with evidence:

- BRAND.md §1: tagline, descriptor, what we are / are not.
- §2: each keyword. Prefer the term the code already uses for an entity over a new brand word. Renaming code to fit a brand word is expensive; renaming a brand word is cheap. If the code uses `project` where the brand says `opportunity`, propose following the code unless the docs make the distinction.
- §2: supporting terms. Add any core domain noun the brand is missing, and remove terms for things the product doesn't have.
- §2: banned words. Keep the integrity bans (guarantee, certified, offset…). Add words that would misdescribe *this* product.
- §3: voice persona, tone table rows (one per real product moment found in Step 1), and do/don't examples rewritten with real objects and numbers from the docs or fixtures. Never invent metrics; use clearly fake placeholders if nothing real exists.

Keep the brand's integrity rules unless the product contradicts them: claims carry dates or citations, uncertainty is named, humans decide.

## Step 3. Write the proposal and stop for approval

Create `brand/ADAPTATION.md` containing:

1. **Product summary** (5–8 lines, quoted sources).
2. **Change table**: `Section | Current | Proposed | Why | Evidence (file:line)`.
3. **Keyword map**: old keyword → new keyword → code identifiers that use it.
4. **Open questions**: anything the repo doesn't settle (for example, a product name, or audience priority).
5. **Figma text changes**: slide → layer → current text → new text (see Step 5).

**Then stop and ask the team to approve or edit the proposal.** Brand wording is a team decision. Don't apply anything before approval.

## Step 4. Apply approved changes to the files

Apply only what was approved, then search the whole repo for every old word so nothing is left behind:

- `brand/BRAND.md` §1–§3 and §13 checklist wording
- `brand/tokens.json` → `keywords`
- `brand/WEB.md` examples, `brand/starter.html` copy, `brand/index.html` copy (text only; leave markup and classes alone)
- `brand/IMAGERY.md` annotation labels in prompts
- `.claude/skills/use-our-branding/SKILL.md` step 5, `.kiro/steering/branding.md`, `CLAUDE.md`, `AGENTS.md` (the keyword list, banned list and product one-liner)

Keep the result consistent: the same keywords appear identically in BRAND.md, tokens.json, the skill, the steering file and the deck.

## Step 5. Apply approved changes to the Figma deck

File: `https://www.figma.com/design/tk6Ja5pTo6eFjC25uHHawB/Mangrove`, page "Mangrove deck". Load the `figma:figma-use` skill before any `use_figma` call.

- **Edit text content only.** Don't move, resize, restyle, detach or recolor anything. Keep each headline's single italic accent word: if the sentence changes, pick the new accent word and keep it in its existing italic style range.
- Keep body copy within the slide's limits (max 25 words of body, 2–3 headline lines). If new text overflows its frame, shorten the words; don't shrink the type.
- Slides that carry brand wording:

| Slide | Node | What to update |
|---|---|---|
| G01 Cover | `7:21` | Tagline, descriptor |
| G02 The idea | `7:121` | The one-line idea, explanation |
| G06 Keywords | `8:244` | All keywords, meanings, examples |
| G07 Voice | `8:351` | Voice persona, tone examples |
| G12 Closing | `9:742` | Tagline, contact line |
| T01–T08 templates | `10:769`, `10:869`, `10:969`, `10:1020`, `11:1024`, `11:1143`, `11:1226`, `11:1262` | Sample headlines and evidence copy, so the templates show real product language |

- Read each slide's text nodes first (`get_metadata` on the node), list exact before/after in `ADAPTATION.md`, apply, then screenshot each changed slide and check nothing overflows.
- Re-export every changed slide to `brand/slides/` (same filenames, 1920 wide for T-slides, 1600 for G-slides) so agents without Figma access see the new wording.

## Step 6. Verify

- Search the repo for each replaced word; nothing remains outside `ADAPTATION.md`'s history table.
- `starter.html` still renders (open it, or screenshot it headless) and copy fits its layout at 1440px and 375px.
- BRAND.md §13 checklist still reads correctly with the new words.
- Report: what changed, what was left unchanged on purpose, and open questions.
