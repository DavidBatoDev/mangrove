"""BR-004 pin state precedence (docs/prd.md §4.1): conflict > awaiting > on_track."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

CONFLICT, AWAITING, ON_TRACK = "conflict", "awaiting", "on_track"


def pin_state(checks: Iterable[Mapping[str, Any]], site_answers: Iterable[Mapping[str, Any]]) -> str:
    checks = list(checks)
    if any(c["status"] == "conflicting" for c in checks) or any(a["status"] == "conflicting" for a in site_answers):
        return CONFLICT
    if any(c["status"] in ("missing", "too_early") for c in checks):
        return AWAITING
    return ON_TRACK
