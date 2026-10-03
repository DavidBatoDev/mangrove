"""Public writes (ADR-061): API-008 add evidence and API-009 lock a promise, with no accounts.

Whoever submits types their name (required), organisation and role; a contact email is optional, stored privately
and never displayed, hashed or sent to MCP. Everything goes through the append-only ledger (INSERT only, EQ-011).
Abuse limits per client IP stand in for sign-in (docs/api.md §5).
"""

from __future__ import annotations

import re
import threading
import time
from collections import deque
from datetime import date, datetime, time as dtime, timedelta, timezone
from typing import Any, Literal
from uuid import UUID

from fastapi import Request
from pydantic import BaseModel, Field, field_validator, model_validator

from ledger.records import append_event, build_snapshot, create_record, insert_evidence

from . import reads
from .db import connection
from .errors import ApiError, not_found

Role = Literal["field_partner", "funder", "resident"]
FINDINGS = {
    "history": ("mangrove_recorded", "no_mangrove_recorded"),
    "ground": ("open_for_restoration", "active_fishpond", "land_use_dispute_reported", "existing_mangrove"),
    "work": ("work_done", "no_work_seen"),
    "outcome": ("recovery_seen", "no_recovery_seen"),
}
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$")
FIELD_LIMITATION = "Observed and reported by a member of the public; not verified by the project. GPS accuracy of the device is unknown."
REPORT_LIMITATION = "Self-reported by the submitter; not verified by the project."


# --- abuse limits --------------------------------------------------------------------------------------

LIMITS = {"evidence": (10, 3600), "lock": (3, 3600)}  # per client IP: count per window (s)
_hits: dict[tuple[str, str], deque] = {}
_hits_lock = threading.Lock()


def client_ip(request: Request) -> str:
    """Caddy is the only way in; it sets X-Forwarded-For. Its first hop is the viewer."""
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def rate_limit(kind: str, ip: str) -> None:
    n, window = LIMITS[kind]
    now = time.monotonic()
    with _hits_lock:
        q = _hits.setdefault((kind, ip), deque())
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= n:
            raise ApiError(429, "RATE_LIMITED", "Too many submissions from this connection. Try again later.")
        q.append(now)


# --- who is submitting ---------------------------------------------------------------------------------

