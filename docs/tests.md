---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-04
doc: tests
owns: test intent and the traceability sink — which feature is proven by which case · the automation contract (path, command, trigger) · regression and exit criteria
---

# Tests — Mangrove

> **Purpose:** what proves each behaviour, and the trace from feature to case to command.
> Traces back to: [`prd.md`](prd.md), [`system-design.md`](system-design.md), [`security.md`](security.md),
> [`methods.md`](methods.md), [`api.md`](api.md). Traces forward to: Kiro specs' `tasks.md` during the build.

No code exists yet. Every command below is the contract the scaffold must create. None of them run today.
A case is `planned` until its file exists and the command has been run.

## 1. Test Strategy

Risk order, cheapest layer that proves the behaviour:

1. **Unit** — the evidence engine and the hash (pure functions). A wrong status or a wrong area is the failure that makes the demo a lie. Owner: whoever builds `api/engine/`.
2. **Integration** — API + Neon PostGIS (a test branch, ADR-036): lock a record, reject an update, append evidence, recompute the pin. Owner: whoever builds the API.
3. **Contract** — MCP `tools/list` is read-only and matches [`api.md`](api.md) API-015. Owner: whoever builds `/mcp`.
4. **E2E** — one browser path: compare → lock → pin appears → conflict turns it red. Owner: whoever builds the web app.

Manual only where a human must look: the Amazon Quick conversation (TC-013b) and the demo-data label on a projector.

## 2. Test Profile

- **Browser UI present:** yes
- **Core smoke path:** US-007 → US-009 → US-012 / TC-020
- **PR gate command:** `pytest` (API and engine) — not runnable until the scaffold exists
- **Full gate command:** `pytest && npm test` — Playwright smoke included; not runnable until the scaffold exists
- **CI budget/constraints:** none. No CI is configured. The gate is local, before the demo.
- **Required environments:** one laptop browser, Chromium. Firefox/WebKit are not required for the judging setup.

## 3. Scope

### In scope

- F-001 through F-012 (every Must and the one Should).
- Authz for funder vs partner vs public (T-011).
- Engine equations EQ-001, EQ-003, EQ-005, EQ-006, EQ-009, EQ-010, EQ-011, EQ-013.
- The append-only database guarantee (BR-002).

### Out of scope

- F-013 and F-014 — Could, and not in the demo script. Reason: the 12-hour window is spent on the lock-and-check loop.
- F-015 through F-021 — Won't. They record decisions, not behaviour.
- Live Copernicus during automated tests — the refresh test stubs the HTTP call. A manual check hits the real API once before the demo.
- Amazon Quick's own UI — we test our MCP server; Quick's rendering is AWS's.
- Load, uptime, and multi-region — no `quality.md`, and the demo is one host.

## 4. Environments

- **Where tests run:** local, against the API and a dedicated Neon test branch (never the demo branch, ADR-036). S3 is stubbed in automated tests (ADR-037).
- **Deterministic data:** `db/seed.sql` loads the demo orgs, users, 3–5 Manila Bay sites, GMW-derived evidence and one stored Sentinel-2 snapshot. Tests that write use a transaction rolled back at the end, except TC-008 which asserts the rollback itself fails.
- **Secrets:** Copernicus credentials and the session key come from the environment. No secret in a fixture or in this doc.
- **External services:** Copernicus and any LLM are stubbed in automated tests. One manual refresh against the live API is done before the demo and is not part of the gate.

## 5. Traceability Matrix

