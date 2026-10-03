# ADR index — Mangrove

`docs/adr/` is the only why. The ledger cites an ADR; it does not restate it.

ADR-001 to ADR-030 were decided in the team Google Doc before this repo existed (Doc ID
`1-be18BqqkKIr4C2g5qmQkwt7s8t-RK8CNFcs2NXMoJg`, adrs tab). They are **not copied here** — copying them
would make a second copy that drifts. ADR-031 adopts them as prior decisions and says how to read them.
New decisions start at ADR-031. Never reuse a number.

| ADR | Status in the Google Doc | Decision, in one line |
|-----|--------------------------|------------------------|
| ADR-001 | retained | Keep mangrove restoration accountability as the domain. |
| ADR-002 | locked | Do not claim an 80–90% Philippine failure rate. |
| ADR-003 | locked | Describe outcomes as heterogeneous, not generally failing. |
| ADR-004 | locked | Do not reduce the problem to monitoring. |
| ADR-005 | locked | Do not build another mangrove map or monitoring dashboard. |
| ADR-006 | locked | Satellite data is evidence, not truth. |
| ADR-007 | viable, not final | Keep the claim → evidence → contradiction → check loop. |
| ADR-008 | mechanism, not the product | Community ground evidence is usable with a protocol. |
| ADR-009 | locked | Do not claim survival is never monitored. |
| ADR-010 | preference | Do not depend on government procurement as the business. |
| ADR-011 | direction | Sell to companies, NGOs, foundations and donors. |
| ADR-012 | candidate | An outcome-funded network is explored, not chosen. |
| ADR-013 | locked | Communities and consumers are not assumed to be the buyer. |
| ADR-014 | locked | Never reward a "successful" observation. |
| ADR-015 | locked | Optimize for a real problem, a 12-hour build, and the rubric. |
| ADR-016 | historical | Do not treat an early concept as the final product. |
| ADR-017 | working | One core mechanism, one reinforcing layer. |
| ADR-018 | working guardrail | Screening, not certification; abstain when evidence is thin. |
| ADR-019 | locked framing | Accountability covers the decision, not only the finished asset. |
| ADR-020 | superseded by ADR-021 | Pre-implementation accountability, replaced as the build direction. |
| ADR-021 | locked | Help funders compare sites, then publish a record that can be checked. |
| ADR-022 | locked | "Deserves money" means the environmental case, not investment readiness. |
| ADR-023 | locked | GMW, Sentinel-2, field evidence stay separate layers. |
| ADR-024 | locked | A public baseline plus a later comparison; the software does not punish. |
| ADR-025 | hypothesis | Funders and campaign operators are the commercial surface. Not validated. |
| ADR-026 | locked | Public data and AI are not the moat. |
| ADR-027 | locked | Integrated evidence is a decision mechanism, not a dashboard. |
| ADR-028 | locked | Provenance on every item; explicit statuses; no success score. |
| ADR-029 | hypothesis | Start with B2B software. Willingness to pay is unvalidated. |
| ADR-030 | locked | Three working sources beat seven integrations. |

| ADR | Status here | Decision |
|-----|-------------|----------|
| [ADR-031](ADR-031-adopt-prior-decisions.md) | Accepted | Adopt ADR-001..030 as prior decisions; do not renumber them. |
| [ADR-032](ADR-032-three-questions-public-promise.md) | Accepted | The build contract is three questions, a locked promise, and a public map. |
| [ADR-033](ADR-033-work-check-uses-mapped-area.md) | Accepted | "Did the work happen?" is checked against a mapped area, not against satellite pixels. |
| [ADR-034](ADR-034-append-only-hash-chain.md) | Accepted | Immutability is database-enforced and hash-chained. It is tamper-evident, not tamper-proof. |
| [ADR-035](ADR-035-kiro-coauthor-only.md) | Accepted | The only assistant co-author trailer on a commit is Kiro's. |
| [ADR-036](ADR-036-neon-managed-postgis.md) | Accepted | The database is Neon Postgres + PostGIS, not a Compose container. Append-only triggers and grants stand. |
| [ADR-037](ADR-037-s3-asset-store.md) | Accepted | Evidence photos live in a private S3 bucket through the instance role, not on a filesystem volume. |
| [ADR-038](ADR-038-parallel-frontend-backend.md) | Accepted | Frontend and backend are built in parallel; the UI starts on fixtures equal to `docs/api.md` and cuts over per screen. |
| [ADR-039](ADR-039-person-branches-phase-integration.md) | Accepted | David and Ethan work on person branches; an orchestrator merges them into `master` per phase after checks. |
| [ADR-040](ADR-040-notes-with-every-message.md) | Accepted | Every message between David and Ethan comes with a note in `notes/`, delivered to the recipient's branch. |
| [ADR-041](ADR-041-three-large-phases.md) | Accepted | Three large phases (P0 story end to end, P1 make it real, P2 demo-ready) replace ADR-039's six. |
| [ADR-042](ADR-042-sentinel2-from-earth-search.md) | Accepted | Sentinel-2 L2A comes from Earth Search COGs (no account), not the Copernicus Statistical API. |
| [ADR-043](ADR-043-adopt-brand-kit.md) | Accepted | The Mangrove brand kit (`brand/`) is the design system; its wording follows the PRD; red is for conflict only. |
| [ADR-044](ADR-044-partner-proposals-and-milestone-gate.md) | Accepted | A partner proposes the public terms, a funder commits, and the milestone gate flags disagreement. ADR-041's P0 screen list is behind the PRD when they disagree. |
| [ADR-045](ADR-045-gmw-context-widgets.md) | Accepted | Mangrove context from GMW (site and nearby trend, bay layer, national card); the history answer stays honest. |
| [ADR-046](ADR-046-google-maps-display-only.md) | Accepted | Google Maps for visualization only (2D + 3D); evidence stays with GMW and Sentinel-2; MapLibre is the fallback. |
| [ADR-047](ADR-047-deploy-on-push-to-master.md) | Accepted | Every push to `master` redeploys the demo host through GitHub Actions, OIDC and SSM, with rollback on a failed health check. |
| [ADR-048](ADR-048-ph-mangrove-extent-tiles.md) | Accepted | Mangrove extent for the whole Philippines, served by the API as brand-Tidal map tiles on Google and MapLibre; context only. |
| [ADR-049](ADR-049-mangrove-layer-cyan-and-open-tiles.md) | Accepted | The mangrove layer uses a dedicated GMW-style cyan token; API-024 tiles allow any origin so fixtures mode shows real tiles. |
| [ADR-050](ADR-050-mangrove-change-layer-and-legend-filters.md) | Accepted | GMW mangrove gain/loss as map tiles (API-025), loss in red as a named map-data exception; compact legend toggles and filters layers; tiles to zoom 22 with a fade. |
| [ADR-051](ADR-051-real-sourced-case-records.md) | Accepted | Four real, sourced Post-Yolanda records (`is_demo = false`) beside the demo cast; `public_report` evidence always links its source; real organizations only as cited parties, no individuals; reconstructed, not locked at the time. |
