"""Real, sourced Post-Yolanda (MBFDP) records in Eastern Visayas (ADR-055). Called by db/seed.py.

Every value below comes from docs/case-study-yolanda.md and carries its source number [n]; nothing is invented.
Items in that file's §11 "Not found" go in known_unknowns, never in a finding. Nobody is named: organizations
appear only as the cited funder or partner. The four records are reconstructed on the seed date from public
sources; they were not locked at the time, and each record says so.

Stages, each skipped when already done (append-only, so a bad seed needs --reset):
1. owner role: organizations, the seeder account (cannot sign in) and the four sketched sites;
2. app role: the ground items known before each promise (they go into the lock-time snapshot);
3. app role: the records and their timelines, only once every real site has its GMW history item, so the
   snapshot carries the real baseline. Run data/ingest/gmw_ingest.py --sites-only first, then apply again.
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
SEEDER = UUID("00000000-0000-4000-8000-00000000c101")
KEYS = ("F1", "F2", "F3", "F4")
SITE = {k: UUID(f"00000000-0000-4000-8000-0000000000{k.lower()}") for k in KEYS}
RECORD = {k: UUID(f"00000000-0000-4000-8000-0000000001{k.lower()}") for k in KEYS}

RECONSTRUCTED = ("Reconstructed on 2026-10-04 from public sources; this record was not locked at the time, so its "
                 "hash proves only that the reconstruction has not changed since.")

# Short names for the case-study source numbers, so record text cites readably instead of "[n]".
CITE = {
    3: "PENRO Occidental Mindoro", 4: "Inquirer, Nov 2013", 5: "Inquirer, Nov 2013", 10: "Inquirer, Jun 2014",
    11: "Inquirer Opinion, Jun 2014", 20: "Ormoc report, State of the Mangrove Summit 2019",
    21: "Leyte report, State of the Mangrove Summit 2019", 22: "Eastern Samar report, State of the Mangrove Summit 2019",
    25: "Marine Pollution Bulletin, 2016", 29: "VERA Files, 2026", 31: "Mongabay, 2025",
    32: "Climate Tracker Asia, 2022",
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
    3: ("PENRO Occidental Mindoro, “Mangrove and Beach Forest Development Program”", "undated",
        "https://penrooccidentalmindoro.gov.ph/mangove-and-beach-forest-development-program/"),
    10: ("Inquirer, “Gov't study shows 'Yolanda' damage to mangroves bigger than reported”", "2014-06-02",
         "https://newsinfo.inquirer.net/?p=607594"),
    11: ("Inquirer Opinion, “Mangroves of E. Visayas need protection”", "2014-06-15",
         "https://opinion.inquirer.net/75597/mangroves-of-e-visayas-need-protection"),
    18: ("Proceedings of the 3rd National Mangrove Conference, Iloilo City", "2018-04",
         "https://cms.zsl.org/sites/default/files/2023-02/15%20Proceedings%20NATMANCON%203%202018.pdf"),
    20: ("Ateneo de Manila University, “State of the Mangrove Summit: Central and Eastern Visayas Proceedings”", "2019",
         "https://mangroveecology.com/wp-content/uploads/2019/03/3.-state-of-the-mangrove.pdf"),
    21: ("State of the Mangrove Summit, “State of the Mangrove in Leyte”", "2019",
         "https://www.academia.edu/87539308/State_of_the_Mangrove_in_Leyte"),
    22: ("State of the Mangrove Summit, “State of the Mangrove in Eastern Samar”", "2019",
         "https://www.academia.edu/87539309/State_of_the_Mangrove_in_Eastern_Samar"),
    23: ("State of the Mangrove Summit, “Synthesis”", "2019",
         "https://mangroveecology.com/wp-content/uploads/2019/03/6.-synthesis.pdf"),
    25: ("Marine Pollution Bulletin 109, “Preliminary assessment of post-Haiyan mangrove damage and short-term "
         "recovery in Eastern Samar”", "2016", "https://restoration.elti.yale.edu/node/86314"),
    29: ("VERA Files, “The Last Guardians of Paraiso”", "2026-09-24",
         "https://verafiles.org/articles/the-last-guardians-of-paraiso"),
    31: ("Mongabay, “Philippine mangroves survived a typhoon, but now confront a human-made challenge”", "2025-12",
         "https://news.mongabay.com/2025/12/philippine-mangroves-survived-a-typhoon-but-now-confront-a-human-made-challenge/"),
    32: ("Climate Tracker Asia, “Guiuan coastal folks turn to mangroves, seawall for protection”", "2022-11-10",
         "https://climatetracker.asia/guiuan-coastal-folks-turn-to-mangroves-seawall-for-protection/"),
}

NATIONWIDE = "Program-wide figure across 43 provinces with no published method; not measured at this site."
LEYTE_RANGE = "Province-wide range that spans both outcomes; the source says the figures need field validation."


def quoted(name: str, value: float, unit: str) -> dict:
    """EQ-017: a figure read as published, never computed. Low (DS-009)."""
    return {"name": name, "value": value, "unit": unit, "eq_id": "EQ-017", "confidence": "low"}


def item(key: str, n: int, ref: int, question: str, finding: str | None, observed: tuple[datetime, datetime],
         words: str, limitation: str, metrics: list | None = None, unusable_reason: str | None = None) -> dict:
    name, published, url = SOURCES[ref]
    usable = unusable_reason is None
    method = (f"Quoted from a public report, not measured by Mangrove (EQ-017, DS-009). "
              + (f"Finding picked from the fixed list (PRD §4.1) because the source says: {words}" if usable
                 else f"The source says: {words} No finding is taken from it."))
    return {
        "id": evidence_id(key, n), "site_id": SITE[key], "question": question, "source_type": "public_report",
        "source_name": name, "source_version": f"Published {published} (case study source {ref})",
        "observed_from": observed[0], "observed_to": observed[1], "finding": finding if usable else None,
        "usable": usable, "unusable_reason": unusable_reason, "metrics": metrics or [], "method": method,
        "limitation": limitation, "provenance_url": url, "is_demo": False,
    }


# --- what was known before each promise: site evidence, part of the lock-time snapshot ---------------------
GROUND = {
    "F1": [item("F1", 1, 11, "ground", "open_for_restoration", (ts(2014, 1), ts(2014, 3, 31)),
                "“total mortality” at only three of 14 surveyed sites, one of them Barangay 83a in Tacloban, and "
                "planting should be limited to those three sites.",
                "One independent survey in Jan and Mar 2014, reported in an opinion piece; Barangay 83a is named, "
                "not mapped, so the match to this polygon is by barangay.")],
    "F2": [],
    "F3": [],
    "F4": [item("F4", 1, 10, "ground", "open_for_restoration", (ts(2014, 4, 20), ts(2014, 5, 3)),
                "DENR's research bureau counted 1,696 hectares of mangrove damaged in Eastern Samar.",
                "Province-wide count by the program's own research bureau; the damaged stands are not mapped, so "
                "whether this patch was among them is unknown.",
                [quoted("damaged_area_eastern_samar", 1696, "ha")]),
           item("F4", 2, 25, "ground", "existing_mangrove", (ts(2016), ts(2016)),
                "natural stands in Eastern Samar showed short-term recovery after the typhoon, recovering within "
                "18 months.",
                "Province-level study dated to its publication year (2016); survey plots are not this polygon.")],
}

# --- what happened after: appended to each record's timeline, oldest first ---------------------------------
TIMELINE = {
    "F1": [item("F1", 2, 29, "work", "work_done", (ts(2014), ts(2014, 12, 31)),
                "the barangay led mangrove planting from 2014 with DENR support, about 15 workers paid ₱8 per "
                "seedling potted and ₱7 per seedling outplanted, and replanted after two typhoons that year.",
                "Journalistic account; worker numbers and pay are as reported, not audited."),
           item("F1", 3, 31, "work", "work_done", (ts(2015), ts(2018, 12, 31)),
                "about 30,000 seedlings were planted on roughly 4 hectares between 2015 and 2018.",
                "Reported figures; the planted boundary is not published.",
                [quoted("reported_area", 4, "ha"), quoted("seedlings_planted", 30000, "seedlings")]),
           item("F1", 4, 31, "outcome", "recovery_seen", (ts(2023), ts(2023, 12, 31)),
                "Paraiso's mangrove cover reached 3.6 ha by 2023, above the 1.9 ha before the typhoon.",
                "Cover figures from a published study as reported by the article; method in the study, not here.",
                [quoted("mangrove_cover_2023", 3.6, "ha"), quoted("mangrove_cover_before_typhoon", 1.9, "ha")])],
    "F2": [item("F2", 1, 21, "work", "work_done", (ts(2017, 9), ts(2018, 11, 30)),
                "70 hectares in Cancabato Bay over 14 months, with ₱28.8 million from DENR Region 8, the "
                "fisheries bureau and the Environmental Management Bureau.",
                "Government-reported activity in a summit chapter; the 70 ha boundary is not published.",
                [quoted("reported_area", 70, "ha"), quoted("reported_budget", 28.8, "million PHP")]),
           item("F2", 2, 21, "outcome", None, (ts(2019), ts(2019, 12, 31)),
                "“Many failed due to improper implementation, but some succeeded.”",
                "Leyte-wide statement; it does not say which sites.",
                unusable_reason="Leyte-wide statement that reports both outcomes and names no site."),
           item("F2", 3, 23, "outcome", None, (ts(2019), ts(2019, 12, 31)),
                "survival in Leyte ranged from 0% to 100%, with “no standard monitoring protocol”.",
                "Not limited to MBFDP sites; the source says the figures “need field validation”.",
                [quoted("reported_survival_leyte_min", 0, "%"), quoted("reported_survival_leyte_max", 100, "%")],
                unusable_reason=LEYTE_RANGE)],
    "F3": [item("F3", 1, 20, "work", "work_done", (ts(2015), ts(2017, 12, 31)),
                "Ormoc recorded an MBFDP site of 105 hectares in 8 parcels, 2015-2017, and switched from "
                "Rhizophora to Avicennia and Sonneratia.",
                "Summit proceedings; parcel locations are not published, so the polygon is a stand-in.",
                [quoted("reported_area", 105, "ha"), quoted("reported_parcels", 8, "parcels")]),
           item("F3", 2, 18, "outcome", None, (ts(2016, 2), ts(2016, 5, 31)),
                "DENR's survival check found 78.3% for mangrove and 76.3% for beach forest.",
                "DENR's own figure, taken within months of planting, method unpublished.",
                [quoted("reported_survival_mangrove", 78.3, "%")], unusable_reason=NATIONWIDE),
           item("F3", 3, 23, "outcome", None, (ts(2019), ts(2019, 12, 31)),
                "survival in Leyte ranged from 0% to 100%, with “no standard monitoring protocol”.",
                "Not limited to MBFDP sites; the source says the figures “need field validation”.",
                [quoted("reported_survival_leyte_min", 0, "%"), quoted("reported_survival_leyte_max", 100, "%")],
                unusable_reason=LEYTE_RANGE)],
    "F4": [item("F4", 3, 22, "work", "work_done", (ts(2014), ts(2016, 12, 31)),
                "about 2,553 hectares in Eastern Samar were planted and monitored by local community or people's "
                "organization members.",
                "Province-level figure; this patch stands in for it and is not a published site boundary.",
                [quoted("reported_area_eastern_samar", 2553, "ha")]),
           item("F4", 4, 18, "outcome", None, (ts(2016, 2), ts(2016, 5, 31)),
                "DENR's survival check found 78.3% for mangrove and 76.3% for beach forest.",
                "DENR's own figure, taken within months of planting, method unpublished.",
                [quoted("reported_survival_mangrove", 78.3, "%")], unusable_reason=NATIONWIDE),
           item("F4", 5, 23, "outcome", None, (ts(2019), ts(2019, 12, 31)),
                "average survival in Samar was 25%, with “no standard monitoring protocol”.",
                "Not limited to MBFDP sites; Mangrove does not turn a quoted rate into a finding.",
                [quoted("reported_survival_samar", 25, "%")],
                unusable_reason="Province-wide rate; the source says the figures need field validation."),
           item("F4", 6, 32, "outcome", "recovery_seen", (ts(2020), ts(2020, 12, 31)),
                "in Bungtod, 104.39 hectares were recovering as of 2020, after resident-led planting.",
                "Journalistic account citing a local figure; the recovering area is not mapped.",
                [quoted("recovering_area_bungtod", 104.39, "ha")])],
}

GOALS = ("DENR's stated goals for the program: a “coastal greenbelt” that would also support fishing and "
         "ecotourism, with 80% of funds going to cash-for-work for typhoon survivors [4], and storm protection [5]. "
         "No site-level target was published.")
NOT_FOUND = ("Not published: the MBFDP agreement text, daily wage and any survival condition on payment; per-site "
             "survival for Eastern Visayas MBFDP plots; an independent program-wide survival rate.")

RECORDS = {
    "F1": dict(
        rationale="Barangay 83 (Paraiso) was one of three places where a 2014 independent survey found total "
                  "mangrove mortality [11]; the barangay led replanting with DENR support [29].",
        planned_action="planting",
        planned_action_detail="Mangrove planting by residents on cash-for-work, paid per seedling (₱8 potted, ₱7 "
                              "outplanted) [29]; about 30,000 seedlings on roughly 4 ha, 2015-2018 [31].",
        planned_area_ha=4.0, work_check_after=date(2019, 1, 1), outcome_check_after=date(2022, 1, 1),
        known_unknowns="Whether the 2014 Paraiso planting was paid from MBFDP money is not stated; the first MBFDP "
                       "release came in February 2015 [3]. " + NOT_FOUND + " The polygon is the OpenStreetMap "
                       "mangrove stand in Barangay 83, not the planted boundary. " + RECONSTRUCTED,
    ),
    "F2": dict(
        rationale="DENR Region 8 reported a 70 ha Cancabato Bay planting in the 2017-2018 Leyte phase [21], on the "
                  "bay where Paraiso sits [31].",
        planned_action="planting",
        planned_action_detail="70 ha over 14 months with ₱28.8 million from DENR Region 8, the fisheries bureau and "
                              "the Environmental Management Bureau [21].",
        planned_area_ha=70.0, work_check_after=date(2018, 12, 1), outcome_check_after=date(2021, 12, 1),
        known_unknowns="The 70 ha boundary and the partner organizations are not published; the polygon is the "
                       "OpenStreetMap-mapped wetland on the bay shore. " + NOT_FOUND + " " + RECONSTRUCTED,
    ),
    "F3": dict(
        rationale="Ormoc's mangrove report records an MBFDP site of 105 ha in 8 parcels, 2015-2017 [20].",
        planned_action="planting",
        planned_action_detail="Planting across 8 parcels; the city switched from Rhizophora to Avicennia and "
                              "Sonneratia [20].",
        planned_area_ha=105.0, work_check_after=date(2018, 1, 1), outcome_check_after=date(2021, 1, 1),
        known_unknowns="The parcel locations and the organization that held the work are not published; the same "
                       "report names the Naungan-San Juan Mangrove Planters Association but does not say it held "
                       "the MBFDP work [20], and the polygon is OpenStreetMap-mapped mangrove at Naungan. "
                       + NOT_FOUND + " " + RECONSTRUCTED,
    ),
    "F4": dict(
        rationale="Eastern Samar, where Yolanda made landfall, received about 2,553 ha of MBFDP planting [22]. "
                  "Independent scientists had found natural stands recovering [25] and put the need for replanting "
                  "in Leyte and Eastern Samar at 100-200 ha [11].",
        planned_action="planting",
        planned_action_detail="Planting and monitoring by local community or people's organization members [22]. "
                              "The area shown is the Bungtod figure reported in [32] (104.39 ha); no per-site "
                              "planned area was published, and the province figure is 2,553 ha [22].",
        planned_area_ha=104.39, work_check_after=date(2016, 2, 1), outcome_check_after=date(2019, 2, 1),
        known_unknowns="Which organizations held the Eastern Samar work, and whether the resident-led Bungtod "
                       "planting [32] was MBFDP-funded, are not published. The polygon is the 2010 Global Mangrove "
                       "Watch patch south of Bungtod, a stand-in for the province program. "
                       + NOT_FOUND + " " + RECONSTRUCTED,
    ),
}


def _features() -> dict[str, dict]:
    fc = json.loads((ROOT / "data/sites/real/yolanda.geojson").read_text(encoding="utf-8"))
    return {f["properties"]["site_id"]: f for f in fc["features"]}


def _seed_reference(conn: psycopg.Connection) -> None:
    conn.execute(
        """INSERT INTO organization (id, name, kind, is_demo) VALUES
           (%s, 'Department of Environment and Natural Resources (DENR)', 'funder', false),
           (%s, 'Barangay Local Government of Paraiso (Barangay 83), Tacloban', 'partner', false),
           (%s, 'Mangrove case reconstruction', 'funder', false)""",
        (DENR, PARAISO_LGU, CASE_DESK),
    )
    # The seeder writes the reconstructed records; nobody knows its password, so it cannot sign in.
    conn.execute(
        """INSERT INTO app_user (id, org_id, email, display_name, role, password_hash)
           VALUES (%s, %s, 'case-desk@mangrove.invalid', 'Case reconstruction (seed)', 'funder', %s)""",
        (SEEDER, CASE_DESK, PasswordHasher().hash(secrets.token_urlsafe(32))),
    )
    for key, f in sorted(_features().items()):
        p = f["properties"]
        assert UUID(p["id"]) == SITE[key], f"fixed id mismatch for real site {key}"
        conn.execute(
            """INSERT INTO site (id, name, region, geom, proposal_summary, proposed_by_org_id, is_demo)
               VALUES (%s, %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)), %s, %s, false)""",
            (SITE[key], p["name"], REGION, json.dumps(f["geometry"]), cite(p["case_note"]),
             PARAISO_LGU if key == "F1" else None),
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
        fields = dict(text, site_id=SITE[key], funder_org_id=DENR, created_by_user_id=SEEDER,
                      expected_outcome=cite(GOALS), expected_vegetated_ha=None, is_demo=False)
        create_record(conn, fields, snapshot, idempotency_key=f"seed-real-record-{key.lower()}", record_id=RECORD[key])
        for ev in TIMELINE[key]:
            insert_evidence(conn, ev)
            append_event(conn, RECORD[key], "evidence_added", SEEDER, evidence_item_id=ev["id"])


def run(owner_url: str, app_url: str) -> None:
    with psycopg.connect(owner_url, row_factory=dict_row) as conn:
        if not conn.execute("SELECT 1 FROM site WHERE id = %s", (SITE["F1"],)).fetchone():
            with conn.transaction():
                _seed_reference(conn)
            print("seed-real: DENR, Paraiso LGU, the seeder and 4 Eastern Visayas sites (owner role)")

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
            print(f"seed-real: no GMW history yet for {missing}; run data/ingest/gmw_ingest.py --sites-only, "
                  "then db/apply.py again to lock the records with the baseline in their snapshot")
            return
        with conn.transaction():
            _seed_records(conn)
    print("seed-real: 4 reconstructed records and their timelines via the ledger (app role)")
