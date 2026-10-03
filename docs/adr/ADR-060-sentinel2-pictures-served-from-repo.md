# ADR-060 — Sentinel-2 then/now pictures served from the repo

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-030, ADR-037, ADR-042, ADR-059, DS-002, EQ-005, EQ-006, EQ-007, API-005, API-014, TC-032

### Context

`data/ingest/s2_ingest.py` answers "What's there now?" offline (EQ-005, EQ-006, EQ-007) from Earth Search
collection `sentinel-2-c1-l2a`. It also cuts two true-colour PNG chips per site: the scene it used ("now"),
and a 2016–2017 "then" chip from the older Earth Search collection `sentinel-2-l2a`, because Collection 1 has
no usable 2016–2017 scenes over these sites. Each chip is content-addressed, written to
`api/app/evidence_assets/<sha256>.png` and served by `GET /api/v1/assets/{sha256}` (API-014); the evidence
item carries `asset_sha256`, and the "then" hash is in `raw.then_asset_sha256`. ADR-037 put evidence assets in
S3. On the four real records the answer is now `supported` (`mostly_vegetation`).

### Why now

The pictures are on the site and record pages for the demo, and the reseed (ADR-059) re-runs the ingest.

### Options considered

1. **S3, as ADR-037 says** — pros: one store for every asset / cons: needs AWS credentials the builder
   machine does not have; ADR-037 was designed for uploaded photos (presigned per request, metadata stripped).
2. **Commit the chips as static files** — pros: about 4 MB, content-addressed (the hash in the URL is the
   bytes), public data with no personal content, deployed with the code / cons: the repo grows with each
   ingest run; not a pattern for partner uploads.

### Decision

Satellite chips are committed under `api/app/evidence_assets/` and served by API-014 from there. ADR-037
still governs partner photos and documents.

### Why this option

The chips are public, small and regenerable, and committing them removes a credential dependency on the demo
path without weakening anything ADR-037 protects.

### Overrides

- **Prior ADRs and rules:** ADR-037, for Sentinel-2 chips only.
- **Doc or plan truth:** `docs/api.md` API-014, `docs/data-model.md` (`asset_sha256`), `docs/tests.md` TC-030 and
  TC-032 already describe this; no further doc change.

### Consequences

- **Easier:** the pictures work in any environment that has the repo; the hash check needs no network.
- **Harder or owed:** old chips stay in history after a re-ingest; field photos are still not wired to API-014.
- **Follow-up:** move chips to S3 if the set grows past a few tens of MB.
