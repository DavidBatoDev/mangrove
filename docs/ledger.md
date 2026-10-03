---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-04
doc: ledger
owns: which decision is current · names and immutable IDs · rejected approaches · decision assumptions
---

# Ledger — AIDE-M

> **What this is.** Append-only history of pivots, rejected approaches, names, and the assumptions behind
> decisions. It does not override the PRD, the system design, or the test plan. If it disagrees with one of
> them, stop and reconcile.
>
> **Last reconciled:** 2026-10-04

## 1. Names & immutable identifiers (read first)

| Name / ID | Kind | Where it appears | Rule |
|-----------|------|------------------|------|
| AIDE-M | public product name (ADR-051) | UI, pitch, docs | Use this name wherever a person sees the product. Its meaning, "Accountability In Delivery & Evidence · Mangrove", goes only in small type under the wordmark and at a document's first mention. The name was "Mangrove" until 2026-10-04; repo, CSS, file and AWS identifiers keep `mangrove`. |
| `prd.md` | doc filename | `docs/prd.md` | The PRD file is `prd.md`, not `product.md`. Do not rename it. |
| F-001…F-021, US-001…US-015, BR-001…BR-006, API-001…API-018, EQ-001…EQ-013, DS-001…DS-006, TC-001…TC-020, T-001…T-013, DEC-001… | stable IDs | docs | Never renumber or reuse. Retire and add a new ID. |
| ADR-001…ADR-030 | prior decision numbers | Google Doc; indexed in `docs/adr/README.md` | Not reused. New ADRs start at ADR-031. |
| `484907520476` / `ap-southeast-1` | AWS account / region | all AWS resources, tagged `project=bon-mangrove` | Do not touch untagged resources in this account; they belong to another project. |
| `i-0bf01980932161e8c` (Name `bon-mangrove`) | EC2 instance, t3.medium, Ubuntu 24.04 | `infra/` deploy target | Replacing it: reattach the Elastic IP so the domain does not change. |
| `18.140.211.157` (`eipalloc-067c13129884c6106`) | Elastic IP | DNS for the domain below | Never release it during the event. |
| `18-140-211-157.sslip.io` | public domain (sslip.io wildcard DNS) | `DOMAIN`, `PUBLIC_BASE_URL`; MCP URL `https://18-140-211-157.sslip.io/mcp` (no trailing slash) | Changing it means re-registering the Quick MCP connector. |
| `bon-mangrove-evidence-baf5cf` | S3 bucket (private, SSE-S3) | `S3_BUCKET`; photos under `assets/<sha256>` (ADR-037) | Accessed only through instance role `bon-mangrove-ec2-role`. |
| `bon-mangrove-ec2-role` / `bon-mangrove-ec2-profile` | IAM role / instance profile | EC2 → S3 (Get/Put/List, no Delete) + SSM | — |
| `bon-mangrove-gha-deploy` | IAM role for GitHub Actions (OIDC) | `.github/workflows/deploy.yml` via repo variable `AWS_DEPLOY_ROLE_ARN` | Trusts only `repo:DavidBatoDev@149306718/mangrove@1403260294:ref:refs/heads/master`; may only `ssm:SendCommand` on the demo instance (ADR-047). |
| (pending) | Neon project id | `DATABASE_URL`, `DATABASE_URL_DIRECT` (ADR-036) | Add the project id here when it is created. |

## 2. Decision assumptions & evidence (confidence, not a product spec)

| SUPPORTED (backed by the cited sources) | PROVISIONAL (accepted, not verified end to end) | UNVALIDATED (do not state as fact) |
|---|---|---|
| Funders struggle to find restoration projects, and screening plus baselines already exist as a practice [R10][R11]. | A public, uneditable promise is something a funder will publish rather than avoid. | Any funder will pay for this product, at any price. |
| Remotely promising Manila Bay sites have turned out to be fishponds or constrained land [R09]. | Three evidence sources are enough to change a comparison a single map does not. | The first buyer is a corporate CSR team rather than a foundation or an NGO. |
| Sentinel-2 cannot resolve individual seedlings [R06][ADR-006]. | The demo conflict (reported hectares vs mapped hectares) reads clearly to a judge. | A longitudinal dataset of decisions and outcomes will become a moat. |
| GMW v4.1.12 (CC BY 4.0, Zenodo 10.5281/zenodo.21346457) and the Copernicus Statistical API are obtainable on the terms in `docs/methods.md` §4. | Amazon Quick at the venue can reach a public MCP server (needs an Enterprise subscription). | Rubric weights apply as published in the handbook PDF (`context.md` §1, R38); organizers may still change them on site. |

