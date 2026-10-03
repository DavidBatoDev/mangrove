"""TC-034: public writes with no accounts (ADR-061). API-008 evidence and API-009 lock; submitter shown, email private.

Writes go to the Neon test branch only (conftest). Rows are append-only, so tests use fresh idempotency keys and
assert on the items they created.
"""

from __future__ import annotations

import json
import uuid
from datetime import date, timedelta

import psycopg
import pytest

import conftest

from app import writes
from conftest import SITE
from ledger.hashing import evidence_hash, record_hash

WHO = {"name": "Test Submitter", "organisation": "Test Barangay Council", "role": "resident",
       "contact_email": "private.person@example.org"}
POINT = {"type": "Point", "coordinates": [120.74, 14.79]}


def purge_test_submissions() -> None:
    """Remove only rows these tests created (submitter "Test Submitter") from the TEST branch.

    The tables are append-only (BR-002): the owner turns the triggers off and back on inside this one transaction,
    so they are never off for anyone else. Never point this at the demo database.
    """
    with psycopg.connect(conftest._test_owner) as conn, conn.transaction():
        for t in ("evidence_item", "promise_record", "record_event"):
            conn.execute(f"ALTER TABLE {t} DISABLE TRIGGER USER")
        conn.execute("""DELETE FROM record_event WHERE record_id IN (SELECT id FROM promise_record WHERE funder_name = %s)
                        OR evidence_item_id IN (SELECT id FROM evidence_item WHERE submitter_name = %s)""", (WHO["name"],) * 2)
        conn.execute("DELETE FROM promise_record WHERE funder_name = %s", (WHO["name"],))
        conn.execute("DELETE FROM evidence_item WHERE submitter_name = %s", (WHO["name"],))
        for t in ("evidence_item", "promise_record", "record_event"):
            conn.execute(f"ALTER TABLE {t} ENABLE TRIGGER USER")


@pytest.fixture(scope="module", autouse=True)
def _clean_test_branch():
    yield
    purge_test_submissions()


@pytest.fixture(autouse=True)
def _no_limits():
    writes._hits.clear()
    yield
    writes._hits.clear()


def _evidence(**over):
    body = {"site_id": SITE["C"], "question": "ground", "finding": "open_for_restoration",
            "observed_at": date.today().isoformat(), "point": POINT, "note": "TC-034 public evidence",
            "submitter": WHO}
    body.update(over)
    return body


def test_tc034_public_evidence_is_stored_with_submitter_and_private_email(client):
    r = client.post("/api/v1/evidence", json=_evidence())
    assert r.status_code == 201, r.text
    ev = r.json()["evidence"]
    assert ev["source_type"] == "field" and ev["finding"] == "open_for_restoration"
    assert ev["submitted_by"] == {"name": "Test Submitter", "organisation": "Test Barangay Council", "role": "resident"}
    dossier = client.get(f"/api/v1/sites/{SITE['C']}")
    assert any(e["id"] == ev["id"] for e in dossier.json()["evidence"])
    # The email is stored for follow-up but never leaves the server.
    assert "private.person@example.org" not in r.text and "private.person@example.org" not in dossier.text
    assert "contact_email" not in r.text


def test_tc034_funder_work_report_needs_reported_area(client):
    who = {**WHO, "role": "funder"}
    bad = client.post("/api/v1/evidence", json=_evidence(question="work", finding="work_done", point=None, submitter=who))
    assert bad.status_code == 422
    ok = client.post("/api/v1/evidence", json=_evidence(question="work", finding="work_done", point=None,
                                                        reported_area_ha=4.5, submitter=who))
    assert ok.status_code == 201, ok.text
    assert ok.json()["evidence"]["source_type"] == "project_report"


@pytest.mark.parametrize("over", [
    {"question": "current", "finding": "mostly_water"},  # satellite only
    {"finding": "work_done"},  # not in the ground vocabulary
    {"observed_at": (date.today() + timedelta(days=2)).isoformat()},
    {"point": None},  # a field observation needs its GPS point
    {"submitter": {**WHO, "name": "  "}},
    {"submitter": {**WHO, "contact_email": "not-an-email"}},
    {"submitter": {**WHO, "role": "admin"}},
])
def test_tc034_invalid_evidence_is_rejected(client, over):
    assert client.post("/api/v1/evidence", json=_evidence(**over)).status_code == 422


