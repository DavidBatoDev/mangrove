"""DS-002 adapter: Sentinel-2 L2A Collection 1 from the AWS Open Data Registry, found with Element 84 Earth Search
(ADR-042). Public COGs on S3, read with HTTP range requests; no account, no key.

`refresh()` searches the scenes over a site polygon in the last S2_WINDOW_DAYS, reads each candidate's SCL pixels whose
centre lies inside the polygon, keeps the scene with the highest valid fraction (EQ-005), then computes the class
fractions and finding (EQ-006) and mean NDVI for context (EQ-007) on that scene. It returns one evidence item
(question `current`) for ledger.records.insert_evidence. It never writes anything itself.
"""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Mapping

import numpy as np
import rasterio
from affine import Affine
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from rasterio.windows import Window, from_bounds as window_from_bounds

from engine import constants as C
from engine.equations import LOW, eq005_valid_fraction, eq006_current, metric

STAC_SEARCH = "https://earth-search.aws.element84.com/v1/search"
COLLECTION = "sentinel-2-c1-l2a"
SOURCE_NAME = "Sentinel-2 L2A (Copernicus), AWS Open Data via Earth Search"
MAX_SCENES = 6  # least-cloudy candidates read per refresh; each read is a few small range requests
SCL_NODATA, SCL_VEG, SCL_BARE, SCL_WATER = 0, 4, 5, 6
LIMITATION = (
    "20 m scene classification: cannot see individual seedlings; mixed pixels at the edge; one scene, the clearest "
    "in the window."
)
METHOD = (
    "SCL pixels with centre inside the site polygon in the clearest Sentinel-2 L2A scene of the window "
    "(EQ-005), classified vegetation / bare soil / water (EQ-006); mean NDVI over non-water valid pixels (EQ-007)."
)

