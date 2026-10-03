# ADR-040 — Every message between builders comes with a note in the repo

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** David, Ethan
- **Related:** DEC-010, ADR-039

### Context

David and Ethan build on separate branches (ADR-039). Mid-phase, one of them often has to tell the other
something: "the dossier endpoint now returns X", "I renamed a field", "I need `compare_sites` to also return
Y", "the seed has five sites, here are their ids". A chat message alone does not reach the other branch,
is lost by morning, and cannot be read by the Kiro agent working on that branch.

### Why now

The two branches are being created now, and the first cross-branch message will follow within the hour.

### Options considered

1. **Chat only** — pros: fastest / cons: no record on the branch; the other person's Kiro agent never sees it; context is gone when someone wakes up at 6 AM.
2. **Orca orchestration mail** — pros: inbox and reply tracking / cons: only works inside one Orca runtime, and the two builders may be on different machines.
3. **A note file committed in the repo with every message, delivered to the recipient's branch** — pros: the context travels with the code; any agent on that branch can read it; history shows who asked what and when / cons: a minute of writing per message, and a delivery step.

### Decision

Whenever David or Ethan sends the other a message about a change, a request, a question or context, it
comes with a note:

1. **Write** `notes/<YYYYMMDD-HHMM>-<from>-to-<to>-<slug>.md` from `notes/TEMPLATE.md` (from, to, time, phase, branch and commit, type, what changed or what is needed, why, what the recipient should do, what it affects, how to check).
2. **Commit it on its own** on your person branch: `note(<from>-><to>): <subject>`, a commit that touches only `notes/`, and push.
3. **Deliver it to the recipient's branch.** The orchestrator cherry-picks the note commit onto the recipient's branch and pushes it. It reaches `master` at the next phase merge. If the orchestrator is not available, the recipient cherry-picks it or reads it with `git show origin/person/<sender>:notes/<file>`.
4. **Then send the chat message**, naming the note file. The note is the record; the chat is the doorbell.

A note is never edited after it is sent. A reply or follow-up is a new note whose `reply_to` names the
earlier one. A note announces a fact; it does not own it. A contract change still goes into `docs/api.md`,
`docs/data-model.md` or `docs/methods.md` and to `master` first (ADR-039); the note points at it.

### Why this option

The point of the message is that the other side's code and agent act on it. Only a file on their branch
reaches both. Note-only commits cherry-pick without conflicts, and the same note arriving again through the
phase merge is an identical change on both sides, so it merges cleanly.

### Overrides

- **Prior ADRs:** none.
- **Doc or plan truth:** `docs/index.md` §0 gains a row saying `notes/` holds messages, not facts. `AGENTS.md` gains a short section. Both updated in the same change.
- **Out of scope:** Does not replace talking to each other; it only requires that a change-carrying message leaves a note.

### Consequences

- **Easier:** either builder, or their Kiro agent, can rebuild the other side's recent changes and requests from `notes/` alone; the orchestrator can check that each phase's requests were answered.
- **Harder or owed:** about a minute per message, and the orchestrator delivers notes promptly so nobody waits on one.
- **Follow-up:** none.