def test_tc034_rate_limit(client, monkeypatch):
    monkeypatch.setitem(writes.LIMITS, "evidence", (1, 3600))
    assert client.post("/api/v1/evidence", json=_evidence()).status_code == 201
    r = client.post("/api/v1/evidence", json=_evidence())
    assert r.status_code == 429 and r.json()["error"]["code"] == "RATE_LIMITED"


def _lock(site):
    return {"site_id": site, "rationale": "TC-034 public lock", "planned_action": "planting",
            "planned_action_detail": "Plant along the outer dike", "planned_area_ha": 3.0,
            "expected_outcome": "Seedlings established", "expected_vegetated_ha": 2.0,
            "work_check_after": "2027-04-01", "outcome_check_after": "2029-10-01",
            "known_unknowns": "Tenure of the outer ponds", "submitter": {**WHO, "role": "funder"}}


def test_tc034_public_lock_idempotent_verifiable_and_one_per_site(client, owner_conn):
    free = owner_conn.execute(
        "SELECT s.id FROM site s WHERE NOT EXISTS (SELECT 1 FROM promise_record r WHERE r.site_id = s.id) LIMIT 1"
    ).fetchone()
    if free is None:
        pytest.skip("every test site already has a promise; reset the test branch to rerun")
    key = str(uuid.uuid4())
    r = client.post("/api/v1/records", json=_lock(str(free["id"])), headers={"Idempotency-Key": key})
    assert r.status_code == 201, r.text
    rec = r.json()
    again = client.post("/api/v1/records", json=_lock(str(free["id"])), headers={"Idempotency-Key": key})
    assert again.status_code == 201 and again.json()["id"] == rec["id"]  # retry: same record
    other = client.post("/api/v1/records", json=_lock(str(free["id"])), headers={"Idempotency-Key": str(uuid.uuid4())})
    assert other.status_code == 422  # one promise per site
    detail = client.get(f"/api/v1/records/{rec['id']}").json()["record"]
    assert detail["funder"]["name"] == "Test Barangay Council"
    assert detail["locked_by"] == {"name": "Test Submitter", "organisation": "Test Barangay Council", "role": "funder"}
    assert "private.person@example.org" not in json.dumps(detail)
    assert client.get(f"/api/v1/records/{rec['id']}/verify").json()["intact"] is True
    # Public evidence on the record extends its timeline and still verifies.
    ev = client.post("/api/v1/evidence", json=_evidence(site_id=None, record_id=rec["id"], question="work",
                                                       finding="work_done", point=POINT))
    assert ev.status_code == 201, ev.text
    assert ev.json()["record_event"]["seq"] == 1
    v = client.get(f"/api/v1/records/{rec['id']}/verify").json()
    assert v["intact"] is True and v["events_checked"] == 1


def test_tc034_lock_needs_idempotency_key(client):
    assert client.post("/api/v1/records", json=_lock(SITE["D"])).status_code == 422


def test_tc034_old_rows_hash_as_before_and_submitter_is_hashed():
    base = {"site_id": "s", "question": "ground", "finding": "open_for_restoration", "usable": True}
    assert evidence_hash(base) == evidence_hash({**base, "submitter_name": None, "submitter_org": None,
                                                 "submitter_role": None, "contact_email": None})
    named = {**base, "submitter_name": "A", "submitter_role": "resident"}
    assert evidence_hash(named) != evidence_hash(base)
    assert evidence_hash(named) != evidence_hash({**named, "submitter_name": "B"})
    assert evidence_hash(named) == evidence_hash({**named, "contact_email": "x@example.org"})  # email never hashed
    rec = {"site_id": "s", "funder_org_id": "o", "rationale": "r"}
    assert record_hash(rec) == record_hash({**rec, "funder_name": None, "contact_email": None})
    assert record_hash({**rec, "funder_name": "A"}) != record_hash(rec)
