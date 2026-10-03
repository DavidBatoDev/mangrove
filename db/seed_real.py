"""Real, sourced Post-Yolanda records in Eastern Visayas (ADR-056, corrected by ADR-059). Called by db/seed.py.

Every value below comes from docs/case-study-yolanda.md (sources [1]–[44], each fetched and quoted) and carries
its source number; nothing is invented. Items in that file's §11 "Not found" go in known_unknowns, never in a
finding. Nobody is named as a subject: organizations appear only as the cited funder or partner. The four
records are reconstructed on the seed date from public sources; they were not locked at the time, and each
record says so.

Stages, each skipped when already done (append-only, so a bad seed needs --reset):
1. owner role: organizations, the seeder account (cannot sign in) and the four sketched sites;
2. app role: the ground items known before each promise (they go into the lock-time snapshot);
3. app role: the records and their timelines, only once every real site has its GMW history item, so the
   snapshot carries the real baseline. Run data/ingest/gmw_ingest.py --sites-only (and s2_ingest.py) first,
   then apply again.
"""

from __future__ import annotations

import json
import re
import secrets
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID

import psycopg
from argon2 import PasswordHasher
from psycopg.rows import dict_row

from app.reads import site_dossier_raw
from ledger.records import append_event, build_snapshot, create_record, insert_evidence

ROOT = Path(__file__).resolve().parents[1]
REGION = "Eastern Visayas"

DENR = UUID("00000000-0000-4000-8000-00000000c001")
PARAISO_LGU = UUID("00000000-0000-4000-8000-00000000c002")
CASE_DESK = UUID("00000000-0000-4000-8000-00000000c003")
JAPAN_MOFA = UUID("00000000-0000-4000-8000-00000000c004")
LEYTE_PG = UUID("00000000-0000-4000-8000-00000000c005")
NSJMPA = UUID("00000000-0000-4000-8000-00000000c006")
SEEDER = UUID("00000000-0000-4000-8000-00000000c101")
KEYS = ("F1", "F2", "F3", "F4")
SITE = {k: UUID(f"00000000-0000-4000-8000-0000000000{k.lower()}") for k in KEYS}
RECORD = {k: UUID(f"00000000-0000-4000-8000-0000000001{k.lower()}") for k in KEYS}

ORGS = [
    (DENR, "Department of Environment and Natural Resources (DENR)", "funder"),
    (PARAISO_LGU, "Barangay Local Government of Paraiso (Barangay 83), Tacloban", "partner"),
    (CASE_DESK, "AIDE-M case reconstruction", "funder"),
    (JAPAN_MOFA, "Ministry of Foreign Affairs of Japan", "funder"),
    (LEYTE_PG, "Provincial Government of Leyte", "partner"),
    (NSJMPA, "Naungan-San Juan Mangrove Planters Association, Ormoc", "partner"),
]
FUNDER = {"F1": JAPAN_MOFA, "F2": DENR, "F3": DENR, "F4": DENR}
PROPOSER = {"F1": PARAISO_LGU, "F2": LEYTE_PG, "F3": NSJMPA, "F4": None}

RECONSTRUCTED = ("Reconstructed on 2026-10-04 from public sources; this record was not locked at the time, so its "
                 "hash proves only that the reconstruction has not changed since.")

# Short names for the case-study source numbers, so record text cites readably instead of "[n]".
CITE = {
    3: "PENRO Occidental Mindoro", 4: "Inquirer, Nov 2013", 5: "Inquirer, Nov 2013", 10: "Inquirer, Jun 2014",
    11: "Inquirer Opinion, Jun 2014", 17: "2nd National Mangrove Conference, 2015",
    20: "Ormoc report, State of the Mangrove Summit 2019", 21: "Leyte report, State of the Mangrove Summit 2019",
    22: "Eastern Samar report, State of the Mangrove Summit 2019", 26: "Carbon Research, 2025",
    29: "VERA Files, 2026", 31: "Mongabay, 2025", 32: "Climate Tracker Asia, 2022",
    37: "Journal of Environmental Management, 2025", 38: "UP Open University study, 2022",
    40: "Academia Journal of Biology, 2023", 41: "Biodiversitas, 2024", 43: "Mongabay, 2023",
}


