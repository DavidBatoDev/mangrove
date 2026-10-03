"""Integration cases on the P0 read path (docs/tests.md §6): TC-001, TC-002 shape, TC-007, TC-008, TC-010 shape,
TC-029, TC-030, TC-031, TC-032."""

from __future__ import annotations

import psycopg
import pytest

from conftest import REAL_RECORD, REAL_SITE, RECORD_A, SITE


def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_sites(client):
    """TC-001: five demo sites with their fixed ids, area by EQ-001, and is_demo; the real sites beside them (TC-030)."""
    body = client.get("/api/v1/sites").json()
    assert body["type"] == "FeatureCollection"
    props = [f["properties"] for f in body["features"]]
    assert {p["id"] for p in props if p["is_demo"]} == set(SITE.values())
    assert {p["id"] for p in props if not p["is_demo"]} == set(REAL_SITE.values())
    assert [p["name"] for p in props] == sorted(p["name"] for p in props)
    assert all(f["geometry"]["type"] == "MultiPolygon" for f in body["features"])
    assert client.get("/api/v1/sites", params={"region": "Nowhere"}).json()["features"] == []


def test_dossier_provenance(client):
    body = client.get(f"/api/v1/sites/{SITE['E']}").json()
    assert body["site"]["is_demo"] is True
    # History comes from the real GMW ingest (ADR-045): no mangrove inside E since 1985.
    assert [a["status"] for a in body["answers"]] == ["supported", "supported", "conflicting"]
    assert body["answers"][0]["finding"] == "no_mangrove_recorded"
    # "What's there now?" from the real Sentinel-2 ingest (data/ingest/s2_ingest.py): open water in the ponds.
    assert body["answers"][1]["finding"] == "mostly_water"
    assert sorted(e["source_type"] for e in body["evidence"]) == ["field", "gmw", "proposal", "sentinel2"]
    for e in body["evidence"]:
        for key in ("source_name", "observed_from", "retrieved_at", "method", "limitation", "content_hash"):
            assert e[key]
        assert len(e["content_hash"]) == 64
        # Demo ground items are labelled demo; the GMW and Sentinel-2 items are real data (BR-006).
        assert e["is_demo"] is (e["source_type"] not in ("gmw", "sentinel2"))
        assert "raw" not in e and "submitted_by_user_id" not in e  # internal fields stay internal


def test_compare_b_d_e(client):
    ids = ",".join([SITE["B"], SITE["D"], SITE["E"]])
    body = client.get("/api/v1/compare", params={"site_ids": ids}).json()
    assert [s["site"]["id"] for s in body["sites"]] == [SITE["B"], SITE["D"], SITE["E"]]
    ground = [s["answers"][2] for s in body["sites"]]
    assert [g["status"] for g in ground] == ["supported", "missing", "conflicting"]
    assert "evidence" not in body["sites"][0]


@pytest.mark.parametrize("ids", [[SITE["A"]], list(SITE.values()) + [SITE["A"]], []])
def test_compare_range(client, ids):
    """TC-007: fewer than 2 or more than 5 ids is COMPARE_RANGE."""
    r = client.get("/api/v1/compare", params={"site_ids": ",".join(ids)})
    assert r.status_code == 422 and r.json()["error"]["code"] == "COMPARE_RANGE"


def test_unknown_ids_use_the_error_envelope(client):
    for path in ("/api/v1/sites/00000000-0000-4000-8000-000000000999", "/api/v1/sites/not-a-uuid",
                 "/api/v1/records/00000000-0000-4000-8000-000000000999"):
        r = client.get(path)
        assert r.status_code == 404 and r.json()["error"]["code"] == "NOT_FOUND"
    r = client.get("/api/v1/compare", params={"site_ids": f"{SITE['A']},00000000-0000-4000-8000-000000000999"})
    assert r.status_code == 404


def test_records_and_record(client):
    pins = client.get("/api/v1/records").json()
    demo = [f for f in pins["features"] if f["properties"]["is_demo"]]
    assert [f["properties"]["id"] for f in demo] == [RECORD_A]
    p = demo[0]
    assert p["geometry"]["type"] == "Point" and p["properties"]["pin_state"] == "awaiting"
    assert p["properties"]["is_demo"] is True and p["properties"]["funder"] == "Demo Coastal Fund"

    rec = client.get(f"/api/v1/records/{RECORD_A}").json()
    assert [c["check"] for c in rec["checks"]] == ["work", "outcome"]
    assert rec["checks"][0]["status"] == "missing" and rec["checks"][1]["status"] == "too_early"
    assert rec["checks"][1]["checkable_from"] == "2029-10-01"
    assert rec["record"]["planned_area_ha"] == {"value": 10.0, "unit": "ha", "eq_id": None, "confidence": "high"}
    assert [a["question"] for a in rec["site_answers"]] == ["history", "current", "ground"]
    assert rec["disclaimer"].startswith("This record is not a certification")
    assert len(rec["record"]["snapshot"]["evidence"]) == 2

    v = client.get(f"/api/v1/records/{RECORD_A}/verify").json()
    assert v["intact"] is True and v["first_mismatch_seq"] is None


