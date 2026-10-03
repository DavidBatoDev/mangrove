---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-04
doc: api
owns: the operation contracts (API-###) the web app, Amazon Quick and other clients depend on — request and response shapes, per-operation auth requirement, error codes, rate limits, versioning
---

# API — Mangrove

> **Purpose:** what a caller must send, what it can rely on receiving, and what it must present. Two
> surfaces: the REST API used by the web app, and the read-only MCP server used by Amazon Quick.
> Traces back to: [`system-design.md`](system-design.md), [`data-model.md`](data-model.md). Traces forward
> to: [`tests.md`](tests.md), client code.

## 1. Overview & Machine-Readable Spec

- **What this API serves:** the Mangrove web app (same origin, via the Next.js `/api/*` proxy) and Amazon Quick (MCP).
- **Base URL / namespace:** REST at `/api/v1`; MCP at `/mcp`.
- **Protocol style:** REST + JSON (multipart for uploads); MCP over streamable HTTP.
- **Machine-readable spec:** `none` yet. Once the API is scaffolded, FastAPI's generated `/api/v1/openapi.json` becomes the source of truth for field shapes, and §3 below shrinks to semantics.
- **Relationship to the code:** this doc is the contract until the OpenAPI file exists; after that, code-generated.
- **Where it is validated:** contract tests in [`tests.md`](tests.md) (planned).

**Common conventions:** UUIDs for ids; timestamps ISO 8601 UTC; areas in hectares; every number in a response
is an object `{value, unit, eq_id, confidence}` (glass-box, [`methods.md` §1](methods.md)); every entity
carries `is_demo`. Errors use `{"error": {"code": "<CODE>", "message": "<human text>"}}`.

## 2. Operation Index

| `API-###` | Operation | Serves | Auth | Status |
|-----------|-----------|--------|------|--------|
| API-001 | `POST /api/v1/auth/login` | F-003, F-004, F-007 | **none — it is the sign-in; rate-limited (§5)** | stable |
| API-002 | `POST /api/v1/auth/logout` | F-007 | session | stable |
| API-003 | `GET /api/v1/auth/me` | F-004, F-007 | session | stable |
| API-004 | `GET /api/v1/sites` | F-001 | **none — public data** | stable |
| API-005 | `GET /api/v1/sites/{site_id}` | F-002, F-003, F-005 | **none — public data** | stable |
| API-006 | `GET /api/v1/compare` | F-006 | **none — public data** | stable |
| API-007 | `POST /api/v1/sites/{site_id}/sentinel-refresh` | F-003 | session, role `funder` | stable |
| API-008 | `POST /api/v1/evidence` | F-004, F-009, F-010 | session, role `partner` (field) or `funder` (project report) | stable |
| API-009 | `POST /api/v1/records` | F-007 | session, role `funder` | stable |
| API-019 | `POST /api/v1/sites/{site_id}/proposal` | F-001, F-007 | session, role `partner` | stable |
| API-020 | `GET /api/v1/records/{record_id}/notice` | F-010 | session, role `funder`, same org as the record | stable |
| API-010 | `GET /api/v1/records` | F-008, F-010 | **none — public data** | stable |
| API-011 | `GET /api/v1/records/{record_id}` | F-007, F-009, F-010 | **none — public data** | stable |
| API-012 | `POST /api/v1/records/{record_id}/corrections` | F-007 | session, role `funder`, same org as the record | stable |
| API-013 | `GET /api/v1/records/{record_id}/verify` | F-012 | **none — public data** | stable |
| API-014 | `GET /api/v1/assets/{sha256}` | F-004 | **none — published evidence photos; metadata stripped** | stable |
| API-015 | `POST /mcp` (MCP tools, §3) | F-011 | **none — read-only tools over public data; rate-limited** | stable |
| API-016 | `GET /api/v1/health` | — | **none — returns no data** | stable |
| API-017 | `POST /api/v1/sites` | F-014 | session, role `funder` | beta |
| API-018 | `POST /api/v1/sites/{site_id}/summary` | F-013 | session (any role) — protects LLM cost | beta |
| API-021 | `GET /api/v1/sites/{site_id}/gmw-timeline` | F-025 | **none — public data** | stable |
| API-022 | `GET /api/v1/context/countries/{iso3}` | F-025 | **none — public data** | stable |
| API-023 | `GET /api/v1/layers/gmw-extent` | F-025 | **none — public data** | stable |
| API-024 | `GET /api/v1/layers/gmw-extent/tiles` and `…/tiles/{year}/{z}/{x}/{y}.png` | F-025 | **none — public data** | stable |

There is deliberately **no** `PUT`, `PATCH` or `DELETE` on sites' evidence, records or timeline entries. A
request using those methods gets `405` (BR-002).

## 3. Operations

### API-001 — `POST /api/v1/auth/login` — sign in

- **Serves:** F-003, F-004, F-007 · **Implements:** US-005, US-006, US-007
- **Auth:** none — this is how a session is obtained.
- **Idempotent:** yes (same credentials → a session).

```json
{ "email": "<email>", "password": "<password>" }
```

**Response — `200`** sets an `HttpOnly; Secure; SameSite=Lax` session cookie.

```json
{ "user": { "id": "<uuid>", "display_name": "<name>", "role": "funder", "org": { "id": "<uuid>", "name": "<org>", "is_demo": true } } }
```

- **Errors:** `401` `UNAUTHENTICATED` (wrong credentials, same message whether email or password is wrong) · `429` `RATE_LIMITED`.

### API-002 — `POST /api/v1/auth/logout` — sign out

- **Serves:** F-007 · **Auth:** session · **Idempotent:** yes. **Response — `204`**, cookie cleared.

### API-003 — `GET /api/v1/auth/me` — current user

- **Serves:** F-004, F-007 · **Auth:** session. **Response — `200`** same `user` object as API-001; `401` if no session.

### API-004 — `GET /api/v1/sites` — list candidate sites

- **Serves:** F-001 · **Implements:** US-001 · **Auth:** none · **Idempotent:** yes

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `region` | query | string | no | e.g. `Manila Bay`; omitted = all |
| `commitment` | query | `with` \| `without` \| `all` | no | Default `all`. `with` = a funder has committed. `without` = a public site with no commitment |

**Response — `200`** — a GeoJSON `FeatureCollection`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "MultiPolygon", "coordinates": ["<…>"] },
      "properties": {
        "id": "<uuid>", "name": "<site name>", "region": "Manila Bay", "is_demo": true,
        "has_commitment": false,
        "area": { "value": "<ha>", "unit": "ha", "eq_id": "EQ-001", "confidence": "high" }
      }
    }
  ]
}
```

- **Notes:** ordered by `name`. An empty region returns an empty `features` array, not `404`. No pagination (demo has ≤5 sites).

### API-005 — `GET /api/v1/sites/{site_id}` — site dossier

- **Serves:** F-002, F-003, F-005 · **Implements:** US-002, US-003 · **Auth:** none

**Response — `200`**

```json
{
  "site": { "id": "<uuid>", "name": "<name>", "region": "Manila Bay", "is_demo": true,
            "geometry": { "<GeoJSON>": "…" },
            "area": { "value": "<ha>", "unit": "ha", "eq_id": "EQ-001", "confidence": "high" },
            "proposal_summary": "<partner benefit text or null>",
            "has_commitment": false,
            "proposal": {
              "benefit_text": "<partner's words or null>",
              "timeline": "<text or null>",
              "milestones": [ { "kind": "early", "label": "<text>", "due": "<date>" } ],
              "proposed_by": { "name": "<org or null>", "is_demo": true }
            } },
  "answers": [
    {
      "question": "history",
      "label": "Was this mangrove before?",
      "status": "supported",
      "finding": "mangrove_recorded",
      "source_count": { "value": 2, "unit": "items", "eq_id": "EQ-013", "confidence": "high" },
      "evidence_ids": ["<uuid>", "<uuid>"],
      "disagreeing_evidence_ids": []
    }
  ],
  "evidence": [
    {
      "id": "<uuid>", "question": "current", "source_type": "sentinel2",
      "source_name": "Copernicus Sentinel-2 L2A", "source_version": "<processing baseline or null>",
      "observed_from": "<ts>", "observed_to": "<ts>", "retrieved_at": "<ts>",
      "location": { "<GeoJSON or null>": "…" },
      "finding": "mostly_bare_soil", "usable": true, "unusable_reason": null,
      "metrics": [ { "name": "valid_fraction", "value": "<0-1>", "unit": "fraction", "eq_id": "EQ-005", "confidence": "low" } ],
      "method": "<one line incl. thresholds used>", "spatial_resolution_m": 20,
      "limitation": "<text>", "provenance_url": "<url or null>",
      "asset_url": null, "note": "<text or null>",
      "submitted_by_org": { "name": "<org>", "is_demo": true },
      "is_demo": true, "created_at": "<ts>", "content_hash": "<64 hex>",
      "mapped_area": { "value": "<ha>", "unit": "ha", "eq_id": "EQ-010", "confidence": "medium" }
    }
  ]
}
```

- **Errors:** `404` `NOT_FOUND`.
- **Notes:** `answers` always has exactly three entries in the order history, current, ground. `status` ∈ `supported | conflicting | missing`; `finding` is `null` when `missing`. `evidence` is newest-first and includes unusable items (flagged). `submitted_by_org` is `null` for items no organisation submitted (satellite, GMW). `mapped_area` is present only on an item with a mapped boundary. `proposal` is null when nobody has proposed. `benefit_text` is the partner's words. The response has no computed environmental benefit and no contract text. GMW evidence in `evidence` is history (EQ-002, EQ-003), not a completion result.

### API-006 — `GET /api/v1/compare` — side-by-side comparison

- **Serves:** F-006 · **Implements:** US-004 · **Auth:** none

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `site_ids` | query | comma-separated UUIDs | yes | 2–5 ids |

**Response — `200`** `{ "sites": [ { "site": {…}, "answers": [ … ] } ] }` — same `site` and `answers` shapes as API-005, without the full `evidence` list, **in the order requested**.

- **Errors:** `422` `COMPARE_RANGE` (fewer than 2 or more than 5 ids) · `404` `NOT_FOUND` (any unknown id).

### API-007 — `POST /api/v1/sites/{site_id}/sentinel-refresh` — pull current condition

- **Serves:** F-003 · **Implements:** US-005 · **Auth:** session, role `funder`
- **Idempotent:** no — each success appends a new evidence item; rate-limited per site (§5).

**Response — `201`** `{ "evidence": { … one evidence item … }, "answers": [ … ] }`

- **Errors:** `401` · `403` `FORBIDDEN_ROLE` · `404` · `429` `RATE_LIMITED` · `502` `UPSTREAM_UNAVAILABLE`.
- **Notes:** on `502` nothing is written and the stored snapshot remains the site's latest Sentinel-2 item. An all-cloud result is a `201` with `usable: false`, not an error.

### API-008 — `POST /api/v1/evidence` — submit evidence to a site or record

- **Serves:** F-004, F-009, F-010 · **Implements:** US-006, US-010 · **Auth:** session; role rules below
- **Idempotent:** no — each call appends one item.

**Request — `multipart/form-data`**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `site_id` | uuid | yes unless `record_id` | |
| `record_id` | uuid | no | When set, the item is also appended to that record's timeline; `site_id` is taken from the record |
| `source_type` | `field` \| `project_report` | yes | `field` requires role `partner`; `project_report` requires role `funder` |
| `question` | `history` \| `current` \| `ground` \| `work` \| `outcome` | yes | `current` is rejected for human sources (satellite only) |
| `finding` | string | yes | Must be in the question's vocabulary ([`prd.md` §4.1](prd.md)) |
| `observed_at` | date | yes | Not in the future |
| `point` | GeoJSON Point | `field`: yes | Where the observation was made |
| `boundary` | GeoJSON Polygon | no | Mapped worked area → EQ-010 |
| `reported_area_ha` | number > 0 | `project_report` + `work`: yes | The claimed area (DS-005) |
| `note` | string ≤ 2,000 chars | no | No personal data ([`security.md` §6](security.md)) |
| `photo` | file (JPEG/PNG) | no | ≤ 10 MB `[assumption]`; EXIF stripped before storage |

**Response — `201`** `{ "evidence": { … }, "record_event": { "seq": 3, "event_hash": "<64 hex>" } | null }`

- **Errors:** `401` · `403` `FORBIDDEN_ROLE` · `404` · `413` `PAYLOAD_TOO_LARGE` · `415` `UNSUPPORTED_MEDIA` · `422` `VALIDATION_FAILED` · `429`.
- **Notes:** the evidence item and its record event are written in one transaction — both or neither.

### API-009 — `POST /api/v1/records` — commit to a partner proposal

- **Serves:** F-007 · **Implements:** US-007 · **Auth:** session, role `funder`
- **Idempotent:** yes, via the required `Idempotency-Key` header (client-generated UUID).

```json
{ "site_id": "<uuid>" }
```

**Response — `201`**

```json
{ "id": "<uuid>", "url": "/records/<uuid>", "published_at": "<ts>", "content_hash": "<64 hex>", "is_demo": true }
```

- **Errors:** `401` · `403` `FORBIDDEN_ROLE` · `404` (site) · `409` `IDEMPOTENCY_CONFLICT` (same key, different body) · `422` `VALIDATION_FAILED` (no partner proposal on the site, or the site already has a commitment).
- **Notes:** the server copies the partner proposal (benefit text, timeline, milestones, and the planned action, area and dates the proposal carries) into the public record. The client does not send the benefit text. A retry with the same key and body returns the original `201` body; no second record. The snapshot is computed server-side at commit time; the client cannot supply evidence or statuses. The response and the stored public record contain no contract text.

### API-010 — `GET /api/v1/records` — map pins

- **Serves:** F-008, F-010 · **Implements:** US-009, US-012 · **Auth:** none

**Response — `200`** — GeoJSON `FeatureCollection`, one Point feature per record (site centroid):

```json
{ "type": "Feature", "geometry": { "type": "Point", "coordinates": ["<lon>", "<lat>"] },
  "properties": { "id": "<uuid>", "site_id": "<uuid>", "site_name": "<name>", "funder": "<org>", "published_at": "<ts>",
                  "pin_state": "conflict", "is_demo": true } }
