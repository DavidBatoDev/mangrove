"""TC-016 (engine numbers match their equations) and TC-004 (three answers, no score). docs/tests.md §7."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from engine import constants as C
from engine import equations as E
from engine.pin import pin_state
from engine.status import outcome_check, site_answers, work_check

from conftest import SITE

T0 = datetime(2026, 10, 1, tzinfo=timezone.utc)


def item(id_, question, finding, usable=True, source_type="field", created_at=T0, **extra):
    return {"id": id_, "question": question, "finding": finding, "usable": usable,
            "source_type": source_type, "created_at": created_at, "metrics": [], **extra}


# --- TC-016 ------------------------------------------------------------------------------------------

def test_eq001_and_eq010_geodesic_area_of_the_b_mapped_boundary(owner_conn):
    """The demo partner's mapped boundary inside B is 5.00 ha by ST_Area on geography."""
    geo = json.loads((Path(__file__).resolve().parents[2] / "data/sites/demo/B-mapped-boundary-5ha.geojson").read_text())
    geom = json.dumps(geo["features"][0]["geometry"])
    area = owner_conn.execute(
        "SELECT ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)::geography) / 10000 AS ha", (geom,)
    ).fetchone()["ha"]
    assert E.eq010_mapped_area(area) == {"value": 5.0, "unit": "ha", "eq_id": "EQ-010", "confidence": "medium"}


def test_eq001_site_areas_are_geodesic_hectares(client):
    props = {f["properties"]["id"]: f["properties"] for f in client.get("/api/v1/sites").json()["features"]}
    for sid in SITE.values():
        area = props[sid]["area"]
        assert area["eq_id"] == "EQ-001" and area["unit"] == "ha" and area["confidence"] == "high"
        assert area["value"] > 0
    # The prep check in EPSG:32651 gave 31.86 ha for B; geodesic must agree within 1 %.
    assert props[SITE["B"]]["area"]["value"] == pytest.approx(31.86, rel=0.01)


def test_eq009_area_discrepancy_8_vs_5_is_a_conflict():
    r = E.eq009_area_discrepancy(8.0, 5.0)
    assert r["d"] == pytest.approx(0.375)
    assert r["conflict"] is True
    assert r["metric"] == {"value": True, "unit": "flag", "eq_id": "EQ-009", "confidence": "low"}
    assert E.eq009_area_discrepancy(8.0, 7.0)["conflict"] is False  # 0.125 <= 0.20
    assert E.eq009_area_discrepancy(10.0, 8.0)["conflict"] is False  # exactly the tolerance is not a conflict


def test_eq003_history_threshold():
    site = 30.0
    assert E.eq003_history({2000: 3.0, 2010: 1.0}, site)["finding"] == "mangrove_recorded"  # 0.10 >= 0.10
    r = E.eq003_history({2000: 2.0, 2010: 2.5}, site)
    assert r["finding"] == "no_mangrove_recorded" and r["y_max"] == 2010
    assert all(m["eq_id"] == "EQ-003" and m["confidence"] == "medium" for m in r["metrics"])


def test_eq005_and_eq006_sentinel_rules():
    assert E.eq005_valid_fraction(100, 0, 50)["usable"] is True
    low = E.eq005_valid_fraction(100, 20, 30)  # 30 / 80
    assert low["usable"] is False and low["unusable_reason"] == "too few cloud-free pixels"
    assert E.eq006_current(10, 5, 3)["finding"] == "mostly_vegetation"
    tie = E.eq006_current(5, 5, 1)
    assert tie["usable"] is False and tie["unusable_reason"] == "no dominant class"


def test_eq002_pixel_area_and_eq012():
    # ~0.0899 ha at the equator for a 0.000269469° pixel
    assert E.eq002_pixel_area_ha(0.0) == pytest.approx(0.0897, rel=0.01)
    assert E.eq012_outcome(5.7, 7.0) == "recovery_seen"  # 5.7 >= 7 × 0.8
    assert E.eq012_outcome(5.5, 7.0) == "no_recovery_seen"


def test_eq013_counts_only_usable_items():
    answers = site_answers([item(1, "ground", "open_for_restoration"),
                            item(2, "ground", None, usable=False, unusable_reason="x")])
    ground = answers[2]
    assert ground["source_count"] == {"value": 1, "unit": "items", "eq_id": "EQ-013", "confidence": "high"}
    assert ground["evidence_ids"] == ["1"]


def test_constants_match_methods_doc():
    assert (C.HISTORY_MIN_FRACTION, C.MIN_VALID_FRACTION, C.S2_WINDOW_DAYS, C.AREA_TOLERANCE) == (0.10, 0.50, 90, 0.20)


def test_work_check_area_conflict_and_br004_pin():
    report = item("r", "work", "work_done", source_type="project_report",
                  metrics=[{"name": "reported_area", "value": 8.0, "unit": "ha", "eq_id": None, "confidence": "low"}])
    field = item("f", "work", "work_done", mapped_area_ha=5.0)
    check = work_check([report, field])
    assert check["status"] == "conflicting"
    assert check["reported_area"]["value"] == 8.0 and check["measured_area"]["eq_id"] == "EQ-010"
    assert check["area_conflict"]["value"] is True

    early = outcome_check([], date(2029, 10, 1), today=date(2026, 10, 4))
    assert early["status"] == "too_early" and early["checkable_from"] == "2029-10-01"

    calm = [{"status": "supported"}] * 3
    assert pin_state([check, early], calm) == "conflict"
    assert pin_state([work_check([]), early], calm) == "awaiting"
    assert pin_state([{"status": "supported"}, {"status": "supported"}], calm) == "on_track"
    assert pin_state([{"status": "supported"}, {"status": "supported"}],
                     [{"status": "conflicting"}]) == "conflict"


# --- TC-004 ------------------------------------------------------------------------------------------

def _keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _keys(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _keys(v)


def test_three_answers_in_order_with_honest_status():
    answers = site_answers([
        item(1, "ground", "open_for_restoration"),
        item(2, "ground", "active_fishpond"),
        item(3, "history", "mangrove_recorded", source_type="gmw"),
    ])
    assert [a["question"] for a in answers] == ["history", "current", "ground"]
    assert [a["status"] for a in answers] == ["supported", "missing", "conflicting"]
    assert answers[1]["finding"] is None  # missing shows no finding
    assert sorted(answers[2]["disagreeing_evidence_ids"]) == ["1", "2"]


def test_no_score_rank_or_probability_anywhere(client):
    for sid in SITE.values():
        body = client.get(f"/api/v1/sites/{sid}").json()
        assert [a["question"] for a in body["answers"]] == ["history", "current", "ground"]
        assert all(a["status"] in ("supported", "conflicting", "missing") for a in body["answers"])
        forbidden = {"score", "rank", "probability", "success_score"}
        assert forbidden.isdisjoint(set(_keys(body)))
