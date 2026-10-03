# ADR-051 — Real, sourced Post-Yolanda records beside the fictional demo cast

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (Ethan owned frontend and backend for this change)
- **Related:** DEC-021, BR-006, F-001, US-001, EQ-017, DS-009, TC-029, TC-030, [`docs/case-study-yolanda.md`](../case-study-yolanda.md)

### Context

Every site, organization and record in the app is fictional (BR-006) and sits on Manila Bay (PRD §6). The
team compiled a sourced case study of the ₱1 billion Post-Yolanda Mangrove and Beach Forest Development
Project (MBFDP, DENR): planting was verified, survival was not. That is the gap Mangrove exists to close.
The case names four places with public figures: Paraiso (Tacloban), Cancabato Bay (Tacloban), Ormoc, and
Eastern Samar (Bungtod, Guiuan).

### Why now

Judges ask "would this have worked on a real case?". A fictional cast cannot answer that; the case study can,
if it is shown in the same record page as the demo.

### Options considered

1. **Keep fictional records only** — pros: no naming risk / cons: nothing shows the product on a real promise.
2. **Tell the case in the pitch only** — pros: no data or code change / cons: the claim is not inspectable; nobody can open the record.
3. **Add real, sourced records with `is_demo = false`** — pros: the same record page, checks and hashes on a real case; every item links its source / cons: real names appear, so the naming and framing rules must be tight.

### Decision

- Four real sites in region "Eastern Visayas", each with a promise record, the three site questions, the
  work and outcome checks, and a cited evidence timeline. Fixed ids and polygon basis: [`data/sites/real/README.md`](../../data/sites/real/README.md).
- A new evidence source type `public_report` (DS-009, EQ-017). Every such item must carry `provenance_url`
  (database CHECK). A finding is chosen from the PRD §4.1 lists only where the source's own words state it
  for that place. Program-wide or province-wide rates are stored as `usable = false` with the reason, so
  they show on the timeline and decide nothing. A quoted rate is never turned into a finding.
- Real organizations appear only as cited parties: DENR as funder, the Barangay Local Government of Paraiso
  (Barangay 83) as partner and proposer. No individual is named in any row. A team seeder organization and a
  seeder account that cannot sign in write the rows.
- The records are **reconstructed on 2026-10-04 from public sources**. They were not locked when the money
  moved. `published_at` is the seed time and the integrity hash covers the reconstruction; the record text says so.
- Framing follows case study §9: the system could not detect misuse. Never "corruption", never "nothing
  survived". Case study §11 "Not found" items go in `known_unknowns`, never in a finding.

### Why this option

It shows the product on the case it was built for, with every claim one click from its source, and keeps the
fictional cast for the live demo flow.

### Overrides

- **Prior ADRs and rules:** BR-006's "demo organizations use fictional names" and `docs/security.md` §8's
  all-fictional demo gate, for `is_demo = false` sourced records only. PRD §6's Manila-only scope, for these
  four records only. Demo records are unchanged.
- **Doc or plan truth:** `docs/prd.md` (BR-006, F-001, US-001, §6), `docs/security.md` §6 and §8,
  `docs/data-model.md`, `docs/methods.md` (EQ-017, DS-009, §3.2), `docs/api.md`, `docs/tests.md`,
  `data/sites/README.md`. Updated in the same change.

### Consequences

- **Easier:** the pitch can open a real record; pins show the case's mixed result (Paraiso on track,
  Cancabato and Ormoc awaiting, Bungtod in conflict).
- **Harder or owed:** polygons are sketched, not surveyed, and are labelled so. "What's there now?" stays
  missing until the Sentinel-2 adapter exists. A wrong seed row cannot be edited (append-only); fixing it
  needs a reset of that database.
- **Follow-up:** a freedom-of-information request to DENR Region 8 and ERDB (case study §11) would replace
  sketched polygons and fill the known unknowns.
