# ADR-035 — Kiro is the only assistant named as a co-author

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-005

### Context

Kiro is a required platform for Build Over Nights 2026, and the team wants Kiro named on commits.
Other assistants (Claude, Codex, Cursor, ChatGPT, and others) must not be named as co-authors. Commit
messages are part of what a judge can read.

### Why now

The first commit of this repo has not been made. The rule is cheapest before any commit exists.

### Options considered

1. **No assistant trailers at all** — pros: nothing to get wrong / cons: drops the Kiro attribution the team asked for.
2. **Co-author whichever assistant produced the commit** — pros: accurate per tool / cons: puts non-Kiro assistants on the history the team does not want there.
3. **One allowed trailer, Kiro's, and no others** — pros: matches the request / cons: a commit made outside Kiro still has to follow the rule by hand.

### Decision

Every commit message ends with exactly one assistant trailer:

```
Co-authored-by: Kiro <noreply@kiro.dev>
```

No `Co-authored-by` for Claude, Codex, Cursor, ChatGPT, or any other model or assistant. No "Generated
with" trailer. The Author is a human teammate. `AGENTS.md` repeats this so every tool that reads it sees it.

### Why this option

The team asked for Kiro by name and excluded the others by name. One trailer is checkable; a list of
exceptions is not.

### Overrides

- **Prior ADRs:** none
- **Doc or plan truth:** `AGENTS.md` commit section.
- **Out of scope:** Does not change git author name, commit dates, or history. Commits are made when the team makes them. Dates are not rewritten.

### Consequences

- **Easier:** one line to add, one line to reject in review.
- **Harder or owed:** whoever commits from a tool that inserts its own trailer has to take that trailer out before committing.
- **Follow-up:** none