```

- **Notes:** `pin_state` ∈ `conflict | awaiting | on_track` (BR-004), derived at read time. Newest first. No pagination for the demo.

### API-011 — `GET /api/v1/records/{record_id}` — read a record

- **Serves:** F-007, F-009, F-010 · **Implements:** US-008, US-009, US-011, US-012 · **Auth:** none

**Response — `200`**

```json
{
  "record": { "id": "<uuid>", "site_id": "<uuid>", "funder": { "name": "<org>", "is_demo": true }, "published_at": "<ts>",
              "rationale": "…", "planned_action": "…", "planned_action_detail": "…",
              "planned_area_ha": { "value": 8.0, "unit": "ha", "eq_id": null, "confidence": "high" },
              "expected_outcome": "…", "expected_vegetated_ha": null,
              "work_check_after": "<date>", "outcome_check_after": "<date>",
              "known_unknowns": "…", "snapshot": { "…": "as stored" }, "is_demo": true,
              "content_hash": "<64 hex>" },
  "site": { "…": "same shape as API-005 site" },
  "checks": [
    { "check": "work", "label": "Did the work happen?", "status": "conflicting", "finding": null,
      "satellite_line": "not_yet_observable",
      "source_count": { "value": 1, "unit": "items", "eq_id": "EQ-013", "confidence": "high" },
      "reported_area": { "value": 8.0, "unit": "ha", "eq_id": null, "confidence": "low" },
      "measured_area": { "value": 5.0, "unit": "ha", "eq_id": "EQ-010", "confidence": "medium" },
      "area_conflict": { "value": true, "unit": "flag", "eq_id": "EQ-009", "confidence": "low" },
      "evidence_ids": ["<uuid>"], "disagreeing_evidence_ids": ["<uuid>"] },
    { "check": "outcome", "label": "Did the mangroves come back?", "status": "too_early",
      "satellite_line": "not_yet_observable", "checkable_from": "<date>", "finding": null,
      "source_count": { "value": 0, "unit": "items", "eq_id": "EQ-013", "confidence": "high" },
      "evidence_ids": [], "disagreeing_evidence_ids": [], "vegetated_area": null }
  ],
  "site_answers": [ "… three answers as in API-005, computed now …" ],
  "timeline": [ { "seq": 1, "kind": "evidence_added", "created_at": "<ts>", "prev_hash": "<64 hex>",
                  "event_hash": "<64 hex>", "evidence": { "…": "evidence item as in API-005" } } ],
  "pin_state": "conflict",
  "disclaimer": "This record is not a certification of restoration success or approval of funding."
}
```

*(Values above are illustrative of the shape; `planned_area_ha` and `reported_area` are inputs, not computed, hence `eq_id: null`.)*

- **Errors:** `404` `NOT_FOUND`.
- **Notes:** `checks[].status` ∈ `supported | conflicting | missing | too_early` (`too_early` only for `outcome`). There is no status `successful`. Before `outcome_check_after`, outcome `status` is `too_early` and `satellite_line` is `not_yet_observable`. That line is not a fail: it does not set `pin_state` to `conflict`. The work check may still be `conflicting` from EQ-009 (reported area against mapped area) while its own `satellite_line` is `not_yet_observable`. After the date, outcome `status` is `missing` unless both a partner outcome report and an EQ-012 result exist; `conflicting` if they disagree; `supported` if they agree. `supported` means the sources agree. Global Mangrove Watch numbers, if shown, stay on the history answer. They are not an outcome status. `timeline` is ordered by `seq`; an entry carries `evidence` when it adds an item, otherwise `body`. `vegetated_area` on the outcome check is `EQ-008` (confidence low) once a usable Sentinel-2 vegetation fraction exists, else `null`. The body never includes contract text. It never includes the funder notice. `pin_state` is the public flag.

### API-012 — `POST /api/v1/records/{record_id}/corrections` — append a correction

- **Serves:** F-007 · **Implements:** US-008 · **Auth:** session, role `funder`, user's org = record's funder
- **Idempotent:** no

`{ "field": "<record field name>", "text": "<correction>" }` → **`201`** `{ "seq": <n>, "event_hash": "<64 hex>" }`

- **Errors:** `401` · `403` `FORBIDDEN_OWNER` · `404` · `422`.
- **Notes:** the original field is never changed; the correction is a timeline entry.

### API-013 — `GET /api/v1/records/{record_id}/verify` — integrity check

- **Serves:** F-012 · **Implements:** US-014 · **Auth:** none

**Response — `200`** `{ "intact": true, "content_hash": "<64 hex>", "events_checked": 3, "first_mismatch_seq": null }`

- **Notes:** recomputes EQ-011 for the record and every event. `intact: false` names the first mismatching `seq` (`0` = the record itself).

### API-014 — `GET /api/v1/assets/{sha256}` — evidence photo

- **Serves:** F-004 · **Auth:** none. **Response — `200`** image bytes with the stored `Content-Type`; `404` if unknown. The hash in the URL is the file's SHA-256, so the bytes are self-verifying.

### API-015 — `POST /mcp` — MCP server for Amazon Quick

- **Serves:** F-011 · **Implements:** US-013
- **Auth:** none — every tool is read-only and returns only the public subset the unauthenticated REST endpoints already return. No contract text. No funder notice. Rate-limited (§5).
- **Transport:** MCP streamable HTTP. Tool `inputSchema`s are JSON Schema Draft 7 with `required` as a root-level array (Quick rejects Draft 3 style) [R35].

| Tool | Input (required in **bold**) | Returns | Same data as |
|------|------------------------------|---------|--------------|
| `list_sites` | `region` | Sites with id, name, area, `is_demo` | API-004 |
| `get_site_dossier` | **`site_id`** | Three answers + evidence items with provenance, `eq_id`, `confidence` | API-005 |
| `compare_sites` | **`site_ids`** (2–5) | Per-site answers in request order, plus `differing_questions`: the questions whose status or finding differs between sites | API-006 |
| `list_records` | — | Records with pin state | API-010 |
| `get_record` | **`record_id`** | Promise, checks, timeline | API-011 |
| `verify_record` | **`record_id`** | Integrity result | API-013 |

- **Notes:** tool descriptions tell the agent that statuses mean source agreement (BR-001), that demo data is labelled, and that numbers must be quoted with their `eq_id`. Responses return in seconds from the database; no tool calls Copernicus (Quick's limit is 5 minutes). After changing tools, the connector owner presses **Sync** in Quick.

### API-019 — `POST /api/v1/sites/{site_id}/proposal` — partner proposes

- **Serves:** F-001, F-007 · **Implements:** US-016 · **Auth:** session, role `partner`
- **Idempotent:** no — a second proposal for a site that already has one is rejected. This change does not define an edit.

**Request — JSON**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `benefit_text` | string, 1–2,000 chars | yes | The partner's words. Not a computed benefit |
| `timeline` | string, 1–2,000 chars | yes | When the work and the outcome are expected |
| `milestones` | array, length ≥ 1 | yes | Each item: `kind` ∈ `early` \| `outcome`, `label` string, `due` date. At most one `outcome` |
| `planned_action` | enum, same as the record | yes | Copied onto the record at commit |
| `planned_area_ha` | number > 0 | yes | The partner's stated area. Not a satellite measurement |
| `expected_vegetated_ha` | number > 0 or null | no | Optional input to EQ-012 after the outcome date |
| `work_check_after` | date | yes | |
| `outcome_check_after` | date | yes | Must be on or after `work_check_after` |

**Response — `201`** `{ "site_id": "<uuid>", "proposal": { "…": "as in API-005" }, "has_commitment": false }`

- **Errors:** `401` · `403` `FORBIDDEN_ROLE` · `404` · `409` (a proposal already exists) · `422` `VALIDATION_FAILED` / `DATES_ORDER`.
- **Notes:** the proposal is public as soon as it is stored. It is not a commitment. Contract text is not a field on this request.

### API-020 — `GET /api/v1/records/{record_id}/notice` — funder notice

- **Serves:** F-010 · **Implements:** US-012 · **Auth:** session, role `funder`, user's org = record's funder
- **Idempotent:** yes

**Response — `200`** `{ "check": "outcome", "created_at": "<ts>" }`

- **Errors:** `401` · `403` `FORBIDDEN_OWNER` · `404` (unknown record, or no notice has been recorded).
- **Notes:** returned only to the funder account on that record. The body is the flag (which check disagreed, and when). It does not contain contract text. A public `GET` of the record and every MCP tool omit this object. A notice is recorded when a check becomes `conflicting` under US-012. An early milestone with `satellite_line = not_yet_observable` does not record one.

### API-016 — `GET /api/v1/health` — liveness

- **Auth:** none — returns no data. **Response — `200`** `{ "status": "ok" }`.

### API-017 — `POST /api/v1/sites` — add a candidate site (Could)

- **Serves:** F-014 · **Auth:** session, role `funder`. Body `{ "name", "region", "geometry": <GeoJSON Polygon|MultiPolygon> }` → `201` site. Errors `422` (invalid or self-intersecting geometry).

### API-018 — `POST /api/v1/sites/{site_id}/summary` — plain-language summary (Could)

- **Serves:** F-013 · **Implements:** US-015 · **Auth:** session. **Response — `200`** `{ "summary": "<text>", "generated_by": "AI", "source_evidence_ids": [ … ] }`; `503` `UPSTREAM_UNAVAILABLE` if the LLM fails. The prompt contains only the dossier; the response is labelled AI-generated (BR-003).

### API-021 — `GET /api/v1/sites/{site_id}/gmw-timeline` — GMW mangrove area inside and near a site

- **Serves:** F-025 · **Implements:** US-017 · **Auth:** none

**Response — `200`**

```json
{ "site_id": "<uuid>", "is_demo": true,
  "source": { "name": "Global Mangrove Watch", "version": "v4.1.12", "provenance_url": "https://doi.org/10.5281/zenodo.21346457", "evidence_id": "<uuid>" },
  "nearby_buffer": { "value": 1000, "unit": "m", "eq_id": null, "confidence": "high" },
  "limitation": "GMW starts in 1985; ponds converted earlier are not visible. 30 m pixels.",
  "years": [ { "year": 1985,
               "inside": { "value": 0.0, "unit": "ha", "eq_id": "EQ-002", "confidence": "medium" },
               "nearby": { "value": 5.6, "unit": "ha", "eq_id": "EQ-014", "confidence": "medium" } } ] }
