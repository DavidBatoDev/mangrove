---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-03
doc: ledger
owns: which decision is current · names and immutable IDs · rejected approaches · decision assumptions
---

# Ledger — Mangrove

> **What this is.** Append-only history of pivots, rejected approaches, names, and the assumptions behind
> decisions. It does not override the PRD, the system design, or the test plan. If it disagrees with one of
> them, stop and reconcile.
>
> **Last reconciled:** 2026-10-03

## 1. Names & immutable identifiers (read first)

| Name / ID | Kind | Where it appears | Rule |
|-----------|------|------------------|------|
| Mangrove | public product name | UI, pitch, repo | Use this name wherever a person sees the product. |
| `prd.md` | doc filename | `docs/prd.md` | The PRD file is `prd.md`, not `product.md`. Do not rename it. |
| F-001…F-021, US-001…US-015, BR-001…BR-006, API-001…API-018, EQ-001…EQ-013, DS-001…DS-006, TC-001…TC-020, T-001…T-013, DEC-001… | stable IDs | docs | Never renumber or reuse. Retire and add a new ID. |
| ADR-001…ADR-030 | prior decision numbers | Google Doc; indexed in `docs/adr/README.md` | Not reused. New ADRs start at ADR-031. |
| `484907520476` / `ap-southeast-1` | AWS account / region | all AWS resources, tagged `project=bon-mangrove` | Do not touch untagged resources in this account; they belong to another project. |
| `i-0bf01980932161e8c` (Name `bon-mangrove`) | EC2 instance, t3.medium, Ubuntu 24.04 | `infra/` deploy target | Replacing it: reattach the Elastic IP so the domain does not change. |
| `18.140.211.157` (`eipalloc-067c13129884c6106`) | Elastic IP | DNS for the domain below | Never release it during the event. |
| `18-140-211-157.sslip.io` | public domain (sslip.io wildcard DNS) | `DOMAIN`, `PUBLIC_BASE_URL`; MCP URL `https://18-140-211-157.sslip.io/mcp` (no trailing slash) | Changing it means re-registering the Quick MCP connector. |
| `bon-mangrove-evidence-baf5cf` | S3 bucket (private, SSE-S3) | `S3_BUCKET`; photos under `assets/<sha256>` (ADR-037) | Accessed only through instance role `bon-mangrove-ec2-role`. |
| `bon-mangrove-ec2-role` / `bon-mangrove-ec2-profile` | IAM role / instance profile | EC2 → S3 (Get/Put/List, no Delete) + SSM | — |
| (pending) | Neon project id | `DATABASE_URL`, `DATABASE_URL_DIRECT` (ADR-036) | Add the project id here when it is created. |

## 2. Decision assumptions & evidence (confidence, not a product spec)

| SUPPORTED (backed by the cited sources) | PROVISIONAL (accepted, not verified end to end) | UNVALIDATED (do not state as fact) |
|---|---|---|
| Funders struggle to find restoration projects, and screening plus baselines already exist as a practice [R10][R11]. | A public, uneditable promise is something a funder will publish rather than avoid. | Any funder will pay for this product, at any price. |
| Remotely promising Manila Bay sites have turned out to be fishponds or constrained land [R09]. | Three evidence sources are enough to change a comparison a single map does not. | The first buyer is a corporate CSR team rather than a foundation or an NGO. |
| Sentinel-2 cannot resolve individual seedlings [R06][ADR-006]. | The demo conflict (reported hectares vs mapped hectares) reads clearly to a judge. | A longitudinal dataset of decisions and outcomes will become a moat. |
| GMW v4.1.12 (CC BY 4.0, Zenodo 10.5281/zenodo.21346457) and the Copernicus Statistical API are obtainable on the terms in `docs/methods.md` §4. | Amazon Quick at the venue can reach a public MCP server (needs an Enterprise subscription). | Rubric weights apply as published in the handbook PDF (`context.md` §1, R38); organizers may still change them on site. |

## 3. Pivots & decisions (newest first, append at top)

### 2026-10-03 — Photos are stored in S3
- **ID:** DEC-007
- **Type:** platform
- **Change:** content-addressed filesystem volume → private S3 bucket `bon-mangrove-evidence-baf5cf`, keys `assets/<sha256>`, through the EC2 instance role
- **Why:** the bucket and role were already provisioned and tested; photos survive an instance rebuild.
- **Invalidated:** the "Filesystem asset store" rows in `docs/system-design.md` §2 and §4 (updated in the same change)
- **Recorded as:** ADR-037

### 2026-10-03 — The database is Neon
- **ID:** DEC-006
- **Type:** platform
- **Change:** PostGIS container in Docker Compose → Neon Postgres + PostGIS in `aws-ap-southeast-1`
- **Why:** the team already has the project, and one shared database lets four people build against the same seed.
- **Invalidated:** the `db` service in `docs/system-design.md` §6 (updated in the same change). ADR-034's triggers and grants stand.
- **Recorded as:** ADR-036

