"""Every computed number, one function per EQ-### (docs/methods.md §3). Pure; no I/O.

Each public number leaves the engine through `metric()`, so it always carries unit, eq_id and confidence.
"""

from __future__ import annotations

import math
from typing import Any, Mapping

from . import constants as C

HIGH, MEDIUM, LOW = "high", "medium", "low"


def metric(value: Any, unit: str, eq_id: str | None, confidence: str, name: str | None = None) -> dict[str, Any]:
    """The glass-box number shape `{value, unit, eq_id, confidence}` (docs/api.md §1)."""
    out = {"value": value, "unit": unit, "eq_id": eq_id, "confidence": confidence}
    if name is not None:
        out = {"name": name, **out}
    return out


def ha(value: float | None) -> float | None:
    return None if value is None else round(float(value), 2)


# EQ-001 and EQ-010 are computed by PostGIS on a geography cast; these are the SQL expressions.
EQ001_SQL = "ST_Area(geom::geography) / 10000"
EQ010_SQL = "ST_Area(location::geography) / 10000"


def eq001_area(area_ha: float) -> dict[str, Any]:
    """EQ-001 site area, High."""
    return metric(ha(area_ha), "ha", "EQ-001", HIGH)


def eq010_mapped_area(area_ha: float) -> dict[str, Any]:
    """EQ-010 field-mapped worked area, Medium (device GPS accuracy unknown)."""
    return metric(ha(area_ha), "ha", "EQ-010", MEDIUM)


def eq002_pixel_area_ha(lat_deg: float) -> float:
    """EQ-002 area of one GMW pixel at latitude φ, in hectares."""
    side = C.EARTH_RADIUS_M * C.GMW_PIXEL_DEG * math.pi / 180
    return side * side * math.cos(math.radians(lat_deg)) / 10000


def eq003_history(annual_ha: Mapping[int, float], site_area_ha: float) -> dict[str, Any]:
    """EQ-003 maximum historical extent and the "Was this mangrove before?" finding."""
    if not annual_ha or site_area_ha <= 0:
        raise ValueError("EQ-003 needs annual GMW areas and a positive site area")
    y_max = max(annual_ha, key=lambda y: (annual_ha[y], -y))
    a_max = annual_ha[y_max]
    f_hist = a_max / site_area_ha
    finding = "mangrove_recorded" if f_hist >= C.HISTORY_MIN_FRACTION else "no_mangrove_recorded"
    return {
        "finding": finding,
        "a_max": a_max,
        "y_max": y_max,
        "f_hist": f_hist,
        "metrics": [
            metric(ha(a_max), "ha", "EQ-003", MEDIUM, name="max_mangrove_area"),
            metric(y_max, "year", "EQ-003", MEDIUM, name="max_mangrove_year"),
            metric(round(f_hist, 4), "fraction", "EQ-003", MEDIUM, name="max_mangrove_fraction"),
        ],
    }


def eq004_change_since_peak(annual_ha: Mapping[int, float], last_year: int = 2025) -> float:
    """EQ-004 ΔA = A_2025 − A_max (context only, no status)."""
    return annual_ha[last_year] - max(annual_ha.values())


def eq005_valid_fraction(sample_count: int, no_data_count: int, n_valid: int) -> dict[str, Any]:
    """EQ-005 Sentinel-2 valid-pixel fraction and usability."""
    n_poly = sample_count - no_data_count
    f_valid = n_valid / n_poly if n_poly > 0 else 0.0
    usable = f_valid >= C.MIN_VALID_FRACTION
    return {
        "f_valid": f_valid,
        "usable": usable,
        "unusable_reason": None if usable else "too few cloud-free pixels",
        "metric": metric(round(f_valid, 4), "fraction", "EQ-005", LOW, name="valid_fraction"),
    }


def eq006_current(n_veg: int, n_bare: int, n_water: int) -> dict[str, Any]:
    """EQ-006 class fractions and the "What's there now?" finding. An exact tie is unusable."""
    n_valid = n_veg + n_bare + n_water
    if n_valid == 0:
        return {"finding": None, "usable": False, "unusable_reason": "no valid pixels", "metrics": []}
    fr = {
        "mostly_vegetation": n_veg / n_valid,
        "mostly_bare_soil": n_bare / n_valid,
        "mostly_water": n_water / n_valid,
    }
    top = max(fr.values())
    leaders = [k for k, v in fr.items() if v == top]
    metrics = [
        metric(round(fr["mostly_vegetation"], 4), "fraction", "EQ-006", LOW, name="vegetation_fraction"),
        metric(round(fr["mostly_bare_soil"], 4), "fraction", "EQ-006", LOW, name="bare_soil_fraction"),
        metric(round(fr["mostly_water"], 4), "fraction", "EQ-006", LOW, name="water_fraction"),
    ]
    if len(leaders) > 1:
        return {"finding": None, "usable": False, "unusable_reason": "no dominant class", "metrics": metrics}
    return {"finding": leaders[0], "usable": True, "unusable_reason": None, "metrics": metrics}


def eq008_vegetated_area(f_veg: float, site_area_ha: float) -> float:
    """EQ-008 vegetated area detected by Sentinel-2 (outcome check only)."""
    return f_veg * site_area_ha


def eq009_area_discrepancy(reported_ha: float, measured_ha: float) -> dict[str, Any]:
    """EQ-009 d = |A_reported − A_measured| / A_reported; conflict iff d > AREA_TOLERANCE."""
    if reported_ha <= 0:
        raise ValueError("EQ-009 needs a positive reported area")
    d = abs(reported_ha - measured_ha) / reported_ha
    conflict = d > C.AREA_TOLERANCE
    return {"d": d, "conflict": conflict, "metric": metric(conflict, "flag", "EQ-009", LOW)}


def eq012_outcome(vegetated_ha: float, expected_vegetated_ha: float) -> str:
    """EQ-012 satellite outcome finding, used only on or after outcome_check_after."""
    threshold = expected_vegetated_ha * (1 - C.AREA_TOLERANCE)
    return "recovery_seen" if vegetated_ha >= threshold else "no_recovery_seen"


def eq013_source_count(n: int) -> dict[str, Any]:
    """EQ-013 number of usable items behind a question or check."""
    return metric(n, "items", "EQ-013", HIGH)
