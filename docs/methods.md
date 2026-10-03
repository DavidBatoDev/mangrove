---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-04
doc: methods
owns: every computed number and derived finding the product emits — its equation (EQ-###), its input datasets (DS-###), and its computed confidence · the decision thresholds · the glass-box contract
---

# Methods — Glass-Box Ledger — Mangrove

> **Purpose:** the one home for every number Mangrove computes and every finding it derives from a number:
> areas, satellite class fractions, discrepancy checks, hashes. Each carries its equation, its inputs, and a
> computed confidence.
> Traces back to: [`system-design.md`](system-design.md), [`data-model.md`](data-model.md). Traces forward to:
> [`prd.md`](prd.md) features that display numbers, [`tests.md`](tests.md).

## 1. The Glass-Box Contract

Every number Mangrove shows — on a page, in an API response, or through an MCP tool to Amazon Quick — must
resolve to:

1. an **`EQ-###`** (§3), and
2. its **`DS-###` inputs** (§4), and
3. a **computed confidence** (§2).

**The LLM narrates and cites; it never originates a number** (BR-003). A number that cannot name its equation,
inputs and confidence does not ship. Low-confidence outputs render as a direction ("well below the
expected area"), never as a precise-looking point value.

This matters here because a funder, journalist or community member may act on what they read, and a made-up
figure set in the same type as a derived one looks identical to them.

## 2. Confidence Rubric

| Level | How it renders | Trigger |
|-------|----------------|---------|
| **High** | Point value | All load-bearing inputs are High-tier and the method is exact (geometry, hashing) |
| **Medium** | Value marked "approximate", with the source's limitation shown | Weakest input is Medium, or the formula uses an `[assumption]` constant |
| **Low** | Direction only (above / below / about the same as the comparison value); no point estimate | Any load-bearing input is Low-tier |

**Mapping rule:** output confidence = the lowest tier among its load-bearing `DS-###` inputs. An output whose
formula uses an `[assumption]` constant from §3.1 is capped at Medium until that constant is sourced. **No
number inherits a confidence higher than its weakest load-bearing input.**

Statuses (supported / conflicting / missing) are categories, not numbers; they carry no confidence of their
own. The UI shows the confidence of the items behind them.

## 3. Equation Registry

| `EQ-###` | Output | Formula / method | Inputs | Confidence | Reference |
|----------|--------|------------------|--------|------------|-----------|
| EQ-001 | Site area (ha) | `ST_Area(geom::geography) / 10000` — geodesic area on the WGS 84 ellipsoid | DS-003 | High | PostGIS `ST_Area` (geography) |
| EQ-002 | GMW mangrove area within the site, per year y = 1985…2025 (ha) | `A_y = Σ over GMW pixels with DN=1 in band y whose centre lies inside the site polygon of a_px(φ)`, with `a_px(φ) = (R · Δ · π/180)² · cos φ / 10000`, `Δ = 0.000269469°` (GMW pixel spacing), `R = 6,371,008.8 m` (IUGG mean Earth radius), `φ` = pixel-centre latitude | DS-001, DS-003 | Medium | JAXA GMW v4.1 dataset description [R31]; internal rule for pixel-centre inclusion |
| EQ-003 | Maximum historical mangrove extent and the "Was this mangrove before?" finding | `A_max = max_y A_y`, `y_max = argmax_y A_y`, `f_hist = A_max / EQ-001`. Finding = `mangrove_recorded` if `f_hist ≥ HISTORY_MIN_FRACTION`, else `no_mangrove_recorded` | DS-001, DS-003 | Medium | Internal rule |
| EQ-004 | Mangrove change since peak (ha) | `ΔA = A_2025 − A_max` (≤ 0 means loss since the peak year) — context only, no status | DS-001, DS-003 | Medium | Internal rule |
| EQ-005 | Sentinel-2 valid-pixel fraction and usability | For each L2A scene in the window `[t − S2_WINDOW_DAYS, t]`, over the SCL pixels (20 m) whose centre lies inside the site polygon: `n_poly = count(SCL ≠ 0)` (0 = no data); `n_valid = count(SCL ∈ {4, 5, 6})`; `f_valid = n_valid / n_poly`. The scene with the highest `f_valid` is used (ADR-042). Item is usable iff `f_valid ≥ MIN_VALID_FRACTION`; otherwise `usable = false`, reason "too few cloud-free pixels" | DS-002, DS-003 | Low | Sen2Cor SCL codelist; pixel counts computed by us from the COG (ADR-042) |
| EQ-006 | Sentinel-2 class fractions and the "What's there now?" finding | `f_veg = n(SCL=4)/n_valid`, `f_bare = n(SCL=5)/n_valid`, `f_water = n(SCL=6)/n_valid`. Finding = the class with the largest fraction → `mostly_vegetation` / `mostly_bare_soil` / `mostly_water`; an exact tie makes the item unusable ("no dominant class") | DS-002 | Low | Sen2Cor scene classification via S2L2A `SCL` band [R32] |
| EQ-007 | Mean NDVI over non-water valid pixels — context only, no status | `mean((B08 − B04)/(B08 + B04))` over pixels with `SCL ∈ {4, 5}` and `B08 + B04 ≠ 0` | DS-002 | Low | Copernicus Statistical API NDVI example [R32] |
| EQ-008 | Vegetated area detected by Sentinel-2 (ha) — outcome check only | `A_veg = f_veg × EQ-001` (assumes valid pixels represent the polygon) | DS-002, DS-003 | Low | Internal rule |
| EQ-009 | Area discrepancy flag | `d = |A_reported − A_measured| / A_reported`; **conflict** iff `d > AREA_TOLERANCE`. Work check: `A_reported` = the newest usable project report's (or public report's, DS-009) claimed `reported_area`, `A_measured` = EQ-010. Shown as both values plus "differs by more than the tolerance" | DS-005, DS-004 | Low | Internal rule |
| EQ-010 | Field-mapped worked area (ha) | `ST_Area(location::geography) / 10000` for a partner-submitted boundary polygon | DS-004 | Medium | PostGIS `ST_Area` (geography); GPS accuracy of the partner's device is unknown |
| EQ-011 | Content hash and timeline hash | `content_hash = SHA-256(UTF-8(JCS(payload)))`; `event_hash = SHA-256(prev_hash ‖ UTF-8(JCS(event_payload)))`, where `prev_hash` is the record's `content_hash` for `seq = 1`, else the previous `event_hash`. Verification recomputes all and reports the first mismatch | DS-008 | GMW change vs baseline 1985/1990/2000/2010, 30 m, DN 1 = gain, 2 = loss | Global Mangrove Watch v4.1.12 change stacks — Zenodo record 21346457 [R31]; mirrored to `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/` | CC BY 4.0 (same record as DS-001). Kept as per-baseline, per-year GeoTIFFs over the Philippines for the API-025 map layer (`data/ingest/gmw_change_tiles.py`, ADR-050); a picture, never an input to an EQ | Medium (modelled change; small changes near the 30 m limit are uncertain) |
| DS-006 | High | RFC 8785 (JSON Canonicalization Scheme); FIPS 180-4 (SHA-256) |
| EQ-012 | "Did the mangroves come back?" finding from satellite | Only when `today ≥ outcome_check_after` and `expected_vegetated_ha` is set: `recovery_seen` if `EQ-008 ≥ expected_vegetated_ha × (1 − AREA_TOLERANCE)`, else `no_recovery_seen`. Before the date, this equation is not evaluated. The satellite line reads "not yet observable" (§3.3), which is not a fail. | DS-002, DS-003, DS-006 | Low | Internal rule |
| EQ-013 | Source count per question or check | Number of usable evidence items for that question (site) or check (record) | DS-001…DS-005, DS-009 | High | Count |
| EQ-014 | Mangrove area near the site, per year y = 1985…2025 (ha) — context only, no status | EQ-002's sum over GMW pixels with DN=1 in band y whose centre lies inside `ST_Buffer(site::geography, NEARBY_BUFFER_M)` and outside the site polygon | DS-001, DS-003 | Medium | Internal rule (ADR-045) |
| EQ-015 | National mangrove extent, per year (ha), with lower and upper 95% bounds — context only | Read as published: GMW v4.1.12 country statistics, "corrected" area (GMW applied an accuracy correction factor of 0.9775) | DS-007 | Medium | GMW v4.1.12 README [R31] |
| EQ-016 | National mangrove gain, loss and net change between consecutive years (ha) — context only | `gain_y`, `loss_y` read as published from GMW's change matrix (base year y−1, target y); `net_y = gain_y − loss_y`. Net change between y1 and y2 is `EQ-015(y2) − EQ-015(y1)` | DS-007 | Medium | GMW v4.1.12 change statistics [R31] |
| EQ-017 | Figure quoted from a public report (ha, %, count) — shown as quoted, never a finding by itself | Read as published: value and unit copied from the cited source, with its reference number; nothing is computed. A quoted rate is never turned into a finding: a finding on a `public_report` item is chosen from the PRD §4.1 list only where the source's own words state it for the place the record covers (the site, or for a record that stands in for a province program, that province). Rates (program-wide, province-wide or site) are stored `usable = false` with the reason (ADR-051) | DS-009 | Low | The cited source (`provenance_url` on the item) |

*Every constant inside a formula is either sourced (Δ from JAXA; R is the IUGG mean radius) or listed in
§3.1 as an `[assumption]`.*

### 3.1 Decision constants

All are `[assumption]` proposals until the data lead confirms or replaces them. They live in one config
module (`api/engine/constants.py`) and are echoed in every evidence item's `method` text, so a reader can see
which threshold produced a finding.

| Constant | Proposed value | Used by | Why this value is only a proposal |
|----------|----------------|---------|-----------------------------------|
| `HISTORY_MIN_FRACTION` | 0.10 `[assumption]` | EQ-003 | No source sets the share of a polygon that must have been mangrove to count as "mangrove before" |
| `MIN_VALID_FRACTION` | 0.50 `[assumption]` | EQ-005 | No source sets a minimum cloud-free share for a polygon summary |
| `S2_WINDOW_DAYS` | 90 `[assumption]` | EQ-005 | Trades freshness against the chance of a cloud-free acquisition in the wet season |
| `AREA_TOLERANCE` | 0.20 `[assumption]` | EQ-009, EQ-012 | No restoration-reporting standard was found in the source register that sets an acceptable reported-vs-measured gap |
| `NEARBY_BUFFER_M` | 1000 `[assumption]` | EQ-014 | No source sets how far around a site counts as its surroundings; 1 km shows the stands beside the demo sites without reaching across the bay |

### 3.2 Status rules (applied to the outputs above)

BR-001 in [`prd.md` §4.1](prd.md) is the rule; this is how each question's findings are produced, so the rule
has inputs:

| Question / check | Satellite / computed findings | Human findings |
|------------------|-------------------------------|----------------|
| Was this mangrove before? | EQ-003 from GMW | Proposal or field item may assert either finding |
| What's there now? | EQ-006 from Sentinel-2 | — |
| What do people on the ground say? | — | Field, proposal and public-report items pick from the fixed list |
| Did the work happen? | EQ-009 area check across a report and a field-mapped area. Not a satellite area (ADR-033). See §3.3 for which milestone may use it | Project report, public report and field items: `work_done` / `no_work_seen` |
| Did the mangroves come back? | EQ-012, and only after the outcome date, together with the partner's finding (§3.3) | Field and public-report items: `recovery_seen` / `no_recovery_seen` |

**Known limits that the UI must show beside the finding:**
- GMW (30 m) and SCL (20 m) cannot see seedlings; months after planting, satellite cannot confirm planting [ADR-006].
- SCL "vegetation" does not distinguish mangrove from other vegetation; tide state at acquisition changes the water fraction.
- An active fishpond and open water look alike from space; only ground evidence settles land use [R09].
- GMW starts in 1985. Mangrove cut for ponds before 1985 is not visible, so `no_mangrove_recorded` does not mean the site was never mangrove (ADR-045).

### 3.3 Milestone kind and allowed inputs

ADR-044. No new equation. AlphaEarth (F-016) and Sentinel-1 (F-020) are not inputs to either kind (ADR-030).

| Milestone kind | When | Allowed inputs | What is not an input |
|----------------|------|----------------|----------------------|
| Early | Before `outcome_check_after` | Partner photo, GPS point, and mapped area (EQ-010). A reported area against that mapped area still uses EQ-009. Findings come from the field item or the project report | Sentinel-2, Sentinel-1, AlphaEarth, and Global Mangrove Watch. The satellite line reads "not yet observable". That line is not a fail, not *missing*, and not *conflicting*. EQ-012 is not evaluated |
| Outcome | `today ≥ outcome_check_after` | Both are required: the partner's report (a finding of `recovery_seen` or `no_recovery_seen`) and EQ-012 (Sentinel-2 vegetated area). Supported only when both are present and they agree. One without the other is *missing*. Disagreement is *conflicting* (BR-001) | Global Mangrove Watch (EQ-002, EQ-003) may be shown beside the outcome as history. It is context. It is not a pass, not a fail, and not a completion certificate. AlphaEarth and Sentinel-1 stay off the gate |

The partner's benefit text is displayed as written. It is not an equation and it has no confidence tier.

## 4. Dataset Registry

| `DS-###` | Input | Source | Access & licence | Confidence tier |
|----------|-------|--------|------------------|-----------------|
| DS-001 | GMW annual mangrove extent, 41 bands 1985–2025, 30 m, DN=1 mangrove | Global Mangrove Watch v4.1.12 — Zenodo record 21346457 / JAXA EORC [R31] | Downloaded once. The 93 tiles over the Philippines (116–127°E, 4–22°N) are also kept as per-year GeoTIFFs for the API-024 map layer (`data/ingest/gmw_tiles.py`, ADR-048), a picture that is never an input to an EQ. For the site figures `data/ingest/` reads tile N15E120 (Manila Bay demo sites) and tiles N12E124 and N12E125 (the real Eastern Visayas sites, ADR-051), mosaicking two tiles when a site and its buffer cross a tile edge. CC BY 4.0, confirmed on the Zenodo record (10.5281/zenodo.21346457) — credit the authors and "© Global Mangrove Watch" | Medium (modelled classification; GMW's own assessment found slight global overestimation) |
| DS-002 | Sentinel-2 L2A Collection 1: SCL (20 m), B04 `red` and B08 `nir` (10 m) | Cloud-Optimized GeoTIFFs on public AWS S3, found with Element 84 Earth Search STAC `https://earth-search.aws.element84.com/v1`, collection `sentinel-2-c1-l2a` (ADR-042) [R39] | No account, no quota; HTTP range reads. Copernicus Sentinel data are free and open (Sentinel data legal notice); credit "Contains modified Copernicus Sentinel data <year>" `[assumption — confirm wording in the Copernicus legal notice]`, distributed by Element 84 | Low (every Sentinel-2 output here depends on the 20 m Sen2Cor scene classification for masking or classes) |
| DS-003 | Site polygons | Demo: drawn by the team on Manila Bay coastal areas `[assumption]`; later: proposer-supplied | Team-authored; public | High as the definition of the site (the polygon *is* the site) |
| DS-004 | Partner field submissions: photo, GPS point, mapped boundary, finding | Field partners via the Submit evidence screen; demo items authored by the team and labelled demo (BR-006) | Submitted under the partner's account; public | Medium (observed, but self-reported; device GPS accuracy unknown) |
| DS-005 | Project reports: claimed worked area, work date | Funder or implementing NGO via the Submit evidence screen | Submitted under the funder's account; public | Low (self-reported claim) |
| DS-007 | GMW v4.1.12 country statistics: extent per country and year with lower/upper 95% bounds (`gmw_v4_timeseries_4112_gmw_country_stats_corr_area_formatted.xlsx`), and gain/loss change matrices per country (`gmw_mng_chng_stats_v4112_corrected.tar.gz`) | Global Mangrove Watch v4.1.12 — Zenodo record 21346457 [R31]; mirrored to `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/` | CC BY 4.0 (same record as DS-001) | Medium (GMW's own accuracy assessment: global F1 0.93; it varies locally) |
| DS-009 | Public reports cited in [`case-study-yolanda.md`](case-study-yolanda.md): news, conference proceedings, government statements | The numbered sources in that file; each item's `provenance_url` | Quoted with a link; never copied in full; public | Low (self-reported or secondary; methods often unpublished) |
| DS-006 | Promise record fields and timeline payloads | The record itself (planned area, expected vegetated area, dates) | Created by the Record ledger; public | High (they are the commitment, not a measurement) |

## 5. Traceability

- Features that display numbers: F-001 (EQ-001), F-002/F-003 (EQ-002…EQ-007, EQ-017), F-005/F-006 (EQ-003, EQ-006, EQ-013), F-009/F-010 (EQ-008, EQ-009, EQ-010, EQ-012), F-012 (EQ-011), F-025 (EQ-002, EQ-003, EQ-014, EQ-015, EQ-016).
- Every `EQ-###` uses only `DS-###` rows in §4, and every §4 row is used.
- [`tests.md`](tests.md) has a case per equation family asserting the computed value and the rendered confidence (TC-016…TC-019).
- Stored numbers name their `EQ-###` in `evidence_item.metrics` ([`data-model.md` §2](data-model.md)).
- MCP tools return each number with its `eq_id` and `confidence`, so Amazon Quick can cite them.

## 6. Doc Integrity Check

- [x] Every displayed number resolves to an `EQ-###`.
- [x] Every `EQ-###` names real `DS-###` inputs; every `DS-###` is used.
- [x] Every formula can be recomputed by hand from its inputs.
- [x] Every constant is sourced or an `[assumption]` in §3.1.
- [x] Every confidence follows §2's mapping rule.
- [x] Licence: DS-001 (v4.1.12) is CC BY 4.0 on Zenodo.
- [ ] Attribution: DS-002 wording still to confirm.
- [ ] **Trusted because written down?** All four §3.1 constants. None is validated; each finding they gate must show the threshold used.

## References

- [`context.md`](../context.md) §7 — R31 (GMW v4.1), R39 (Earth Search / AWS Open Data Sentinel-2); R32 (Statistical API) is no longer used (ADR-042).
- Sentinel-2 L2A band and SCL codelist: <https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html>
- Earth Search STAC (Sentinel-2 L2A Collection 1 COGs): <https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a>
- GMW v4.1.12 timeseries: <https://zenodo.org/records/21346457>
- RFC 8785 JSON Canonicalization Scheme: <https://www.rfc-editor.org/rfc/rfc8785>
