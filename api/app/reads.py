"""Read functions shared by REST (docs/api.md §3) and the MCP tools (API-015). Database only; no Copernicus.

Statuses, pin states and areas are derived here on every read from append-only rows (BR-001, BR-004);
nothing derived is stored.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Iterable
from uuid import UUID

from psycopg import Connection

from engine import equations as E
from engine.pin import pin_state
from engine.status import outcome_check, site_answers, work_check
from ledger.canonical import normalize
from ledger.hashing import GEOJSON_PRECISION, verify_chain

from .errors import ApiError, not_found

DISCLAIMER = "This record is not a certification of restoration success or approval of funding."
COMPARE_MIN, COMPARE_MAX = 2, 5


def parse_uuid(value: str, what: str = "Not found") -> UUID:
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        raise not_found(what) from None


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


# --- sites -------------------------------------------------------------------------------------------

_SITE_SQL = f"""
SELECT s.id, s.name, s.region, s.proposal_summary, s.is_demo,
       ST_AsGeoJSON(s.geom, {GEOJSON_PRECISION})::json AS geometry,
       {E.EQ001_SQL.replace("geom", "s.geom")} AS area_ha,
       ST_X(ST_PointOnSurface(s.geom)) AS lon, ST_Y(ST_PointOnSurface(s.geom)) AS lat
FROM site s
"""


def _site_dto(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "region": row["region"],
        "is_demo": row["is_demo"],
        "geometry": row["geometry"],
        "area": E.eq001_area(row["area_ha"]),
        "proposal_summary": row["proposal_summary"],
    }


def _site_rows(conn: Connection, ids: list[UUID] | None = None, region: str | None = None) -> list[dict[str, Any]]:
    if ids is not None:
        return conn.execute(_SITE_SQL + " WHERE s.id = ANY(%s)", (ids,)).fetchall()
    if region:
        return conn.execute(_SITE_SQL + " WHERE s.region = %s ORDER BY s.name", (region,)).fetchall()
    return conn.execute(_SITE_SQL + " ORDER BY s.name").fetchall()


def list_sites(conn: Connection, region: str | None = None) -> dict[str, Any]:
    """API-004: GeoJSON FeatureCollection ordered by name."""
    features = []
    for row in _site_rows(conn, region=region):
        site = _site_dto(row)
        features.append({
            "type": "Feature",
            "geometry": site["geometry"],
            "properties": {"id": site["id"], "name": site["name"], "region": site["region"],
                           "is_demo": site["is_demo"], "area": site["area"]},
        })
    return {"type": "FeatureCollection", "features": features}


# --- evidence ----------------------------------------------------------------------------------------

_EVIDENCE_SQL = f"""
SELECT e.id, e.site_id, e.question::text AS question, e.source_type::text AS source_type, e.source_name,
       e.source_version, e.observed_from, e.observed_to, e.retrieved_at,
       ST_AsGeoJSON(e.location, {GEOJSON_PRECISION})::json AS location,
       e.finding, e.metrics, e.method, e.spatial_resolution_m, e.limitation, e.provenance_url,
       e.asset_sha256, e.asset_mime, e.raw, e.usable, e.unusable_reason, e.note,
       e.submitted_by_user_id, e.submitted_by_org_id, e.is_demo, e.created_at, e.content_hash,
       CASE WHEN GeometryType(e.location) IN ('POLYGON', 'MULTIPOLYGON')
            THEN {E.EQ010_SQL.replace("location", "e.location")} END AS mapped_area_ha,
       o.name AS submitted_by_org_name, o.is_demo AS submitted_by_org_is_demo
