"""API-007: pull the site's current condition from Sentinel-2 (AWS Open Data, ADR-042) and append it as evidence.

The network part (adapters/sentinel2.py, a few seconds) runs without holding a database connection; the item is then
appended through the ledger (INSERT only, EQ-011 hash). On an upstream failure nothing is written (502).
One refresh per site per 10 minutes (docs/api.md §5).
"""

from __future__ import annotations

import threading
import time
from typing import Any

from adapters import sentinel2
from ledger.records import insert_evidence

from . import reads
from .db import connection
from .errors import ApiError, not_found
from .reads import parse_uuid

REFRESH_EVERY_S = 600  # docs/api.md §5: 1 Sentinel-2 refresh per site per 10 minutes
_last: dict[str, float] = {}
_lock = threading.Lock()


def _claim(site_id: str) -> None:
    with _lock:
        now = time.monotonic()
        if now - _last.get(site_id, -REFRESH_EVERY_S) < REFRESH_EVERY_S:
            wait = int(REFRESH_EVERY_S - (now - _last[site_id])) + 1
            raise ApiError(429, "RATE_LIMITED", f"This site was refreshed recently. Try again in {wait // 60 + 1} minutes.")
        _last[site_id] = now


def _release(site_id: str) -> None:
    with _lock:
        _last.pop(site_id, None)


def refresh_site(site_id: str) -> dict[str, Any]:
    sid = parse_uuid(site_id, "Site not found")
    with connection() as conn:
        row = conn.execute("SELECT id, is_demo, ST_AsGeoJSON(geom)::json AS geometry FROM site WHERE id = %s",
                           (sid,)).fetchone()
    if row is None:
        raise not_found("Site not found")
    _claim(str(sid))
    try:
        item = sentinel2.refresh(str(sid), row["geometry"], is_demo=row["is_demo"])
    except sentinel2.UpstreamError as e:
        _release(str(sid))  # nothing was written; let the viewer try again
        raise ApiError(502, "UPSTREAM_UNAVAILABLE", "The Sentinel-2 archive did not respond. Try again later.") from e
    with connection() as conn:
        stored = insert_evidence(conn, item)
    with connection() as conn:
        d = reads.site_dossier(conn, str(sid))
    ev = next((e for e in d["evidence"] if e["id"] == str(stored["id"])), None)
    return {"evidence": ev, "answers": d["answers"]}
