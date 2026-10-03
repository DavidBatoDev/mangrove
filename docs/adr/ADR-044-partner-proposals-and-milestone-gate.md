# ADR-044 — Partner proposals and a public milestone gate

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-014, ADR-032, ADR-041, F-016, F-020, EQ-012

### Context

ADR-032 is the build contract: three questions, a locked promise, and a public map. In that contract the funder compares sites, writes the promise, and a field partner uploads evidence afterward. The map shows pins for promises. It does not show a site that has no commitment. Benefit is a sentence on the promise, not a number the product computes.

A later meeting asked for a different writer and a public check. The partner (called innovator in the room) supplies the site, the timeline, the milestones and the proposed benefit before a funder sees that package. The public sees the promise, the milestone reports and the outcome. "Did it happen?" needs both a partner report and a satellite observation. A mismatch is flagged and the funder is notified. Legal consequences stay in the funder-partner contract.

The same meeting assigned Sentinel-1 to in-progress tracking, Global Mangrove Watch to completion, and AlphaEarth as a third success input. That assignment contradicts ADR-033, EQ-008 and EQ-012 in `docs/methods.md`, and the AlphaEarth decision (F-016, ADR-030). A new planting is smaller than a 10–20 m pixel, so Sentinel-1, Sentinel-2 and AlphaEarth cannot confirm an early milestone. Global Mangrove Watch is annual mangrove extent from 1985 at 30 m. It can show whether mangrove pixels are present in a later year. It is not a completion certificate for this season's planting, and the layer lags. AlphaEarth's published layer is an annual 64-number summary through 2024. A change in that vector does not mean mangrove came back. The word "successful" in the room is the success score ADR-028 already bans.

### Why now

`docs/prd.md`, `idea.md` and `docs/methods.md` still describe the funder as the writer. P0 is building that story (ADR-041). The meeting's flow has to be the contract before more screens follow a writer the meeting replaced. This change is docs only. It ships no code.

### Options considered

1. **Keep ADR-032's writer** — pros: the eight P0 screens stay the contract / cons: the partner does not propose the site, the benefit, the timeline or the milestones.
2. **Use the room's sensor assignment as the gate** — pros: matches the words said in the meeting / cons: an early "it happened" check on Sentinel-1, Sentinel-2, AlphaEarth or Global Mangrove Watch would invent a measurement the methods already refuse, and "successful" would reopen ADR-028.
3. **The partner proposes the public terms, the funder commits, and the gate uses only inputs the methods already allow** — pros: keeps the meeting's roles and the flag, without a new sensor claim / cons: ADR-041's P0 screen list is behind the PRD until a later build.

### Decision

A partner proposes a site and the public terms: the benefit in the partner's words, a timeline, and milestones. A funder commits to that proposal. The public map shows sites with a commitment and sites without one, and the reader can toggle between them.

The milestone gate:

- Early milestones, before the outcome date, take the partner's photo, GPS and mapped area only. The satellite line reads "not yet observable". That line is not a fail.
- After the outcome date, both are required: the partner's report, and the Sentinel-2 vegetated-area check (EQ-012). If they disagree, the record is flagged and the funder account is notified.
- The product does not declare fraud, dispatch an inspector, or apply a penalty. Consequences stay in the private contract.
- The product does not say "successful" and does not certify. When the two required inputs agree, the status is that the sources agree. The record footer stays: this is not a certification.
- Environmental benefit is the partner's words, displayed as written. The product does not compute one.
- There is no marketplace fee. Listing a proposal is not brokering.

AlphaEarth (F-016) and Sentinel-1 (F-020) stay off the gate (ADR-030). Global Mangrove Watch stays history (EQ-002, EQ-003): context beside an outcome, not a pass and not a fail.

When this decision and the P0 screen list in ADR-041 disagree, the flow in `docs/prd.md` wins until a later build updates that list. ADR-041 is not edited.

### Why this option

Option 1 keeps a writer the meeting replaced. Option 2 would publish a measurement the pixel size cannot support. Option 3 keeps the roles, the public record and the flag, and leaves each source in the job `docs/methods.md` already gives it.

### Overrides

- **Prior ADRs:** ADR-032, on who writes the proposal and on a map that shows only promises. The three questions, the agreement statuses, and the ban on a computed benefit stay. ADR-041, on the P0 screen list only, and only by the rule above: the PRD flow wins when they disagree. ADR-041's text is unchanged.
- **Does not override:** ADR-024 (the software does not punish), ADR-028 (no success score), ADR-033 (the work check uses a mapped area), ADR-034 (append-only hash chain), or the no-fee half of ADR-029. Listing a proposal does not reopen fees. Does not reopen Neon (ADR-036), S3 (ADR-037), person branches (ADR-039), notes (ADR-040), or the brand kit (ADR-042).
- **Doc or plan truth:** `docs/prd.md` (flow, stories, non-goals), `idea.md` §2 and §7, `docs/methods.md` (milestone inputs), `docs/data-model.md` and `docs/security.md` (confidential contract, public projection), `docs/api.md`, `docs/tests.md`, `docs/pitch.md`, `docs/design.md`, and the cast prose in `data/sites/README.md`.
- **Out of scope:** `api/`, `web/`, `db/`, `infra/`, `brand/`, and `person/ethan`. A labelled sample contract and a labelled case study can wait. No owner of fabricated data is named here.

### Consequences

- **Easier:** the public check has two shapes, field-only early and both inputs after the outcome date, and neither shape pretends a pixel counted a seedling.
- **Harder or owed:** P0's screen list in ADR-041 is behind the PRD until a later build. `person/ethan` already implements the old read path and is left as it is. Builders hear about this from `notes/`, not from a code change. Amazon Quick still sees only the public subset, so the unauthenticated MCP server stays.
- **Follow-up:** none in this change.
