# ADR-034 — Immutability is enforced in the database and exposed as a hash

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-004, F-007, F-012, BR-002, EQ-011

### Context

The product says a published promise cannot be edited or deleted, including by the funder who wrote it.
A rule that lives only in the API is one forgotten endpoint away from being false.

### Why now

The schema and the security gate are being written before any code, which is the cheap moment to decide
where the rule is enforced.

### Options considered

1. **API-only: no update routes** — pros: fast / cons: a direct SQL session, or a later endpoint, bypasses it.
2. **Append-only grants and triggers, plus a public SHA-256 chain** — pros: the app role cannot write an update; anyone can recompute the hash / cons: a database superuser can still rewrite rows and hashes together.
3. **Anchor each record on a public blockchain** — pros: a third party holds the hash / cons: wallet setup and a dependency we would have to explain, for a demo of five records.

### Decision

`evidence_item`, `promise_record` and `record_event` reject `UPDATE` and `DELETE` by trigger, and the
application role has `SELECT` and `INSERT` only. Each record and timeline event carries a SHA-256 over
canonical JSON (EQ-011), and the verify endpoint recomputes it. We do not anchor to a chain for the hackathon.

Copy says the record cannot be edited through Mangrove and that any change breaks the published hash.
Copy does not say alteration is impossible.

### Why this option

Option 1 is too weak for the claim. Option 3 spends the night on a property the demo does not need.
Option 2 makes the claim true against the application, and states the leftover risk instead of hiding it.

### Overrides

- **Prior ADRs:** none. This is the mechanism under ADR-024's "nobody can edit it afterward."
- **Doc or plan truth:** `docs/data-model.md` §3, `docs/security.md` T-002 and T-003.
- **Out of scope:** Does not provide a way to erase personal data from a published record. That residual risk is in `docs/security.md` §6.

### Consequences

- **Easier:** immutability is a test (TC-008), not a convention.
- **Harder or owed:** corrections are new timeline entries, never edits. The pitch must not say "tamper-proof."
- **Follow-up:** none