FROM evidence_item e
LEFT JOIN organization o ON o.id = e.submitted_by_org_id
"""


def _evidence_rows(conn: Connection, site_ids: list[UUID]) -> list[dict[str, Any]]:
    return conn.execute(
        _EVIDENCE_SQL + " WHERE e.site_id = ANY(%s) ORDER BY e.created_at DESC, e.id", (site_ids,)
    ).fetchall()


def _evidence_by_ids(conn: Connection, ids: list[UUID]) -> dict[str, dict[str, Any]]:
    if not ids:
        return {}
    rows = conn.execute(_EVIDENCE_SQL + " WHERE e.id = ANY(%s)", (ids,)).fetchall()
    return {str(r["id"]): r for r in rows}


def evidence_dto(row: dict[str, Any]) -> dict[str, Any]:
    """Public projection of an evidence item (docs/api.md API-005). Internal fields (raw, user id) are left out."""
    out = {
        "id": str(row["id"]),
        "question": row["question"],
        "source_type": row["source_type"],
        "source_name": row["source_name"],
        "source_version": row["source_version"],
        "observed_from": normalize(row["observed_from"]),
        "observed_to": normalize(row["observed_to"]),
        "retrieved_at": normalize(row["retrieved_at"]),
        "location": row["location"],
        "finding": row["finding"],
        "usable": row["usable"],
        "unusable_reason": row["unusable_reason"],
        "metrics": normalize(row["metrics"]),
        "method": row["method"],
        "spatial_resolution_m": normalize(row["spatial_resolution_m"]),
        "limitation": row["limitation"],
        "provenance_url": row["provenance_url"],
        "asset_url": f"/api/v1/assets/{row['asset_sha256']}" if row["asset_sha256"] else None,
        "note": row["note"],
        "submitted_by_org": (
            {"name": row["submitted_by_org_name"], "is_demo": row["submitted_by_org_is_demo"]}
            if row["submitted_by_org_id"] else None
        ),
        "is_demo": row["is_demo"],
        "created_at": normalize(row["created_at"]),
        "content_hash": row["content_hash"],
    }
    if row.get("mapped_area_ha") is not None:
        out["mapped_area"] = E.eq010_mapped_area(row["mapped_area_ha"])
    return out


# --- dossier and compare -----------------------------------------------------------------------------

def _dossiers(conn: Connection, ids: list[UUID]) -> dict[str, dict[str, Any]]:
    sites = {str(r["id"]): r for r in _site_rows(conn, ids=ids)}
    evidence: dict[str, list[dict[str, Any]]] = {sid: [] for sid in sites}
    for row in _evidence_rows(conn, ids):
        evidence[str(row["site_id"])].append(row)
    return {
        sid: {"site": _site_dto(row), "answers": site_answers(evidence[sid]), "_evidence": evidence[sid]}
        for sid, row in sites.items()
    }


def site_dossier(conn: Connection, site_id: str) -> dict[str, Any]:
    """API-005: site, three answers (history, current, ground) and every evidence item, newest first."""
    sid = parse_uuid(site_id, "Site not found")
    d = _dossiers(conn, [sid]).get(str(sid))
    if d is None:
        raise not_found("Site not found")
    return {"site": d["site"], "answers": d["answers"], "evidence": [evidence_dto(r) for r in d["_evidence"]]}


def site_dossier_raw(conn: Connection, site_id: UUID) -> dict[str, Any] | None:
    """Dossier with the raw evidence rows, for the ledger's lock-time snapshot."""
    return _dossiers(conn, [site_id]).get(str(site_id))


def compare_sites(conn: Connection, site_ids: Iterable[str]) -> dict[str, Any]:
    """API-006: 2–5 sites in the order requested, without the full evidence list."""
    raw = [s.strip() for s in site_ids if s and s.strip()]
    if not COMPARE_MIN <= len(raw) <= COMPARE_MAX:
        raise ApiError(422, "COMPARE_RANGE", f"Compare needs {COMPARE_MIN} to {COMPARE_MAX} site ids")
    ids = [parse_uuid(s, f"Site not found: {s}") for s in raw]
    found = _dossiers(conn, list(dict.fromkeys(ids)))
    missing = [str(i) for i in ids if str(i) not in found]
    if missing:
        raise not_found(f"Site not found: {missing[0]}")
    return {"sites": [{"site": found[str(i)]["site"], "answers": found[str(i)]["answers"]} for i in ids]}


def differing_questions(compared: dict[str, Any]) -> list[str]:
    """Questions whose status or finding is not the same across the compared sites (MCP compare_sites)."""
    out = []
    for idx, (question, _) in enumerate((a["question"], a["label"]) for a in compared["sites"][0]["answers"]):
        seen = {(s["answers"][idx]["status"], s["answers"][idx]["finding"]) for s in compared["sites"]}
        if len(seen) > 1:
            out.append(question)
    return out


# --- records -----------------------------------------------------------------------------------------

_RECORD_SQL = """
SELECT r.id, r.site_id, r.funder_org_id, r.created_by_user_id, r.rationale,
       r.planned_action::text AS planned_action, r.planned_action_detail, r.planned_area_ha,
       r.expected_outcome, r.expected_vegetated_ha, r.work_check_after, r.outcome_check_after,
       r.known_unknowns, r.snapshot, r.is_demo, r.published_at, r.content_hash,
       o.name AS funder_name, o.is_demo AS funder_is_demo
FROM promise_record r
JOIN organization o ON o.id = r.funder_org_id
"""

_EVENTS_SQL = """
SELECT ev.id, ev.record_id, ev.seq, ev.kind::text AS kind, ev.evidence_item_id, ev.body,
       ev.created_by_user_id, ev.created_at, ev.prev_hash, ev.event_hash,
       ei.content_hash AS evidence_content_hash
FROM record_event ev
LEFT JOIN evidence_item ei ON ei.id = ev.evidence_item_id
WHERE ev.record_id = ANY(%s)
ORDER BY ev.record_id, ev.seq
"""


def _events(conn: Connection, record_ids: list[UUID]) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {str(r): [] for r in record_ids}
    for row in conn.execute(_EVENTS_SQL, (record_ids,)).fetchall():
        out[str(row["record_id"])].append(row)
    return out


def _evaluate(record: dict[str, Any], site: dict[str, Any], timeline_items: list[dict[str, Any]],
              site_items: list[dict[str, Any]], today: date) -> dict[str, Any]:
    """Two checks from timeline evidence, three site answers computed now, and the BR-004 pin."""
    answers = site_answers(site_items)
    checks = [
        work_check(timeline_items),
        outcome_check(
            timeline_items, record["outcome_check_after"], today,
            expected_vegetated_ha=record["expected_vegetated_ha"],
            site_area_ha=site["area"]["value"], current_items=site_items,
        ),
    ]
    return {"checks": checks, "site_answers": answers, "pin_state": pin_state(checks, answers)}


