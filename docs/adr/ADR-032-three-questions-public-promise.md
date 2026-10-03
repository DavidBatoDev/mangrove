# ADR-032 — The build contract is three questions, a locked promise, and a public map

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-002, F-005, F-007, F-008

### Context

The Google Doc's product tab describes four comparison dimensions: restoration need, plausible restoration
potential, possible environmental benefit, and evidence confidence (ADR-022, ADR-028). The team's later
summary, which is the build direction, asks three questions per site — was this mangrove before, what's
there now, what do people on the ground say — each marked supported, conflicting or missing, then locks a
promise and puts it on a public map.

### Why now

A 12-hour build cannot implement both phrasings. One of them has to be the contract the screens and the
engine follow.

### Options considered

1. **Keep the four dimensions as separate scored axes** — pros: closer to the long doc / cons: invites a composite score, which ADR-028 rejects, and adds UI with no new evidence.
2. **Three evidence questions plus agreement statuses, and a public locked promise** — pros: matches the demo script and ADR-028's statuses / cons: "possible environmental benefit" is not its own axis in the demo.

### Decision

The hackathon build follows the three questions, the locked promise, and the public map. "Supported" means
the usable sources agree on the finding; the finding is always shown next to the status. There is no
overall score. Environmental benefit is stated in the funder's own expected outcome on the promise, not
computed.

### Why this option

The four dimensions were a guard against collapsing the decision into one number. Statuses plus a visible
finding do that with less machinery, and the summary is what the team will demo.

### Overrides

- **Prior ADRs:** narrows how ADR-022's four dimensions appear in the demo. Does not unlock ADR-028's ban on a success score.
- **Doc or plan truth:** `docs/prd.md` §4 is the behaviour. This ADR is why it looks that way.
- **Out of scope:** Does not drop the later two checks (did the work happen, did the mangroves come back).

### Consequences

- **Easier:** one status function, one comparison layout, a demo that finishes.
- **Harder or owed:** a judge who read "four dimensions" needs the one-line answer in the pitch.
- **Follow-up:** none — the PRD already says this.
