# Mangrove — Agent guide

Mangrove makes a mangrove funding promise public before the money moves, then shows whether it came true. It serves restoration funders who cannot tell which sites are worth funding, or show later that the work happened.

Teammates need `/docs` and this file. Do not commit the `fmd/` folder.

## Read order

Do this before every change. Stop as soon as you have the owner.

1. Open [`docs/index.md`](docs/index.md) §0. Find the one row for the concern you are about to change. Open that file only.
2. If §0.5 has a row for that same concern, read it. That row is the active choice. It names a `DEC-###`; that entry in [`docs/ledger.md`](docs/ledger.md) cites the ADR. Read that ADR next.
3. If you are asking why, or §0.5 has no row, read [`docs/adr/`](docs/adr/) newest first. ADR-001 to ADR-030 are indexed there and their text is in the team Google Doc. The newest Accepted ADR for that concern wins until the owning doc is updated.
4. There is no `BUILD.md`. Kiro specs (`.kiro/specs/`) are the task tracker. Do not create a second one.
5. Do not open the pitch unless the task is the pitch.

When two docs disagree, this order wins:

1. The §0.5 row for that concern.
2. The newest Accepted ADR for that concern.
3. The owning doc from §0.
4. Older ADRs.

`docs/adr/` is the only why. The ledger records what is active and cites an ADR. It does not restate the why. Chat is not a record.

## Where to write

| You decided | Write it in |
| --- | --- |
| What the user can do, a story, or a flow | [`docs/prd.md`](docs/prd.md) |
| How the pieces connect | [`docs/system-design.md`](docs/system-design.md) |
| Stored shape | [`docs/data-model.md`](docs/data-model.md) |
| A computed number, a threshold, a confidence | [`docs/methods.md`](docs/methods.md) |
| An endpoint or an MCP tool | [`docs/api.md`](docs/api.md) |
| Look, components, or routes | `docs/design.md`, which does not exist yet. Start from [`docs/design-brief.md`](docs/design-brief.md) and create `docs/design.md` from it. |
| Auth or threats | [`docs/security.md`](docs/security.md) |
| What you will not build | PRD non-goals, or a Won't row in `idea.md` §7. A reason and a revisit condition. |
| Why you chose | a new file under [`docs/adr/`](docs/adr/) |

The PRD file is `docs/prd.md`. Do not rename it to `product.md`.

Story priority on a product story is Must, Should, or Could. Won't is only for a feature that has no story.

## Writing an ADR

Add `docs/adr/ADR-NNN-short-slug.md` when behavior, structure, security, or the plan changed, or when a later reader would ask why. Skip a trivial edit with no lasting why.

The next free number is ADR-036. Never reuse a number. Never edit an Accepted ADR.

Fill Context, Why now, Options (at least two), Decision, Why this option, Overrides, Consequences. Same change as the code or doc it records. Add a §3 entry to `docs/ledger.md` that cites the ADR in the same commit; the pre-commit hook blocks the commit otherwise.

## Pivot

1. Write the new ADR. In Overrides, name the old ADR and the doc section it beats.
2. Add a `DEC-###` entry at the top of `docs/ledger.md` §3 that cites the new ADR. Do not renumber old DEC ids. The next free number is DEC-006.
3. If you can update the owning doc in this change, do that and do not add a §0.5 row. If you cannot, add one §0.5 row: the concern, the owning doc, the `DEC-###`, and the section it overrides.
4. Leave the old ADR as it was.

## Commits

- The Author is a human teammate.
- Kiro is the only assistant co-author. Every commit ends with this trailer, and no other co-author trailer:

```
Co-authored-by: Kiro <noreply@kiro.dev>
```

- Always add that line, including when Cursor, Claude, Codex, ChatGPT, or another tool made the commit. Kiro is the exception. There is no second exception.
- No `Co-authored-by` for Claude, Codex, Cursor, ChatGPT, or any other model or assistant. No "Generated with" trailer. Do not name an assistant in the message body.
- If a tool inserts its own trailer, delete that line before the commit is published. The published message has Kiro's line and no other co-author line.
- Do not rewrite commit dates or history to change when a commit appears to have happened.

## Before you finish

- Tests for this change pass, or the change is docs-only and `docs/tests.md` names the case that will cover it.
- A Must or Should story you touched has an observable Given/When/Then line.
- A real decision has a new ADR and a ledger line.
- No secrets in the diff. `.env` stays untracked.
- A displayed number cites its `EQ-###` and a confidence from `docs/methods.md`. The model does not invent one.

## Stack currency

Verify a library, API, or version against that version's current docs before coding. Do not write an API from memory. Nothing is pinned yet; pin versions in the manifest when the project is scaffolded, and record them in `.cursor/rules/stack-currency.mdc`.

Until then, these are the facts already checked against current docs (2026-10-03):

- Copernicus Statistical API: `POST https://sh.dataspace.copernicus.eu/statistics/v1`, OAuth client credentials at `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`.
- Sentinel-2 scene classes used here are the SCL band: 4 vegetation, 5 bare soil, 6 water.
- Amazon Quick MCP is remote only, prefers streamable HTTP, accepts an unauthenticated server, and rejects tool schemas that are not JSON Schema draft 7 or later (`required` is an array at the schema root).
- Areas use PostGIS `ST_Area` on a `geography`, not on a geometry.

## Commands

```text
Not scaffolded. No build command exists yet.
Expected when it does: docker compose up, then the web and API dev servers named in the README of that scaffold.
```

```text
Not scaffolded. No test command exists yet.
The contract is in docs/tests.md: pytest, and npm test for the one Playwright spec.
```

Ask before changing: the append-only grants and triggers on `evidence_item`, `promise_record` and `record_event`; the thresholds in `docs/methods.md` §3.1; Accepted ADRs; `fmd/`.