def _load_records(conn: Connection, where: str = "", params: tuple = ()) -> list[dict[str, Any]]:
    return conn.execute(_RECORD_SQL + where + " ORDER BY r.published_at DESC, r.id", params).fetchall()


def _context(conn: Connection, records: list[dict[str, Any]], today: date) -> list[dict[str, Any]]:
    if not records:
        return []
    rec_ids = [r["id"] for r in records]
    events = _events(conn, rec_ids)
    dossiers = _dossiers(conn, list({r["site_id"] for r in records}))
    ev_ids = [e["evidence_item_id"] for evs in events.values() for e in evs if e["evidence_item_id"]]
    ev_rows = _evidence_by_ids(conn, ev_ids)
    out = []
    for r in records:
        d = dossiers[str(r["site_id"])]
        evs = events[str(r["id"])]
        items = [ev_rows[str(e["evidence_item_id"])] for e in evs if e["evidence_item_id"]]
        out.append({"record": r, "dossier": d, "events": evs, "evidence": ev_rows,
                    **_evaluate(r, d["site"], items, d["_evidence"], today)})
    return out


def list_records(conn: Connection, today: date | None = None) -> dict[str, Any]:
    """API-010: one Point per record at the site, with its BR-004 pin state, newest first."""
    today = today or today_utc()
    features = []
    for ctx in _context(conn, _load_records(conn), today):
        r, site_row = ctx["record"], ctx["dossier"]["site"]
        point = conn.execute(
            "SELECT ST_X(p) AS lon, ST_Y(p) AS lat FROM (SELECT ST_PointOnSurface(geom) AS p FROM site WHERE id = %s) x",
            (r["site_id"],),
        ).fetchone()
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [point["lon"], point["lat"]]},
            "properties": {
                "id": str(r["id"]), "site_id": str(r["site_id"]), "site_name": site_row["name"],
                "funder": r["funder_name"], "published_at": normalize(r["published_at"]),
                "pin_state": ctx["pin_state"], "is_demo": r["is_demo"],
            },
        })
    return {"type": "FeatureCollection", "features": features}


def _record_dto(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(r["id"]),
        "site_id": str(r["site_id"]),
        "funder": {"name": r["funder_name"], "is_demo": r["funder_is_demo"]},
        "published_at": normalize(r["published_at"]),
        "rationale": r["rationale"],
        "planned_action": r["planned_action"],
        "planned_action_detail": r["planned_action_detail"],
        # Inputs, not computed numbers: eq_id is null (docs/api.md API-011).
        "planned_area_ha": E.metric(float(r["planned_area_ha"]), "ha", None, E.HIGH),
        "expected_outcome": r["expected_outcome"],
        "expected_vegetated_ha": (
            E.metric(float(r["expected_vegetated_ha"]), "ha", None, E.HIGH)
            if r["expected_vegetated_ha"] is not None else None
        ),
        "work_check_after": normalize(r["work_check_after"]),
        "outcome_check_after": normalize(r["outcome_check_after"]),
        "known_unknowns": r["known_unknowns"],
        "snapshot": r["snapshot"],
        "is_demo": r["is_demo"],
        "content_hash": r["content_hash"],
    }


def get_record(conn: Connection, record_id: str, today: date | None = None) -> dict[str, Any]:
    """API-011: promise, both checks, the site's three answers now, timeline, pin state and disclaimer."""
    rid = parse_uuid(record_id, "Record not found")
    rows = _load_records(conn, " WHERE r.id = %s", (rid,))
    if not rows:
        raise not_found("Record not found")
    ctx = _context(conn, rows, today or today_utc())[0]
    timeline = []
    for e in ctx["events"]:
        entry = {"seq": e["seq"], "kind": e["kind"], "created_at": normalize(e["created_at"]),
                 "prev_hash": e["prev_hash"], "event_hash": e["event_hash"]}
        if e["evidence_item_id"]:
            entry["evidence"] = evidence_dto(ctx["evidence"][str(e["evidence_item_id"])])
        else:
            entry["body"] = e["body"]
        timeline.append(entry)
    return {
        "record": _record_dto(ctx["record"]),
        "site": ctx["dossier"]["site"],
        "checks": ctx["checks"],
        "site_answers": ctx["site_answers"],
        "timeline": timeline,
        "pin_state": ctx["pin_state"],
        "disclaimer": DISCLAIMER,
    }


def verify_record(conn: Connection, record_id: str) -> dict[str, Any]:
    """API-013: recompute EQ-011 for the record and every event."""
    rid = parse_uuid(record_id, "Record not found")
    rows = _load_records(conn, " WHERE r.id = %s", (rid,))
    if not rows:
        raise not_found("Record not found")
    events = _events(conn, [rid])[str(rid)]
    evidence = _evidence_by_ids(conn, [e["evidence_item_id"] for e in events if e["evidence_item_id"]])
    return verify_chain(rows[0], events, evidence)