| F-ID | Feature | Priority | Test case ID(s) | Lowest proving level | Automation | Status |
|------|---------|----------|-----------------|----------------------|------------|--------|
| F-001 | Candidate sites | Must | TC-001 | integration | planned | todo |
| F-002 | Evidence dossier + provenance | Must | TC-002 | integration | planned | todo |
| F-003 | GMW + Sentinel-2 adapters | Must | TC-003, TC-005 | integration | planned | todo |
| F-004 | Field evidence submission | Must | TC-006 | integration | planned | todo |
| F-005 | Three-question assessment | Must | TC-004 | unit | planned | todo |
| F-006 | Side-by-side comparison | Must | TC-007 | integration | planned | todo |
| F-007 | Locked promise | Must | TC-008, TC-009 | integration | planned | todo |
| F-008 | Public map | Must | TC-010 | e2e | planned | todo |
| F-009 | Later evidence + two checks | Must | TC-011, TC-012 | integration | planned | todo |
| F-010 | Conflict flag, red pin | Must | TC-013 | integration | planned | todo |
| F-011 | Amazon Quick via MCP | Must | TC-014 | contract | planned | todo |
| F-012 | Record integrity check | Should | TC-015 | unit | planned | todo |
| F-013 | Plain-language summary | Could | — | — | — | deferred — not in the demo; add TC when the story is started |
| F-014 | Upload a candidate polygon | Could | — | — | — | deferred — no story yet; add US + TC when started |
| F-025 | Mangrove context (GMW) | Should | TC-025 | integration | planned | todo |
| F-015 | Success score | Won't | — | — | — | n/a — Won't |
| F-016 | AlphaEarth | Won't | — | — | — | n/a — Won't |
| F-017 | Live ODK | Won't | — | — | — | n/a — Won't |
| F-018 | MRTT import | Won't | — | — | — | n/a — Won't |
| F-019 | Billing | Won't | — | — | — | n/a — Won't |
| F-020 | Sentinel-1 | Won't | — | — | — | n/a — Won't |
| F-021 | Private shortlists | Won't | — | — | — | n/a — Won't |

## 6. Automation Contract

| Test ID | Level/tool | Test path | Command | Trigger | Artifact/evidence |
|---------|------------|-----------|---------|---------|-------------------|
| TC-016 | unit / pytest | `api/tests/test_engine.py` | `pytest api/tests/test_engine.py` | local, before demo | pytest output |
| TC-001–TC-013, TC-017, TC-025 | integration / pytest | `api/tests/test_api.py` | `pytest api/tests/test_api.py` | local, before demo | pytest output |
| TC-014 | contract / pytest | `api/tests/test_mcp.py` | `pytest api/tests/test_mcp.py` | local, before demo | pytest output |
| TC-015 | unit / pytest | `api/tests/test_ledger.py` | `pytest api/tests/test_ledger.py` | local, before demo | pytest output |
| TC-020 | e2e / Playwright | `web/e2e/demo.spec.ts` | `npm test` | local, before demo | HTML report on failure |

These paths do not exist yet. Creating them is part of the build, not of this plan.

## 7. Test Cases

### TC-001 — Candidate sites list with area and demo label

- **Covers:** F-001 · **Proves:** US-001
- **Level:** integration
- **Preconditions / controlled data:** seed with 3–5 sites, `is_demo = true`
- **Steps:** `GET /api/v1/sites?region=Manila%20Bay` with no session
- **Expected:** Given 3–5 seeded candidate sites, when the candidate list is requested, then each site is returned with its name and its area in hectares (EQ-001). Given a site is demo data, when it is returned, then `is_demo` is true.
- **Automation:** planned — `pytest api/tests/test_api.py::test_sites`

### TC-002 — Dossier shows provenance and drops unusable items from the status

- **Covers:** F-002 · **Proves:** US-002
- **Level:** integration
- **Preconditions / controlled data:** one site with a usable GMW item and one Sentinel-2 item with `usable = false`
- **Steps:** `GET /api/v1/sites/{id}`
- **Expected:** Given a site with evidence items, when its dossier is opened, then every item shows source, source version, observed date, retrieved date, method, spatial resolution where applicable, limitation, and a link or asset (BR-005). Given an item is not usable, when the dossier is returned, then it is marked not usable with the reason and its finding is absent from the status inputs (BR-001).
- **Automation:** planned — `pytest api/tests/test_api.py::test_dossier_provenance`