# --- TC-008 ------------------------------------------------------------------------------------------

@pytest.mark.parametrize("method", ["put", "patch", "delete"])
@pytest.mark.parametrize("path", [f"/api/v1/records/{RECORD_A}", f"/api/v1/records/{RECORD_A}/timeline/1",
                                  "/api/v1/evidence/00000000-0000-4000-8000-0000000e0a01", "/api/v1/records"])
def test_http_update_or_delete_is_405(client, method, path):
    r = client.request(method.upper(), path, json={"rationale": "changed"})
    assert r.status_code == 405 and r.json()["error"]["code"] == "RECORD_IMMUTABLE"


@pytest.mark.parametrize("statement", [
    "UPDATE evidence_item SET note = 'x' WHERE site_id = '00000000-0000-4000-8000-0000000000a0'",
    "DELETE FROM evidence_item WHERE site_id = '00000000-0000-4000-8000-0000000000a0'",
    f"UPDATE promise_record SET rationale = 'x' WHERE id = '{RECORD_A}'",
    f"DELETE FROM promise_record WHERE id = '{RECORD_A}'",
    "UPDATE record_event SET seq = seq",
    "DELETE FROM record_event",
])
def test_app_role_cannot_update_or_delete(rollback, statement):
    """Second layer (grant): the app role has no UPDATE or DELETE privilege at all."""
    with pytest.raises(psycopg.errors.InsufficientPrivilege, match="permission denied for table"):
        rollback.execute(statement)


@pytest.mark.parametrize("statement", [
    "UPDATE evidence_item SET note = 'x' WHERE site_id = '00000000-0000-4000-8000-0000000000a0'",
    f"DELETE FROM promise_record WHERE id = '{RECORD_A}'",
    "TRUNCATE record_event",
])
def test_trigger_blocks_even_the_owner(owner_conn, statement):
    """First layer (trigger): even the owner role cannot update or delete published rows."""
    owner_conn.rollback()
    try:
        with pytest.raises(psycopg.errors.InsufficientPrivilege, match="RECORD_IMMUTABLE"):
            owner_conn.execute(statement)
    finally:
        owner_conn.rollback()


# --- TC-025 ------------------------------------------------------------------------------------------

def test_gmw_context(client):
    """TC-025: per-site GMW series, the Philippines card, and the bay extent layer (F-025, ADR-045)."""
    t = client.get(f"/api/v1/sites/{SITE['B']}/gmw-timeline").json()
    assert [y["year"] for y in t["years"]] == list(range(1985, 2026))
    assert all(y["inside"]["eq_id"] == "EQ-002" and y["nearby"]["eq_id"] == "EQ-014" for y in t["years"])
    assert all(y["inside"]["confidence"] == "medium" for y in t["years"])
    assert t["years"][-1]["inside"]["value"] == pytest.approx(1.04, abs=0.05)  # the ~1 ha inside B in 2025
    assert t["nearby_buffer"]["value"] == 1000 and "1985" in t["limitation"]
    assert t["source"]["version"] == "v4.1.12" and t["is_demo"] is True
    assert client.get("/api/v1/sites/00000000-0000-4000-8000-000000000999/gmw-timeline").status_code == 404

    c = client.get("/api/v1/context/countries/PHL").json()
    assert c["name"] == "Philippines" and len(c["years"]) == 41
    first = c["years"][0]
    assert first["year"] == 1985 and first["gain"] is None and first["loss"] is None
    for y in c["years"]:
        ext = y["extent"]
        assert ext["eq_id"] == "EQ-015" and ext["lower"] <= ext["value"] <= ext["upper"]
    assert c["years"][1]["net"]["eq_id"] == "EQ-016"
    assert c["years"][1]["net"]["value"] == pytest.approx(c["years"][1]["gain"]["value"] - c["years"][1]["loss"]["value"], abs=0.02)
    assert client.get("/api/v1/context/countries/XYZ").status_code == 404

    layer = client.get("/api/v1/layers/gmw-extent", params={"year": 2025}).json()
    assert layer["type"] == "FeatureCollection" and layer["year"] == 2025 and len(layer["features"]) > 0
    assert layer["available_years"] == list(range(1985, 2026, 5))
    bad = client.get("/api/v1/layers/gmw-extent", params={"year": 1987})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "VALIDATION_FAILED"


