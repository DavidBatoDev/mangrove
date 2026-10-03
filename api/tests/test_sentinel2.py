"""TC-035: API-007 Sentinel-2 refresh from AWS Open Data (ADR-042), EQ-005/006/007.

The adapter is tested on tiny synthetic COG-like GeoTIFFs and a fake STAC search, so no network is used.
The route test writes one evidence item to the test branch through a stubbed adapter.
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_bounds

from adapters import sentinel2 as s2
from app import sentinel
from conftest import SITE

# A 0.01-degree square site; rasters in EPSG:4326 covering a slightly larger box.
POLY = {"type": "Polygon", "coordinates": [[[120.70, 14.80], [120.71, 14.80], [120.71, 14.81], [120.70, 14.81], [120.70, 14.80]]]}
BOX = (120.69, 14.79, 120.72, 14.82)
NOW = datetime(2026, 10, 1, tzinfo=timezone.utc)


def _tif(path, data, nodata=0):
    h, w = data.shape
    with rasterio.open(path, "w", driver="GTiff", width=w, height=h, count=1, dtype=data.dtype, crs="EPSG:4326",
                       transform=from_bounds(*BOX, w, h), nodata=nodata) as dst:
        dst.write(data, 1)
    return str(path)


def _item(tmp_path, name, scl, red=None, nir=None, cloud=10.0):
    a = {"scl": {"href": _tif(tmp_path / f"{name}_scl.tif", scl)}}
    if red is not None:
        a["red"] = {"href": _tif(tmp_path / f"{name}_red.tif", red), "raster:bands": [{"scale": 0.0001, "offset": -0.1}]}
        a["nir"] = {"href": _tif(tmp_path / f"{name}_nir.tif", nir), "raster:bands": [{"scale": 0.0001, "offset": -0.1}]}
    return {"id": name, "assets": a, "links": [{"rel": "self", "href": f"https://example.test/items/{name}"}],
            "properties": {"datetime": "2026-09-25T02:33:52Z", "eo:cloud_cover": cloud, "s2:processing_baseline": "05.13"}}


def test_tc035_picks_clearest_scene_and_classifies(tmp_path):
    cloudy = np.full((60, 60), 9, dtype="uint8")  # SCL 9 = cloud high probability
    clear = np.full((60, 60), 4, dtype="uint8")  # vegetation
    clear[:, 42:] = 6  # water east of the site (the site spans columns 20-40)
    red = np.full((120, 120), 1500, dtype="uint16")  # reflectance 0.05
    nir = np.full((120, 120), 4500, dtype="uint16")  # reflectance 0.35 -> NDVI 0.75
    items = [_item(tmp_path, "cloudy", cloudy, cloud=1.0), _item(tmp_path, "clear", clear, red, nir, cloud=20.0)]
    out = s2.refresh("site", POLY, is_demo=True, now=NOW, searcher=lambda *a, **k: items)
    assert out["usable"] and out["finding"] == "mostly_vegetation"
    assert out["raw"]["stac_item"] == "clear" and len(out["raw"]["scenes_checked"]) == 2
    m = {x["name"]: x for x in out["metrics"]}
    assert m["valid_fraction"]["value"] == 1.0 and m["valid_fraction"]["eq_id"] == "EQ-005"
    assert m["mean_ndvi"]["eq_id"] == "EQ-007" and m["mean_ndvi"]["value"] == pytest.approx(0.75, abs=0.01)
    assert all(x["confidence"] == "low" for x in out["metrics"])
    assert out["provenance_url"] == "https://example.test/items/clear" and "05.13" in out["source_version"]


def test_tc035_all_cloud_is_unusable_not_an_error(tmp_path):
    items = [_item(tmp_path, "cloudy", np.full((60, 60), 9, dtype="uint8"))]
    out = s2.refresh("site", POLY, is_demo=True, now=NOW, searcher=lambda *a, **k: items)
    assert out["usable"] is False and out["finding"] is None and out["unusable_reason"] == "too few cloud-free pixels"


def test_tc035_no_scene_in_window_is_unusable(tmp_path):
    out = s2.refresh("site", POLY, is_demo=True, now=NOW, searcher=lambda *a, **k: [])
    assert out["usable"] is False and "no Sentinel-2 scene" in out["unusable_reason"]


def test_tc035_upstream_failure_is_502_and_writes_nothing(client, monkeypatch):
    def boom(*a, **k):
        raise s2.UpstreamError("down")

    monkeypatch.setattr(s2, "refresh", boom)
    sentinel._last.clear()
    before = len(client.get(f"/api/v1/sites/{SITE['C']}").json()["evidence"])
    r = client.post(f"/api/v1/sites/{SITE['C']}/sentinel-refresh")
    assert r.status_code == 502 and r.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"
    assert len(client.get(f"/api/v1/sites/{SITE['C']}").json()["evidence"]) == before
    # A failed refresh does not use up the site's rate-limit slot.
    assert str(SITE["C"]) not in sentinel._last


def test_tc035_refresh_appends_current_evidence_then_rate_limits(client, monkeypatch):
    def fake(site_id, geometry, *, is_demo, **k):
        return {"site_id": site_id, "question": "current", "source_type": "sentinel2", "source_name": s2.SOURCE_NAME,
                "method": s2.METHOD, "spatial_resolution_m": 20, "limitation": s2.LIMITATION, "is_demo": is_demo,
                "observed_from": NOW, "observed_to": NOW, "usable": True, "finding": "mostly_water", "unusable_reason": None,
                "metrics": [{"name": "valid_fraction", "value": 1.0, "unit": "fraction", "eq_id": "EQ-005", "confidence": "low"}],
                "provenance_url": "https://example.test/items/x", "source_version": "test", "raw": {"stac_item": "x"}}

    monkeypatch.setattr(s2, "refresh", fake)
    sentinel._last.clear()
    r = client.post(f"/api/v1/sites/{SITE['D']}/sentinel-refresh")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["evidence"]["question"] == "current" and body["evidence"]["finding"] == "mostly_water"
    assert any(a["question"] == "current" for a in body["answers"])
    again = client.post(f"/api/v1/sites/{SITE['D']}/sentinel-refresh")
    assert again.status_code == 429 and again.json()["error"]["code"] == "RATE_LIMITED"


def test_tc035_unknown_site_is_404(client):
    r = client.post("/api/v1/sites/00000000-0000-4000-8000-00000000ffff/sentinel-refresh")
    assert r.status_code == 404