def cite(text: str) -> str:
    """Replace each case-study "[n]" with "(short source name)"."""
    return re.sub(r"\[(\d+)\]", lambda m: f"({CITE[int(m.group(1))]})", text)


def evidence_id(key: str, n: int) -> UUID:
    return UUID(f"00000000-0000-4000-8000-0000000e{key.lower()}{n:02d}")


def ts(y: int, m: int = 1, d: int = 1) -> datetime:
    return datetime(y, m, d, tzinfo=timezone.utc)


# Case-study source number -> (source_name, published, url). Publications only; no person is named.
SOURCES = {
    10: ("Inquirer, “Gov't study shows 'Yolanda' damage to mangroves bigger than reported”", "2014-06-02",
         "https://newsinfo.inquirer.net/607594/"),
    11: ("Inquirer Opinion, “Mangroves of E. Visayas need protection”", "2014-06-15",
         "https://opinion.inquirer.net/75597/mangroves-of-e-visayas-need-protection"),
    18: ("Proceedings of the 3rd National Mangrove Conference, Iloilo City", "2018-04",
         "https://cms.zsl.org/sites/default/files/2023-02/15%20Proceedings%20NATMANCON%203%202018.pdf"),
    20: ("State of the Mangrove Summit, “State of the Mangrove in Ormoc City”", "2019",
         "https://mangroveecology.com/wp-content/uploads/2019/03/3.-state-of-the-mangrove.pdf"),
    21: ("State of the Mangrove Summit, “State of the Mangrove in Leyte”", "2019",
         "https://www.academia.edu/87539308/State_of_the_Mangrove_in_Leyte"),
    22: ("State of the Mangrove Summit, “State of the Mangrove in Eastern Samar”", "2019",
         "https://www.academia.edu/87539309/State_of_the_Mangrove_in_Eastern_Samar"),
    23: ("State of the Mangrove Summit, “Synthesis”", "2019",
         "https://mangroveecology.com/wp-content/uploads/2019/03/6.-synthesis.pdf"),
    26: ("Carbon Research 4, “Understanding blue carbon management strategies”", "2025",
         "https://link.springer.com/article/10.1007/s44246-025-00216-6"),
    29: ("VERA Files, “The Last Guardians of Paraiso”", "2026-09-24",
         "https://verafiles.org/articles/the-last-guardians-of-paraiso"),
    31: ("Mongabay, “Philippine mangroves survived a typhoon, but now confront a human-made challenge”", "2025-12",
         "https://news.mongabay.com/2025/12/philippine-mangroves-survived-a-typhoon-but-now-confront-a-human-made-challenge/"),
    32: ("Climate Tracker Asia, “Guiuan coastal folks turn to mangroves, seawall for protection”", "2022-11-10",
         "https://climatetracker.asia/guiuan-coastal-folks-turn-to-mangroves-seawall-for-protection/"),
    37: ("Journal of Environmental Management 395:127840, Paraiso mangrove recovery study", "2025",
         "https://doi.org/10.1016/j.jenvman.2025.127840"),
    38: ("UP Open University special problem on community mangrove rehabilitation (Zenodo)", "2022",
         "https://doi.org/10.5281/zenodo.6975985"),
    40: ("Academia Journal of Biology 45(3):69–80, Guiuan mangrove study", "2023",
         "https://doi.org/10.15625/2615-9023/18041"),
    41: ("Biodiversitas 25(5), Naungan mangrove study", "2024", "https://smujo.id/biodiv/article/view/17583"),
    42: ("BIODIVERS 2(2), “Natural Regrowth of Mangrove Five Years After a Large-Scale Disturbance”", "2023",
         "https://doi.org/10.56060/bdv.2023.2.2.2099"),
    44: ("Proceedings of the 3rd National Mangrove Conference, Iloilo City (p. 40)", "2018-04",
         "https://cms.zsl.org/sites/default/files/2023-02/15%20Proceedings%20NATMANCON%203%202018.pdf"),
}

