> **Repo copy (2026-10-03, integrator):** copied from the pre-event prep folder. Only `candidates.geojson` and this file are in the repo; `view.html`, `renders/`, `osm/` and `prep-tools/` mentioned below stay outside it. The demo cast and fixed ids are in [`README.md`](README.md).

# Candidate restoration sites: north coast of Manila Bay

> **SKETCHED FOR DEMO, NOT FIELD-VERIFIED.**
> These five polygons were drawn by a prep agent on 2026-10-03 from OpenStreetMap features and imagery quick-looks. Nobody has visited them. They are **not** the sites that Wetlands International validated in 2024; that work did not publish polygons on the pages we read. Pond use, ownership, Fishpond Lease Agreement (FLA) status, water, and substrate are all unknown for every site. Treat each polygon as a remote-screening candidate that local conditions can invalidate (R09).
>
> **Reviewed 2026-10-03 (adversarial review, before any GMW or Sentinel-2 statistic was computed).** Site A's south edge was moved because it crossed 10 mapped buildings (A is now 33.5 ha). Site D's ring order was fixed (same shape). Wording was tightened where imagery readings had been stated as facts. See "Review log" at the end.

Files in this folder:
- `candidates.geojson`: the five polygons (EPSG:4326) with properties.
- `view.html`: open in a browser to see the polygons on an OSM basemap. You can switch on Sentinel-2 2025 or Esri imagery. This is a prep viewing aid, not product UI.
- `renders/`: quick-look PNGs. Sentinel-2 cloudless 2025 mosaic (EOX, CC BY-NC-SA 4.0), with OSM features drawn on top. Yellow = candidate, red = OSM coastline, green = OSM mangrove, blue = OSM aquaculture, magenta = OSM protected area. `A_s2-2025.png` was re-rendered after the review. `overview_s2-2025.png` still shows the pre-review A outline; at that scale the change is about 3 pixels.
- `osm/`: raw OpenStreetMap extracts (ODbL) used for placement.
- `prep-tools/`: the scripts used to fetch, check, render, and build. These are prep tooling only. Never copy them into the product repo.

## Summary

| ID | Name | Where | Area | Type | Centroid (lat, lon) | Biggest unknown |
|---|---|---|---|---|---|---|
| A | Macabebe bayfront ponds east of Bangkung Malapad | Consuelo (confirm), Macabebe, Pampanga | 33.5 ha | near-existing-mangrove | 14.78995, 120.64141 | Are the ponds active or idle? Who holds them? Who uses the buildings on the south dike? |
| B | Pamarawan breached-dike pond complex | Pamarawan, Malolos City, Bulacan | 31.9 ha | fishpond-conversion | 14.75953, 120.82504 | Why are the dikes broken, and who owns the ponds? Airport reclamation about 1 km east |
| C | Hagonoy outer pond belt near Tibaguin | Hagonoy, Bulacan (barangay unconfirmed) | 33.3 ha | coastal-fringe-loss | 14.76276, 120.74739 | Ponds, or permanently flooded former ponds? |
| D | Orani bayfront eroded pond enclosure | Hermosa per OSM boundary, next to Orani, Bataan | 10.9 ha | coastal-fringe-loss | 14.79319, 120.55353 | Wave exposure and mud level; even the municipality needs confirming |
| E | Paombong (Masukol) coastal pond belt | Masukol, Paombong, Bulacan | 34.6 ha | fishpond-conversion | 14.76114, 120.77895 | Ponds look intact. Are they actively farmed? |

All five are valid polygons with 8 vertices each (counter-clockwise rings). Each is 5–50 ha, and none overlap. No polygon overlaps mapped OSM urban land use (ways and, since the review, relations too) or any mapped OSM building. At least 99% of each polygon is on the land side of the OSM coastline. See "How these were sketched" for the limits of these checks.

**The "Type" column is a hypothesis, not a finding.** For example, "coastal-fringe-loss" means we expect the evidence to show lost coastal mangrove. No loss has been measured at any site yet. If the evidence says otherwise, change the label and record why.

Why this mix: the product has to compare sites whose evidence differs. Each site therefore stands for a different situation in the sources: next to an existing mangrove and a Ramsar site (A); ponds with broken dikes that are already being colonized (B); a shoreline with a documented planting in the past (C); a former enclosure that has eroded to mudflat (D); and ponds whose dikes look intact (E). We picked the types before computing any GMW or Sentinel-2 statistic. No statistic has been computed yet. Do not move a polygon to change a demo result. If a site turns out to be wrong, record that as evidence.