### 2026-10-03 — Kiro is the only assistant co-author
- **ID:** DEC-005
- **Type:** platform
- **Change:** no assistant trailer → one trailer, `Co-authored-by: Kiro <noreply@kiro.dev>`, and no other assistant
- **Why:** Kiro is a required platform and the team asked for it by name. Other assistants were explicitly excluded.
- **Invalidated:** none
- **Recorded as:** ADR-035

### 2026-10-03 — Immutability is a database rule plus a public hash
- **ID:** DEC-004
- **Type:** platform
- **Change:** "nobody can edit it" as a product sentence → triggers, grants, and a SHA-256 chain, with the leftover superuser risk stated
- **Why:** an API convention does not survive the next endpoint, and a blockchain does not fit the night.
- **Invalidated:** any claim that a published record is tamper-proof
- **Recorded as:** ADR-034

### 2026-10-03 — The work check uses a mapped area
- **ID:** DEC-003
- **Type:** use-case
- **Change:** "the satellite shows 5 hectares" → the partner's mapped area shows 5 hectares
- **Why:** 10–20 m pixels cannot see new seedlings, so a satellite area in that scene would be invented.
- **Invalidated:** the demo line that attributes the 5 ha to the satellite
- **Recorded as:** ADR-033

### 2026-10-03 — Three questions and a public promise are the build contract
- **ID:** DEC-002
- **Type:** zoom-in
- **Change:** four comparison dimensions as axes → three evidence questions with agreement statuses, a locked promise, and a public map
- **Why:** the team's summary is what will be demoed, and a fourth scored axis invites the success score ADR-028 already bans.
- **Invalidated:** none of ADR-021..030. This narrows the demo, it does not replace the direction.
- **Recorded as:** ADR-032

### 2026-10-03 — Prior decisions ADR-001 to ADR-030 stand
- **ID:** DEC-001
- **Type:** platform
- **Change:** decisions only in the Google Doc → indexed here, with new numbers starting at ADR-031
- **Why:** renumbering them would collide, and copying them would fork.
- **Invalidated:** none
- **Recorded as:** ADR-031

## 4. Rejected approaches (what we tried and killed — and why)

| Approach considered | Rejected because | Would revisit if |
|---------------------|------------------|------------------|
| Another mangrove map or monitoring dashboard | GMW and MRTT already exist (ADR-005) | A workflow they cannot express shows up |
| A restoration success score | Remote evidence cannot support one (ADR-028) | A validated outcome model exists |
| Blockchain-anchored records | Setup cost for five demo records, and the hash chain covers the claim we can honestly make (ADR-034) | A partner requires a third-party anchor |
| Transaction or marketplace fees as the starting model | No deal flow, trust, or legal structure (ADR-029) | The product actually intermediates capital |
| Government procurement as the primary customer | Slow, and not the 12-hour surface (ADR-010) | A specific agency asks to use it |
| Satellite vegetated area as the "work happened" check | Seedlings are invisible at 10–20 m (ADR-033) | The record's outcome date has passed and canopy is the question |
| AlphaEarth, live ODK, MRTT import, Sentinel-1 in the hackathon | Three sources prove the loop (ADR-030) | The loop is done with time left |
| Private funder shortlists | Public reads are what let the Quick MCP server stay unauthenticated | A paying funder needs confidentiality |

## 5. Open items / risks (do not lose these)

- Willingness to pay is unvalidated. Do not pitch it as fact.
- Rubric weights and Grand Finals criteria come from the handbook PDF (`context.md` §1). The handbook says the submission structure may change; check the live form.
- Five demo site polygons were sketched before the build from OSM and published sources (outside this repo); they must be reviewed by the team and seeded, labelled demo (BR-006). A Copernicus OAuth client exists; its credentials go in the host `.env`.
- Amazon Quick MCP needs an Enterprise subscription. Confirm access at the venue before depending on a live Quick demo; the MCP contract tests do not need Quick.
- The four thresholds in `docs/methods.md` §3.1 are assumptions. The data lead confirms or replaces them before the demo script freezes.
- The Copernicus attribution line still needs a look at the source page (`docs/methods.md` §4). The GMW v4.1.12 licence is confirmed CC BY 4.0.
- Neon free plan suspends after 5 min idle (ADR-036): run the keep-warm ping during the demo window.

## References

- `docs/index.md` §0 — which doc owns which fact
- `docs/adr/` — the only why
- `context.md` §7 — the `[R##]` register
- `hooks/` — the commit-time check that an ADR change comes with a ledger change