# Published photos, linked and credited, never rehosted (the URL is the publisher's).
PHOTOS = {
    "takagi_before_after": {"url": "https://ars.els-cdn.com/content/image/1-s2.0-S0301479725038162-gr2.jpg",
                            "credit": "Journal of Environmental Management 2025, Fig. 2 (CC BY-NC 4.0)",
                            "caption": "Paraiso shoreline before and after, Google Earth imagery"},
    "takagi_field": {"url": "https://ars.els-cdn.com/content/image/1-s2.0-S0301479725038162-gr9.jpg",
                     "credit": "Journal of Environmental Management 2025, Fig. 9 (CC BY-NC 4.0)",
                     "caption": "Paraiso planted mangroves, field photos"},
    "paraiso_park": {"url": "https://imgs.mongabay.com/wp-content/uploads/sites/20/2025/12/04131402/d.-Paraiso_Mangrove_Eco_Learning_Park_boardwalk_floating_cottage_Tacloban_Leyte__09-09-2022.jpg",
                     "credit": "Patrickroque01 via Wikimedia Commons (CC BY-SA 4.0), via Mongabay",
                     "caption": "Paraiso Mangrove Eco-Learning Park boardwalk, 2022"},
    "cancabato_bay": {"url": "https://imgs.mongabay.com/wp-content/uploads/sites/20/2023/12/21123915/Cancabato-Bay.jpg",
                      "credit": "Bagoto via Wikimedia Commons (CC BY-SA 4.0), via Mongabay",
                      "caption": "Cancabato Bay, Tacloban"},
    "naungan_boardwalk": {"url": "https://i0.wp.com/shellwanders.com/wp-content/uploads/2023/05/Ormoc-Mangrove-Ecopark-Barangay-Naungan-Boardwalk.jpg",
                          "credit": "Shellwanders (personal travel blog), 8 May 2023",
                          "caption": "Ormoc Mangrove Eco Park boardwalk, Barangay Naungan"},
    "bungtod": {"url": "https://climatetracker.asia/wp-content/uploads/2022/11/mangroves_ft-img-e1669013830455.jpg",
                "credit": "Climate Tracker Asia, photo by Aprille Ann Yodico",
                "caption": "Mangrove trees in Barangay Bungtod, Guiuan, Eastern Samar"},
}

NATIONWIDE = "Program-wide figure across 43 provinces with no published method; not measured at this site."
LEYTE_RANGE = "Province-wide range that spans both outcomes; the source says the figures need field validation."


def quoted(name: str, value: float, unit: str) -> dict:
    """EQ-017: a figure read as published, never computed. Low (DS-009)."""
    return {"name": name, "value": value, "unit": unit, "eq_id": "EQ-017", "confidence": "low"}


def item(key: str, n: int, ref: int, question: str, finding: str | None, observed: tuple[datetime, datetime],
         words: str, limitation: str, metrics: list | None = None, unusable_reason: str | None = None,
         photos: tuple[str, ...] = ()) -> dict:
    name, published, url = SOURCES[ref]
    usable = unusable_reason is None
    method = (f"Quoted from a public report, not measured by AIDE-M (EQ-017, DS-009). "
              + (f"Finding picked from the fixed list (PRD §4.1) because the source says: {words}" if usable
                 else f"The source says: {words} No finding is taken from it."))
    return {
        "id": evidence_id(key, n), "site_id": SITE[key], "question": question, "source_type": "public_report",
        "source_name": name, "source_version": f"Published {published} (case study source {ref})",
        "observed_from": observed[0], "observed_to": observed[1], "finding": finding if usable else None,
        "usable": usable, "unusable_reason": unusable_reason, "metrics": metrics or [], "method": method,
        "limitation": limitation, "provenance_url": url, "is_demo": False,
        "raw": {"photos": [PHOTOS[p] for p in photos]} if photos else None,
    }


