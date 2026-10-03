"""Demo seed straight from data/sites/README.md (the demo cast and fixed ids). Called by db/apply.py.

- Organizations, users and sites are written as the owner role (no API writes them).
- Evidence and the site-A record are written as the app role through the ledger, so the grants and the
  EQ-011 hashes are the real ones. Passwords are Argon2id hashes of DEMO_*_PASSWORD from the environment.
- No satellite evidence: history and current stay "missing" until real GMW / Sentinel-2 ingest (P1).
"""

from __future__ import annotations

import json
import os
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID

import psycopg
from argon2 import PasswordHasher
from psycopg.rows import dict_row

from app.reads import site_dossier_raw
from ledger.records import build_snapshot, create_record, insert_evidence

ROOT = Path(__file__).resolve().parents[1]
REGION = "Manila Bay"

FUNDER_ORG = UUID("00000000-0000-4000-8000-00000000f001")
PARTNER_ORG = UUID("00000000-0000-4000-8000-00000000f002")
FUNDER_USER = UUID("00000000-0000-4000-8000-00000000f101")
PARTNER_USER = UUID("00000000-0000-4000-8000-00000000f102")
SITE = {k: UUID(f"00000000-0000-4000-8000-0000000000{k.lower()}0") for k in "ABCDE"}
RECORD_A = UUID("00000000-0000-4000-8000-0000000001a0")

PROPOSAL_DATE = datetime(2026, 9, 15, tzinfo=timezone.utc)
FIELD_DATE = datetime(2026, 9, 28, 2, 0, tzinfo=timezone.utc)


def evidence_id(site: str, n: int) -> UUID:
    return UUID(f"00000000-0000-4000-8000-0000000e0{site.lower()}{n:02d}")


# Ground evidence per site (README "The demo cast"): (source_type, finding, note)
GROUND = {
    "A": [("proposal", "open_for_restoration", "Demo: the proposal states the pond compartments are disused and open for restoration."),
          ("field", "open_for_restoration", "Demo: outer dike breached, ponds drained at low tide, no stocking or feeding seen.")],
    "B": [("proposal", "open_for_restoration", "Demo: the proposal states the pond complex was abandoned after the outer dikes failed."),
          ("field", "open_for_restoration", "Demo: dikes broken in several places, tidal water flowing through, ponds not in use.")],
    "C": [("proposal", "open_for_restoration", "Demo: the proposal states the outer pond belt is open for restoration.")],
    "D": [],
    "E": [("proposal", "open_for_restoration", "Demo: the proposal states the coastal pond belt is open for restoration."),
          ("field", "active_fishpond", "Demo: ponds stocked and pumped, feeding platforms in use, sluice gates maintained.")],
}

PROPOSAL = dict(
    source_name="Site proposal (demo)",
    method="Proposer's statement in the site proposal; finding picked from the fixed ground list (PRD §4.1).",
    limitation="Self-reported by the proposer and not checked on the ground; a proposal can be out of date or optimistic.",
    observed_from=PROPOSAL_DATE, observed_to=PROPOSAL_DATE,
)
FIELD = dict(
    source_name="Demo Bayside Partners field visit",
    method="Partner site visit; finding picked from the fixed ground list (PRD §4.1).",
    limitation="One visit, self-reported by the partner; the GPS accuracy of the partner's device is unknown.",
    observed_from=FIELD_DATE, observed_to=FIELD_DATE,
    submitted_by_user_id=PARTNER_USER, submitted_by_org_id=PARTNER_ORG,
)

RECORD_A_FIELDS = dict(
    site_id=SITE["A"],
    funder_org_id=FUNDER_ORG,
    created_by_user_id=FUNDER_USER,
    rationale="Demo: dike-enclosed pond compartments next to a remaining mangrove stand; the proposal and the "
              "partner's field visit agree the ponds are open for restoration.",
    planned_action="natural_regeneration",
    planned_action_detail="Demo: open the outer dike in two places to restore tidal exchange and let propagules "
                          "from the neighbouring stand recolonise the compartments.",
    planned_area_ha=10.0,
    expected_outcome="Demo: natural mangrove regrowth across most of the treated compartments.",
    expected_vegetated_ha=7.0,
    work_check_after=date(2027, 4, 1),
    outcome_check_after=date(2029, 10, 1),
    known_unknowns="Demo: the lease status of each pond compartment and the sediment supply are not yet confirmed.",
    is_demo=True,
)


