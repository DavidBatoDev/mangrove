# data/sites/real/ — real, sourced Post-Yolanda sites (ADR-051)

> **Real case, sourced. Not demo data.** Four places from the Post-Yolanda Mangrove and Beach Forest
> Development Project (MBFDP, DENR), Eastern Visayas. Every figure comes from
> [`docs/case-study-yolanda.md`](../../../docs/case-study-yolanda.md); `[n]` below is its source number.
> The polygons were **sketched on 2026-10-04, not field-verified**. No planting boundary is published for any of them.

## Files

| File | What it is |
|------|------------|
| `yolanda.geojson` | The four sketched polygons (EPSG:4326, MultiPolygon). Each feature carries `id` (fixed UUID below), `site_id` (F1–F4), `is_demo: false`, name, municipality, province, region, `polygon_basis`, `case_note`, and `area_ha_geodesic_prep` (prep check only; the product computes area with EQ-001). |

## Sites and polygon basis

| Key | Site | id | Polygon basis | Sketch area | Area in the sources |
|-----|------|----|---------------|-------------|---------------------|
| F1 | Paraiso mangrove stand, Tacloban | `00000000-0000-4000-8000-0000000000f1` | OpenStreetMap way 892162587 (`wetland=mangrove`) inside Barangay 83 (Paraiso) | 2.53 ha | roughly 4 ha planted, 2015–2018 [31] |
| F2 | Cancabato Bay shore, Tacloban | `00000000-0000-4000-8000-0000000000f2` | Union of nine OpenStreetMap `natural=wetland` ways on the bay shore, Paraiso stand excluded | 54.93 ha | 70 ha, Sep 2017–Nov 2018 [21] |
| F3 | Naungan coast, Ormoc | `00000000-0000-4000-8000-0000000000f3` | OpenStreetMap ways 246018761, 246035216, 246035217 (`wetland=mangrove`) | 11.36 ha | 105 ha in 8 parcels, 2015–2017 [20]; parcel locations not published |
| F4 | Bungtod mangrove, Guiuan | `00000000-0000-4000-8000-0000000000f4` | Largest Global Mangrove Watch v4.1.12 **2010** (pre-Yolanda) patch south of the Bungtod barangay hall, simplified; no OSM mangrove feature there | 119.99 ha | stands in for Eastern Samar's ~2,553 ha [22]; 104.39 ha recovering by 2020 [32] |

Map data © OpenStreetMap contributors (ODbL), used for placement only. F4's outline is derived from Global
Mangrove Watch v4.1.12 (CC BY 4.0, © Global Mangrove Watch), so its history answer is expected to read
"mangrove recorded"; that is the place, not a result.

## Fixed ids

| Entity | id |
|--------|----|
| Records on F1–F4 | `00000000-0000-4000-8000-0000000001f1` … `…0000000001f4` |
| Organization: DENR (`funder`, cited party) | `00000000-0000-4000-8000-00000000c001` |
| Organization: Barangay Local Government of Paraiso (Barangay 83) (`partner`, proposer of F1) | `00000000-0000-4000-8000-00000000c002` |
| Organization: Mangrove case reconstruction (`funder` kind; the team's seeder org) | `00000000-0000-4000-8000-00000000c003` |
| Seeder user (cannot sign in) | `00000000-0000-4000-8000-00000000c101` |
| Evidence items | `00000000-0000-4000-8000-0000000ef1NN` (F1), `…ef2NN`, `…ef3NN`, `…ef4NN` |

## What the records say

| Site | Work check after / outcome check after | Expected pin | Why |
|------|----------------------------------------|--------------|-----|
| F1 | 2019-01-01 / 2022-01-01 | on track | Work reported [29][31]; cover reached 3.6 ha by 2023 vs 1.9 ha before the typhoon [31] |
| F2 | 2018-12-01 / 2021-12-01 | awaiting | Work reported [21]; only province-level survival figures, stored unusable, so the outcome is missing |
| F3 | 2018-01-01 / 2021-01-01 | awaiting | Work reported [20]; same as F2 |
| F4 | 2016-02-01 / 2019-02-01 | conflict | Ground: ERDB counted 1,696 ha damaged in Eastern Samar [10] vs natural stands recovering [25] |

Work check after = end of planting. Outcome check after = three years later, the period the MBFDP unit cost
covered [17]. "What's there now?" stays **missing**: the Sentinel-2 adapter is not built.

## Honesty rules for this data

- Records were **reconstructed on 2026-10-04** from public sources. They were not locked when the money
  moved; the record text says so, and the integrity hash covers the reconstruction.
- Real organizations appear only as cited parties. No individual is named in any row ([`docs/security.md` §6](../../../docs/security.md)).
- A finding is chosen only where the source's own words state it for the place the record covers. F4 stands
  in for the Eastern Samar program, so statements about Eastern Samar count for it ([10], [22], [25]); a
  Leyte-wide statement does not count for F2 or F3. Quoted rates (DENR 78.3% [18]; Samar 25%, Leyte 0–100%
  [23]) are never findings and are stored `usable = false` with the reason (EQ-017).
- Framing: the system could not detect misuse. Never "corruption", never "nothing survived" (case study §9).
- Case study §11 "Not found" items go in `known_unknowns`, never in a finding.
- Do not move a polygon to change a result.