## 3. Pivots & decisions (newest first, append at top)

### 2026-10-04 — Gain and loss off by default, one side-panel switch
- **ID:** DEC-027
- **Type:** zoom-in
- **Change:** gain/loss on by default with legend toggles and a baseline picker → off by default, one switch on the national card
- **Why:** the team wants a simpler default map.
- **Invalidated:** ADR-050's default and legend controls
- **Recorded as:** ADR-057

### 2026-10-04 — Real, sourced Post-Yolanda records beside the demo cast
- **ID:** DEC-026
- **Type:** scope-add
- **Change:** fictional Manila Bay records only → plus four real Eastern Visayas MBFDP records (`is_demo = false`), reconstructed from cited public reports (`public_report`, EQ-017, DS-009), naming real organizations only as cited parties
- **Why:** the team wants the product shown on the real case it was built for, with every claim one click from its source.
- **Invalidated:** BR-006's fictional-name rule, `docs/security.md` §8's all-fictional gate and PRD §6's Manila-only scope, for these sourced records only
- **Recorded as:** ADR-056

### 2026-10-04 — Google map back to per-zoom GMW tile layers
- **ID:** DEC-025
- **Type:** pivot
- **Change:** fixed-tile overlay on Google → Google `ImageMapType` tile layers on the static tiles
- **Why:** the fixed overlay felt laggy.
- **Invalidated:** ADR-054 for the Google map
- **Recorded as:** ADR-055

### 2026-10-04 — Map draws GMW layers from one fixed tile level
- **ID:** DEC-024
- **Type:** zoom-in
- **Change:** a new tile set per zoom → one zoom-10 set, placed once and scaled with the map
- **Why:** the team saw a wait and a blurry swap on every zoom.
- **Invalidated:** per-zoom Google overlays (ADR-048, ADR-050)
- **Recorded as:** ADR-054

### 2026-10-04 — GMW tiles served as static files
- **ID:** DEC-023
- **Type:** zoom-in
- **Change:** tiles read from the API's disk cache → a static tile tree served by Caddy, the API only rendering missing tiles
- **Why:** the team asked for GMW's tile speed.
- **Invalidated:** ADR-052's cache key and API-only serving
- **Recorded as:** ADR-053

### 2026-10-04 — GMW map tiles rendered once and kept on disk
- **ID:** DEC-022
- **Type:** zoom-in
- **Change:** tiles rendered per request and kept in memory → rendered once into a disk cache, prerendered for the default view after each deploy, enlarged from zoom 12 above it
- **Why:** cold renders queued for over 90 s on the 2-CPU host and the map blurred when zoomed in.
- **Invalidated:** ADR-048's in-memory cache and zoom 4–8 prewarm
- **Recorded as:** ADR-052
### 2026-10-04 — The product is named AIDE-M
- **ID:** DEC-021
- **Type:** naming
- **Change:** public product name "Mangrove" → **AIDE-M** (Accountability In Delivery & Evidence · Mangrove); the meaning appears only under the wordmark and at first mention
- **Why:** "Mangrove" is also the ecosystem the product is about, so the name read as a topic.
- **Invalidated:** ADR-043's product name only
- **ADR:** ADR-051

### 2026-10-04 — Mangrove gain and loss on the map; compact legend filters
- **ID:** DEC-020
- **Type:** scope-add
- **Change:** extent-only mangrove layer with controls in map settings → GMW gain (green) and loss (red) layers since a chosen baseline (API-025), toggled from a compact legend that also filters pins by state; tiles to zoom 22, fading when zoomed far in
- **Why:** the team asked for GMW's change view and a smaller legend that switches layers.
- **Invalidated:** ADR-043's red-only-for-conflict rule for the map loss color; ADR-048's zoom-16 limit and settings controls
- **Recorded as:** ADR-050