def _features() -> dict[str, dict]:
    fc = json.loads((ROOT / "data/sites/candidates.geojson").read_text(encoding="utf-8"))
    return {f["properties"]["site_id"]: f for f in fc["features"]}


def _seed_reference(conn: psycopg.Connection) -> None:
    ph = PasswordHasher()  # argon2-cffi default type is Argon2id
    funder_pw = os.environ.get("DEMO_FUNDER_PASSWORD")
    partner_pw = os.environ.get("DEMO_PARTNER_PASSWORD")
    if not funder_pw or not partner_pw:
        raise SystemExit("DEMO_FUNDER_PASSWORD and DEMO_PARTNER_PASSWORD must be set")
    conn.execute(
        "INSERT INTO organization (id, name, kind, is_demo) VALUES (%s, %s, 'funder', true), (%s, %s, 'partner', true)",
        (FUNDER_ORG, "Demo Coastal Fund", PARTNER_ORG, "Demo Bayside Partners"),
    )
    conn.execute(
        """INSERT INTO app_user (id, org_id, email, display_name, role, password_hash) VALUES
           (%s, %s, 'funder@demo.mangrove.test', 'Demo Funder', 'funder', %s),
           (%s, %s, 'partner@demo.mangrove.test', 'Demo Partner', 'partner', %s)""",
        (FUNDER_USER, FUNDER_ORG, ph.hash(funder_pw), PARTNER_USER, PARTNER_ORG, ph.hash(partner_pw)),
    )
    for key, f in sorted(_features().items()):
        p = f["properties"]
        assert UUID(p["id"]) == SITE[key], f"fixed id mismatch for site {key}"
        conn.execute(
            """INSERT INTO site (id, name, region, geom, proposal_summary, proposed_by_org_id, is_demo)
               VALUES (%s, %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)), %s, NULL, true)""",
            (SITE[key], p["name"], REGION, json.dumps(f["geometry"]),
             p.get("rationale_short") if GROUND[key] else None),
        )


def _seed_evidence_and_record(conn: psycopg.Connection) -> None:
    feats = _features()
    for key, items in GROUND.items():
        props = feats[key]["properties"]
        for n, (source_type, finding, note) in enumerate(items, start=1):
            base = PROPOSAL if source_type == "proposal" else FIELD
            item = dict(base, id=evidence_id(key, n), site_id=SITE[key], question="ground",
                        source_type=source_type, finding=finding, usable=True, note=note, is_demo=True)
            if source_type == "field":
                item["location"] = {"type": "Point", "coordinates": [props["centroid_lon"], props["centroid_lat"]]}
            insert_evidence(conn, item)

    d = site_dossier_raw(conn, SITE["A"])
    snapshot = build_snapshot(d["site"], d["_evidence"], d["answers"])
    create_record(conn, RECORD_A_FIELDS, snapshot, idempotency_key="seed-record-site-a", record_id=RECORD_A)


def run(owner_url: str, app_url: str) -> None:
    with psycopg.connect(owner_url, row_factory=dict_row) as conn:
        if conn.execute("SELECT 1 FROM site WHERE id = %s", (SITE["A"],)).fetchone():
            print("seed: demo sites already present, skipping")
            return
        with conn.transaction():
            _seed_reference(conn)
    print("seed: organizations, users and 5 sites (owner role)")

    with psycopg.connect(app_url, row_factory=dict_row, prepare_threshold=None) as conn:
        with conn.transaction():
            _seed_evidence_and_record(conn)
    print("seed: ground evidence and the site-A record via the ledger (app role)")