### TC-003 — Pre-ingested GMW history is on every demo site

- **Covers:** F-003 · **Proves:** US-002
- **Level:** integration
- **Preconditions / controlled data:** seed produced by the GMW ingest script
- **Steps:** `GET` each demo site
- **Expected:** Given the Global Mangrove Watch snapshot was pre-ingested, when any demo site's dossier is opened, then it contains a GMW item with historical mangrove area per year and maximum historical extent (EQ-002, EQ-003), each metric carrying `eq_id` and `confidence`.
- **Automation:** planned — `pytest api/tests/test_api.py::test_gmw_item`

### TC-004 — Three answers, no score

- **Covers:** F-005 · **Proves:** US-003
- **Level:** unit
- **Preconditions / controlled data:** fixture dossiers — all agreeing, none usable, two disagreeing
- **Steps:** call the engine status function
- **Expected:** Given a site dossier, when it is assessed, then it returns three questions (history, current, ground), each with a finding, a status of supported, conflicting or missing, and a source count (EQ-013). Given no usable evidence for a question, when it is assessed, then the status is missing and the finding is null. Given any site, when it is assessed, then no score, rank or probability is produced.
- **Automation:** planned — `pytest api/tests/test_engine.py::test_three_answers`

### TC-005 — Sentinel-2 refresh appends, and failure keeps the snapshot

- **Covers:** F-003 · **Proves:** US-005
- **Level:** integration
- **Preconditions / controlled data:** funder session; HTTP stub for the Statistical API, then a stub that returns 500
- **Steps:** `POST /api/v1/sites/{id}/sentinel-refresh` twice
- **Expected:** Given Copernicus is reachable, when a refresh is requested, then a new Sentinel-2 item is appended with its window, valid-pixel fraction (EQ-005) and class fractions (EQ-006), and the current-condition status recomputes. Given Copernicus fails, when a refresh is requested, then no new item is created and the response is `502`.
- **Automation:** planned — `pytest api/tests/test_api.py::test_sentinel_refresh`

### TC-006 — Field submission, metadata stripped, role enforced

- **Covers:** F-004 · **Proves:** US-006
- **Level:** integration
- **Preconditions / controlled data:** partner session; a JPEG with EXIF GPS and a camera serial; a second request with no session
- **Steps:** `POST /api/v1/evidence` as partner, then unauthenticated
- **Expected:** Given a signed-in partner, when they submit a JPEG, a GPS point, a date and a finding from the fixed list, then a field item is appended with their organization as the source. Given a photo is uploaded, when it is stored, then the stored bytes contain no EXIF. Given the caller is not a signed-in partner, when they submit, then the response is `401` or `403` and nothing is stored.
- **Automation:** planned — `pytest api/tests/test_api.py::test_field_submit`

### TC-007 — Compare accepts 2–5 and rejects other counts

- **Covers:** F-006 · **Proves:** US-004
- **Level:** integration
- **Preconditions / controlled data:** three seeded sites
- **Steps:** `GET /api/v1/compare` with 2 ids, then with 1 id
- **Expected:** Given 2–5 sites are requested, when comparison runs, then each site is returned in request order with its area, three answers and source counts. Given fewer than 2 ids, when comparison is requested, then the response is `422` `COMPARE_RANGE`.
- **Automation:** planned — `pytest api/tests/test_api.py::test_compare`

### TC-008 — A published record cannot be updated or deleted

- **Covers:** F-007 · **Proves:** US-008
- **Level:** integration
- **Preconditions / controlled data:** one seeded record; database connection as the app role
- **Steps:** `PUT` and `DELETE` the record over HTTP; then `UPDATE` and `DELETE` the row in SQL
- **Expected:** Given a published record, when anyone tries to change or delete it through the product, then the attempt is refused (`405`) and the row is unchanged. Given the app role issues `UPDATE` or `DELETE` on `promise_record`, `evidence_item` or `record_event`, when the statement runs, then the database rejects it.
- **Automation:** planned — `pytest api/tests/test_api.py::test_immutable`