## What the public sources say (shared context)

All URLs below were located by the prep agent. The review agent re-fetched 11 of them on 2026-10-03 and confirmed the quoted facts: R09, WI Bulacan 2023, WI case study, WI–BPSU MoU, both FEED 2017 releases, FEED/Maybank 2025, SunStar, PhilCHM, Global Voices, SEAFDEC and Wikipedia. Still check them once more before citing in the pitch. The Ramsar RIS page was not checked.

- **R09: Wetlands International Philippines, Manila Bay validation and ground-truthing (fieldwork June 10–26, 2024; article published July 10, 2024).** [True, thick or thin? Validation and ground-truthing activity for potential mangrove restoration sites in Manila Bay](https://philippines.wetlands.org/blog/true-thick-or-thin-validation-and-ground-truthing-activity-for-potential-mangrove-restoration-sites-in-manila-bay/)
  - Covered **Pampanga: Macabebe, Sasmuan, Lubao**; **Bataan: Orani, Samal**; **Bulacan: Hagonoy, Paombong**. Field visits ran June 10–14, 17–21 and 24–26, 2024. Cavite and Parañaque/NCR were named as future areas.
  - The team checked water quality (colour, smell, depth), substrate type, and tenure status (owned, unauthorized, or under FLA). They classified each spot as a restoration site or an active/abandoned fishpond.
  - They found **unresolved tenure issues, active fish pens, ownership or titling that needed confirmation, and Fishpond Lease Agreements**.
  - The work built on a 2021 "Building with Nature" mapping study. It supports the Manila Bay Operational Plan 2024–2029 and the DENR/PhilSA BakaJuan citizen-science mangrove validation. Its outputs feed the Provincial Restoration and Conservation Plans for the North Coast of Manila Bay.
  - The article does **not** publish site coordinates, polygons, or hectares.
- **Wetlands International, "Bluer Forests for the People of Bulacan's Intertidal Zones" (Feb 3, 2023).** [link](https://philippines.wetlands.org/blog/bluer-forests-for-the-people-of-bulacans-intertidal-zones/)
  - In Oct–Nov 2022 the team documented "three fishponds in Barangays Calero and Pamarawan in Malolos City and Barangay San Roque in Paombong Municipality". They saw that "Fishponds lay abandoned, undeveloped, or underutilized beside the river".
  - The article quotes "Bulacan's mangroves suffered an astounding 53.29% decline from 1990 to 2002", from 2021 UP-TCAGP mapping.
  - It names "foreshore lease agreements (FLAs) between fishpond operators and the government" among "complex legal, institutional, economic, and political challenges". Here FLA means *foreshore* lease agreement. In R09, FLA means *Fishpond* Lease Agreement. Do not mix them up.
  - It describes Ecological Mangrove Restoration (EMR) and Associated Mangrove Aquaculture (AMA) pilots.
- **Wetlands International case study, "Scaling science-based mangrove restoration in the Philippines".** [link](https://www.wetlands.org/case-study/scaling-science-based-mangrove-restoration-in-the-philippines/)
  - Describes EMR as "breaching dike walls and re-creating tidal creeks, with minimal need for enrichment planting".
  - Names Associated Mangrove Aquaculture (AMA) demonstration sites in **Bataan** (Manila Bay) and Macajalar Bay (Misamis Oriental).
  - This supports framing restoration as hydrological repair and natural regeneration, not tree planting.
- **WI + Bataan Peninsula State University AMA pilot MoU (June 14, 2024).** [link](https://philippines.wetlands.org/wetlands-international-philippines-and-bataan-peninsula-state-university-to-pilot-ama-in-the-province/)
  - AMA puts a mangrove greenbelt along waterways next to ponds, outside the ponds.
  - The article does not give a pilot location.
- **R18: FEED / Maybank, "Maybank's Mangrove Planting in Bulacan" (29 March 2025).** [link](https://feed.org.ph/media-centre/press-releases-2025/maybanks-mangrove-planting-in-bulacan-strengthening-coastal-protection-community-partnerships-for-climate-resilience/)
  - Partners were Maybank Philippines, the Samahan ng Kapisanan ng mga Mangingisda ng Malolos (SKMM), the Hagonoy Fish Farmers Producer Cooperative (HFFPC), the Bantay Dagat of Malolos, and One Child, One Tree. There were 40 participants, who planted 650 mangroves "along the coastal areas of Bulacan". The page was posted on 15 May 2025.
  - **No barangay or coordinates are given**, so we cannot tie it to any polygon.
- **FEED, "Kailangan Lahat Tayo: 40,000 Mangrove Trees Planted in Bulacan" (3 March 2017).** [link](https://feed.org.ph/media-centre/press-releases-2017/kailangan-lahat-tayo-40000-mangrove-trees-planted-in-bulacan-to-restore-a-critical-carbon-sink-flood-protection-system-livelihood-source/)
  - "40,000 indigenous Philippine mangrove tree species of 'bakauang babae' (Rhizophora mucronata) were planted along the coastal shores of Barangay Tibaguin, in the Municipality of Hagonoy."
  - No outcome monitoring was found.
- **FEED, Hagonoy mangrove reforestation with HFFPC (23 May 2017).** [link](https://feed.org.ph/media-centre/press-releases-2017/be-aware-act-believe-in-what-you-do-the-power-of-one-mangrove-reforestation-strengthens-community-resilience-in-hagonoy/)
  - A community project in Tibaguin with a planned mangrove nursery at Tibaguin Elementary School.
- **Sasmuan Pampanga Coastal Wetlands.**
  - Ramsar site, designated February 2, 2021 ([PhilCHM](https://www.philchm.ph/ramsar-sites-3/)).
  - It includes the Sasmuan Bangkung Malapad Critical Habitat and Ecotourism Area. That area is described as 405 ha under DENR DAO 2021-36, which prohibits "illegal fishing and fishponds" in the protected area ([SunStar, Nov 29, 2021](https://www.sunstar.com.ph/pampanga/local-news/bangkung-malapad-now-an-eco-tourism-area)).
  - Our attempt to fetch the official Ramsar RIS failed (HTTP 502). Verify it at https://rsis.ramsar.org/ris/2445.
- **Taliptip, Bulakan: airport reclamation context.**
  - [Global Voices (June 8, 2018)](https://globalvoices.org/2018/06/08/a-fishing-village-and-mangrove-habitat-in-the-philippines-faces-threats-of-reclamation/) reports a 2,500-hectare reclamation for an "aerotropolis" next to Taliptip mangroves.
  - The OSM relation 17372795 "New Manila International Airport" spans 14.716–14.760 N, 120.838–120.900 E.
  - OSM tags that relation as landuse=construction.
  - We kept sites away from it, except B, which is about 1 km west of its bounding box.
- **Advocacy context (news, not a dataset).** The [SEAFDEC repository record](https://ani.seafdec.org.ph/handle/20.500.12174/14906) of a Manila Bulletin article (Aug 31, 2024) reports Dr. Jurgenne Primavera calling for reverting "44,000 hectares or 80 percent of the ponds in the Manila Bay to mangroves". It also reports that "before 1890, mangroves covered 74,000 hectares" of the bay's coastline. If you use these figures, cite them as reported statements.

## Site A: Macabebe bayfront ponds east of Bangkung Malapad

- **Location:** centroid 14.78995 N, 120.64141 E. Area 33.5 ha (45.2 ha before the review; see Review log).
  - OSM admin and Nominatim place it in Consuelo, Macabebe, Pampanga (confirm).
  - It is about 2 km outside the OSM boundary of the Sasmuan Pampanga Coastal Wetlands (relation 16859126).
- **Why it is a candidate:**
  - It is a block of dike-enclosed pond compartments facing the bay, about 1.5 km east of the large mapped mangrove islets of the Sasmuan / Bangkung Malapad area.
  - In Esri imagery we read a narrow dark-green strip, probably mangrove, along the outer dike at the polygon's west edge. This is our reading. OSM does not map this strip.
  - If the ponds are idle, a nearby seed source plus tidal reconnection could support natural regeneration or protection. This is a hypothesis.
- **OSM basis:**
  - relation/2540972 (landuse=aquaculture) covers 100% of the site.
  - Nearest OSM mangrove: relation/2540914 (49.1 ha, about 1.5 km west) and relation/5514712 "Bangkong Malapad" (8.9 ha, about 2.3 km west).
- **Sources:** Macabebe and Sasmuan were in the R09 2024 field validation. R09 reports tenure, FLA, and active fish-pen issues for the region, not for this block. The Bangkung Malapad protected-area rules prohibit fishponds inside that area. This site is outside it.
- **Fishpond, tenure, and past restoration:** unknown. We found no record of restoration on this block.
- **People nearby:** OSM maps a cluster of buildings on the bayfront dike just south of the polygon (the nearest is about 60 m away), plus footpaths along the dikes inside it. Their use is unknown; some may be homes or pond huts. Any restoration option must not assume that anyone is moved. Community and tenure checks are outside the product's scope, but they are real constraints and belong in the dossier as missing evidence.
- **What GMW should show (hypotheses to test):**
  - Little or no mangrove inside the polygon in recent epochs. The west-edge strip may be too narrow for 30 m pixels.
  - Clear mangrove extent on the Bangkung Malapad islets to the west.
  - If the ponds were built before 1985, GMW will show **no loss** here, even though mangrove may have been lost before then. Absence of GMW loss is not evidence of no historical loss.
- **What Sentinel-2 should show (hypotheses):**
  - Mostly open water inside the ponds: high NDWI, low NDVI.
  - Higher NDVI only along the west edge.
  - Repeated drain-and-refill swings in NDWI over 9–12 months could suggest active pond management. A flat water signal is not proof of abandonment.
- **What would invalidate it:**
  - The ponds are actively farmed or held under a valid FLA or title, and the holder does not want to change use.
  - The west-edge strip is not mangrove.
  - Pond floors are too deep for mangrove to establish.
  - Field checks find substrate or water conditions that R09-style validation would reject.

## Site B: Pamarawan breached-dike pond complex

- **Location:** centroid 14.75953 N, 120.82504 E.
  - Barangay Pamarawan, Malolos City, Bulacan (OSM admin and Nominatim agree).
  - It lies inside a seaward bulge of the OSM coastline, east of Pamarawan village.
- **Why it is a candidate:**
  - In Esri imagery we read pond compartments open to the tide, with broken outer dikes and parallel lines of what look like mangrove on dike remnants at the south end. What looks like a dense mangrove patch sits just outside the polygon's north-east corner. These are our readings of imagery, not source facts.
  - This is the EMR-type situation that Wetlands International describes: breached dikes, tidal reconnection, minimal planting.
  - Possible hydrological repair (creek re-creation) or natural regeneration.
- **OSM basis:**
  - No OSM aquaculture or mangrove polygon covers the site, so the ponds and the mangrove lines here are **unmapped**.
  - Nearest OSM mangrove: relation/2544790 (8.3 ha, about 1.1 km east, in Bulakan).
  - OSM relation/17372795 (New Manila International Airport) has a bounding box about 1 km east.
- **Sources:**
  - Pamarawan is one of the three barangays where Wetlands International went to document fishponds in Oct–Nov 2022. The article says "Fishponds lay abandoned, undeveloped, or underutilized beside the river". It does not say which ponds, and B is bayfront, not riverside, so we do **not** claim this block is one of them.
  - Malolos fisherfolk (SKMM) and the Bantay Dagat of Malolos took part in the 2025 FEED/Maybank planting. The location is not given.
- **Fishpond, tenure, and past restoration:** ownership, FLA status, and the reason the dikes are broken (storm damage, neglect, or deliberate opening) are unknown.
- **What GMW should show (hypotheses):**
  - Possible small mangrove gain in recent epochs along the dike remnants, if the lines are wide enough to register at 30 m.
  - Mangrove at the patch just outside the north-east corner.
  - Mostly non-mangrove elsewhere.
- **What Sentinel-2 should show (hypotheses):**
  - A mix of water (high NDWI) with linear high-NDVI features.
  - Polygon-mean NDVI will be pulled down by water, so the per-polygon average may hide the strips. This is a limitation to record.
- **What would invalidate it:**
  - The ponds are titled or leased, and the holder plans to rebuild the dikes.
  - The mangrove lines are not mangrove.
  - Sediment levels are too low for colonization.
  - Airport reclamation changes the local tide or sediment regime in ways that rule out restoration. This is unknown and should not be assumed either way.

## Site C: Hagonoy outer pond belt near Tibaguin

- **Location:** centroid 14.76276 N, 120.74739 E.
  - Hagonoy, Bulacan. OSM gives no barangay. The site lies between the Pugad village area (about 0.5–0.8 km north-west) and Tibaguin (about 1.3 km north-east).
- **Why it is a candidate:**
  - It is the outer belt of OSM-mapped ponds on a shoreline with a documented past planting: 40,000 *Rhizophora mucronata* planted "along the coastal shores of Barangay Tibaguin" in March 2017 (FEED).
  - The planting outcome is unpublished as far as we found.
  - Bulacan saw a large mangrove decline in 1990–2002 (UP-TCAGP mapping, as quoted by Wetlands International).
  - This makes C a case of **missing evidence**: a documented past planting nearby, with no published outcome that we found.
  - **Do not present C in the demo as a failed project.** The 2017 footprint is unknown, the outcome is unknown, and the parties named in the FEED release are real. Any "later evidence" shown for C must be real and sourced, or clearly labelled as illustrative.
- **OSM basis:** relation/2555241 (67% of the site) and relation/2555234 (28%) are landuse=aquaculture. The nearest OSM mangrove is relation/2555221 (1.4 ha, about 2 km away).
- **Sources:** Hagonoy was in the R09 2024 validation. R09 reported tenure, FLA, and active fish-pen issues, but not for this site.
- **Fishpond, tenure, and past restoration:**
  - Pond use and tenure are unknown.
  - The 2017 planting's exact footprint is unknown. **Do not assume it was inside this polygon.**
  - R01 documents historical Philippine failures from planting *Rhizophora* on exposed or low-intertidal sites. This is a mechanism to check, not a prediction for this site.
- **What GMW should show (hypotheses):**
  - Little or no mangrove inside.
  - A 2017 planting would be hard to detect at 30 m by 2025. Absence of gain would **not** prove the planting failed.
- **What Sentinel-2 should show (hypotheses):**
  - A uniform water signal.
  - **Caution:** both the 2025 Sentinel-2 mosaic and Esri imagery show a uniform water surface with only faint dike lines. The area may be permanently flooded former ponds rather than working ponds. Optical imagery cannot tell these apart.
- **What would invalidate it:**
  - The area is permanently inundated, too deep for mangrove (needs elevation or tide data, or a field visit).
  - The ponds are active and leased.
  - Local partners report that the shoreline is not suitable.

## Site D: Orani bayfront eroded pond enclosure

- **Location:** centroid 14.79319 N, 120.55353 E, in Bataan.
  - The OSM admin boundary (Overpass is_in) and Nominatim both say **Hermosa**. A point about 1 km west returns Orani, and the site is directly off the Orani shore.
  - Treat the municipality as "Orani or Hermosa, to confirm".
- **Why it is a candidate:**
  - The OSM coastline makes a seaward bulge here. In Esri imagery we read an intertidal mudflat inside it, with faint remnant dike lines and small patches that look like mangrove on the edges. In the 2025 Sentinel-2 mosaic the bulge looks much like the open bay, so the OSM coastline may trace dikes that no longer stand.
  - We read it as a former pond enclosure whose dikes have failed. **This reading is our visual interpretation, not a source fact.**
  - Possible natural or assisted regeneration if the mud level and exposure allow.
- **OSM basis:**
  - OSM coastline ways only. About 99% of the polygon is on the landward side.
  - Nearest OSM mangrove: relation/11289770 (0.8 ha) and relation/3417136 (9.9 ha), about 1.5–1.7 km away.
  - OSM relation/16859126 (Sasmuan Pampanga Coastal Wetlands) is about 2.3 km east.
- **Sources:**
  - Orani and Samal were in the R09 2024 validation.
  - Wetlands International names Bataan as an AMA demonstration province and signed an AMA MoU with BPSU on June 14, 2024. The pilot location is not given, so we do not claim a link.
- **Fishpond, tenure, and past restoration:** unknown.
- **What GMW should show (hypotheses):** non-mangrove inside, possibly some mangrove pixels along the edges. If the enclosure once held mangrove after 1985, GMW might show loss. If not, no change.
- **What Sentinel-2 should show (hypotheses):**
  - NDWI will vary strongly between scenes, because tide height differs at each overpass. Exposed mud reads differently from covered mud.
  - This is a case where single-date values are misleading and a time series is needed.
- **What would invalidate it:**
  - The site is open-bay mudflat exposed to waves, where mangroves were never naturally present.
  - Planting on such sites is the mechanism behind past failures (R01). It would also remove mudflat habitat.
  - Ownership or FLA claims on the former enclosure.

## Site E: Paombong (Masukol) coastal pond belt

- **Location:** centroid 14.76114 N, 120.77895 E. Barangay Masukol, Paombong, Bulacan (OSM admin: admin_level 10 Masukol).
- **Why it is a candidate:**
  - These are bayfront pond compartments with **intact-looking dikes** in the 2025 Sentinel-2 mosaic. No mangrove fringe is visible between the ponds and the bay.
  - E is the contrast case: a place where the ecological story ("ponds on former mangrove coast") may be weaker than the use and tenure story.
  - If the ponds are active, R09 lists active use as a constraint that can hamper restoration.
- **OSM basis:**
  - The ponds are visible in imagery but **not mapped** in OSM. The OSM coastline runs along the outer dike.
  - Nearest OSM mangrove: relation/2552559 (0.7 ha, about 1.1 km east).
  - OSM residential ways 964716887 and 964716886 are 0.2–0.5 km away.
- **Sources:** Paombong was in the R09 2024 validation. Wetlands International documented ponds in San Roque, Paombong (inland, about 8 km north) in 2022, not here.
- **Fishpond, tenure, and past restoration:** unknown. We found no restoration record.
- **What GMW should show (hypotheses):** no mangrove and no change across epochs (stable ponds).
- **What Sentinel-2 should show (hypotheses):** pond water with possible drain-and-fill cycles. Higher NDVI only on dikes, if anywhere.
- **What would invalidate it as a restoration candidate:**
  - Confirmed active, productive ponds held under a valid FLA or title, with no willing holder.
  - Note: an E that turns out to be "not a good candidate" is a legitimate outcome. The tool should be able to say so.

## Considered and not sketched

- **Obando (Salambao) / Navotas (Tanza) mangrove strip.**
  - OSM relations 2505145 (30 ha, Salambao, Obando), 2505146 and 18319296 (Tanza, Navotas) map a narrow mangrove barrier.
  - Land behind it is mapped as aquaculture, but Esri imagery shows open standing water there.
  - It sits next to a large bare fill or earthworks area visible in imagery, and within about 1 km of the airport relation's bounding box. Obando was not in the R09 2024 list.
  - Placing a polygon here would have meant drawing in what looks like open water. Revisit it if the team wants a Metro Manila-adjacent site.
- **Las Piñas–Parañaque Critical Habitat and Ecotourism Area (Ramsar).**
  - OSM way 229053507. [Wikipedia](https://en.wikipedia.org/wiki/Las_Pi%C3%B1as%E2%80%93Para%C3%B1aque_Critical_Habitat_and_Ecotourism_Area) gives 181 ha, with about 30 ha of mangrove and about 114 ha of tidal mudflats used by migratory birds.
  - It is already protected. Its open areas are mudflat habitat, and turning mudflats into mangrove is not restoration.
  - It could serve as a "protection / already-mangrove" reference in a later version.
- **Cavite (Noveleta, Kawit, Bacoor) mangroves.** OSM has several 7–24 ha mangrove ways (e.g., way 610002581 in Noveleta). R09 lists Cavite only as a future area, and we found no site-level public source tonight.

## How these were sketched (methods)

1. **Sources first.** We read the R09 validation article and related Wetlands International, FEED, Ramsar/PhilCHM, SunStar, Global Voices, and SEAFDEC pages (links above). We recorded the municipalities and barangays named and the constraints reported. No source published site polygons.
2. **OSM extracts** were fetched via Overpass for bbox lat 14.40–14.90, lon 120.45–121.05 (`prep-tools/fetch_osm.py`, raw JSON in `osm/`):

   | Layer | Endpoint | OSM data timestamp (UTC) | Notes |
   |---|---|---|---|
   | mangrove (wetland=mangrove) | overpass-api.de | 2026-10-03T11:16 | 208 elements; relations with member geometry |
   | aquaculture (landuse=aquaculture, water=fishpond) | overpass.private.coffee (mirror) | 2026-06-01T08:52 | 2,559 elements; mirror data is ~4 months older |
   | coastline | overpass.kumi.systems | 2026-07-28T02:16 | ways only |
   | urban (residential/industrial/commercial/port/aerodrome) | overpass-api.de | 2026-10-03T11:00 | fetched before a fix, so **relations have no member geometry**. Only ways were used in `check_sites.py`. The review re-checked relations and buildings separately (see Review log) |
   | protected areas | overpass-api.de | 2026-10-03T11:24 | |
   | other wetlands | overpass-api.de | 2026-10-03T11:25 | |

3. **Imagery quick-looks** (`prep-tools/render_area.py`):
   - Sentinel-2 cloudless 2025 annual mosaic (EOX s2maps.eu, CC BY-NC-SA 4.0, contains modified Copernicus Sentinel data 2025).
   - Esri World Imagery, for higher-resolution viewing. Its capture dates are unknown and vary by tile. Several Esri tiles over Hagonoy and Paombong are sun-glinted water.
   - Both were used **only to place polygons by eye**. No values were extracted.
4. **Placement.** Vertices were read off zoom-16 renders with a 0.002° graticule. Expect ±20–50 m placement error. The polygons are simple 8-vertex shapes, not parcel boundaries.
5. **Checks** (`prep-tools/check_sites.py`; area in EPSG:32651):
   - Validity, vertex count, and area of 5–50 ha.
   - No overlaps between sites.
   - Overlap with OSM urban ways.
   - Share of each polygon on the land side of the nearest OSM coastline segment.
   - Nearest OSM mangrove and aquaculture features.
6. **Admin names** come from Overpass `is_in` on OSM admin boundaries plus Nominatim reverse geocoding. OSM boundaries offshore are imprecise; site D shows the problem.
7. **Build.** `prep-tools/build_candidates.py` writes `candidates.geojson`. `prep-tools/make_view.py` embeds it into `view.html`.

**Known limits of this method**
- OSM is volunteer-mapped. Many ponds and mangrove lines here are unmapped, and the coastline is older than the imagery in places.
- Imagery interpretation (for example "breached dikes" or "former enclosure") is ours, not a source's.
- We did not check elevation, tides, GMW, or Sentinel-2 statistics. Those are build-time evidence sources, and the hypotheses above are what they should test.

## Source register mapping (for the team sheet)

- R09 → https://philippines.wetlands.org/blog/true-thick-or-thin-validation-and-ground-truthing-activity-for-potential-mangrove-restoration-sites-in-manila-bay/ (located by prep agent, verify)
- R18 → https://feed.org.ph/media-centre/press-releases-2025/maybanks-mangrove-planting-in-bulacan-strengthening-coastal-protection-community-partnerships-for-climate-resilience/ (located by prep agent, verify)

## Review log (2026-10-03, adversarial review agent)

All changes below were made **before any GMW or Sentinel-2 statistic was computed**. None was made to change a demo result.

- **Site A geometry changed.** A live Overpass check of OSM buildings found that A's south edge crossed 10 mapped buildings (about 800 m² of footprint) on the bayfront dike. The south edge was moved about 100 m north. A is now 33.5 ha (was 45.2 ha). It now stays at least 60 m from every mapped building, is still 100% inside aquaculture relation/2540972, and is still about 1.5 km from mangrove relation/2540914 and about 2.0 km from the Sasmuan protected area. The `revision_note` property in `candidates.geojson` records this.
- **Site D ring order reversed** to counter-clockwise, as RFC 7946 asks for GeoJSON exterior rings. Shape and area are unchanged.
- **Urban relations now checked.** The original check used urban ways only. The review fetched urban land-use relations and all buildings with geometry for lat 14.74–14.82, lon 120.53–120.85 (overpass-api.de, OSM data 2026-10-03T11:58Z). No site intersects any urban land-use relation. A was the only site that touched buildings. The nearest building to D is about 60 m away, to E about 230 m, and to C about 300 m (residential relation).
- **OSM ids re-queried.** Every OSM id cited per site exists and has the stated tags (overpass.kumi.systems, OSM data 2026-07-24). Distances were reproduced. D to the Sasmuan protected area is 2.3 km, not 2.4 km. Relation/2544790 (near B) is tagged natural=wood plus wetland=mangrove.
- **Wording.** Imagery readings for A, B and D are now stated as "our reading", not as facts. The WI 2023 "FLA" is a *foreshore* lease agreement, not a Fishpond Lease Agreement. The WI case study names Bataan as an AMA demonstration site, not an EMR one. Site C is now framed as missing evidence, and must not be shown as a failed project.

**Still open for the team** (not fixed by the review):
- C and D both look like open water or open mudflat in the 2025 Sentinel-2 mosaic. Remote screening cannot tell whether they are restorable. Keep them only if the demo is meant to show "needs field verification" or "insufficient evidence" outcomes. Do not keep them to show a predetermined result.
- Whether to show EOX (CC BY-NC-SA) or Esri imagery in the demo. The product should use Copernicus data.