# --- TC-029, TC-030 (ADR-056) ------------------------------------------------------------------------

def _public_report(**over):
    from datetime import datetime, timezone
    item = {"site_id": REAL_SITE["F1"], "question": "outcome", "source_type": "public_report",
            "source_name": "Test report", "observed_from": datetime(2023, 1, 1, tzinfo=timezone.utc),
            "observed_to": datetime(2023, 1, 1, tzinfo=timezone.utc), "finding": "recovery_seen", "usable": True,
            "method": "Quoted from a public report (EQ-017).", "limitation": "Test.",
            "provenance_url": "https://example.org/report", "is_demo": False}
    return {**item, **over}


def test_public_report_needs_its_source(rollback):
    """TC-029: a cited public report is stored; one without provenance_url is rejected by the CHECK."""
    from ledger.records import insert_evidence

    row = insert_evidence(rollback, _public_report())
    stored = rollback.execute("SELECT source_type::text AS t, is_demo FROM evidence_item WHERE id = %s",
                              (row["id"],)).fetchone()
    assert stored == {"t": "public_report", "is_demo": False}
    with pytest.raises(psycopg.errors.CheckViolation, match="ck_evidence_public_report_cited"):
        insert_evidence(rollback, _public_report(provenance_url=None))


@pytest.mark.parametrize("statement", [
    f"UPDATE evidence_item SET note = 'x' WHERE site_id = '{REAL_SITE['F4']}'",
    f"DELETE FROM promise_record WHERE id = '{REAL_RECORD['F1']}'",
])
def test_real_rows_are_append_only(owner_conn, statement):
    """TC-029: the trigger blocks changes to the real seeded rows too (BR-002)."""
    owner_conn.rollback()
    try:
        with pytest.raises(psycopg.errors.InsufficientPrivilege, match="RECORD_IMMUTABLE"):
            owner_conn.execute(statement)
    finally:
        owner_conn.rollback()


def test_real_records_read_as_the_sources_say(client):
    """TC-030: real sites in Eastern Visayas, pins as the cited sources say, every report linked, chains intact."""
    sites = {f["properties"]["id"]: f["properties"] for f in client.get("/api/v1/sites").json()["features"]}
    assert all(sites[i]["region"] == "Eastern Visayas" and sites[i]["is_demo"] is False for i in REAL_SITE.values())
    assert {f["properties"]["id"] for f in client.get(
        "/api/v1/sites", params={"region": "Eastern Visayas"}).json()["features"]} == set(REAL_SITE.values())

    pins = {f["properties"]["id"]: f["properties"] for f in client.get("/api/v1/records").json()["features"]}
    expected = {"F1": "on_track", "F2": "awaiting", "F3": "on_track", "F4": "on_track"}
    for key, state in expected.items():
        assert pins[REAL_RECORD[key]]["pin_state"] == state, key
        assert pins[REAL_RECORD[key]]["is_demo"] is False

    for key, rid in REAL_RECORD.items():
        rec = client.get(f"/api/v1/records/{rid}").json()
        assert rec["record"]["is_demo"] is False and not rec["record"]["funder"]["is_demo"]
        assert "Reconstructed on 2026-10-04" in rec["record"]["known_unknowns"]
        assert rec["record"]["expected_vegetated_ha"] is None
        # "What's there now?" comes from one real Sentinel-2 item per site (data/ingest/s2_ingest.py, TC-032).
        assert rec["site_answers"][1]["status"] == "supported" and rec["site_answers"][1]["finding"]
        assert rec["disclaimer"].startswith("This record is not a certification")
        assert any(e["question"] == "history" for e in rec["record"]["snapshot"]["evidence"])  # GMW baseline locked in
        for entry in rec["timeline"]:
            e = entry["evidence"]
            assert e["source_type"] == "public_report" and e["provenance_url"].startswith("https://")
            assert e["is_demo"] is False and e["usable"] == (e["finding"] is not None)
            assert all(m["eq_id"] == "EQ-017" and m["confidence"] == "low" for m in e["metrics"])
        assert client.get(f"/api/v1/records/{rid}/verify").json()["intact"] is True

    f4 = client.get(f"/api/v1/records/{REAL_RECORD['F4']}").json()
    assert (f4["site_answers"][2]["status"], f4["site_answers"][2]["finding"]) == ("supported", "open_for_restoration")
    assert f4["checks"][1]["status"] == "supported" and f4["checks"][1]["source_count"]["value"] == 3
    f1 = client.get(f"/api/v1/records/{REAL_RECORD['F1']}").json()
    assert f1["record"]["funder"]["name"] == "Ministry of Foreign Affairs of Japan"  # not MBFDP (ADR-059)
    photos = [p for t in f1["timeline"] for p in t["evidence"].get("photos", [])]
    assert photos and all(p["url"].startswith("https://") and p["credit"] for p in photos)
    f2 = client.get(f"/api/v1/records/{REAL_RECORD['F2']}").json()
    assert f2["checks"][1]["status"] == "missing"  # no source states the 70 ha outcome; the rest is not usable
    assert f2["checks"][0]["reported_area"]["value"] == 70.0