### TC-009 — Lock publishes one record and a retry does not duplicate it

- **Covers:** F-007 · **Proves:** US-007
- **Level:** integration
- **Preconditions / controlled data:** funder session; a complete lock body; the same `Idempotency-Key` sent twice; a third call with the outcome date before the work date
- **Steps:** `POST /api/v1/records`
- **Expected:** Given a funder submits a complete lock, when it is confirmed, then one record is published with publication time, funder organization, a snapshot of geometry and evidence, and a content hash (EQ-011). Given the same key and body are retried, when the second call arrives, then the same record is returned and no second row exists. Given the outcome-check date is before the work-check date, when the form is submitted, then nothing is published (`422`).
- **Automation:** planned — `pytest api/tests/test_api.py::test_lock`

### TC-010 — Public map returns a pin per record without a session

- **Covers:** F-008 · **Proves:** US-009
- **Level:** e2e
- **Preconditions / controlled data:** two seeded records with different pin states
- **Steps:** open `/` signed out; request `GET /api/v1/records`
- **Expected:** Given published records, when the map is opened without signing in, then one pin is returned per record with a `pin_state`. Given a record id, when its page is requested, then the promise, snapshot, timeline and both checks are present.
- **Automation:** planned — `npm test` (`web/e2e/demo.spec.ts`) plus `pytest api/tests/test_api.py::test_pins`

### TC-011 — Later evidence appends and the promise stays

- **Covers:** F-009 · **Proves:** US-010
- **Level:** integration
- **Preconditions / controlled data:** a published record; partner session
- **Steps:** `POST /api/v1/evidence` with `record_id`
- **Expected:** Given a published record, when a partner submits field evidence, then a timeline event is appended and the record's `content_hash` and promise fields are byte-for-byte unchanged.
- **Automation:** planned — `pytest api/tests/test_api.py::test_later_evidence`

### TC-012 — The two checks stay separate, and the outcome can be too early

- **Covers:** F-009 · **Proves:** US-011
- **Level:** integration
- **Preconditions / controlled data:** a record whose `outcome_check_after` is in the future, with one work-evidence item
- **Steps:** `GET /api/v1/records/{id}`
- **Expected:** Given a record, when it is read, then `checks` contains `work` and `outcome` separately, each with its own status. Given today is before `outcome_check_after`, when it is read, then the outcome status is `too_early` and `checkable_from` is that date.
- **Automation:** planned — `pytest api/tests/test_api.py::test_two_checks`

### TC-013 — An area disagreement flags the check and turns the pin red

- **Covers:** F-010 · **Proves:** US-012
- **Level:** integration
- **Preconditions / controlled data:** a record with planned area 8 ha; a project report claiming 8 ha; a partner boundary of 5 ha
- **Steps:** submit both evidence items; `GET` the record and the pin list
- **Expected:** Given a reported area and a measured area differ by more than the tolerance (EQ-009), when the record is read, then the work check is `conflicting`, both values are present with their `eq_id`, and `pin_state` is `conflict`.
- **Automation:** planned — `pytest api/tests/test_api.py::test_conflict_pin`

### TC-013b — Quick quotes the tool, and cannot write

- **Covers:** F-011 · **Proves:** US-013
- **Level:** contract, plus one manual Quick session
- **Preconditions / controlled data:** MCP server running; Quick connector pointed at it
- **Steps:** `tools/list`; call `compare_sites`; in Quick, ask why two seeded sites differ
- **Expected:** Given the MCP server is connected, when Quick asks why two sites differ, then the tool result contains findings, statuses, sources, `eq_id` and `is_demo`, and the agent's numbers match that result. Given any tool is listed, when `tools/list` is read, then no tool creates or changes data.
- **Automation:** the read-only list is `pytest api/tests/test_mcp.py`. The Quick conversation is manual — because Quick's UI is not ours.

### TC-014 — MCP tools match the contract