# Public bucket over HTTPS: no credentials, no directory listing.
GDAL_ENV = {"AWS_NO_SIGN_REQUEST": "YES", "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "GDAL_HTTP_MAX_RETRY": "3",
            "GDAL_HTTP_RETRY_DELAY": "1", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.TIF"}


class UpstreamError(Exception):
    """Earth Search or the COG bucket did not answer; nothing is written (API-007 502)."""


def search(geometry: Mapping[str, Any], start: datetime, end: datetime, limit: int = MAX_SCENES) -> list[dict]:
    body = {
        "collections": [COLLECTION],
        "intersects": geometry,
        "datetime": f"{start.strftime('%Y-%m-%dT%H:%M:%SZ')}/{end.strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "limit": limit,
        "sortby": [{"field": "properties.eo:cloud_cover", "direction": "asc"}],
    }
    req = urllib.request.Request(STAC_SEARCH, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "Accept": "application/geo+json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r).get("features", [])
    except Exception as e:  # network, HTTP or JSON error
        raise UpstreamError(f"Earth Search did not answer: {e}") from e


def _read_in_polygon(href: str, geometry: Mapping[str, Any], out_shape: tuple[int, int] | None = None) -> np.ndarray:
    """Pixels of band 1 whose centre lies inside the polygon (others masked), from a COG window."""
    with rasterio.open(href) as src:
        geom = transform_geom("EPSG:4326", src.crs, geometry)
        xs, ys = [], []

        def walk(c):
            if isinstance(c[0], (int, float)):
                xs.append(c[0]); ys.append(c[1])
            else:
                for cc in c:
                    walk(cc)

        walk(geom["coordinates"])
        win = window_from_bounds(min(xs), min(ys), max(xs), max(ys), src.transform).round_offsets().round_lengths()
        win = win.intersection(Window(0, 0, src.width, src.height))
        if out_shape:  # resample (nearest) onto another band's grid, e.g. SCL 20 m onto the 10 m red window
            data = src.read(1, window=win, out_shape=out_shape, resampling=Resampling.nearest)
            transform = src.window_transform(win) @ Affine.scale(win.width / out_shape[1], win.height / out_shape[0])
        else:
            data = src.read(1, window=win)
            transform = src.window_transform(win)
    inside = geometry_mask([geom], out_shape=data.shape, transform=transform, invert=True, all_touched=False)
    return np.ma.array(data, mask=~inside)


def scl_counts(scl: np.ma.MaskedArray) -> dict[str, int]:
    v = scl.compressed()
    return {"sample_count": int(v.size), "no_data_count": int((v == SCL_NODATA).sum()),
            "n_veg": int((v == SCL_VEG).sum()), "n_bare": int((v == SCL_BARE).sum()), "n_water": int((v == SCL_WATER).sum())}


def mean_ndvi(red: np.ma.MaskedArray, nir: np.ma.MaskedArray, scl10: np.ma.MaskedArray,
              scale: float, offset: float) -> float | None:
    """EQ-007 over pixels with SCL in {4, 5} and B08 + B04 != 0 (reflectance = DN * scale + offset)."""
    ok = ~red.mask & ~nir.mask & np.isin(scl10.filled(0), (SCL_VEG, SCL_BARE)) & (red.data > 0) & (nir.data > 0)
    r = red.data[ok] * scale + offset
    n = nir.data[ok] * scale + offset
    s = n + r
    keep = s != 0
    if not keep.any():
        return None
    return float(np.mean((n[keep] - r[keep]) / s[keep]))


def _band_scale(asset: Mapping[str, Any]) -> tuple[float, float]:
    b = (asset.get("raster:bands") or [{}])[0]
    return float(b.get("scale") or 1.0), float(b.get("offset") or 0.0)


def refresh(site_id: str, geometry: Mapping[str, Any], *, is_demo: bool, now: datetime | None = None,
            searcher: Callable[..., list[dict]] = search) -> dict[str, Any]:
    """One `current` evidence item for the site from the clearest scene in the window. Raises UpstreamError."""
    now = now or datetime.now(timezone.utc)
    start = now - timedelta(days=C.S2_WINDOW_DAYS)
    scenes = searcher(geometry, start, now)
    base = {"site_id": site_id, "question": "current", "source_type": "sentinel2", "source_name": SOURCE_NAME,
            "method": METHOD, "spatial_resolution_m": 20, "limitation": LIMITATION, "is_demo": is_demo}
    if not scenes:
        return {**base, "observed_from": start, "observed_to": now, "usable": False, "finding": None,
                "unusable_reason": f"no Sentinel-2 scene in the last {C.S2_WINDOW_DAYS} days", "metrics": [],
                "raw": {"window_days": C.S2_WINDOW_DAYS, "scenes_checked": []}}

    checked, best = [], None
    with rasterio.Env(**GDAL_ENV):
        for item in scenes[:MAX_SCENES]:
            try:
                scl = _read_in_polygon(item["assets"]["scl"]["href"], geometry)
            except Exception as e:
                raise UpstreamError(f"could not read {item['id']}: {e}") from e
            counts = scl_counts(scl)
            v = eq005_valid_fraction(counts["sample_count"], counts["no_data_count"],
                                     counts["n_veg"] + counts["n_bare"] + counts["n_water"])
            checked.append({"id": item["id"], "datetime": item["properties"]["datetime"],
                            "cloud_cover": item["properties"].get("eo:cloud_cover"), "valid_fraction": round(v["f_valid"], 4)})
            if best is None or v["f_valid"] > best[1]["f_valid"]:
                best = (item, v, counts)
            if v["f_valid"] >= 0.99:
                break

        item, valid, counts = best
        ndvi = None
        if valid["usable"]:
            try:
                scale, offset = _band_scale(item["assets"]["red"])
                red = _read_in_polygon(item["assets"]["red"]["href"], geometry)
                nir = _read_in_polygon(item["assets"]["nir"]["href"], geometry)
                scl10 = _read_in_polygon(item["assets"]["scl"]["href"], geometry, out_shape=red.shape)
                h, w = min(red.shape[0], nir.shape[0]), min(red.shape[1], nir.shape[1])
                ndvi = mean_ndvi(red[:h, :w], nir[:h, :w], scl10[:h, :w], scale, offset)
            except Exception as e:
                raise UpstreamError(f"could not read bands of {item['id']}: {e}") from e

    when = datetime.fromisoformat(item["properties"]["datetime"].replace("Z", "+00:00"))
    self_link = next((l["href"] for l in item.get("links", []) if l.get("rel") == "self"), None)
    metrics = [valid["metric"]]
    out = {**base, "observed_from": when, "observed_to": when, "provenance_url": self_link,
           "source_version": f"{COLLECTION}, processing baseline {item['properties'].get('s2:processing_baseline', '?')}",
           "raw": {"stac_item": item["id"], "window_days": C.S2_WINDOW_DAYS, "counts": counts, "scenes_checked": checked}}
    if not valid["usable"]:
        return {**out, "usable": False, "finding": None, "unusable_reason": valid["unusable_reason"], "metrics": metrics}

    cur = eq006_current(counts["n_veg"], counts["n_bare"], counts["n_water"])
    metrics += cur["metrics"]
    if ndvi is not None:
        metrics.append(metric(round(ndvi, 3), "index", "EQ-007", LOW, name="mean_ndvi"))
    return {**out, "usable": cur["usable"], "finding": cur["finding"], "unusable_reason": cur["unusable_reason"],
            "metrics": metrics}
