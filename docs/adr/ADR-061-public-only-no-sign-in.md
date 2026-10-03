# ADR-061 — Public-only: no sign-in; anyone can add evidence and lock a promise

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (built by the orchestrator at the team's request)
- **Related:** DEC-032, API-001, API-002, API-003, API-008, API-009, US-006, US-007, US-010, BR-002, EQ-011, TC-034

### Context

The product was specified with two signed-in roles (funder, field partner) and a public reader. Sign-in only ever
existed in the web app's fixtures mode: the live API had no accounts and no write endpoints, so on the deployed
site nobody could add evidence or lock a promise. The team chose to present the product from the public's
perspective: no accounts, while anyone can still contribute.

### Why now

The demo should show contributions working on the live site, without a sign-in step judges cannot get past.

### Options considered

1. **Build sign-in (API-001..003) and keep the roles** — pros: the original design / cons: password handling and sessions to build and secure tonight; judges need demo credentials.
2. **No accounts; contributors type who they are; open writes with abuse limits** — pros: every visitor can try it; nothing secret to manage / cons: anyone can write, and what they type about themselves is not verified.
3. **Read-only public product** — pros: no write risk / cons: drops evidence and locking, the core of the story.

### Decision

- **No sign-in.** API-001..003, the `/sign-in` page and the session provider are removed. All screens are public.
- **API-008 `POST /api/v1/evidence`** (JSON, no photo) and **API-009 `POST /api/v1/records`** are open. Each body carries a `submitter`: name (required), organisation (optional), role (`field_partner` / `funder` / `resident`) and an optional contact email. A funder's "Did the work happen?" is a project report (claimed area); everything else is a field observation with a GPS point. `current` stays satellite-only.
- **What is shown:** name, organisation and role, as "Submitted by" on evidence and "locked by" on a record. **The contact email is personal data:** stored for follow-up only, never returned by the API or MCP, never hashed, never displayed.
- **Integrity (EQ-011):** submitter name, organisation and role are part of the content hash when present, so the existing hashes of every earlier item and record are unchanged. Writes stay INSERT-only through the ledger (BR-002).
- **Abuse limits** in place of accounts: per client IP, 10 evidence items and 3 locks per hour; bodies over 32 KB are refused; one promise per site; locking needs an `Idempotency-Key`.
- **Schema:** `db/init/008_public_submissions.sql` adds nullable submitter columns and lets a record or timeline event exist without an account (`funder_org_id`, `created_by_user_id` nullable; a record needs an organisation or a typed name).

### Why this option

It shows the product working for anyone, live, without inventing accounts, and keeps the one guarantee that matters,
an uneditable public record.

### Overrides

- **Prior ADRs:** the role model in the PRD and ADR-038's fixtures-only sign-in.
- **Doc or plan truth:** `docs/api.md` API-001..003, API-008, API-009 and §5; `docs/security.md` §3, §4, §8 (updated in this change). `docs/prd.md` §2 personas, US-005/006/007/010/012/016 role wording and §5 sign-in screens, and `docs/design.md`'s `/sign-in` route, are overridden through `docs/index.md` §0.5 until reconciled.
- **Out of scope:** no change to any EQ, threshold or status rule.

### Consequences

- **Easier:** anyone can add evidence or lock a promise on the live site.
- **Harder or owed:** submitter identity is self-declared and unverified (shown as such); spam is limited, not prevented; the contact email must stay out of every read path, export and log.
- **Follow-up:** moderation view for the team; reconcile the PRD and design docs and remove the §0.5 rows.