- **Covers:** F-011 · **Proves:** US-013
- **Level:** contract
- **Preconditions / controlled data:** running API
- **Steps:** initialize MCP and list tools
- **Expected:** Given the server is up, when tools are listed, then the names are exactly `list_sites`, `get_site_dossier`, `compare_sites`, `list_records`, `get_record`, `verify_record`, and each `inputSchema` is an object whose `required` is an array.
- **Automation:** planned — `pytest api/tests/test_mcp.py`

### TC-015 — Verify recomputes the hash chain

- **Covers:** F-012 · **Proves:** US-014
- **Level:** unit
- **Preconditions / controlled data:** a record plus two events; a second copy with one byte of `body` flipped
- **Steps:** run EQ-011 verification on both
- **Expected:** Given an untampered record, when verification runs, then the result is intact. Given one event payload is altered, when verification runs, then the result names that event's `seq`.
- **Automation:** planned — `pytest api/tests/test_ledger.py`

### TC-016 — Engine numbers match their equations

- **Covers:** F-001, F-003, F-005, F-010 · **Proves:** US-001, US-003, US-012
- **Level:** unit
- **Preconditions / controlled data:** a square polygon of known geodesic area; a tiny GMW raster fixture with a known count of DN=1 pixels; an SCL histogram fixture; reported 8 ha vs mapped 5 ha
- **Steps:** call EQ-001, EQ-003, EQ-005, EQ-006, EQ-009, EQ-013
- **Expected:** Given the fixture inputs, when each equation runs, then the output matches a hand-computed value from [`methods.md`](methods.md) and the confidence is the rubric's value (High for EQ-001 and EQ-013, Medium for EQ-003, Low for EQ-005, EQ-006 and EQ-009).
- **Automation:** planned — `pytest api/tests/test_engine.py`

### TC-017 — A partner cannot lock, and a funder cannot file a field report

- **Covers:** F-004, F-007 · **Proves:** US-006, US-007
- **Level:** integration
- **Preconditions / controlled data:** one partner session and one funder session
- **Steps:** partner `POST /records`; funder `POST /evidence` with `source_type=field`
- **Expected:** Given a partner calls the lock endpoint, when it is handled, then the response is `403` and no record exists. Given a funder submits `source_type=field`, when it is handled, then the response is `403` and no item exists.
- **Automation:** planned — `pytest api/tests/test_api.py::test_roles`

### TC-020 — Demo path is visible in the browser

