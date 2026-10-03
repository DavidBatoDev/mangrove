---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-03
doc: prd
owns: features (F-###) and their MoSCoW priority · personas · user stories (US-###) and their acceptance criteria · cross-cutting business rules (BR-###) · app flow, screen inventory & UX intent · instrumentation taxonomy
---

# PRD — Mangrove

> **Purpose:** what we build, for whom, and how a user moves through it. The team's primary build
> reference, and the doc to read first.
> Traces back to: [`idea.md`](../idea.md) §6, §7, §8, §10. Traces forward to: system design, data model,
> methods, API, security, tests, design brief.

## 1. Product Purpose & Value Proposition

Mangrove is a public map of mangrove funding promises in the Philippines, where anyone can check whether
each promise came true. A funder compares a few candidate sites. For each one it sees three answers — was
this mangrove before (Global Mangrove Watch), what's there now (Sentinel-2), what do people on the ground
say (field partners) — each marked supported, conflicting or missing, with no invented success score.
When the funder picks a site, Mangrove publishes a locked record of the promise: why this site, what will be
done, what should happen, and what nobody knew yet. The record becomes a pin on the map. Later evidence
lands on the same record and answers two separate questions: did the work happen, and did the mangroves
come back. When sources disagree, the pin turns red. Maps and trackers show data; Mangrove locks a promise
before the money moves and checks it afterwards.

**Success is measured by** the targets in [`idea.md` §8](../idea.md) — not restated here.

## 2. Personas

| Persona | Role & context | Problem frequency | Today's workaround | Stories |
|---------|----------------|-------------------|--------------------|---------|
| **Funder** | CSR/sustainability manager at a Philippine company, or a foundation/NGO program officer, choosing between candidate mangrove sites and answerable to leadership and the public for the spend | Each funding cycle; defended for years after | Reads a partner's proposal, maybe a GMW map, then publishes a press release ("10,000 trees planted") | US-001, US-002, US-003, US-004, US-005, US-007, US-008, US-013, US-015 |
| **Field partner** | Field officer at a local NGO or people's organization who visits sites, takes photos and maps planted areas | Per site visit | Photos and spreadsheets sent to the funder privately; nothing public | US-006, US-010 |
| **Public reader** | Journalist, local government officer, auditor, community member or another funder checking a promise | Whenever a project is announced or questioned | Takes the press release at face value or files a request | US-009, US-011, US-012, US-014 |

*Market segments are not defined in this suite (no market doc; see [`idea.md` §2](../idea.md)).*

## 3. Feature Set & Priority

Features reuse the `F-###` IDs from [`idea.md` §7](../idea.md); none are minted here.

| `F-###` | Feature | Priority | Solves (problem) | Notes / why not |
|---------|---------|----------|------------------|-----------------|
| F-001 | Candidate sites (3–5 Manila Bay polygons) | Must | No common starting set | Demo sites are labelled demo (BR-006) |
| F-002 | Evidence dossier with full provenance per item | Must | Scattered evidence | BR-005 |
| F-003 | Source adapters: GMW history (pre-ingested), Sentinel-2 now (live + snapshot fallback) | Must | Manual reconciliation | Equations in [`methods.md`](methods.md) |
| F-004 | Field evidence submission (photo, GPS, observation, mapped area) | Must | Map-only screening misses fishponds and land conflicts | |
| F-005 | Three-question assessment, each supported / conflicting / missing | Must | Hidden disagreement | BR-001, BR-003 |
| F-006 | Side-by-side comparison of 3–5 sites | Must | Choosing what to fund | |
| F-007 | Locked promise record | Must | No baseline | BR-002 |
| F-008 | Public map with pins, country-to-site zoom | Must | Promises can't be found | BR-004 |
| F-009 | Later evidence + two checks (work happened? mangroves came back?) | Must | Nobody checks | BR-001 |
| F-010 | Conflict flagging, red pin | Must | Deviations stay hidden | BR-001, BR-004 |
| F-011 | Amazon Quick analyst over a read-only MCP server | Must | Manual analyst work | Hard requirement ([`context.md`](../context.md)) |
| F-012 | Record integrity check | Should | "Can't be edited" must be checkable | |
| F-013 | In-app plain-language evidence summary | Could | Dense dossiers | BR-003; LLM provider TBD |
| F-014 | Upload a new candidate polygon | Could | Limited to pre-loaded sites | Waits on the core loop |
| F-015 | Success score / probability | Won't | — | Reason: fake precision [ADR-023, ADR-028]. Reconsider if: a validated outcome model exists. |
| F-016 | AlphaEarth embeddings | Won't | — | Reason: not interpretable; costs time. Reconsider if: core loop done early. |
| F-017 | Live ODK Central integration | Won't | — | Reason: later integration. Reconsider if: a partner already uses ODK. |
| F-018 | MRTT import | Won't | — | Reason: no documented live API. Reconsider if: a partner exports MRTT data. |
| F-019 | Billing / subscriptions | Won't | — | Reason: willingness to pay untested. Reconsider if: a funder commits to pay. |
| F-020 | Sentinel-1 radar | Won't | — | Reason: optional. Reconsider if: clouds block every Sentinel-2 window. |
| F-021 | Private funder shortlists | Won't | — | Reason: public reads keep Quick's MCP unauthenticated; demo data is public-source. Reconsider if: a paying funder needs confidentiality. |

| Tier | Means | QA obligation |
|------|-------|---------------|
| **Must** | no point shipping without it | ≥1 test case |
| **Should** | important; core value survives one release without it | ≥1 test case |
| **Could** | wanted if time allows | may defer, with the reason stated in the QA plan |
| **Won't** | decided against for now | excluded — the row records a decision |

## 4. User Stories & Acceptance Criteria

**US-001 — Browse candidate sites** *(F-001)* — Priority: Must
> As a **Funder**, I want to see the candidate sites in Manila Bay on a map and in a list so that I know
> what I am choosing between.

- Given 3–5 seeded candidate sites, when I open the candidate sites screen, then each site appears as a polygon on the map and as a list row showing its name and its area in hectares (EQ-001).
- Given a site is demo data, when it is displayed anywhere, then it carries a visible "Demo data" label (BR-006).

**US-002 — Inspect a site's evidence dossier** *(F-002, F-003)* — Priority: Must
> As a **Funder**, I want every piece of evidence about a site in one place with where it came from so
> that I can judge how much to trust it.

- Given a site with evidence items, when I open its dossier, then every item shows its source, source version, observed date, retrieved date, method, spatial resolution (when applicable), limitation, and a link or attached asset (BR-005).
- Given the Global Mangrove Watch snapshot was pre-ingested, when I open any demo site's dossier, then it contains a GMW item with the site's historical mangrove area per year and its maximum historical extent (EQ-002, EQ-003).
- Given an evidence item is not usable (e.g. too few cloud-free pixels, EQ-005), when it is displayed, then it is marked "not usable" with the reason, and it is excluded from status calculations (BR-001).

**US-003 — See the three answers for a site** *(F-005)* — Priority: Must
> As a **Funder**, I want each of the three questions answered with an honest status so that I can see
> what the evidence agrees on, what it disputes, and what is unknown.

- Given a site dossier, when it renders, then it shows three questions — "Was this mangrove before?", "What's there now?", "What do people on the ground say?" — each with its finding, a status of supported, conflicting or missing (BR-001), and the number and dates of the sources behind it.
- Given no usable evidence for a question, when it renders, then the status is "missing" and no finding is shown.
- Given any site, when it renders, then no overall score, rank or probability is shown (F-015 is Won't).

**US-004 — Compare sites side by side** *(F-006)* — Priority: Must
> As a **Funder**, I want to compare 2–5 sites in columns so that I can see which differences matter.

- Given I select 2–5 sites, when I open the comparison, then each site is a column with its area, its three answers (finding + status + source count) and its open conflicts, in the order I selected.
- Given I select fewer than 2 or more than 5 sites, when I try to compare, then the comparison does not open and I am told the allowed range.

**US-005 — Refresh current-condition evidence from Sentinel-2** *(F-003)* — Priority: Must
> As a **Funder**, I want to pull the latest satellite condition for a site so that "what's there now" is
> current.

- Given Copernicus is reachable, when I request a refresh for a site, then a new Sentinel-2 evidence item is appended with its acquisition window, valid-pixel fraction (EQ-005) and class fractions (EQ-006), and the "What's there now?" status recomputes.
- Given Copernicus fails or times out, when I request a refresh, then no new item is created, I am told the live source failed, and the dossier keeps showing the stored snapshot item with its date.

**US-006 — Submit field evidence** *(F-004)* — Priority: Must
> As a **Field partner**, I want to upload what I saw at a site so that ground truth sits next to the
> satellite evidence.

- Given I am signed in as a partner, when I submit a photo (JPEG or PNG), GPS point, observation date, a finding from the fixed list and an optional mapped boundary for a site or record, then a field evidence item is appended with me and my organization as the source.
- Given I upload a photo, when it is stored, then its embedded metadata (EXIF) is removed, and the location shown is the GPS point I entered.
- Given I am not signed in as a partner, when I try to submit, then the submission is rejected.

**US-007 — Lock a promise** *(F-007)* — Priority: Must
> As a **Funder**, I want to publish my choice and what I expect before money moves so that the promise is
> public and checkable.

- Given I am signed in as a funder and viewing a site, when I submit the lock form with rationale, planned action, planned area (ha), expected outcome, implementation-check date, outcome-check date and known unknowns, then I am shown a final confirmation stating the record can never be edited or deleted.
- Given I confirm, when the record is created, then it is published at a public URL with its publication time, my organization, a snapshot of the site geometry and of every evidence item and status at that moment, and a content hash (BR-002).
- Given a required field is empty or the outcome-check date is before the implementation-check date, when I submit, then nothing is published and the problem is shown.

**US-008 — A published record cannot change** *(F-007)* — Priority: Must
> As a **Funder**, I want my published promise to be impossible to quietly edit so that its credibility
> holds — including against me.

- Given a published record, when anyone tries to change or delete it or its evidence through the product, then the attempt is refused and the record is unchanged (BR-002).
- Given I need to correct a mistake, when I add a correction, then it appears as a new dated entry on the record's timeline and the original text stays visible.

**US-009 — Find promises on the public map** *(F-008)* — Priority: Must
> As a **Public reader**, I want to zoom from the whole country to a site and open its promise so that I
> can read it without an account.

- Given published records, when I open the map without signing in, then the Philippines is shown with one pin per record, coloured by pin state (BR-004).
- Given I click a pin, when the record opens, then I can read the promise, its evidence snapshot, its timeline and both checks.

**US-010 — Add later evidence to a record** *(F-009)* — Priority: Must
> As a **Field partner**, I want to add new evidence to an existing record so that the promise is checked
> against what actually happened.

- Given a published record, when a partner submits field evidence or a funder submits a project report (with claimed area and work date), then it is appended to the record's timeline with its provenance, and the original promise and earlier entries stay unchanged (BR-002, BR-005).

**US-011 — See the two checks** *(F-009)* — Priority: Must
> As a **Public reader**, I want "did the work happen?" and "did the mangroves come back?" answered
> separately so that activity is not confused with recovery.

- Given a record, when it renders, then it shows the two checks separately, each with a status of supported, conflicting or missing and the evidence behind it (BR-001).
- Given today is before the record's outcome-check date, when it renders, then "Did the mangroves come back?" reads "Too early to tell", with the date it becomes checkable.

**US-012 — Conflicts are flagged** *(F-010)* — Priority: Must
> As a **Public reader**, I want disagreements between sources to be impossible to miss so that a
> deviation from the promise is visible.

- Given a record where a reported area and a measured area differ by more than the tolerance (EQ-009), when it renders, then the affected check shows "conflicting" with both values and their sources, and the record's pin is red (BR-004).
- Given conflicting evidence within one of the three site questions, when that site or record renders, then the question shows "conflicting" and lists the disagreeing items.

**US-013 — Ask Amazon Quick why two sites differ** *(F-011)* — Priority: Must
> As a **Funder**, I want to ask a Quick agent "why does Site A differ from Site B?" so that I get a
> source-grounded explanation without reading every item.

- Given the Mangrove MCP server is connected to Amazon Quick, when I ask why two named sites differ, then the agent's answer cites findings, statuses and evidence sources returned by the tools, and every number it repeats matches the tool output.
- Given a tool is asked to change data, when Quick calls the server, then no write tool exists to call (the server is read-only).

**US-014 — Verify a record is intact** *(F-012)* — Priority: Should
> As a **Public reader**, I want to check that a record has not been altered since publication so that
> "can't be edited" is something I can confirm.

- Given a published record, when I request verification, then the content hash and every timeline entry hash are recomputed and I see "intact" or the first entry that does not match.

**US-015 — Read a plain-language summary** *(F-013)* — Priority: Could
> As a **Funder**, I want a short plain-language summary of a dossier so that I can brief my leadership.

- Given a site dossier, when I request a summary, then it is generated only from the dossier's items and statuses, is labelled as AI-generated, and states no status or number that the dossier does not contain (BR-003).

### 4.1 Cross-cutting rules (`BR-###`)

| `BR-###` | Rule | Invoked by |
|----------|------|------------|
| BR-001 | **Status = agreement among usable evidence.** For each site question and each record check: no usable item → *missing*; all usable items give the same finding → *supported*; usable items give different findings (or a reported vs measured area differs beyond tolerance, EQ-009) → *conflicting*. "Supported" means sources agree on the finding, not that the site is good — the finding is always shown with the status. Outcome check is *too early to tell* before the record's outcome-check date. | US-002, US-003, US-011, US-012, US-013 |
| BR-002 | **Append-only.** A published record, its evidence items and its timeline entries are never updated or deleted. Corrections and new evidence are new, dated entries. | US-007, US-008, US-010 |
| BR-003 | **Deterministic decisions; the model only narrates.** Statuses, findings, pin states and numbers come from source data and the rules in [`methods.md`](methods.md). An LLM (Quick or in-app) may summarize them; it never sets a status or introduces a number. | US-003, US-013, US-015 |
| BR-004 | **Pin state precedence.** Red (conflict) if any check or site question on the record is conflicting; otherwise "awaiting evidence" if a check is missing or too early; otherwise "on track". Colours other than red belong to the design doc. | US-009, US-012 |
| BR-005 | **Provenance-first evidence.** Every evidence item carries source, source version, observed and retrieved time, geometry or location, question, finding, value and unit where applicable, method (with its `EQ-###` when computed), spatial resolution where applicable, limitation, link or asset, submitter, and a content hash. | US-002, US-005, US-006, US-010 |
| BR-006 | **Demo data is labelled.** Every seeded site, organization, record and evidence item that is not real is flagged demo and shows a "Demo data" label wherever it appears, including in MCP tool output. Demo organizations use fictional names. | US-001, US-009, US-013 |

**Finding vocabularies (fixed lists, per question):**

| Question / check | Findings |
|------------------|----------|
| Was this mangrove before? | `mangrove_recorded` · `no_mangrove_recorded` |
| What's there now? | `mostly_vegetation` · `mostly_bare_soil` · `mostly_water` |
| What do people on the ground say? | `open_for_restoration` · `active_fishpond` · `land_use_dispute_reported` · `existing_mangrove` |
| Did the work happen? | `work_done` · `no_work_seen` (plus area consistency, EQ-009) |
| Did the mangroves come back? | `recovery_seen` · `no_recovery_seen` (plus expected vs measured vegetated area, EQ-008/EQ-009) |

## 5. App Flow & UX Intent

**Design reference:** [`design.md`](design.md) — not yet written; a teammate generates it from
[`design-brief.md`](design-brief.md). Visual stack: Next.js (App Router) + MapLibre GL JS.

### 5.1 Screen Inventory

| Screen | Purpose | Entry points | States to design |
|--------|---------|--------------|------------------|
| Public map | Find promises across the Philippines and open one (US-009) | App launch `/`, shared link | loading / empty (no records) / error / populated |
| Record | Read a promise, its evidence snapshot, timeline, both checks, integrity (US-008, US-011, US-012, US-014) | Pin click, shared URL, after locking | loading / not found / error / intact / conflict / too early |
| Sign in | Funder or partner signs in (US-005, US-006, US-007) | "Sign in" link; any write action while signed out | idle / submitting / wrong credentials / error |
| Candidate sites | Browse 3–5 Manila Bay sites on map + list, pick sites to compare (US-001) | Signed-in home, "Compare sites" link | loading / empty / error / populated |
| Site dossier | Three answers + all evidence for one site; refresh Sentinel-2; start a lock (US-002, US-003, US-005, US-015) | Site row or polygon click | loading / error / refreshing / live-source-failed / populated |
| Compare | 2–5 sites in columns (US-004) | "Compare" from candidate sites | loading / invalid selection / error / populated |
| Lock promise | Form + irreversible confirmation (US-007) | "Lock a promise" on a dossier (funder only) | editing / validation error / confirming / publishing / error |
| Submit evidence | Partner or funder adds evidence to a site or record (US-006, US-010) | "Add evidence" on dossier or record | editing / uploading / validation error / error / done |
| Amazon Quick chat (external) | Ask why sites differ (US-013) | Amazon Quick console | (owned by Quick) |

### 5.2 App Flow

**Linear (primary path):**

`Sign in → Candidate sites → Site dossier(s) → Compare → Lock promise → (record published) → Record → Public map shows the pin → (later) Submit evidence on the record → checks recompute → pin turns red on conflict`

```mermaid
flowchart TD
    Map[Public map] -->|click pin| Rec[Record]
    Map -->|sign in| SignIn[Sign in]
    SignIn --> Role{Role?}
    Role -->|funder| Sites[Candidate sites]
    Role -->|partner| Sites
    Sites --> Dossier[Site dossier]
    Dossier -->|refresh| S2{Copernicus OK?}
    S2 -->|no| Snap[Keep stored snapshot + notice] --> Dossier
    S2 -->|yes| Dossier
    Sites --> Compare[Compare 2-5 sites]
    Compare --> Dossier
    Dossier -->|funder| Lock[Lock promise + confirm]
    Lock --> Rec
    Rec -->|add evidence| Submit[Submit evidence]
    Dossier -->|add evidence| Submit
    Submit --> Rec
    Rec --> Map
```

| Flow concern | Detail |
|--------------|--------|
| Entry points | `/` (public map); shared record URL; sign-in link; Amazon Quick (external) |
| Decision branches | Role (funder can lock; partner can submit evidence; both can browse); Copernicus reachable or not |
| Dead ends | None — every screen links back to the map or candidate sites |
| Abandonment / resume | An unconfirmed lock form is not saved; nothing is published until confirmation. Submitted evidence is saved immediately. |
| Edge cases | No records yet (empty map with explanation); Copernicus down (snapshot); all pixels cloudy (item "not usable"); outcome date in future (too early); duplicate double-submit of a lock (one record only — see `api.md`) |

### 5.3 Onboarding Flow

- **Aha / first-value moment:** in the comparison, a site that looks restorable on Global Mangrove Watch
  shows a conflicting ground answer — a partner reports an active fishpond — which the map alone does not
  show [R09].
- **Time-to-first-value target:** under 2 minutes in the demo, using pre-seeded sites and evidence.
- **Skippable / resumable:** the public map needs no sign-in; funder/partner flows use seeded demo accounts.
- **Friction budget:** none for public readers; one sign-in for funders and partners.

### 5.4 UX Constraints

- Every status shows its finding, source count and source dates — met by rendering the BR-001 inputs alongside the status, never the status alone.
- Every record shows "This record is not a certification of restoration success or approval of funding" — met by a fixed record footer.
- Demo content is always labelled — met by the `is_demo` flag on every entity (BR-006).
- Live satellite calls must not block the demo — met by a stored Sentinel-2 snapshot per site and an explicit refresh action rather than fetching on page load.
- Laptop/projector browser is the primary surface; the public map and record pages must also read on a phone `[assumption]`.

### 5.5 Instrumentation & Event Taxonomy

| Event name | Fires when | Key properties | Feeds metric |
|------------|-----------|----------------|--------------|
| `comparison_opened` | A comparison renders | site_count, ts | Activation |
| `promise_locked` | A record is published | record_id, site_id, ts | Activation |
| `evidence_added` | An evidence item is appended to a record | record_id, source_type, ts | Retention |
| `record_viewed` | A record page renders | record_id, signed_in (bool), ts | Value (public reach) |

**Naming convention:** snake_case `object_action`, past tense, no PII in properties.
**Analytics tool:** TBD — server logs are enough for the demo.

## 6. Non-Goals

See [`idea.md` §10](../idea.md) for scope exclusions. Rejected features are `Won't` rows in §3.

- No overclaiming copy: the claim boundaries in [`idea.md` §9](../idea.md) "Avoid" apply to every screen, the pitch and Quick's agent instructions. Revisit only with new evidence.
- No enforcement: the product does not notify regulators or penalize anyone; stakeholders act on what is visible [ADR-024]. Revisit if a stakeholder asks for alerts.
- No regions beyond the Manila Bay demo area are seeded for the hackathon. Revisit after the demo.

## 7. Dependencies & Open Questions

**Dependencies**

- Copernicus Data Space account with an OAuth client (Sentinel Hub Statistical API) [R32].
- Global Mangrove Watch v4.1.12 extent stack, downloaded before ingest [R31].
- Amazon Quick access with MCP integration enabled (requires an Enterprise subscription per AWS docs) [R35].
- A public HTTPS URL for the MCP endpoint (Quick connects to remote servers only) [R35].
- Basemap tiles for MapLibre — provider TBD.
- 3–5 demo site polygons and their demo field evidence, authored by the team.

**Open questions**

- Does the handbook's pre-built-product rule allow specs and docs written before the build window? — resolved by asking organizers. `[assumption]` that planning docs are allowed; no code exists before the window.
- Exact build window (10 PM–10 AM) and team cap — resolved by organizers' on-site schedule [context tab §1].
- Rubric weights and Grand Finals criteria — resolved by organizers before the semifinal.
- The demo conflict "8 ha versus 5 ha" is a reported area against a GPS-mapped area, not a satellite reading of seedlings. Closed by ADR-033.
- Threshold values (`HISTORY_MIN_FRACTION`, `MIN_VALID_FRACTION`, `AREA_TOLERANCE`, Sentinel-2 window) — resolved by the data lead and recorded in [`methods.md`](methods.md); all are `[assumption]` until then.
- Include the Global Mangrove Alliance restoration-potential layer [R04] as a fourth evidence source? — resolved by the data lead only if the three-source loop is done.
- Hosting target and basemap provider — resolved by the tech lead at scaffold.
- LLM provider for F-013 (Could) — resolved only if F-013 is started.

## 8. Doc Integrity Check

- [x] Every `F-###` here exists in [`idea.md` §7](../idea.md) with the same ID and MoSCoW tier.
- [x] Every `US-###` names ≥1 real `F-###`; every Must/Should feature is covered (F-001…F-012).
- [x] Story priorities are never stricter than their feature's.
- [x] Every `US-###` has at least one observable Given/When/Then.
- [x] Every persona has ≥1 story; every story names a defined persona.
- [x] Every `BR-###` is invoked by ≥2 stories.
- [x] Every screen in §5.1 is reachable in §5.2 and lists its states.
- [x] No security rule, metric target, route or NFR number is restated here.
- [ ] **Load-bearing and untested:** funders want a public, uneditable promise (idea §9); "supported" will be read as "good" despite BR-001's wording — watch this in the demo and copy.

## References

- [`idea.md`](../idea.md) — problem, segment, features, metrics, exclusions.
- [`index.md` §0](index.md) — which doc owns which fact.
- [`methods.md`](methods.md) — every `EQ-###` cited above.
- [`security.md`](security.md) — auth and threats. [`api.md`](api.md) — contracts. [`tests.md`](tests.md) — the `TC-###` per criterion.
- [`design-brief.md`](design-brief.md) → `design.md` — routes, components, tokens, visual states.
- [`context.md`](../context.md) §7 — `[R##]` citations.