# --- what was known before each promise: site evidence, part of the lock-time snapshot ---------------------
GROUND = {
    "F1": [item("F1", 1, 11, "ground", "open_for_restoration", (ts(2014, 1), ts(2014, 3, 31)),
                "“total mortality” at only three of 14 surveyed sites, one of them Barangay 83a in Tacloban, and "
                "planting should be limited to those three sites.",
                "One independent survey in Jan and Mar 2014, reported in an opinion piece; Barangay 83a is named, "
                "not mapped, so the match to this polygon is by barangay.")],
    "F2": [item("F2", 1, 42, "ground", "existing_mangrove", (ts(2014), ts(2019, 12, 31)),
                "“Mangrove survived along San Juanico Strait, Anibong Bay, and Cancabato Bay exhibiting "
                "regeneration”.",
                "Bay-level statement from plots surveyed one and five years after the typhoon; the plots are "
                "not this polygon.", photos=("cancabato_bay",))],
    "F3": [item("F3", 1, 11, "ground", "existing_mangrove", (ts(2014, 1), ts(2014, 3, 31)),
                "Ormoc City has “pristine, old growth forests” suited for development as ecoparks.",
                "City-level remark from the 2014 independent survey; the stands are not mapped."),
           item("F3", 2, 41, "ground", "existing_mangrove", (ts(2023), ts(2023, 12, 31)),
                "at Naungan “Avicennia marina is the most dominant upperstorey species… followed by Sonneratia "
                "alba… The area is managed by a people's organization”.",
                "Peer-reviewed vegetation survey; survey dates are not stated, dated here to the year before "
                "publication.", photos=("naungan_boardwalk",))],
    "F4": [item("F4", 1, 10, "ground", "open_for_restoration", (ts(2014, 4, 20), ts(2014, 5, 3)),
                "“mangroves in a 206-hectare plantation in the villages of Campoyong and Bungtod in Guian, Eastern "
                "Samar, failed to grow back its leaves six months after the typhoon struck… an indication that the "
                "trees had died”.",
                "Assessment by DENR's own research bureau; the 206 ha spans two villages and is not mapped.",
                [quoted("dead_plantation_campoyong_bungtod", 206, "ha")]),
           item("F4", 2, 40, "ground", "open_for_restoration", (ts(2014), ts(2014, 12, 31)),
                "“The 206 ha plantation of mangroves in barangay Campoyong and Bungtod in Guiuan were unable to "
                "grow back six months after it was hit by the typhoon”.",
                "Peer-reviewed restatement of the 2014 assessment, not a new survey.")],
}

