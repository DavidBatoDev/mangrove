"""TC-015: verify recomputes the hash chain and catches a flipped byte (docs/tests.md §7, EQ-011)."""

from __future__ import annotations

import copy
import json
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID

from app import reads
from ledger.canonical import canonical_bytes, content_hash
from ledger.hashing import event_hash, evidence_hash, record_hash, verify_chain
from ledger.records import append_event, insert_evidence

from conftest import RECORD_A, SITE

PARTNER_USER = UUID("00000000-0000-4000-8000-00000000f102")
FUNDER_USER = UUID("00000000-0000-4000-8000-00000000f101")
TS = datetime(2027, 5, 1, tzinfo=timezone.utc)


def test_jcs_is_canonical():
    assert canonical_bytes({"b": 1.0, "a": [2, "x", None]}) == b'{"a":[2,"x",null],"b":1}'
    assert content_hash({"a": 1}) == content_hash({"a": 1.0})


def _chain():
    record = {"site_id": "s", "funder_org_id": "f", "created_by_user_id": "u", "rationale": "why",
              "planned_action": "planting", "planned_action_detail": "d", "planned_area_ha": 8.0,
              "expected_outcome": "o", "expected_vegetated_ha": 6.0, "work_check_after": date(2027, 4, 1),
              "outcome_check_after": date(2029, 10, 1), "known_unknowns": "k", "snapshot": {"x": 1},
              "is_demo": True, "published_at": TS}
    record["content_hash"] = record_hash(record)
    evidence = {"id": "e1", "site_id": "s", "question": "work", "finding": "work_done", "usable": True,
                "metrics": [], "created_at": TS}
    evidence["content_hash"] = evidence_hash(evidence)
    events, prev = [], record["content_hash"]
    for seq, (ev_id, body) in enumerate([("e1", None), (None, {"field": "rationale", "text": "fix"})], start=1):
        e = {"record_id": "r", "seq": seq, "kind": "evidence_added" if ev_id else "correction",
             "evidence_item_id": ev_id, "evidence_content_hash": evidence["content_hash"] if ev_id else None,
             "body": body, "created_by_user_id": "u", "created_at": TS, "prev_hash": prev}
        e["event_hash"] = event_hash(prev, e)
        prev = e["event_hash"]
        events.append(e)
    return record, events, {"e1": evidence}


def test_intact_chain_verifies():
    record, events, evidence = _chain()
    assert verify_chain(record, events, evidence) == {
        "intact": True, "content_hash": record["content_hash"], "events_checked": 2, "first_mismatch_seq": None}


def test_flipped_byte_in_the_record_is_seq_0():
    record, events, evidence = _chain()
    record = dict(record, rationale="whY")
    r = verify_chain(record, events, evidence)
    assert r["intact"] is False and r["first_mismatch_seq"] == 0


def test_flipped_byte_in_an_event_names_that_seq():
    record, events, evidence = _chain()
    events = copy.deepcopy(events)
    events[1]["body"]["text"] = "fiX"
    assert verify_chain(record, events, evidence)["first_mismatch_seq"] == 2


def test_altered_attached_evidence_names_its_event():
    record, events, evidence = _chain()
    evidence = {"e1": dict(evidence["e1"], finding="no_work_seen")}
    assert verify_chain(record, events, evidence)["first_mismatch_seq"] == 1


def test_flipped_byte_in_a_stored_hash_is_caught():
    record, events, evidence = _chain()
    events = copy.deepcopy(events)
    h = events[0]["event_hash"]
    events[0]["event_hash"] = ("0" if h[0] != "0" else "1") + h[1:]
    assert verify_chain(record, events, evidence)["first_mismatch_seq"] == 1


def test_seeded_record_verifies_from_the_database(app_conn):
    app_conn.rollback()
    r = reads.verify_record(app_conn, RECORD_A)
    assert r["intact"] is True and r["first_mismatch_seq"] is None


def test_appended_timeline_round_trips_through_the_database(rollback):
    """Append work evidence to the seeded record as the app role, read it back, verify; then roll back.

    Also the demo's red-pin path (TC-013 shape): 8 ha reported vs 5 ha mapped turns the check conflicting.
    """
    conn = rollback
    boundary = json.loads((Path(__file__).resolve().parents[2] / "data/sites/demo/B-mapped-boundary-5ha.geojson")
                          .read_text())["features"][0]["geometry"]
    report = insert_evidence(conn, {
        "site_id": UUID(SITE["A"]), "question": "work", "source_type": "project_report",
        "source_name": "Demo Coastal Fund project report", "observed_from": TS, "observed_to": TS,
        "finding": "work_done", "usable": True, "method": "Funder's project report",
        "limitation": "Self-reported claim", "submitted_by_user_id": FUNDER_USER,
        "metrics": [{"name": "reported_area", "value": 8.0, "unit": "ha", "eq_id": None, "confidence": "low"}],
    })
    field = insert_evidence(conn, {
        "site_id": UUID(SITE["A"]), "question": "work", "source_type": "field",
        "source_name": "Demo Bayside Partners field visit", "observed_from": TS, "observed_to": TS,
        "finding": "work_done", "usable": True, "method": "Partner mapped the worked area",
        "limitation": "Device GPS accuracy unknown", "location": boundary, "submitted_by_user_id": PARTNER_USER,
    })
    append_event(conn, RECORD_A, "evidence_added", FUNDER_USER, evidence_item_id=report["id"])
    append_event(conn, RECORD_A, "evidence_added", PARTNER_USER, evidence_item_id=field["id"])
    append_event(conn, RECORD_A, "correction", FUNDER_USER, body={"field": "rationale", "text": "Demo correction"})

    v = reads.verify_record(conn, RECORD_A)
    assert v == {**v, "intact": True, "events_checked": 3, "first_mismatch_seq": None}

    rec = reads.get_record(conn, RECORD_A, today=date(2027, 5, 2))
    work = rec["checks"][0]
    assert work["status"] == "conflicting"
    assert work["reported_area"]["value"] == 8.0
    assert work["measured_area"]["value"] == 5.0
    assert rec["pin_state"] == "conflict"
    assert [e["seq"] for e in rec["timeline"]] == [1, 2, 3]
