"""Record ledger writes: evidence items, promise records and timeline events (EQ-011, BR-002).

INSERT only. Works under the app role, which has SELECT and INSERT on the append-only tables and nothing else.
Callers own the transaction (`with conn.transaction(): ...`).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping
from uuid import UUID, uuid4

from psycopg import Connection
from psycopg.types.json import Jsonb

from .hashing import evidence_hash, event_hash, record_hash, round_geojson


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _json(value: Any) -> Any:
    return None if value is None else Jsonb(value)


def insert_evidence(conn: Connection, item: Mapping[str, Any]) -> dict[str, Any]:
    """Append one evidence item with its EQ-011 content hash. Returns the stored payload incl. id and hash."""
    ts = now_utc()
    row: dict[str, Any] = {
        "source_version": None, "location": None, "finding": None, "metrics": [],
        "spatial_resolution_m": None, "provenance_url": None, "asset_sha256": None, "asset_mime": None,
        "raw": None, "unusable_reason": None, "note": None, "submitted_by_user_id": None,
        "submitted_by_org_id": None, "is_demo": True, "retrieved_at": ts, "created_at": ts,
        **item,
    }
    row["id"] = row.get("id") or uuid4()
    if row["location"] is not None:
        row["location"] = round_geojson(row["location"])
    row["content_hash"] = evidence_hash(row)

    conn.execute(
        """
        INSERT INTO evidence_item (
          id, site_id, question, source_type, source_name, source_version, observed_from, observed_to,
          retrieved_at, location, finding, metrics, method, spatial_resolution_m, limitation,
          provenance_url, asset_sha256, asset_mime, raw, usable, unusable_reason, note,
          submitted_by_user_id, submitted_by_org_id, is_demo, created_at, content_hash)
        VALUES (
          %(id)s, %(site_id)s, %(question)s, %(source_type)s, %(source_name)s, %(source_version)s,
          %(observed_from)s, %(observed_to)s, %(retrieved_at)s,
          CASE WHEN %(location)s::text IS NULL THEN NULL
               ELSE ST_SetSRID(ST_GeomFromGeoJSON(%(location)s::text), 4326) END,
          %(finding)s, %(metrics)s, %(method)s, %(spatial_resolution_m)s, %(limitation)s,
          %(provenance_url)s, %(asset_sha256)s, %(asset_mime)s, %(raw)s, %(usable)s,
          %(unusable_reason)s, %(note)s, %(submitted_by_user_id)s, %(submitted_by_org_id)s,
          %(is_demo)s, %(created_at)s, %(content_hash)s)
        """,
        {**row, "location": _json(row["location"]), "metrics": Jsonb(row["metrics"]), "raw": _json(row["raw"])},
    )
    return row


def build_snapshot(site: Mapping[str, Any], evidence: list[Mapping[str, Any]], answers: list[Any]) -> dict[str, Any]:
    """The lock-time copy stored on the record (docs/data-model.md promise_record.snapshot)."""
    return {
        "site": {
            "id": str(site["id"]),
            "name": site["name"],
            "geometry": site["geometry"],
            "area": site["area"],
        },
        "evidence": [
            {"id": str(e["id"]), "content_hash": e["content_hash"], "question": e["question"],
             "finding": e["finding"], "usable": e["usable"]}
            for e in evidence
        ],
        "answers": answers,
    }


def create_record(conn: Connection, fields: Mapping[str, Any], snapshot: Mapping[str, Any],
                  idempotency_key: str, record_id: UUID | None = None) -> dict[str, Any]:
    """Publish a promise record with its EQ-011 content hash."""
    row = {"is_demo": True, "expected_vegetated_ha": None, **fields,
           "snapshot": snapshot, "published_at": now_utc(), "id": record_id or uuid4()}
    row["content_hash"] = record_hash(row)
    conn.execute(
        """
        INSERT INTO promise_record (
          id, site_id, funder_org_id, created_by_user_id, rationale, planned_action, planned_action_detail,
          planned_area_ha, expected_outcome, expected_vegetated_ha, work_check_after, outcome_check_after,
          known_unknowns, snapshot, idempotency_key, is_demo, published_at, content_hash)
        VALUES (
          %(id)s, %(site_id)s, %(funder_org_id)s, %(created_by_user_id)s, %(rationale)s, %(planned_action)s,
          %(planned_action_detail)s, %(planned_area_ha)s, %(expected_outcome)s, %(expected_vegetated_ha)s,
          %(work_check_after)s, %(outcome_check_after)s, %(known_unknowns)s, %(snapshot)s,
          %(idempotency_key)s, %(is_demo)s, %(published_at)s, %(content_hash)s)
        """,
        {**row, "snapshot": Jsonb(row["snapshot"]), "idempotency_key": idempotency_key},
    )
    return row


def append_event(conn: Connection, record_id: UUID | str, kind: str, created_by_user_id: UUID | str,
                 evidence_item_id: UUID | str | None = None, body: Any = None) -> dict[str, Any]:
    """Extend a record's timeline: next gap-free seq, chained to the previous hash (EQ-011)."""
    # Serialize appends per record without needing UPDATE privilege (SELECT … FOR UPDATE would).
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s::text, 0))", (str(record_id),))
    rec = conn.execute("SELECT content_hash FROM promise_record WHERE id = %s", (record_id,)).fetchone()
    if rec is None:
        raise LookupError("record not found")
    last = conn.execute(
        "SELECT seq, event_hash FROM record_event WHERE record_id = %s ORDER BY seq DESC LIMIT 1", (record_id,)
    ).fetchone()
    seq, prev = (1, rec["content_hash"]) if last is None else (last["seq"] + 1, last["event_hash"])

    evidence_content_hash = None
    if evidence_item_id is not None:
        ev = conn.execute("SELECT content_hash FROM evidence_item WHERE id = %s", (evidence_item_id,)).fetchone()
        if ev is None:
            raise LookupError("evidence item not found")
        evidence_content_hash = ev["content_hash"]

    row = {
        "id": uuid4(), "record_id": UUID(str(record_id)), "seq": seq, "kind": kind,
        "evidence_item_id": UUID(str(evidence_item_id)) if evidence_item_id else None,
        "evidence_content_hash": evidence_content_hash, "body": body,
        "created_by_user_id": UUID(str(created_by_user_id)), "created_at": now_utc(), "prev_hash": prev,
    }
    row["event_hash"] = event_hash(prev, row)
    conn.execute(
        """
        INSERT INTO record_event (id, record_id, seq, kind, evidence_item_id, body, created_by_user_id,
                                  created_at, prev_hash, event_hash)
        VALUES (%(id)s, %(record_id)s, %(seq)s, %(kind)s, %(evidence_item_id)s, %(body)s,
                %(created_by_user_id)s, %(created_at)s, %(prev_hash)s, %(event_hash)s)
        """,
        {**row, "body": _json(body)},
    )
    return row
