"""BR-001 statuses for the three site questions and the two record checks (docs/prd.md §4.1, docs/methods.md §3.2).

Status = agreement among usable evidence: none → missing; one finding → supported; several → conflicting.
"Supported" means the sources agree, not that the site is good. No score is ever produced (F-015 is Won't).
"""

from __future__ import annotations

from datetime import date
from typing import Any, Iterable, Mapping

from . import equations as E

SITE_QUESTIONS: tuple[tuple[str, str], ...] = (
    ("history", "Was this mangrove before?"),
    ("current", "What's there now?"),
    ("ground", "What do people on the ground say?"),
)
CHECK_LABELS = {"work": "Did the work happen?", "outcome": "Did the mangroves come back?"}

SUPPORTED, CONFLICTING, MISSING, TOO_EARLY = "supported", "conflicting", "missing", "too_early"
REPORT_SOURCES = ("project_report", "public_report")  # a claimed area: DS-005, or quoted from a public report (DS-009)

Item = Mapping[str, Any]


def _usable(items: Iterable[Item], question: str) -> list[Item]:
    return [i for i in items if i["question"] == question and i["usable"] and i.get("finding")]


def agreement(usable: list[Item]) -> tuple[str, str | None]:
    """BR-001 over already-filtered usable items: (status, finding)."""
    findings = {i["finding"] for i in usable}
    if not findings:
        return MISSING, None
    if len(findings) == 1:
        return SUPPORTED, next(iter(findings))
    return CONFLICTING, None


def answer(question: str, label: str, items: Iterable[Item]) -> dict[str, Any]:
    usable = _usable(items, question)
    status, finding = agreement(usable)
    ids = [str(i["id"]) for i in usable]
    return {
        "question": question,
        "label": label,
        "status": status,
        "finding": finding,
        "source_count": E.eq013_source_count(len(usable)),
        "evidence_ids": ids,
        "disagreeing_evidence_ids": ids if status == CONFLICTING else [],
    }


def site_answers(items: Iterable[Item]) -> list[dict[str, Any]]:
    """Exactly three answers, always in the order history, current, ground (docs/api.md API-005)."""
    items = list(items)
    return [answer(q, label, items) for q, label in SITE_QUESTIONS]


def _metric_value(item: Item, name: str) -> float | None:
    for m in item.get("metrics") or []:
        if m.get("name") == name and m.get("value") is not None:
            return float(m["value"])
    return None


def _newest(items: list[Item]) -> Item | None:
    return max(items, key=lambda i: i["created_at"]) if items else None


def work_check(items: Iterable[Item]) -> dict[str, Any]:
    """"Did the work happen?": BR-001 over work findings, plus the EQ-009 area check.

    Reported area: the newest usable project or public report's `reported_area` metric (DS-005 or DS-009, Low).
    Measured area: EQ-010 on the newest usable field item that carries a mapped boundary (`mapped_area_ha`).
    """
    usable = _usable(items, "work")
    status, finding = agreement(usable)

    report = _newest([i for i in usable if i["source_type"] in REPORT_SOURCES and _metric_value(i, "reported_area") is not None])
    mapped = _newest([i for i in usable if i["source_type"] == "field" and i.get("mapped_area_ha") is not None])
    reported_ha = _metric_value(report, "reported_area") if report else None
    measured_ha = float(mapped["mapped_area_ha"]) if mapped else None

    area_conflict = None
    if reported_ha is not None and measured_ha is not None:
        eq9 = E.eq009_area_discrepancy(reported_ha, measured_ha)
        area_conflict = eq9["metric"]
        if eq9["conflict"]:
            status, finding = CONFLICTING, None

    ids = [str(i["id"]) for i in usable]
    return {
        "check": "work",
        "label": CHECK_LABELS["work"],
        "status": status,
        "finding": finding,
        "source_count": E.eq013_source_count(len(usable)),
        "reported_area": E.metric(E.ha(reported_ha), "ha", None, E.LOW) if reported_ha is not None else None,
        "measured_area": E.eq010_mapped_area(measured_ha) if measured_ha is not None else None,
        "area_conflict": area_conflict,
        "evidence_ids": ids,
        "disagreeing_evidence_ids": ids if status == CONFLICTING else [],
    }


def outcome_check(
    items: Iterable[Item],
    outcome_check_after: date,
    today: date,
    expected_vegetated_ha: float | None = None,
    site_area_ha: float | None = None,
    current_items: Iterable[Item] = (),
) -> dict[str, Any]:
    """"Did the mangroves come back?": too early before the date; then BR-001 over field findings and EQ-012."""
    base = {
        "check": "outcome",
        "label": CHECK_LABELS["outcome"],
        "checkable_from": outcome_check_after.isoformat(),
    }
    if today < outcome_check_after:
        return {**base, "status": TOO_EARLY, "finding": None,
                "source_count": E.eq013_source_count(0), "evidence_ids": [], "disagreeing_evidence_ids": [],
                "vegetated_area": None}

    usable = _usable(items, "outcome")
    findings = [(str(i["id"]), i["finding"]) for i in usable]

    vegetated = None
    if expected_vegetated_ha is not None and site_area_ha:
        s2 = _newest([i for i in current_items
                      if i["question"] == "current" and i["source_type"] == "sentinel2" and i["usable"]
                      and _metric_value(i, "vegetation_fraction") is not None])
        if s2 is not None:
            veg_ha = E.eq008_vegetated_area(_metric_value(s2, "vegetation_fraction"), site_area_ha)
            vegetated = E.metric(E.ha(veg_ha), "ha", "EQ-008", E.LOW)
            findings.append((str(s2["id"]), E.eq012_outcome(veg_ha, float(expected_vegetated_ha))))

    distinct = {f for _, f in findings}
    if not distinct:
        status, finding = MISSING, None
    elif len(distinct) == 1:
        status, finding = SUPPORTED, next(iter(distinct))
    else:
        status, finding = CONFLICTING, None
    ids = list(dict.fromkeys(i for i, _ in findings))
    return {**base, "status": status, "finding": finding,
            "source_count": E.eq013_source_count(len(ids)), "evidence_ids": ids,
            "disagreeing_evidence_ids": ids if status == CONFLICTING else [],
            "vegetated_area": vegetated}