```

- **Errors:** `404` `NOT_FOUND` (unknown site).
- **Notes:** read from the site's GMW history evidence item (`metrics` named `inside_mangrove_area_<year>` and `nearby_mangrove_area_<year>`). `years` is empty and `source` is null when GMW has not been ingested for the site. Context only: no status is derived (BR-001).

### API-022 — `GET /api/v1/context/countries/{iso3}` — national mangrove extent and change

- **Serves:** F-025 · **Implements:** US-017 · **Auth:** none

**Response — `200`**

```json
{ "iso3": "PHL", "name": "Philippines",
  "source": { "name": "Global Mangrove Watch", "version": "v4.1.12", "provenance_url": "https://doi.org/10.5281/zenodo.21346457" },
  "years": [ { "year": 1986,
               "extent": { "value": 256420.47, "lower": 239162.61, "upper": 281036.04, "unit": "ha", "eq_id": "EQ-015", "confidence": "medium" },
               "gain": { "value": 35.9, "unit": "ha", "eq_id": "EQ-016", "confidence": "medium" },
               "loss": { "…": "same shape" }, "net": { "…": "same shape" } } ] }
```

- **Errors:** `404` `NOT_FOUND` (no statistics shipped for that country; the demo ships `PHL`).
- **Notes:** `gain`, `loss` and `net` are `null` for the first year (1985). Values are GMW's published statistics, not computed by Mangrove.

### API-023 — `GET /api/v1/layers/gmw-extent` — Manila Bay mangrove extent for one year

- **Serves:** F-025 · **Implements:** US-017 · **Auth:** none

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `year` | query | integer | no | One of `available_years`; default the latest |

**Response — `200`** — GeoJSON `FeatureCollection` of mangrove polygons, with foreign members
`{ "year": 2025, "available_years": [1985, 1990, …, 2025], "bbox": [w, s, e, n], "source": { … } }`.

- **Errors:** `422` `VALIDATION_FAILED` when `year` is not in `available_years`.
- **Notes:** generated offline from the GMW extent stack (DS-001) for the demo area; a display layer, it carries no number. The web maps now draw API-024 instead (ADR-048).

### API-024 — `GET /api/v1/layers/gmw-extent/tiles…` — Philippines mangrove extent as map tiles

- **Serves:** F-025 · **Implements:** US-017 · **Auth:** none · **Idempotent:** yes

`GET /api/v1/layers/gmw-extent/tiles` → **`200`**
`{ "years": [1985, 1990, …, 2025], "version": "v4.1.12", "bbox": [116, 4, 127, 22], "max_zoom": 16, "tiles": "/api/v1/layers/gmw-extent/tiles/{year}/{z}/{x}/{y}.png", "source": { "name": "Global Mangrove Watch", "version": "v4.1.12", "provenance_url": "…" } }`

`GET /api/v1/layers/gmw-extent/tiles/{year}/{z}/{x}/{y}.png` → **`200`** `image/png`, 256 × 256 Web Mercator
(XYZ, Google/OSM tiling). Mangrove pixels are data cyan (`--mg-data-mangrove`, ADR-049), near-opaque, grown by one pixel at
zoom ≤ 10; everything else is transparent. A tile with no mangrove is a transparent PNG, not `404`.
`Cache-Control: public, max-age=604800`; `Access-Control-Allow-Origin: *` on both routes (public map data, ADR-049).
Clients add `?s=<style>` from the info response to bust caches when the look changes; the server ignores it.

- **Errors:** `422` `VALIDATION_FAILED` (year not in `years`, or `z` outside 0–16, or `x`/`y` outside the zoom) · `503` `UPSTREAM_UNAVAILABLE` (the layer is not installed on this server).
- **Notes:** rendered from the per-year GeoTIFFs built by `data/ingest/gmw_tiles.py` (DS-001, ADR-048); context only, it carries no number and sets no status.

## 4. Error Codes

Every error has the body `{ "error": { "code": "<CODE>", "message": "<text>" } }`.

| Code | HTTP | Meaning | When it occurs |
|------|------|---------|----------------|
| `UNAUTHENTICATED` | 401 | No valid session, or wrong credentials | Any session-protected operation; API-001 |
| `FORBIDDEN_ROLE` | 403 | Signed in, but the role may not do this | Partner committing a record; funder submitting `field` evidence or a proposal |
| `FORBIDDEN_OWNER` | 403 | Record belongs to another funder org | API-012 |
| `NOT_FOUND` | 404 | Unknown id | Any `{id}` path; unknown id in `site_ids` |
| `RECORD_IMMUTABLE` | 405 | Update/delete is not supported | Any `PUT`/`PATCH`/`DELETE` on evidence, records, timeline |
| `IDEMPOTENCY_CONFLICT` | 409 | Same `Idempotency-Key`, different body | API-009 |
| `PAYLOAD_TOO_LARGE` | 413 | Upload over the size limit | API-008 |
| `UNSUPPORTED_MEDIA` | 415 | Photo is not JPEG/PNG by content | API-008 |
| `VALIDATION_FAILED` | 422 | Missing/invalid field, finding outside vocabulary, future date | API-008, API-009, API-012, API-017 |
| `COMPARE_RANGE` | 422 | Not 2–5 site ids | API-006, `compare_sites` |
| `DATES_ORDER` | 422 | `outcome_check_after` before `work_check_after` | API-019 |
| `RATE_LIMITED` | 429 | Limit in §5 exceeded; `Retry-After` set | Any limited operation |
| `UPSTREAM_UNAVAILABLE` | 502 / 503 | Sentinel-2 source (Earth Search, ADR-042) (502) or LLM (503) failed | API-007, API-018 |

Error messages never include stack traces, SQL or internal hostnames ([`security.md` §5](security.md)).

## 5. Rate Limits

| Limit | Scope | Window | Behaviour on breach |
|-------|-------|--------|---------------------|
| 10 login attempts `[assumption]` | per IP | 1 minute | `429` + `Retry-After` |
| 1 Sentinel-2 refresh `[assumption]` | per site | 10 minutes | `429`; protects the Copernicus quota (10,000 requests/month, 300/minute) |
| 30 evidence submissions `[assumption]` | per user | 1 hour | `429` |
| 120 requests `[assumption]` | per IP, across public GETs and `/mcp` | 1 minute | `429` |

## 6. Versioning & Deprecation

- **How versions are expressed:** URL path `/api/v1`; MCP tool names are stable identifiers.
- **What counts as breaking:** removing or renaming a field or tool, narrowing a type, adding a required parameter, changing a status vocabulary.
- **Deprecation notice period:** none during the hackathon — web app and API ship together; changing an MCP tool requires a Quick **Sync**.
- **Currently deprecated:** none.

## 7. Doc Integrity Check

- [x] Every operation has an `API-###`.
- [x] Every operation names its auth, including public ones with the reason.
- [x] Every network-exposed operation has a row in [`security.md` §4](security.md).
- [x] Every `Serves` names a real `F-###`; every Must/Should feature needing an API has one.
- [x] No machine-readable spec yet, so §3 carries the shapes.
- [x] No validation logic beyond the contract, no field types beyond the wire shape, no NFR numbers restated.
- [ ] **Exists without a feature?** API-016 health only — infrastructure, returns nothing.

## References

- [`system-design.md`](system-design.md) — components and integration failure behaviour.
- [`data-model.md`](data-model.md) — the entities these payloads project.
- [`security.md`](security.md) — §4 how sessions are proven and enforced.
- [`methods.md`](methods.md) — `EQ-###` behind every number.
- Amazon Quick MCP integration: <https://docs.aws.amazon.com/quick/latest/userguide/mcp-integration.html>