# --- what happened after: appended to each record's timeline, oldest first ---------------------------------
TIMELINE = {
    "F1": [item("F1", 2, 37, "work", "work_done", (ts(2015), ts(2018, 12, 31)),
                "“between 2015 and 2018, approximately 30,000 mangrove seedlings were planted across 4 ha of land, "
                "with funding provided by the Japanese Ministry of Foreign Affairs”.",
                "Reported figures in a peer-reviewed study; the planted boundary is not published.",
                [quoted("reported_area", 4, "ha"), quoted("seedlings_planted", 30000, "seedlings")]),
           item("F1", 3, 38, "work", "work_done", (ts(2016), ts(2016, 12, 31)),
                "“OISCA paid the members Php 8.00/plant for seedling potting and Php 7.00/plant for outplanting. An "
                "average of 15 persons worked for this project” and “10,000 mangrove seedlings planted in 2016”.",
                "Student report from interviews; pay and headcount as reported, not audited.",
                [quoted("seedlings_planted_2016", 10000, "seedlings")]),
           item("F1", 4, 37, "outcome", "recovery_seen", (ts(2013, 11), ts(2023, 12, 31)),
                "no significant recovery at 16 months and 3.6 years after the typhoon, then by the 10th anniversary "
                "the stand “expanded to an estimated 3.6 ha” and “the mangrove forest fringe increased by an "
                "impressive 80 % compared to pre-disaster levels, clearly demonstrating successful recovery”.",
                "Satellite NDVI and Google Earth imagery analysed by the study; 3.6 ha is 40 Sentinel-2 pixels.",
                [quoted("mangrove_cover_2023", 3.6, "ha"), quoted("fringe_change_vs_pre_typhoon", 80, "%")],
                photos=("takagi_before_after", "takagi_field")),
           item("F1", 5, 31, "outcome", "recovery_seen", (ts(2023), ts(2023, 12, 31)),
                "Paraiso's mangrove cover reached 3.6 ha by 2023, above the 1.9 ha before the typhoon.",
                "News report of the same study; not an independent measurement.",
                [quoted("mangrove_cover_2023", 3.6, "ha"), quoted("mangrove_cover_before_typhoon", 1.9, "ha")],
                photos=("paraiso_park",))],
    "F2": [item("F2", 2, 21, "work", "work_done", (ts(2017, 9), ts(2018, 11, 30)),
                "the provincial government implements its own mangrove rehabilitation project in Cancabato Bay, "
                "70 hectares over 14 months, with ₱28.8 million from the budget of DENR Region 8 in partnership "
                "with the fisheries bureau and the Environmental Management Bureau.",
                "Government-reported activity in a summit chapter; the 70 ha boundary is not published.",
                [quoted("reported_area", 70, "ha"), quoted("reported_budget", 28.8, "million PHP")]),
           item("F2", 3, 44, "outcome", None, (ts(2014), ts(2018, 4)),
                "“There was a survival rate of 98% in some parts of Quezon and 0% in Tacloban which was damaged "
                "by the typhoon.”",
                "Remark at a national conference; city-level, the programme and planting are not named.",
                [quoted("reported_survival_tacloban", 0, "%")],
                unusable_reason="City-level remark that names no programme or planting; not this project."),
           item("F2", 4, 26, "outcome", None, (ts(2023, 1), ts(2023, 3, 31)),
                "two stations along Cancabato Bay, Brgy. Burayan and Brgy. Paraiso, had 4.28 ha and 5.18 ha of "
                "mangrove cover, and “There are reforested stands in both barangays.”",
                "Peer-reviewed field survey; the reforested stands are not tied to any programme or year.",
                [quoted("mangrove_cover_burayan", 4.28, "ha")],
                unusable_reason="Names no planting programme, so it is not evidence about the 70 ha project."),
           item("F2", 5, 23, "outcome", None, (ts(2019), ts(2019, 12, 31)),
                "survival in Leyte ranged from 0% to 100%, with “no standard monitoring protocol”.",
                "Not limited to this project; the source says the figures “need field validation”.",
                [quoted("reported_survival_leyte_min", 0, "%"), quoted("reported_survival_leyte_max", 100, "%")],
                unusable_reason=LEYTE_RANGE)],
    "F3": [item("F3", 3, 20, "work", "work_done", (ts(2015), ts(2017, 12, 31)),
                "the planters' association's history table lists “2015–2017 MBFDP Project: Granted 105 ha for "
                "mangrove plantation comprising of 8 parcels; maintenance and protection activity; changed "
                "Rhizophora to Avicennia/Sonneratia”.",
                "Summit proceedings; parcel locations are not published, so the polygon is a stand-in.",
                [quoted("reported_area", 105, "ha"), quoted("reported_parcels", 8, "parcels")]),
           item("F3", 4, 18, "outcome", None, (ts(2016, 2), ts(2016, 5, 31)),
                "DENR's survival check found 78.3% for mangrove and 76.3% for beach forest.",
                "DENR's own figure, taken within months of planting, method unpublished.",
                [quoted("reported_survival_mangrove", 78.3, "%")], unusable_reason=NATIONWIDE),
           item("F3", 5, 26, "outcome", "recovery_seen", (ts(2023, 1), ts(2023, 3, 31)),
                "“The natural stand is in Brgy. San Juan, while afforested stand is established in Brgy. Lao. The "
                "mangroves are managed by the Naungan San Juan Mangrove Planters Association (NSJMPA)… a Mangrove "
                "Eco Park was established in 2023”.",
                "Peer-reviewed field survey; it does not state the planting year or programme of the Lao stand, "
                "and Brgy. Lao borders this polygon rather than lying inside it.")],
    "F4": [item("F4", 3, 22, "work", "work_done", (ts(2014), ts(2016, 12, 31)),
                "the project was funded by DENR and supervised by its research bureau, and “The province planted "
                "around 2,553 ha”.",
                "Province-level figure; this patch stands in for it and is not a published site boundary.",
                [quoted("reported_area_eastern_samar", 2553, "ha")]),
           item("F4", 4, 32, "work", "work_done", (ts(2014), ts(2022, 11, 10)),
                "in Bungtod “community members have been planting and rehabilitating mangroves”, with activities "
                "organized by the environment office in Guiuan and non-governmental organizations.",
                "Journalistic account; it does not name MBFDP as the funder.", photos=("bungtod",)),
           item("F4", 5, 18, "outcome", None, (ts(2016, 2), ts(2016, 5, 31)),
                "DENR's survival check found 78.3% for mangrove and 76.3% for beach forest.",
                "DENR's own figure, taken within months of planting, method unpublished.",
                [quoted("reported_survival_mangrove", 78.3, "%")], unusable_reason=NATIONWIDE),
           item("F4", 6, 32, "outcome", "recovery_seen", (ts(2020), ts(2020, 12, 31)),
                "“104.39 hectares of recovered areas with planted seedlings have been mapped out as of 2020” by the "
                "protected area office of the Guiuan Marine Resource Protected Landscape and Seascape.",
                "Protected-area-wide figure, not Bungtod alone; the mapped areas are not published.",
                [quoted("recovered_planted_area_protected_area", 104.39, "ha")]),
           item("F4", 7, 32, "outcome", "recovery_seen", (ts(2022), ts(2022, 11, 10)),
                "in Bungtod “Mangroves in areas severely damaged by the super typhoon are now recovering.”",
                "Journalistic account; recovery is described, not measured.", photos=("bungtod",)),
           item("F4", 8, 40, "outcome", "recovery_seen", (ts(2022), ts(2022, 12, 31)),
                "a vegetation survey sampled 454 mangrove individuals at Bungtod.",
                "Plot survey reported before Jan 2023; plots are not this polygon and the count does not separate "
                "planted from natural trees.",
                [quoted("mangrove_individuals_sampled_bungtod", 454, "trees")])],
}