# --- TC-031 (API-026) --------------------------------------------------------------------------------

def test_program_context_quotes_the_case_study(client):
    """TC-031: the Post-Yolanda program card: every figure EQ-017 · low, sourced, quoted verbatim from the case study."""
    from pathlib import Path

    case_study = (Path(__file__).resolve().parents[2] / "docs" / "case-study-yolanda.md").read_text(encoding="utf-8")
    p = client.get("/api/v1/context/programs/mbfdp")
    assert p.status_code == 200
    body = p.json()
    assert body["funder"] == "Department of Environment and Natural Resources (DENR)" and body["is_demo"] is False
    assert body["record_ids"] == [REAL_RECORD["F3"], REAL_RECORD["F4"]]  # the MBFDP records (ADR-059)
    figures = body["facts"] + body["target_history"]
    by_id = {f["id"]: f for f in figures}
    assert by_id["allocation"]["value"] == 1_000_000_000 and by_id["allocation"]["unit"] == "PHP"
    assert by_id["first_release"]["value"] == 400_000_000 and by_id["first_release"]["as_of"] == "2015-02-05"
    assert by_id["planted"]["value"] == 50417 and by_id["eastern_visayas"]["value"] == 13633
    assert by_id["survival_denr"]["value"] == 78.3 and by_id["unit_cost"]["value"] == 16500
    assert (by_id["need_independent"]["value"], by_id["need_independent"]["upper"]) == (100, 200)
    assert [t["value"] for t in body["target_history"]] == [27400, 41694, 50000]
    for f in figures:
        assert f["eq_id"] == "EQ-017" and f["confidence"] == "low", f["id"]
        assert f["quote"] in case_study, f["id"]
        assert f["source"]["url"].startswith("https://") and f["source"]["case_study_ref"], f["id"]
    assert all(item in case_study for item in body["not_found"])
    assert "How the remaining ₱600 million was released and spent" in body["not_found"]
    assert body["framing"]["quote"] in case_study
    assert "corruption" not in p.text.lower()
    assert client.get("/api/v1/context/programs/nope").status_code == 404
    assert client.get("/api/v1/context/programs/..%2Fgmw_country_PHL").status_code == 404


# --- TC-032 (API-014, Sentinel-2 pictures) -----------------------------------------------------------

def test_evidence_assets_serve_the_sentinel2_pictures(client):
    """TC-032: every current Sentinel-2 item's picture (and its "then" picture) is served by its own SHA-256."""
    import hashlib

    seen = 0
    for sid in [*SITE.values(), *REAL_SITE.values()]:
        for e in client.get(f"/api/v1/sites/{sid}").json()["evidence"]:
            # Only rows s2_ingest.py wrote (it always attaches a picture); the test branch is shared.
            if e["source_type"] != "sentinel2" or not e["asset_url"]:
                continue
            assert e["question"] == "current" and e["is_demo"] is False
            assert e["provenance_url"].startswith("https://earth-search.aws.element84.com/v1/collections/")
            assert "Contains modified Copernicus Sentinel data" in e["limitation"]
            assert all(m["confidence"] == "low" and m["eq_id"] in ("EQ-005", "EQ-006", "EQ-007") for m in e["metrics"])
            for url in filter(None, (e["asset_url"], e.get("asset_then_url"))):
                r = client.get(url)
                assert r.status_code == 200 and r.headers["content-type"] == "image/png"
                assert "immutable" in r.headers["cache-control"]
                assert hashlib.sha256(r.content).hexdigest() == url.rsplit("/", 1)[1]
                seen += 1
    assert seen > 0
    for bad in ("0" * 64, "not-a-hash", "A" * 64):
        r = client.get(f"/api/v1/assets/{bad}")
        assert r.status_code == 404 and r.json()["error"]["code"] == "NOT_FOUND"
    assert client.get("/api/v1/assets/..%2F..%2Fmain.py").status_code == 404  # never reaches the route
