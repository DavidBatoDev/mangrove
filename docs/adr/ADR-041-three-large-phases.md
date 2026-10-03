# ADR-041 — Three large phases instead of six small ones

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** David, Ethan
- **Related:** DEC-011, ADR-039, ADR-038

### Context

ADR-039 split the night into six phases (P0–P5), each one feature group, each ending in an integration
merge. Before Phase 0 started, the team asked for a large change per phase instead: fewer merges, each one
moving the product a long way.

### Why now

Phase 0 is about to start, and its scope depends on this.

### Options considered

1. **Keep six phases** — pros: small merges, early warnings / cons: about ten minutes of integration six times; each phase ships too little to show.
2. **Two phases** — pros: one mid-night merge / cons: the first merge is at about 3 AM; a broken contract is found late.
3. **Three phases** — pros: a first merge by 01:30 that proves the contract and puts the read path and MCP live; a second that makes everything real; a third only for hardening / cons: each merge is larger and conflicts are harder to untangle.

### Decision

The phase table in ADR-039 is replaced by this one. Everything else in ADR-039 (branches, per-phase
ownership asked at each phase start, integration steps, orchestrator scope) stands.

| Phase | Target end | Frontend owner builds | Backend owner builds | Result after the merge |
|-------|------------|-----------------------|----------------------|------------------------|
| **P0 — The story, end to end** | 01:30 | All eight screens in `docs/prd.md` §5.1; the whole demo story clickable on `web/mocks` fixtures, with in-memory fakes for sign-in, lock and evidence, including the red pin | Neon schema with append-only triggers and grants; seed from `data/sites/README.md` (sites, demo orgs and users, demo ground evidence, one published record); engine; ledger hashing; read endpoints API-004, 005, 006, 010, 011, 013, 016; the six MCP tools at `/mcp`; pytest for TC-004, 008, 014, 015 | Deployed with mocks off: real read path and MCP live, so Amazon Quick can connect |
| **P1 — Make it real** | 05:00 | Every screen on the real API; real sign-in, lock, evidence upload and conflict; all states | Sign-in (API-001…003), lock (API-009), evidence with S3 (API-008), corrections (API-012), assets (API-014), GMW v4.1.12 ingest, Sentinel-2 snapshot and refresh (API-007), rate limits | The whole demo runs on the deployed site with real data; the Quick conversation is tested |
| **P2 — Demo-ready** | 08:30 code freeze | Copy and design pass (`docs/design-brief.md` §4), TC-020 in Playwright, projector check | Remaining test cases, the security gate (`docs/security.md` §8), keep-warm | Rehearsed demo; 08:30–10:00 video and submission |

The demo cast and fixed ids that both halves build from are in `data/sites/README.md`.

### Why this option

The team wants each phase to be visible progress, not bookkeeping. Three phases keep a contract check early
(01:30) while giving each builder a long, uninterrupted stretch.

### Overrides

- **Prior ADRs:** ADR-039, its "Phases" table only.
- **Doc or plan truth:** none outside ADR-039.
- **Out of scope:** Does not change ADR-038's rule that mocks are off in the deployed build.

### Consequences

- **Easier:** two working sessions of about two and three and a half hours each; fewer context switches.
- **Harder or owed:** a larger merge at 01:30 and 05:00; mid-phase contract changes must travel as notes (ADR-040) so the merge is not the first time a side hears of them.
- **Follow-up:** none.