GOALS = ("DENR's stated goals for the Post-Yolanda program: a “coastal greenbelt” that would also support fishing "
         "and ecotourism, with 80% of funds going to cash-for-work for typhoon survivors [4], and storm protection "
         "[5]. No site-level target was published.")
NOT_FOUND = ("Not published: the MBFDP agreement text, daily wage and any survival condition on payment; per-site "
             "survival for Eastern Visayas MBFDP plots; an independent program-wide survival rate.")

RECORDS = {
    "F1": dict(
        rationale="Barangay 83 (Paraiso) was one of three places where a 2014 independent survey found total "
                  "mangrove mortality [11]. A DENR-assisted planting in early 2014 was killed by Typhoons Ruby and "
                  "Seniang that December [38]; the community replanted with funding from Japan's Ministry of "
                  "Foreign Affairs [37].",
        planned_action="planting",
        planned_action_detail="About 30,000 seedlings on 4 ha, 2015-2018 [37]; OISCA paid about 15 workers ₱8 per "
                              "seedling potted and ₱7 per seedling outplanted [38].",
        planned_area_ha=4.0, work_check_after=date(2019, 1, 1), outcome_check_after=date(2022, 1, 1),
        expected_outcome="Restore the mangrove fringe that protected the barangay before the typhoon [37]. No "
                         "numeric target was published.",
        known_unknowns="This is not an MBFDP site: no source ties Paraiso to the ₱1 billion program. A resident says "
                       "the planting was done “without a single cent of support from the government” [43], while "
                       "DENR assisted the failed 2014 planting [38]. The polygon is the OpenStreetMap mangrove stand "
                       "in Barangay 83, not the planted boundary. " + RECONSTRUCTED,
    ),
    "F2": dict(
        rationale="The provincial government implements a 70 ha mangrove rehabilitation project in Cancabato Bay, "
                  "paid from the DENR Region 8 budget with the fisheries bureau and the Environmental Management "
                  "Bureau [21]. The source does not call it MBFDP.",
        planned_action="planting",
        planned_action_detail="70 ha over 14 months, Sep 2017-Nov 2018, with ₱28.8 million [21].",
        planned_area_ha=70.0, work_check_after=date(2018, 12, 1), outcome_check_after=date(2021, 12, 1),
        expected_outcome=GOALS,
        known_unknowns="No source states the survival of the 70 ha. The 70 ha boundary is not published; the "
                       "polygon is the OpenStreetMap-mapped wetland on the bay shore. " + NOT_FOUND + " "
                       + RECONSTRUCTED,
    ),
    "F3": dict(
        rationale="Ormoc's 2019 mangrove report lists an MBFDP grant of 105 ha in 8 parcels, 2015-2017, in the "
                  "history table of the Naungan-San Juan Mangrove Planters Association [20].",
        planned_action="planting",
        planned_action_detail="Planting, maintenance and protection across 8 parcels; the species switched from "
                              "Rhizophora to Avicennia and Sonneratia [20].",
        planned_area_ha=105.0, work_check_after=date(2018, 1, 1), outcome_check_after=date(2021, 1, 1),
        expected_outcome=GOALS,
        known_unknowns="The 8 parcel locations are not published; the polygon is OpenStreetMap-mapped mangrove at "
                       "Naungan. No source gives survival for the 105 ha; the outcome item is an afforested stand "
                       "the association manages in the next barangay [26]. " + NOT_FOUND + " " + RECONSTRUCTED,
    ),
    "F4": dict(
        rationale="DENR's research bureau found the 206 ha mangrove plantation in Campoyong and Bungtod dead six "
                  "months after the typhoon [10]. Eastern Samar then received about 2,553 ha of DENR-funded "
                  "planting [22], and Bungtod residents replanted [32].",
        planned_action="planting",
        planned_action_detail="Planting and monitoring by local community or people's organization members [22]. "
                              "The area shown is the protected area's mapped recovered area with planted seedlings "
                              "(104.39 ha) [32]; no per-site planned area was published.",
        planned_area_ha=104.39, work_check_after=date(2016, 2, 1), outcome_check_after=date(2019, 2, 1),
        expected_outcome=GOALS,
        known_unknowns="Whether the Bungtod replanting was paid from MBFDP money is not stated [32]. The polygon "
                       "is the 2010 Global Mangrove Watch patch south of Bungtod, a stand-in for the province "
                       "program. " + NOT_FOUND + " " + RECONSTRUCTED,
    ),
}