### 2026-10-04 — Mangrove layer in GMW-style cyan; tiles readable from any origin
- **ID:** DEC-019
- **Type:** zoom-in
- **Change:** brand Tidal lift at partial opacity, hidden in fixtures mode → data cyan `--mg-data-mangrove` near-opaque with zoomed-out fringes grown, read from the live API in fixtures mode (CORS on API-024)
- **Why:** the team found the layer too faint next to GMW's viewer and saw no layer in local fixtures mode.
- **Invalidated:** ADR-048's color and its fixtures-mode hiding
- **Recorded as:** ADR-049

### 2026-10-04 — Mangrove extent for the whole Philippines, as map tiles
- **ID:** DEC-018
- **Type:** scope-add
- **Change:** a Manila Bay GeoJSON extent layer (API-023), Root brown, MapLibre only → Philippines-wide GMW extent served as map tiles (API-024) in brand Tidal, on by default on every map, on Google and MapLibre
- **Why:** the team uses Google Maps now and asked for mangrove areas to be visible everywhere, like GMW's viewer.
- **Invalidated:** ADR-045's map-layer scope and color (the rest of ADR-045 stands)
- **Recorded as:** ADR-048

### 2026-10-04 — Every push to master redeploys the demo host
- **ID:** DEC-017
- **Type:** platform
- **Change:** the orchestrator deploys by hand over SSH → `.github/workflows/deploy.yml` deploys on every push to `master` through GitHub OIDC and SSM Run Command, running `infra/deploy.sh` with an automatic rollback on a failed health check
- **Why:** no manual step, no open port, no stored key; a bad build cannot take the demo down.
- **Invalidated:** ADR-039 integration step 4's manual deploy
- **Recorded as:** ADR-047

### 2026-10-04 — Google Maps for display, MapLibre as fallback
- **ID:** DEC-016
- **Type:** zoom-in
- **Change:** MapLibre + EOxCloudless only → Google Maps JavaScript API (2D satellite, 3D site fly-in and record orbit) when a key is configured; MapLibre + EOxCloudless as the fallback
- **Why:** current imagery and one 3D moment for the demo, without the demo depending on Google.
- **Invalidated:** `docs/prd.md` §7 basemap line becomes the fallback
- **Recorded as:** ADR-046

### 2026-10-04 — Mangrove context from GMW; honest history
- **ID:** DEC-015
- **Type:** scope-add
- **Change:** + F-025 (Should): per-site GMW mangrove area inside and near each site 1985–2025, a Manila Bay extent layer, and a Philippines extent and change card; the history answer keeps EQ-003's result (`no_mangrove_recorded` for the demo sites) with the 1985 limit shown
- **Why:** real GMW v4.1.12 data shows no mangrove inside the demo polygons since 1985 but clear change right beside them.
- **Invalidated:** nothing; adds EQ-014…EQ-016, DS-007, `NEARBY_BUFFER_M`, API-021…API-023, US-017, TC-025
- **Recorded as:** ADR-045

### 2026-10-04 — A partner proposes and a funder commits
- **ID:** DEC-014
- **Type:** use-case
- **Change:** the funder writes the promise, and the map shows only promises (ADR-032) → the partner proposes the site, benefit text, timeline and milestones; the funder commits; the public map toggles sites with and without a commitment; early milestones are field-only; after the outcome date the partner report and EQ-012 are both required; disagreement flags the record and notifies the funder
- **Why:** the partner states the public terms before a funder commits, and an early satellite reading would invent a measurement.
- **Invalidated:** ADR-032 on who writes the proposal, and the reading that the map shows only committed promises. The three questions and the no-score rule stand. ADR-041's P0 screen list is behind the PRD until a later build; that ADR is not edited.
- **Recorded as:** ADR-044

