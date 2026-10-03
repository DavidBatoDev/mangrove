# ADR-036 — The database is Neon Postgres + PostGIS, not a Compose container

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-006, BR-002, ADR-034

### Context

`docs/system-design.md` placed PostgreSQL + PostGIS in the Docker Compose stack as a `db` service. Before
the build window the team set up a Neon project instead (AWS `ap-southeast-1`, PostGIS available), and the
team chose to keep it.

### Why now

The scaffold, the Compose file and the connection settings are written in the first hour. Changing the
database after migrations exist costs more than deciding now.

### Options considered

1. **PostGIS container in Compose** — pros: no external dependency at demo time, never sleeps, full superuser control / cons: one more service on a t3.medium, backups and the volume are ours to look after, teammates cannot share one database from their laptops.
2. **Neon (managed Postgres + PostGIS)** — pros: one shared database every teammate and the EC2 host can reach, branches for testing, no container to run / cons: an outside network dependency during the demo; the free plan suspends compute after 5 minutes idle and that cannot be disabled; we are not superuser.

### Decision

Use Neon in `aws-ap-southeast-1` with the PostGIS extension. The app connects through the pooled URL
(`DATABASE_URL`); migrations and role setup use the direct URL (`DATABASE_URL_DIRECT`) as the project owner.
The append-only guarantee is unchanged: `BEFORE UPDATE OR DELETE` triggers on `evidence_item`,
`promise_record` and `record_event`, and a separate application role (`DATABASE_APP_ROLE`) granted
`SELECT, INSERT` only on those tables. Automated tests run against a Neon branch, not the demo branch.

### Why this option

The team already has the project, and a shared database lets four people build against the same seeded
data in parallel. The append-only rule depends on triggers and grants, which Neon supports, not on owning
the server.

### Overrides

- **Prior ADRs:** none. ADR-034's mechanism (triggers + grants + hash chain) stands as written.
- **Doc or plan truth:** `docs/system-design.md` §1, §4 (PostgreSQL row), §5, §6; `docs/data-model.md` intro; `docs/tests.md` §4. Those sections are updated in the same change.
- **Out of scope:** Does not change any table, field or constraint in `docs/data-model.md`.

### Consequences

- **Easier:** no database container; one shared seeded database; cheap test branches.
- **Harder or owed:** a keep-warm `SELECT 1` every 4 minutes from the EC2 host during the demo window, and a connect timeout with one retry, so the first request after idle does not stall on stage. The demo depends on Neon being reachable.
- **Follow-up:** record the Neon project id in `docs/ledger.md` §1 when it exists.