def _features() -> dict[str, dict]:
    fc = json.loads((ROOT / "data/sites/real/yolanda.geojson").read_text(encoding="utf-8"))
    return {f["properties"]["site_id"]: f for f in fc["features"]}


def _seed_reference(conn: psycopg.Connection) -> None:
    for org_id, name, kind in ORGS:
        conn.execute("INSERT INTO organization (id, name, kind, is_demo) VALUES (%s, %s, %s, false)",
                     (org_id, name, kind))
    # The seeder writes the reconstructed records; nobody knows its password, so it cannot sign in.
    conn.execute(
        """INSERT INTO app_user (id, org_id, email, display_name, role, password_hash)
           VALUES (%s, %s, 'case-desk@aide-m.invalid', 'Case reconstruction (seed)', 'funder', %s)""",
        (SEEDER, CASE_DESK, PasswordHasher().hash(secrets.token_urlsafe(32))),
    )
    for key, f in sorted(_features().items()):
        p = f["properties"]
        assert UUID(p["id"]) == SITE[key], f"fixed id mismatch for real site {key}"
        conn.execute(
            """INSERT INTO site (id, name, region, geom, proposal_summary, proposed_by_org_id, is_demo)
               VALUES (%s, %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)), %s, %s, false)""",
            (SITE[key], p["name"], REGION, json.dumps(f["geometry"]), cite(p["case_note"]), PROPOSER[key]),
        )