### 2026-10-04 — The brand kit is the design system
- **ID:** DEC-013
- **Type:** zoom-in
- **Change:** "no brand seed" (design brief) → `brand/` (Mangrove brand kit and Figma deck) is the design system; `docs/design.md` created and points to it
- **Why:** one look and one vocabulary across both builders, the deck and the pitch; the kit's wording now follows the PRD.
- **Invalidated:** the "There is no brand seed" line in `docs/design-brief.md` (the brief's other constraints stand)
- **Recorded as:** ADR-043

### 2026-10-04 — Sentinel-2 from Earth Search COGs
- **ID:** DEC-012
- **Type:** pivot
- **Change:** Sentinel-2 L2A via the Copernicus Statistical API → Sentinel-2 L2A Collection 1 COGs found with Element 84 Earth Search, pixel counts computed by the adapter; no account
- **Why:** the team could not register a Copernicus Data Space account (the registration captcha failed), so no OAuth client exists.
- **Invalidated:** `docs/methods.md` DS-002 and EQ-005 method text, `docs/system-design.md` §1/§3/§4/§5 Sentinel-2 rows (updated in the same change); ADR-030's Statistical API access path
- **Recorded as:** ADR-042

### 2026-10-03 — Three large phases
- **ID:** DEC-011
- **Type:** zoom-out
- **Change:** six small phases (ADR-039) → three large ones: P0 the story end to end (to 01:30), P1 make it real (to 05:00), P2 demo-ready (to 08:30)
- **Why:** the team wants each phase to be a large, visible step.
- **Invalidated:** the Phases table in ADR-039 (the rest of ADR-039 stands)
- **Recorded as:** ADR-041

### 2026-10-03 — Every message between builders comes with a note
- **ID:** DEC-010
- **Type:** platform
- **Change:** chat-only messages between David and Ethan → a note in `notes/` committed on its own and delivered to the recipient's branch, with the chat message pointing at it
- **Why:** a message only matters if the other branch's code and agent can read it.
- **Invalidated:** none
- **Recorded as:** ADR-040

### 2026-10-03 — Two builders on person branches, integrated per phase
- **ID:** DEC-009
- **Type:** platform
- **Change:** an unassigned four-person build → David and Ethan on `person/david` and `person/ethan`, merged into `master` at the end of each phase (P0–P5) by an orchestrator that runs the checks and deploys; frontend/backend ownership decided at each phase start (P0–P1: David frontend, Ethan backend)
- **Why:** two people building both halves of a feature group at once, with `master` only holding combinations that passed together.
- **Invalidated:** `context.md` `team_size: 4` (now 2; updated in the same change)
- **Recorded as:** ADR-039

### 2026-10-03 — Frontend and backend run in parallel against the contract
- **ID:** DEC-008
- **Type:** platform
- **Change:** an undecided build order → both halves from the first hour; `web/mocks/` fixtures equal `docs/api.md`, switched off per screen as endpoints land, and off entirely by code freeze
- **Why:** two people, eleven hours, and a contract that already exists; Quick needs the real MCP server early.
- **Invalidated:** none
- **Recorded as:** ADR-038

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
- Five demo site polygons, sketched before the build from OSM and published sources, are in `data/sites/` with the demo cast and fixed ids; they are seeded labelled demo (BR-006). A Copernicus OAuth client exists; its credentials go in the host `.env`.
- Amazon Quick MCP needs an Enterprise subscription. Confirm access at the venue before depending on a live Quick demo; the MCP contract tests do not need Quick.
- The four thresholds in `docs/methods.md` §3.1 are assumptions. The data lead confirms or replaces them before the demo script freezes.
- The Copernicus attribution line still needs a look at the source page (`docs/methods.md` §4). The GMW v4.1.12 licence is confirmed CC BY 4.0.
- Neon free plan suspends after 5 min idle (ADR-036): run the keep-warm ping during the demo window.

## References

- `docs/index.md` §0 — which doc owns which fact
- `docs/adr/` — the only why
- `context.md` §7 — the `[R##]` register
- `hooks/` — the commit-time check that an ADR change comes with a ledger change