class Submitter(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    organisation: str | None = Field(default=None, max_length=120)
    role: Role
    contact_email: str | None = Field(default=None, max_length=254)

    @field_validator("name", "organisation", "contact_email", mode="before")
    @classmethod
    def _strip(cls, v: Any) -> Any:
        return v.strip() or None if isinstance(v, str) else v

    @field_validator("contact_email")
    @classmethod
    def _email(cls, v: str | None) -> str | None:
        if v is not None and not EMAIL.match(v):
            raise ValueError("contact_email is not an email address")
        return v


# --- API-008 -------------------------------------------------------------------------------------------

class EvidenceIn(BaseModel):
    site_id: UUID | None = None
    record_id: UUID | None = None
    question: Literal["history", "ground", "work", "outcome"]
    finding: str
    observed_at: date
    point: dict[str, Any] | None = None
    boundary: dict[str, Any] | None = None
    reported_area_ha: float | None = Field(default=None, gt=0, le=1_000_000)
    note: str | None = Field(default=None, max_length=2000)
    submitter: Submitter

    @model_validator(mode="after")
    def _check(self) -> "EvidenceIn":
        if not self.site_id and not self.record_id:
            raise ValueError("site_id or record_id is required")
        if self.finding not in FINDINGS[self.question]:
            raise ValueError(f"finding must be one of {', '.join(FINDINGS[self.question])}")
        # "Today" anywhere on Earth (UTC+14): a morning in Manila is still yesterday in UTC.
        if self.observed_at > (datetime.now(timezone.utc) + timedelta(hours=14)).date():
            raise ValueError("observed_at is in the future")
        report = self.submitter.role == "funder" and self.question == "work"
        if report and self.reported_area_ha is None:
            raise ValueError("a funder's work report needs reported_area_ha")
        if not report and self.point is None:
            raise ValueError("a field observation needs the GPS point where it was made")
        for g, kind in ((self.point, "Point"), (self.boundary, "Polygon")):
            if g is not None and (g.get("type") != kind or not isinstance(g.get("coordinates"), list)):
                raise ValueError(f"{'point' if kind == 'Point' else 'boundary'} must be a GeoJSON {kind}")
        return self


def add_evidence(body: EvidenceIn) -> dict[str, Any]:
    s = body.submitter
    report = s.role == "funder" and body.question == "work"
    observed = datetime.combine(body.observed_at, dtime(12, 0), tzinfo=timezone.utc)
    with connection() as conn:
        site_id = body.site_id
        if body.record_id:
            rec = conn.execute("SELECT site_id FROM promise_record WHERE id = %s", (body.record_id,)).fetchone()
            if rec is None:
                raise not_found("Record not found")
            site_id = rec["site_id"]
        site = conn.execute("SELECT id, is_demo FROM site WHERE id = %s", (site_id,)).fetchone()
        if site is None:
            raise not_found("Site not found")
        metrics = []
        if report:
            metrics.append({"name": "reported_area", "value": round(body.reported_area_ha, 2), "unit": "ha",
                            "eq_id": None, "confidence": "low"})
        item = insert_evidence(conn, {
            "site_id": site_id, "question": body.question,
            "source_type": "project_report" if report else "field",
            "source_name": "Project report" if report else "Field observation",
            "observed_from": observed, "observed_to": observed,
            "location": body.boundary or body.point, "finding": body.finding, "metrics": metrics,
            "method": "Reported by the submitter through the public form" if report
                      else "Observed on site and submitted through the public form",
            "limitation": REPORT_LIMITATION if report else FIELD_LIMITATION,
            "usable": True, "note": body.note, "is_demo": site["is_demo"],
            "submitter_name": s.name, "submitter_org": s.organisation, "submitter_role": s.role,
            "contact_email": s.contact_email,
        })
        event = None
        if body.record_id:
            ev = append_event(conn, body.record_id, "evidence_added", None, evidence_item_id=item["id"])
            event = {"seq": ev["seq"], "event_hash": ev["event_hash"]}
        stored = reads._evidence_by_ids(conn, [item["id"]])[str(item["id"])]
        return {"evidence": reads.evidence_dto(stored), "record_event": event}


# --- API-009 -------------------------------------------------------------------------------------------

class LockIn(BaseModel):
    site_id: UUID
    rationale: str = Field(min_length=1, max_length=2000)
    planned_action: Literal["planting", "natural_regeneration", "hydrological_repair", "protection", "other"]
    planned_action_detail: str = Field(min_length=1, max_length=2000)
    planned_area_ha: float = Field(gt=0, le=1_000_000)
    expected_outcome: str = Field(min_length=1, max_length=2000)
    expected_vegetated_ha: float | None = Field(default=None, gt=0, le=1_000_000)
    work_check_after: date
    outcome_check_after: date
    known_unknowns: str = Field(min_length=1, max_length=2000)
    submitter: Submitter

    @model_validator(mode="after")
    def _check(self) -> "LockIn":
        if self.outcome_check_after < self.work_check_after:
            raise ValueError("outcome_check_after must be on or after work_check_after")
        return self


def lock_promise(body: LockIn, idempotency_key: str) -> dict[str, Any]:
    if not idempotency_key or len(idempotency_key) > 100:
        raise ApiError(422, "VALIDATION_FAILED", "Idempotency-Key header is required")
    key = f"public-{idempotency_key}"
    with connection() as conn:
        # One serialised lock per site, so two quick clicks cannot publish two promises.
        conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s::text, 1))", (str(body.site_id),))
        prior = conn.execute("SELECT id, site_id, published_at, content_hash, is_demo FROM promise_record "
                             "WHERE idempotency_key = %s", (key,)).fetchone()
        if prior is not None:
            if prior["site_id"] != body.site_id:
                raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This Idempotency-Key was used for another site")
            return _lock_response(prior)
        if conn.execute("SELECT 1 FROM promise_record WHERE site_id = %s", (body.site_id,)).fetchone():
            raise ApiError(422, "VALIDATION_FAILED", "This site already has a published promise")
        d = reads.site_dossier_raw(conn, body.site_id)
        if d is None:
            raise not_found("Site not found")
        s = body.submitter
        fields = body.model_dump(exclude={"submitter"})
        row = create_record(conn, {
            **fields, "is_demo": d["site"]["is_demo"],
            "funder_name": s.name, "funder_org": s.organisation, "funder_role": s.role, "contact_email": s.contact_email,
        }, build_snapshot(d["site"], d["_evidence"], d["answers"]), idempotency_key=key)
        return _lock_response(row)


def _lock_response(r: dict[str, Any]) -> dict[str, Any]:
    return {"id": str(r["id"]), "url": f"/records/{r['id']}", "published_at": reads.normalize(r["published_at"]),
            "content_hash": r["content_hash"], "is_demo": r["is_demo"]}