def _missing_history(conn: psycopg.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT DISTINCT site_id FROM evidence_item WHERE source_type = 'gmw' AND usable AND site_id = ANY(%s)",
        (list(SITE.values()),),
    ).fetchall()
    have = {r["site_id"] for r in rows}
    return [k for k in KEYS if SITE[k] not in have]


def _seed_records(conn: psycopg.Connection) -> None:
    for key in KEYS:
        d = site_dossier_raw(conn, SITE[key])
        snapshot = build_snapshot(d["site"], d["_evidence"], d["answers"])
        text = {k: cite(v) if isinstance(v, str) else v for k, v in RECORDS[key].items()}
        fields = dict(text, site_id=SITE[key], funder_org_id=FUNDER[key], created_by_user_id=SEEDER,
                      expected_vegetated_ha=None, is_demo=False)
        create_record(conn, fields, snapshot, idempotency_key=f"seed-real-record-{key.lower()}", record_id=RECORD[key])
        for ev in TIMELINE[key]:
            insert_evidence(conn, ev)
            append_event(conn, RECORD[key], "evidence_added", SEEDER, evidence_item_id=ev["id"])


def run(owner_url: str, app_url: str) -> None:
    with psycopg.connect(owner_url, row_factory=dict_row) as conn:
        if not conn.execute("SELECT 1 FROM site WHERE id = %s", (SITE["F1"],)).fetchone():
            with conn.transaction():
                _seed_reference(conn)
            print("seed-real: cited organizations, the seeder and 4 Eastern Visayas sites (owner role)")

    with psycopg.connect(app_url, row_factory=dict_row, prepare_threshold=None) as conn:
        if not conn.execute("SELECT 1 FROM evidence_item WHERE id = %s", (evidence_id("F1", 1),)).fetchone():
            with conn.transaction():
                for items in GROUND.values():
                    for ev in items:
                        insert_evidence(conn, ev)
            print("seed-real: ground evidence known before the promises (app role)")
        if conn.execute("SELECT 1 FROM promise_record WHERE id = %s", (RECORD["F1"],)).fetchone():
            print("seed-real: records already present, skipping")
            return
        missing = _missing_history(conn)
        if missing:
            print(f"seed-real: no GMW history yet for {missing}; run data/ingest/gmw_ingest.py --sites-only and "
                  "data/ingest/s2_ingest.py, then db/apply.py again to lock the records with the baseline")
            return
        with conn.transaction():
            _seed_records(conn)
    print("seed-real: 4 reconstructed records and their timelines via the ledger (app role)")
