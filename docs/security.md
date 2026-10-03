---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-04
doc: security
owns: threat model (T-###) · data classification · authn/authz model · secrets & audit policy · the pre-milestone go/no-go gate
---

# Security — AIDE-M

> **Purpose:** data classification, who may call what, the threats against a public record that must stay
> trustworthy, and the go/no-go gate before the demo.
> Traces back to: [`idea.md` §9](../idea.md), [`system-design.md`](system-design.md),
> [`data-model.md`](data-model.md). Traces forward to: [`tests.md`](tests.md).

## 1. Limits

Product limits live in [`prd.md` §6](prd.md) and [`idea.md` §10](../idea.md). They are choices, not ids. This
doc does not copy or enforce them.

## 2. Open Security Questions

Security concerns that are still guesses go in [`prd.md` §7](prd.md).

## 3. Data Classification

| Category | Examples in this product | Where it lives | Retention & deletion |
|----------|--------------------------|----------------|----------------------|
| public | Sites, evidence items, the public projection of a record (benefit text, timeline, milestones, photos with metadata stripped, checks, flag), organization names, hashes | Neon PostgreSQL; private S3 bucket (photos, ADR-037); API responses; MCP tool output | Kept indefinitely; append-only by design (BR-002). Never deleted through the product |
| confidential | The funder-partner contract: agreement or MOA text, and consequence clauses. Not the public benefit sentence | Stored apart from the public projection ([`data-model.md`](data-model.md)). Not in public API responses. Not in MCP tool output | Kept with the record. Readable by the funder account and the partner account on that record. Never returned to the public or to Amazon Quick |
| internal | User ids, roles, raw source responses (`evidence_item.raw`), idempotency keys, server logs, and the flag notice (recipient is the funder account; the notice body is the flag, not the contract) | PostgreSQL; host logs | Database: for the life of the demo deployment. Logs: deleted with the demo host `[assumption]` |
| PII | Demo users' email and display name; any personal data that slips into a photo or note | `app_user`; potentially evidence photos/notes | Demo accounts only, deleted with the deployment. Personal data found in published evidence cannot be deleted through the product (§6 explains the guard and the residual risk) |
| secret | Copernicus OAuth client secret, session signing key, demo account passwords, database password | Host environment variables; password hashes in `app_user` | Never in the repo, docs, logs or client bundle; rotate after the event |

[`data-model.md`](data-model.md) tags each field against these categories.

## 4. Authn / Authz Model

**How identity is proven:** seeded accounts only (no sign-up). `API-001` verifies the password against an
Argon2id hash `[assumption: library chosen at scaffold]` and sets a signed, `HttpOnly; Secure; SameSite=Lax`
session cookie (the browser reaches the API on the same origin through the Next.js proxy). Every
write handler checks session, then role, then ownership — in FastAPI dependencies, so the check cannot be
forgotten in one handler.

| Surface | Who may call it | How identity is proven | Enforced where |
|---------|-----------------|------------------------|----------------|
| Web pages (`/`, site pages, record pages) | public for reads | — | — (read-only). Propose and commit stay signed-in |
| `GET` sites, compare, records, verify, assets (API-004/005/006/010/011/013/014) | public. Every field on the unauthenticated response is classified public (§3). The confidential contract is omitted. The funder notice is omitted | — | Response models expose only public fields |
| `POST /api/v1/auth/login` (API-001) | public | Email + password → session | API handler; rate limit |
| `POST /auth/logout`, `GET /auth/me` (API-002/003) | signed in | Session cookie | API dependency |
| `POST /sites/{id}/sentinel-refresh` (API-007) | role `funder` | Session cookie | API dependency (session + role) |
| `POST /evidence` (API-008) | `partner` for `field`; `funder` for `project_report` | Session cookie | API dependency (session + role-by-source-type) |
| `POST /records` (API-009) | role `funder` | Session cookie | API dependency; database stores `created_by_user_id`. Copies the partner proposal; does not accept a funder-written benefit |
| `POST /sites/{id}/proposal` (API-019) | role `partner` | Session cookie | API dependency (session + role) |
| `GET /records/{id}/notice` (API-020) | role `funder` of the record's org | Session cookie | API dependency (session + role + org match). Body is the flag, not the contract |
| `POST /records/{id}/corrections` (API-012) | role `funder` of the record's org | Session cookie | API dependency (session + role + org match) |
| `POST /sites` (API-017), `POST /sites/{id}/summary` (API-018) | `funder` / any signed-in | Session cookie | API dependency |
| `POST /mcp` (API-015) | public — read-only tools returning the public subset only. No contract text. No funder notice | — (Amazon Quick supports unauthenticated MCP servers [R35]) | No write tools are registered; rate limit; response models exclude confidential and internal notice fields |
| `GET /layers/gmw-extent/tiles…` (API-024) | public — map tiles of public GMW data; no record or user data | — | Read-only route; the response is a PNG of GMW's classification only; `Access-Control-Allow-Origin: *` is safe because no credential or private data is involved (ADR-049); browser and in-memory caching bound the load |
| `GET /layers/gmw-change/tiles…` (API-025) | public — map tiles of public GMW data; no record or user data | — | Read-only route; the response is a PNG of GMW's classification only; `Access-Control-Allow-Origin: *` is safe because no credential or private data is involved (ADR-050); browser and in-memory caching bound the load |
| `GET /health` (API-016) | public — returns no data | — | — |
| Deploy pipeline (`.github/workflows/deploy.yml` → SSM on the host) | GitHub Actions runs on pushes to `master` of this repo only | GitHub OIDC token → IAM role `bon-mangrove-gha-deploy` (trust: `ref:refs/heads/master`) | IAM trust condition + a policy limited to `ssm:SendCommand` on the demo instance (ADR-047) |
| Any `PUT`/`PATCH`/`DELETE` on evidence, records, timeline | nobody | — | No route (405) **and** database trigger **and** grants (BR-002) |

## 5. Threat Model (`T-###`)

STRIDE over the data flow in [`system-design.md` §3](system-design.md).

| `T-###` | Threat (STRIDE) | Vector | Impact | Mitigation | Enforces |
|---------|-----------------|--------|--------|------------|----------|
| T-001 | Spoofing | Forged or stolen session cookie to lock a promise as a funder | False promise published under a real org's name, permanently | Signed cookie with server secret; `HttpOnly; Secure; SameSite=Lax`; seeded accounts only; session expiry | BR-002 |
| T-002 | Tampering | Editing or deleting a record or evidence through the API | The public baseline silently changes | No update/delete routes; `BEFORE UPDATE OR DELETE` triggers; app DB role has `SELECT, INSERT` only | BR-002 |
| T-003 | Tampering | Operator or database superuser rewrites rows and recomputes hashes | Same as T-002, done by us | Hash chain (EQ-011) shown publicly at publication so third parties can keep it; **residual risk accepted**: tamper-evident, not tamper-proof. Claim copy must say "cannot be edited through AIDE-M; any change breaks the published hash", never "impossible to alter" | BR-002 |
| T-004 | Repudiation | A funder later denies making a promise | Accountability lost | `created_by_user_id`, `funder_org_id`, `published_at` inside the hashed payload | BR-002 |
| T-005 | Information disclosure | Photo EXIF (device serial, exact capture metadata) or faces/names in photos and notes | Exposes partners or community members | EXIF stripped on upload; partners attest no identifiable people or personal data; notes guidance in the form | BR-005 |
| T-006 | Information disclosure | Error bodies leak stack traces, SQL or hosts | Recon for further attacks | Uniform error envelope ([`api.md` §4](api.md)); debug off in the demo deployment | — |
| T-007 | Information disclosure | Copernicus secret reaches the browser bundle or logs | Quota theft, account abuse | Secret only in the API's environment; never sent to the web app; never logged | — |
| T-008 | Tampering | Malicious upload (polyglot file, oversized image) | Code execution or storage exhaustion | Type checked by content (JPEG/PNG only), size cap, re-encode on EXIF strip, stored by hash in the private S3 bucket (ADR-037), never on an executable path | — |
| T-009 | Tampering | SQL injection through query or form fields | Data corruption/disclosure | Parameterized queries only; typed request models | — |
| T-010 | Denial of service | Flooding public GETs, `/mcp`, or Sentinel-2 refresh | Demo unavailable; Copernicus quota exhausted | Rate limits in [`api.md` §5](api.md); refresh is funder-only and per-site throttled | — |
| T-011 | Elevation of privilege | Partner calling funder-only operations, or funder correcting another org's record | Unauthorized promises/corrections | Role and org checks in shared dependencies; tests TC-021, TC-022 | BR-002 |
| T-012 | Tampering (prompt injection) | Evidence notes crafted to steer Amazon Quick or the F-013 summarizer | Misleading narrative | Statuses and numbers come from the engine only (BR-003); tool output marks notes as untrusted quoted data; MCP has no write tools, so injection cannot cause actions | BR-003 |
| T-013 | Spoofing | Credential stuffing on the login | Account takeover | Login rate limit; strong per-event demo passwords; same error for wrong email or password | — |
| T-014 | Information disclosure | Contract text or consequence clauses copied into a public GET or an MCP tool | The private agreement becomes public, and Quick can repeat it | No public or MCP schema includes the contract. The flag notice goes to the funder account and carries the flag, not the clauses. TC-024 | — |
| T-015 | Elevation of privilege | Anyone able to push or force-push `master` (or edit the workflow on `master`) runs commands on the demo host through the deploy pipeline | Arbitrary code on the host; secrets in the host `.env` exposed | The IAM role trusts only pushes to `master` of this repo and may only send commands to the demo instance; no SSH key or AWS key is stored in GitHub; only the orchestrator merges to `master` (ADR-039); **residual:** branch protection on `master` is not yet enabled | — |

## 6. Abuse & Safety Risks

| Risk | Who is harmed | Trigger | Guard (mitigation) |
|------|---------------|---------|--------------------|
| Publicly flagging a site as an "active fishpond" or "land-use dispute" exposes the people who work or live there | Fishpond operators, local households, community members near the site | A partner submits ground evidence that becomes public | Findings describe site conditions, never people; notes must not name individuals; partner attestation on submit; site-level location only |
| A funder treats "supported" or a GMW layer as certification and greenwashes | The public, other funders, communities expecting restoration | Funder quotes the record in marketing | BR-001 wording ("sources agree", not "good"); BR-007 (no "successful", no certificate); disclaimer on every record; GMW is history, not a completion check; banned overclaiming copy (see [`design-brief.md`](design-brief.md)) |
| Partners submit flattering evidence to make a project look good | Funders and the public | Incentive to show success | Provenance and submitter on every item; nothing can be deleted; conflicts surface automatically; never reward "successful" observations [ADR-014] |
| Demo data mistaken for real Philippine projects or organizations | Real NGOs/companies; judges; the public | Screenshots or the live demo | `is_demo` on every entity, a visible "Demo data" label, fictional organization names (BR-006) |
| A real, sourced record (ADR-056) is read as an accusation against a real organization or person | The cited organizations (DENR, the Ministry of Foreign Affairs of Japan, the Barangay Local Government of Paraiso (Barangay 83), the Provincial Government of Leyte, the Naungan-San Juan Mangrove Planters Association; ADR-059), named officials and scientists | The Post-Yolanda records are public and name real parties | Real organizations appear only as cited parties in `is_demo = false` rows, every item links its source, no individual is named in any row, copy says the system could not detect misuse (never "corruption" or "nothing survived"), gaps go in `known_unknowns`; the rows are written by a team seeder account that cannot sign in |
| Personal data published by mistake cannot be removed | The person in the photo or note | Append-only storage | Pre-publication guard (attestation, EXIF strip). **Residual risk:** after the event, an operator-level redaction procedure would be needed; out of scope for the hackathon and recorded in [`prd.md` §7](prd.md)'s open questions |

## 7. Secrets, Audit & Compliance

**Secrets.** Copernicus client id/secret, session signing key (`SESSION_SECRET`), Neon connection strings
(they carry the database password) and demo account passwords live in environment variables on the host (and a local, git-ignored `.env` for development). An `.env.example`
with names only is committed. Never inline a secret value in any doc, commit, log line or MCP output —
anything that lands in git history stays compromised even after a revert. Rotate all of them after the event. There are no AWS access keys: the EC2 instance role grants S3 read/write on the one bucket and no delete.

**Audit & logging.** The append-only tables are the audit trail (who, what, when, hash). Request logs record
method, path, status and user id. **Never logged:** passwords, session cookies, the Copernicus secret or
tokens, full request bodies of uploads.

**Compliance obligations.**
- Philippine Data Privacy Act of 2012 (RA 10173) applies to personal information of demo users and anything personal in evidence `[assumption — confirm with counsel before real use]`. Guard: minimal PII (demo accounts only), §6 measures.
- Data licences: GMW attribution (CC BY 4.0, confirmed for v4.1.12) and Copernicus Sentinel data attribution — both credited on the site and in [`methods.md` §4](methods.md).
- No carbon-credit, land-title or certification claims are made ([`idea.md` §10](../idea.md)).

## 8. Pre-Milestone Hard Gate

Milestone: the live demo / submission (Build Over Nights 2026, October 4). A failed line blocks it.

- [ ] Every network-exposed surface declares auth/authz in §4 — no open write paths. — 2026-10-04
      *Why: an unauthenticated write could publish a permanent false promise. Authority: FMD `ORCHESTRATOR.md` definition of done.*
- [ ] No secret is committed; `.env` is git-ignored and only `.env.example` (names, no values) is in the repo. — 2026-10-04
      *Why: git history is permanent and public repos are scraped continuously. Authority: universal engineering practice.*
- [ ] The system SHALL NEVER update or delete a row in `evidence_item`, `promise_record` or `record_event`: an `UPDATE` and a `DELETE` attempted as the app role both fail (TC-008). — 2026-10-04
      *Why: the product's whole claim is an uneditable promise. Authority: product judgment (BR-002), the team's core mechanism [ADR-024].*
- [ ] The MCP server SHALL NEVER expose a write tool: `tools/list` returns only the six read tools in [`api.md`](api.md) API-015. — 2026-10-04
      *Why: the endpoint is unauthenticated. Authority: product judgment, relying on Amazon Quick's documented unauthenticated mode [R35].*
- [ ] Every demo entity shows "Demo data", and no real organization is named as a funder or partner in demo content. Real organizations appear only in `is_demo = false` sourced records, as cited parties, with no individual named (ADR-056). — 2026-10-04
      *Why: misattributing promises to real organizations harms them and misleads judges. Authority: product judgment (BR-006).*
- [ ] Every `T-###` mitigation is implemented, not planned (T-003's residual risk stated in the copy). — 2026-10-04
      *Why: a planned mitigation stops nothing. Authority: §5 of this doc.*
- [ ] `docs/ledger.md` and `docs/index.md` §0/§0.5 agree (`tools/check-context-overlay.py` passes). — 2026-10-04
      *Why: two disagreeing sources of truth is how an agent builds the wrong thing. Authority: FMD ADR-0011.*

## 9. Incident Response Basics

- **Detection:** a teammate notices in the demo or logs (no monitoring stack for the hackathon).
- **Escalation:** whoever notices tells the tech lead immediately; the tech lead decides.
- **Rollback:** redeploy the previous git commit with `docker compose up -d --build`; the database is never rolled back (append-only).
- **Notification:** organizers via the official group chat if the demo URL is affected; if personal data was published, tell the affected partner and follow the RA 10173 assessment `[assumption]`.

## 10. Doc Integrity Check

- [x] Every network-exposed surface from the system design has a §4 row, including deliberate public ones.
- [x] Every `Enforces` reference resolves to a real `BR-###`.
- [x] Every §8 gate line carries a reason and a named authority.
- [x] Classification is defined here only; the data model links here.
- [ ] **Product judgment wearing the tone of law?** The MCP "no auth" line is product judgment — re-label it if a funder needs confidentiality (F-021).
- [ ] **Survives only because written down?** RA 10173 applicability is an `[assumption]` until counsel confirms.

## References

- [`idea.md` §9](../idea.md) — risks and things to avoid.
- [`system-design.md` §3](system-design.md) — the data flow and trust boundaries.
- [`data-model.md`](data-model.md) — fields tagged against §3.
- [`api.md`](api.md) — operations, errors, rate limits.
- [`tests.md`](tests.md) — the cases for auth, immutability and MCP.