- **Covers:** F-006, F-008 · **Proves:** US-004, US-007, US-009
- **Level:** e2e
- **Preconditions / controlled data:** seeded sites, one of them with a conflicting ground finding (`active_fishpond`); demo funder account
- **Steps:** open `/` signed out; sign in; open comparison
- **Expected:** Given seeded records, when the map is opened signed out, then pins are visible. Given the comparison is opened, when it renders, then the conflicting site shows the fishpond finding and a status word, and every demo site shows "Demo data". The lock confirmation screen is checked by eye once (US-007's confirmation sentence); the spec does not submit a lock.
- **Automation:** planned — `npm test`

### TC-018 — Summary is not built

- **Covers:** F-013 · **Proves:** US-015
- **Level:** —
- **Preconditions / controlled data:** —
- **Steps:** —
- **Expected:** Not written. US-015's criterion (a summary states no status or number absent from the dossier) is uncovered until F-013 is started.
- **Automation:** manual — because the feature is deferred

### TC-025 — GMW context: site series, national card, bay layer

- **Covers:** F-025 · **Proves:** US-017
- **Level:** integration
- **Preconditions / controlled data:** GMW history items ingested for the demo sites; the shipped PHL statistics and extent layers
- **Steps:** `GET /api/v1/sites/{B}/gmw-timeline`; `GET /api/v1/context/countries/PHL`; `GET /api/v1/layers/gmw-extent?year=2025` and `?year=1987`
- **Expected:** Given a site with GMW ingested, when its series is requested, then 41 years are returned, each `inside` citing EQ-002 and each `nearby` citing EQ-014, with the 1985 limitation. Given the Philippines card, when it is requested, then each year's extent cites EQ-015 with lower ≤ value ≤ upper, and 1985 has no gain or loss. Given a layer year that is not offered, when it is requested, then `422` names the available years.
- **Automation:** planned — `pytest api/tests/test_api.py::test_gmw_context`

## 8. Browser E2E with Playwright

One Playwright spec, Chromium only, for TC-020: signed out, the map shows pins; sign in as the demo funder; open the comparison; the conflicting site shows the fishpond finding; lock is not clicked in the automated spec (locking is covered by TC-009, and the spec must not publish a new record on every run).

- Assert user-visible text: site name, a status word (`supported`, `conflicting` or `missing`), and `Demo data`. Locate by role and text, not by CSS.
- `workers: 1`, `forbidOnly` in CI if CI is ever added, `trace: 'on-first-retry'`.
- Do not add Firefox or WebKit for the hackathon.
- The spec stubs nothing it can read from the seeded API. It does not call Copernicus.

## 9. Story → Case Map

| `US-###` | Criteria count | Case(s) | Uncovered criterion |
|----------|----------------|---------|---------------------|
| US-001 | 2 | TC-001 | — |
| US-002 | 3 | TC-002, TC-003 | — |
| US-003 | 3 | TC-004 | — |
| US-004 | 2 | TC-007 | — |
| US-005 | 2 | TC-005 | — |
| US-006 | 3 | TC-006, TC-017 | — |
| US-007 | 3 | TC-009 | the on-screen confirmation sentence is covered by TC-020's manual pass, not by the API test |
| US-008 | 2 | TC-008 | — |
| US-009 | 2 | TC-010 | — |
| US-010 | 1 | TC-011 | — |
| US-011 | 2 | TC-012 | — |
| US-012 | 2 | TC-013 | the second criterion (a conflicting *site question*, as opposed to an area check) is asserted in TC-004 |
| US-013 | 2 | TC-013b, TC-014 | — |
| US-014 | 1 | TC-015 | — |
| US-015 | 1 | — | the summary criterion — F-013 is Could and deferred |
| US-017 | 4 | TC-025 | the map-layer criterion is checked by eye in the demo rehearsal |

## 10. Regression Plan

- **Per task / PR:** the pytest file for the area just changed (`test_engine.py`, `test_api.py`, `test_mcp.py` or `test_ledger.py`).
- **On main:** `pytest`.
- **Before demo:** `pytest && npm test`, plus the one manual live Sentinel-2 refresh and the one manual Quick question.

## 11. Exit Criteria

- **Required to pass:** `pytest` green for TC-001 through TC-017, and `npm test` green for TC-020.
- **Allowed open:** TC-018 (F-013 deferred). A flaky live-Copernicus call is not a gate; the stubbed test is.
- **Blocking:** TC-004 (no score, honest status), TC-008 (immutability), TC-009 (one record), TC-013 (red pin), TC-014 (MCP read-only). A failure in any of these blocks the demo.

## 12. Doc Integrity Check

- [x] Every Must/Should `F-###` has ≥1 case; every Could without one states why; every Won't is `n/a — Won't`.
- [x] Every case names a real `F-###` and the `US-###` it proves.
- [x] §9 accounts for every story's criteria or names the uncovered one.
- [x] Automated rows name a path and a command, and §2 says they are not runnable yet.
- [x] No secret is inlined.
- [x] Criteria are copied into `Expected`, not paraphrased into a second spec.
- [ ] **Cheap rather than important?** TC-010's browser check is the one most likely to be skipped under time pressure, and it is the one a judge sees. Do not trade it for more unit tests.

## References

- [`prd.md`](prd.md) — §3 features, §4 criteria.
- [`security.md`](security.md) — auth and the immutability gate.
- [`methods.md`](methods.md) — equations TC-016 recomputes.
- [`api.md`](api.md) — the contracts these cases call.
