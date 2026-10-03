"""EQ-011 payloads and hash-chain verification (docs/methods.md §3, docs/api.md API-013).

Pure functions: rows in, hashes and verdicts out. The database layer lives in `ledger/records.py`.
"""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from .canonical import chained_hash, content_hash

# Every evidence_item column except `id` and `content_hash` (docs/data-model.md §2).
# `location` is hashed as its GeoJSON geometry, read back with the same precision it was written with.
EVIDENCE_HASH_FIELDS = (
    "site_id", "question", "source_type", "source_name", "source_version",
    "observed_from", "observed_to", "retrieved_at", "location", "finding", "metrics",
    "method", "spatial_resolution_m", "limitation", "provenance_url", "asset_sha256",
    "asset_mime", "raw", "usable", "unusable_reason", "note", "submitted_by_user_id",
    "submitted_by_org_id", "is_demo", "created_at",
)

# Every promise_record field except `id`, `idempotency_key` and `content_hash` (docs/data-model.md §2).
RECORD_HASH_FIELDS = (
    "site_id", "funder_org_id", "created_by_user_id", "rationale", "planned_action",
    "planned_action_detail", "planned_area_ha", "expected_outcome", "expected_vegetated_ha",
    "work_check_after", "outcome_check_after", "known_unknowns", "snapshot", "is_demo",
    "published_at",
)

# The event payload chained by EQ-011. `evidence_content_hash` ties the attached item's own hash into
# the chain, so altering an attached evidence item also breaks verification at that event.
EVENT_HASH_FIELDS = (
    "record_id", "seq", "kind", "evidence_item_id", "evidence_content_hash", "body",
    "created_by_user_id", "created_at",
)

GEOJSON_PRECISION = 9  # decimal places, for both writing and ST_AsGeoJSON(location, 9) on read


# Who typed a public submission (ADR-061). Hashed only when present, so every item and record written before
# these columns existed keeps exactly the hash it was published with. contact_email is never hashed.
PUBLIC_EVIDENCE_FIELDS = ("submitter_name", "submitter_org", "submitter_role")
PUBLIC_RECORD_FIELDS = ("funder_name", "funder_org", "funder_role")


def _pick(row: Mapping[str, Any], fields: Iterable[str]) -> dict[str, Any]:
    return {f: row.get(f) for f in fields}


def _with_public(row: Mapping[str, Any], fields: tuple[str, ...], public: tuple[str, ...]) -> dict[str, Any]:
    out = _pick(row, fields)
    if any(row.get(f) is not None for f in public):
        out.update(_pick(row, public))
    return out


def evidence_hash(item: Mapping[str, Any]) -> str:
    return content_hash(_with_public(item, EVIDENCE_HASH_FIELDS, PUBLIC_EVIDENCE_FIELDS))


def record_hash(record: Mapping[str, Any]) -> str:
    return content_hash(_with_public(record, RECORD_HASH_FIELDS, PUBLIC_RECORD_FIELDS))


def event_hash(prev_hash: str, event: Mapping[str, Any]) -> str:
    return chained_hash(prev_hash, _pick(event, EVENT_HASH_FIELDS))


def round_geojson(geom: Any, places: int = GEOJSON_PRECISION) -> Any:
    """Round every coordinate so the stored geometry and the hashed geometry are the same numbers."""
    if isinstance(geom, float):
        return round(geom, places)
    if isinstance(geom, list):
        return [round_geojson(g, places) for g in geom]
    if isinstance(geom, dict):
        return {k: (round_geojson(v, places) if k == "coordinates" else v) for k, v in geom.items()}
    return geom


def verify_chain(
    record: Mapping[str, Any],
    events: list[Mapping[str, Any]],
    evidence_by_id: Mapping[str, Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    """Recompute EQ-011 for the record and every event, in `seq` order.

    `first_mismatch_seq` is 0 for the record itself, else the first event whose hash, chain link,
    sequence number or attached evidence does not recompute. Shape: docs/api.md API-013.
    """
    evidence_by_id = evidence_by_id or {}
    result = {
        "intact": True,
        "content_hash": record["content_hash"],
        "events_checked": 0,
        "first_mismatch_seq": None,
    }

    def fail(seq: int) -> dict[str, Any]:
        result["intact"] = False
        result["first_mismatch_seq"] = seq
        return result

    if record_hash(record) != record["content_hash"]:
        return fail(0)

    prev = record["content_hash"]
    for expected_seq, event in enumerate(sorted(events, key=lambda e: e["seq"]), start=1):
        result["events_checked"] = expected_seq
        seq = event["seq"]
        if seq != expected_seq or event["prev_hash"] != prev:
            return fail(seq)
        if event.get("evidence_item_id") is not None:
            item = evidence_by_id.get(str(event["evidence_item_id"]))
            if item is None or evidence_hash(item) != item["content_hash"]:
                return fail(seq)
            if event.get("evidence_content_hash") != item["content_hash"]:
                return fail(seq)
        if event_hash(prev, event) != event["event_hash"]:
            return fail(seq)
        prev = event["event_hash"]
    return result
