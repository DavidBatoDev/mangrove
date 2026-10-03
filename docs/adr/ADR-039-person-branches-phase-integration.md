# ADR-039 — Two builders on person branches, integrated phase by phase by an orchestrator

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** David, Ethan
- **Related:** DEC-009, ADR-038, ADR-035

### Context

The team is two people, David and Ethan, not the four the intake assumed. They want to build the product
feature group by feature group, together, with one of them on the frontend and the other on the backend of
the same feature group, and the split may swap from phase to phase. Kiro must be the primary development
environment (hard requirement). `master` is the branch deployed to the demo host; there is no `main`.

### Why now

The first code is about to be committed. Where each person commits, and who joins the halves, has to be
settled before two histories exist.

### Options considered

1. **Both commit straight to `master`** — pros: no merging step / cons: constant conflicts in shared files; `master` (the demo) breaks whenever either half is mid-change.
2. **A branch and pull request per task** — pros: reviewable history / cons: dozens of PRs and a reviewer the team does not have, in eleven hours.
3. **One long-lived branch per person, merged into `master` at each phase by an orchestrator** — pros: each person works without waiting; `master` only moves when both halves pass the checks together / cons: integration is a step someone must do every phase, and a long-lived branch drifts if it is not synced back.

### Decision

**Branches.**
- `master`: the integration branch, deployed to the demo host (`docs/ledger.md` §1). Builders do not commit to it directly.
- `person/david` and `person/ethan`: each person's working branch, cut from `master`. Commits there follow ADR-035.

**Phases.** The build runs in feature groups from `docs/prd.md` §3. Times are targets for the night of October 3–4.

| Phase | Feature group | Target end |
|-------|---------------|------------|
| P0 | Contract and scaffold: fixtures (ADR-038), Next.js app, FastAPI app with `/api/v1/health` and `/mcp` mounted, Neon schema with append-only triggers and grants, seed of the demo sites, placeholder deploy | 00:00 |
| P1 | Browse and compare: F-001, F-002, F-005, F-006; MCP `list_sites`, `get_site_dossier`, `compare_sites`; Quick connector registered | 02:00 |
| P2 | Evidence in: F-003 (GMW ingest, Sentinel-2 snapshot and refresh), F-004 (field upload to S3), sign-in (API-001…003) | 04:00 |
| P3 | Promise and public map: F-007, F-008, F-012; MCP `list_records`, `get_record`, `verify_record` | 05:45 |
| P4 | Later evidence and conflict: F-009, F-010 | 07:15 |
| P5 | Demo hardening: TC-020, the Quick conversation (TC-013b), rehearsal; code freeze 08:30, then video and submission | 08:30 |

Tasks inside a phase live in Kiro specs (`.kiro/specs/`), per `AGENTS.md`; this table is not a task list.

**Layer ownership, per phase.** In each phase one person owns the frontend (`web/`) and the other owns the
backend (`api/`, `db/`, `data/`) of that feature group. Who takes which is decided at the start of every
phase: the orchestrator asks the team before the phase begins and states the assignment in the phase's
merge commit. P0 and P1 start with **David on the frontend and Ethan on the backend.** `infra/` belongs to the
orchestrator (deploy). A change to a contract doc (`docs/api.md`, `docs/data-model.md`, `docs/methods.md`) is
merged to `master` before code on either branch depends on it.

**Integration.** At the end of each phase, and whenever a builder asks mid-phase (for example, an endpoint
landed and a screen can cut over), the orchestrator:

1. fetches both branches;
2. merges the backend branch into `master`, then the frontend branch, with `--no-ff`, resolving conflicts;
3. runs the checks that exist at that point: `tools/check-doc-status.py`, `tools/check-context-overlay.py`, `pytest`, `npm test`, a Compose build, and a fixture-versus-real-response check of the cut-over screens (ADR-038);
4. pushes `master` only if the checks pass, and deploys it to the demo host;
5. merges `master` back into both person branches, so the next phase starts from the same code.

If a check fails, the merge is not pushed; the owner of the failing half fixes it on their branch.

**The orchestrator** is a Claude Code session in the main checkout. Its scope is merging, conflict
resolution, the small glue needed for the two halves to connect, verification, and deploy. It does not
author features: feature code is written by David and Ethan in Kiro. Anything larger than glue goes back to
the person who owns that layer in the current phase.

### Why this option

It lets two people build both halves of the same feature group at once while `master` only ever holds a
combination that passed the checks together. Asking at every phase keeps the split flexible without a
standing rule.

### Overrides

- **Prior ADRs:** none.
- **Doc or plan truth:** `context.md` frontmatter `team_size` becomes 2 (the handbook cap of 4 is unchanged). `AGENTS.md` gains a Branches section. Both updated in the same change.
- **Out of scope:** Does not change ADR-035's commit-trailer rule for the builders' commits.

### Consequences

- **Easier:** neither builder waits on the other; `master` stays demoable; each phase ends with a deploy.
- **Harder or owed:** an integration step of about ten minutes per phase; person branches must take `master` back after every merge or they drift.
- **Follow-up:** if the orchestrator session is unavailable, a builder runs the same five integration steps by hand.
