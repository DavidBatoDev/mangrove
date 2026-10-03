# ADR-031 — Adopt the Google Doc's ADR-001 to ADR-030 as prior decisions

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-001

### Context

Thirty decisions already exist in the team Google Doc, several of them locked for this hackathon
(ADR-021 through ADR-030). This repo is where the build happens. Renumbering those decisions, or
re-deriving them in chat, would fork the history.

### Why now

The docs in this repo are being generated from that brief. They need one place that says the earlier
numbers still stand.

### Options considered

1. **Copy all thirty ADRs into this repo** — pros: offline / cons: two copies that will drift within a day.
2. **Start this repo's numbering at ADR-001 and ignore the doc** — pros: a clean folder / cons: throws away locked decisions and collides with their numbers.
3. **Index them and start new numbers at ADR-031** — pros: one chain, no copy / cons: reading a pre-031 decision means opening the Google Doc.

### Decision

ADR-001 to ADR-030 stay the Google Doc's. This repo indexes them in `docs/adr/README.md` and does not
restate them. New ADRs start at ADR-031. A locked decision there is not reopened here without new evidence.

### Why this option

The doc is already the team's decision record. Copying it does not make it more true, and renumbering it
breaks every `[ADR-0xx]` citation in `idea.md` and `context.md`.

### Overrides

- **Prior ADRs:** none
- **Doc or plan truth:** none
- **Out of scope:** Does not change any product behaviour those ADRs already locked.

### Consequences

- **Easier:** agents can see what is already decided and what number comes next.
- **Harder or owed:** anyone who needs the full text of ADR-021 opens the Google Doc.
- **Follow-up:** none
