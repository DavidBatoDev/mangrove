# data/sites/real/ — real, sourced Post-Yolanda sites (ADR-056, corrected by ADR-059)

> **Real case, sourced. Not demo data.** Four places in Eastern Visayas from the Post-Yolanda case: three
> tied to DENR money (Mangrove and Beach Forest Development Project, MBFDP, or the DENR Region 8 budget) and
> Paraiso, a Japan-funded planting that is **not** MBFDP [37]. Every figure comes from
> [`docs/case-study-yolanda.md`](../../../docs/case-study-yolanda.md); `[n]` below is its source number.
> The polygons were **sketched on 2026-10-04, not field-verified**. No planting boundary is published for any of them.

## Files

| File | What it is |
|------|------------|
| `yolanda.geojson` | The four sketched polygons (EPSG:4326, MultiPolygon). Each feature carries `id` (fixed UUID below), `site_id` (F1–F4), `is_demo: false`, name, municipality, province, region, `polygon_basis`, `case_note`, and `area_ha_geodesic_prep` (prep check only; the product computes area with EQ-001). |

## Sites and polygon basis

| Key | Site | id | Polygon basis | Sketch area | Area in the sources |
|-----|------|----|---------------|-------------|---------------------|
| F1 | Paraiso mangrove stand, Tacloban | `00000000-0000-4000-8000-0000000000f1` | OpenStreetMap way 892162587 (`wetland=mangrove`) inside Barangay 83 (Paraiso) | 2.53 ha | about 30,000 seedlings on 4 ha, 2015–2018, funded by Japan's Ministry of Foreign Affairs [37] |
| F2 | Cancabato Bay shore, Tacloban | `00000000-0000-4000-8000-0000000000f2` | Union of nine OpenStreetMap `natural=wetland` ways on the bay shore, Paraiso stand excluded | 54.93 ha | 70 ha, Sep 2017–Nov 2018, provincial government with ₱28.8M from the DENR Region 8 budget [21] |
| F3 | Naungan coast, Ormoc | `00000000-0000-4000-8000-0000000000f3` | OpenStreetMap ways 246018761, 246035216, 246035217 (`wetland=mangrove`) | 11.36 ha | MBFDP 105 ha in 8 parcels, 2015–2017, in the planters' association history table [20]; parcel locations not published |
| F4 | Bungtod mangrove, Guiuan | `00000000-0000-4000-8000-0000000000f4` | Largest Global Mangrove Watch v4.1.12 **2010** (pre-Yolanda) patch south of the Bungtod barangay hall, simplified; no OSM mangrove feature there | 119.99 ha | stands in for Eastern Samar's ~2,553 ha [22]; 206 ha Campoyong–Bungtod plantation dead by May 2014 [10][40]; 104.39 ha is the whole protected area's recovered area, 2020 [32] |

Map data © OpenStreetMap contributors (ODbL), used for placement only. F4's outline is derived from Global
Mangrove Watch v4.1.12 (CC BY 4.0, © Global Mangrove Watch), so its history answer is expected to read
"mangrove recorded"; that is the place, not a result.

## Fixed ids

| Entity | id |
|--------|----|
| Records on F1–F4 | `00000000-0000-4000-8000-0000000001f1` … `…0000000001f4` |
| Organization: DENR (`funder` of F2–F4, cited party) | `00000000-0000-4000-8000-00000000c001` |
| Organization: Barangay Local Government of Paraiso (Barangay 83) (`partner`, proposer of F1) | `00000000-0000-4000-8000-00000000c002` |
| Organization: Ministry of Foreign Affairs of Japan (`funder` of F1, cited party) [37] | `00000000-0000-4000-8000-00000000c004` |
| Organization: Provincial Government of Leyte (`partner`, proposer of F2) [21] | `00000000-0000-4000-8000-00000000c005` |
| Organization: Naungan-San Juan Mangrove Planters Association (`partner`, proposer of F3) [20][26] | `00000000-0000-4000-8000-00000000c006` |
| Organization: AIDE-M case reconstruction (`funder` kind; the team's seeder org) | `00000000-0000-4000-8000-00000000c003` |
| Seeder user (cannot sign in) | `00000000-0000-4000-8000-00000000c101` |
| Evidence items | `00000000-0000-4000-8000-0000000ef1NN` (F1), `…ef2NN`, `…ef3NN`, `…ef4NN` |

## What the records say

| Site | Work check after / outcome check after | Expected pin | Why |
|------|----------------------------------------|--------------|-----|
| F1 | 2019-01-01 / 2022-01-01 | on track | Funder: Ministry of Foreign Affairs of Japan, not MBFDP [37], so F1 is not on the ₱1 billion program card. Work reported [37][38]; fringe up 80% over pre-disaster, 3.6 ha by the 10th anniversary [37][31] |
| F2 | 2018-12-01 / 2021-12-01 | awaiting | Work reported [21]; no source states the outcome of the 70 ha. City-level "0% in Tacloban" [44] stored unusable; bay-level regrowth [42] is ground context only |
| F3 | 2018-01-01 / 2021-01-01 | on track | MBFDP 105 ha row in the planters' association history table [20]; afforested stand in Barangay Lao managed by that association, 2023 [26]; species and management [41] |
| F4 | 2016-02-01 / 2019-02-01 | on track | Ground: the plantation was dead by May 2014 [10][40]; outcome: "now recovering" [32], protected-area 104.39 ha [32], Bungtod sampled in 2023 [40] |

Work check after = end of planting. Outcome check after = three years later, the period the MBFDP unit cost
covered [17]. "What's there now?" is answered by the Sentinel-2 ingest (`data/ingest/s2_ingest.py`, ADR-060).
The first seed had Paraiso funded by DENR and Bungtod in conflict; both were wrong, and the main database was
reset and reseeded (ADR-059, case study §13). The reseed re-ingests GMW and Sentinel-2.

## Honesty rules for this data

- Records were **reconstructed on 2026-10-04** from public sources. They were not locked when the money
  moved; the record text says so, and the integrity hash covers the reconstruction.
- Real organizations appear only as cited parties: DENR, the Ministry of Foreign Affairs of Japan, the
  Barangay Local Government of Paraiso (Barangay 83), the Provincial Government of Leyte, and the
  Naungan-San Juan Mangrove Planters Association. No individual is named in any row ([`docs/security.md` §6](../../../docs/security.md)).
- A finding is chosen only where the source's own words state it for the place the record covers. F4 stands
  in for the Eastern Samar program, so statements about Eastern Samar count for it ([10], [22], [32], [40]); a
  Leyte-wide or Tacloban-wide statement does not count for F2 or F3. The 25% is Samar province (western
  Samar), not Eastern Samar, and never counts for F4. Quoted rates (DENR 78.3% [18]; Samar 25%, Leyte 0–100%
  [23]; "0% in Tacloban" [44]) are never findings and are stored `usable = false` with the reason (EQ-017).
- Framing: the system could not detect misuse. Never "corruption", never "nothing survived" (case study §9).
- Case study §11 "Not found" items go in `known_unknowns`, never in a finding.
- Do not move a polygon to change a result.
