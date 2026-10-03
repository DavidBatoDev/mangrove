"""Offline Sentinel-2 L2A "What's there now?" ingest (DS-002; EQ-005, EQ-006, EQ-007; ADR-042). Never runs at request time.

    api/.venv/bin/python data/ingest/s2_ingest.py --target test [--as-of 2026-10-04] [--site <uuid> ...]

Per site:
1. Earth Search STAC, collection sentinel-2-c1-l2a, every scene intersecting the polygon in
   [t - S2_WINDOW_DAYS, t]. EQ-005 on the SCL band (20 m, pixel centres inside the polygon); the scene with the
   highest valid fraction is used (newest wins a tie). EQ-006 class fractions and the finding; EQ-007 mean NDVI
   (red/nir, 10 m) as context.
2. Pictures: a true-colour PNG chip from that scene's `visual` asset (site bbox + CHIP_MARGIN_M, CHIP_PX square,
   site outline drawn), and a "then" chip from the earliest 2016-2017 scene of the same window whose polygon is
   at least MIN_VALID_FRACTION cloud-free (collection sentinel-2-l2a: Collection 1 has no 2016-2017 scenes over
   these sites). Both are stored as api/app/evidence_assets/<sha256>.png and committed with the repo.
3. ONE `current` evidence item through the ledger as the app role; the current chip is its asset, the "then"
   chip's sha is in `raw.then_asset_sha256`. Skipped when the site already has a sentinel2 item for the scene
   (append-only).
"""

from __future__ import annotations

import argparse
import hashlib
import io
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import psycopg
import rasterio
from dotenv import load_dotenv
from PIL import Image, ImageDraw
from psycopg.rows import dict_row
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.transform import from_origin
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform_geom
from rasterio.windows import Window, from_bounds

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "api"))
load_dotenv(ROOT / ".env")

from engine import constants as C  # noqa: E402
from engine import equations as E  # noqa: E402
from ledger.records import insert_evidence  # noqa: E402

STAC = "https://earth-search.aws.element84.com/v1"
COLLECTION = "sentinel-2-c1-l2a"
THEN_COLLECTION = "sentinel-2-l2a"  # Collection 1 starts too late here; same Copernicus L2A product, older processing
THEN_RANGE = "2016-01-01T00:00:00Z/2017-12-31T23:59:59Z"
SOURCE_NAME = "Sentinel-2 L2A (Earth Search)"
ASSET_DIR = ROOT / "api" / "app" / "evidence_assets"
CHIP_PX = 512
CHIP_MARGIN_M = 300
OUTLINE_RGB = (0xC8, 0xD5, 0x45)  # brand Propagule: the one thing to look at
GDAL_ENV = {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif",
            "GDAL_HTTP_MAX_RETRY": "4", "GDAL_HTTP_RETRY_DELAY": "1", "AWS_NO_SIGN_REQUEST": "YES"}
LIMITS = ("SCL \"vegetation\" does not tell mangrove from other vegetation; tide state at acquisition changes the "
          "water fraction; an active fishpond and open water look alike from space, so only ground evidence settles "
          "land use; 20 m pixels cannot see seedlings, and months after planting satellite cannot confirm planting.")


# --- STAC ----------------------------------------------------------------------------------------------

def stac_search(http: httpx.Client, collection: str, geom: dict, datetime_range: str, asc: bool = False) -> list[dict]:
    body: dict[str, Any] = {"collections": [collection], "intersects": geom, "datetime": datetime_range, "limit": 100,
                            "sortby": [{"field": "properties.datetime", "direction": "asc" if asc else "desc"}]}
    items: list[dict] = []
    req: tuple[str, str, dict | None] = ("POST", f"{STAC}/search", body)
    while req:
        method, url, payload = req
        r = http.request(method, url, json=payload) if method == "POST" else http.get(url)
        r.raise_for_status()
        page = r.json()
        items += page["features"]
        nxt = next((link for link in page.get("links", []) if link.get("rel") == "next"), None)
        req = (nxt.get("method", "GET"), nxt["href"], nxt.get("body")) if nxt else None
    return items


def self_link(item: dict) -> str:
    return next(link["href"] for link in item["links"] if link["rel"] == "self")


def scene_time(item: dict) -> datetime:
    return datetime.fromisoformat(item["properties"]["datetime"].replace("Z", "+00:00"))


# --- EQ-005 / EQ-006 / EQ-007 ----------------------------------------------------------------------------

def _window(ds, geom_ds: dict, pad: int = 1) -> Window:
    xs, ys = [], []

    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for x in c:
                walk(x)

    walk(geom_ds["coordinates"])
    w = from_bounds(min(xs), min(ys), max(xs), max(ys), ds.transform).round_offsets().round_lengths()
    return Window(w.col_off - pad, w.row_off - pad, w.width + 2 * pad, w.height + 2 * pad)


def scl_counts(item: dict, geom: dict) -> dict[str, Any]:
    """EQ-005 inputs on the native 20 m SCL grid: pixel centres inside the polygon (all_touched=False)."""
    with rasterio.Env(**GDAL_ENV), rasterio.open(item["assets"]["scl"]["href"]) as ds:
        g = transform_geom("EPSG:4326", ds.crs, geom)
        w = _window(ds, g)
        scl = ds.read(1, window=w, boundless=True, fill_value=0)
        inside = ~geometry_mask([g], out_shape=scl.shape, transform=ds.window_transform(w), all_touched=False)
    v = scl[inside]
    n = {k: int((v == code).sum()) for k, code in
         (("veg", C.SCL_VEGETATION), ("bare", C.SCL_BARE_SOIL), ("water", C.SCL_WATER))}
    out = {"n_inside": int(inside.sum()), "n_nodata": int((v == 0).sum()), **{f"n_{k}": x for k, x in n.items()}}
    out["n_valid"] = n["veg"] + n["bare"] + n["water"]
    out["eq005"] = E.eq005_valid_fraction(out["n_inside"], out["n_nodata"], out["n_valid"])
    return out


def _scale_offset(asset: dict) -> tuple[float, float]:
    band = (asset.get("raster:bands") or [{}])[0]
    return float(band.get("scale", 1.0)), float(band.get("offset", 0.0))


def mean_ndvi(item: dict, geom: dict) -> tuple[float | None, int]:
    """EQ-007 over 10 m pixels with centre inside, SCL (nearest-resampled to 10 m) in {4, 5}, B08 + B04 != 0."""
    with rasterio.Env(**GDAL_ENV):
        with rasterio.open(item["assets"]["red"]["href"]) as red_ds, rasterio.open(item["assets"]["nir"]["href"]) as nir_ds:
            g = transform_geom("EPSG:4326", red_ds.crs, geom)
            w = _window(red_ds, g)
            tr = red_ds.window_transform(w)
            red_dn = red_ds.read(1, window=w, boundless=True, fill_value=0).astype("float64")
            nir_dn = nir_ds.read(1, window=w, boundless=True, fill_value=0).astype("float64")
        with rasterio.open(item["assets"]["scl"]["href"]) as scl_ds:
            vrt_opts = {"crs": red_ds.crs, "transform": tr, "width": red_dn.shape[1], "height": red_dn.shape[0],
                        "resampling": Resampling.nearest}
            with WarpedVRT(scl_ds, **vrt_opts) as vrt:
                scl = vrt.read(1)
    inside = ~geometry_mask([g], out_shape=red_dn.shape, transform=tr, all_touched=False)
    rs, ro = _scale_offset(item["assets"]["red"])
    ns, no = _scale_offset(item["assets"]["nir"])
    red, nir = red_dn * rs + ro, nir_dn * ns + no
    ok = inside & np.isin(scl, (C.SCL_VEGETATION, C.SCL_BARE_SOIL)) & (red_dn > 0) & (nir_dn > 0) & ((red + nir) != 0)
    if not ok.any():
        return None, 0
    ndvi = (nir[ok] - red[ok]) / (nir[ok] + red[ok])
    return float(ndvi.mean()), int(ok.sum())


# --- pictures --------------------------------------------------------------------------------------------

def chip_grid(item: dict, geom: dict) -> dict[str, Any]:
    """A square CHIP_PX grid in the scene's UTM CRS: polygon bbox + CHIP_MARGIN_M, centred."""
    with rasterio.Env(**GDAL_ENV), rasterio.open(item["assets"]["visual"]["href"]) as ds:
        crs = ds.crs
    g = transform_geom("EPSG:4326", crs, geom)
    xs, ys = [], []

    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for x in c:
                walk(x)

    walk(g["coordinates"])
    side = max(max(xs) - min(xs), max(ys) - min(ys)) + 2 * CHIP_MARGIN_M
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    res = side / CHIP_PX
    return {"crs": crs, "transform": from_origin(cx - side / 2, cy + side / 2, res, res), "side_m": side,
            "geom": g}


def render_chip(item: dict, grid: dict) -> bytes:
    with rasterio.Env(**GDAL_ENV), rasterio.open(item["assets"]["visual"]["href"]) as ds:
        with WarpedVRT(ds, crs=grid["crs"], transform=grid["transform"], width=CHIP_PX, height=CHIP_PX,
                       resampling=Resampling.bilinear) as vrt:
            rgb = vrt.read((1, 2, 3))
    img = Image.fromarray(np.ascontiguousarray(np.moveaxis(rgb, 0, -1).astype("uint8")))
    draw = ImageDraw.Draw(img)
    inv = ~grid["transform"]
    polys = grid["geom"]["coordinates"] if grid["geom"]["type"] == "MultiPolygon" else [grid["geom"]["coordinates"]]
    for poly in polys:
        for ring in poly:
            pts = [tuple(inv * (x, y)) for x, y in ring]
            draw.line(pts, fill=OUTLINE_RGB, width=3, joint="curve")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def store_png(png: bytes) -> str:
    sha = hashlib.sha256(png).hexdigest()
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    path = ASSET_DIR / f"{sha}.png"
    if not path.exists():
        path.write_bytes(png)
    return sha


def then_scene(http: httpx.Client, geom: dict) -> tuple[dict, dict] | None:
    """Earliest 2016-2017 scene whose polygon is fully covered and >= MIN_VALID_FRACTION cloud-free."""
    for item in stac_search(http, THEN_COLLECTION, geom, THEN_RANGE, asc=True):
        try:
            c = scl_counts(item, geom)
        except rasterio.errors.RasterioIOError:
            continue
        if c["n_inside"] and c["n_nodata"] == 0 and c["eq005"]["usable"]:
            return item, c
    return None


# --- ingest ----------------------------------------------------------------------------------------------

def ingest_site(http: httpx.Client, conn: psycopg.Connection, s: dict, as_of: datetime,
                dry_run: bool = False) -> dict[str, Any] | None:
    geom = s["geom"]
    start = as_of - timedelta(days=C.S2_WINDOW_DAYS)
    rng = f"{start.strftime('%Y-%m-%dT%H:%M:%SZ')}/{as_of.strftime('%Y-%m-%dT%H:%M:%SZ')}"
    items = stac_search(http, COLLECTION, geom, rng)
    if not items:
        print(f"skip {s['name']}: no {COLLECTION} scene in {rng}")
        return None
    with ThreadPoolExecutor(max_workers=8) as pool:
        counts = list(pool.map(lambda it: scl_counts(it, geom), items))
    # EQ-005: the scene with the highest valid fraction; the newest wins an exact tie.
    best_i = max(range(len(items)), key=lambda i: (counts[i]["eq005"]["f_valid"], scene_time(items[i])))
    item, c = items[best_i], counts[best_i]
    scene_id = item["id"]
    done = conn.execute(
        "SELECT 1 FROM evidence_item WHERE site_id = %s AND source_type = 'sentinel2' AND source_version = %s",
        (s["id"], scene_id),
    ).fetchone()
    if done:
        print(f"skip {s['name']}: {scene_id} already ingested")
        return None

    v = c["eq005"]
    cur = E.eq006_current(c["n_veg"], c["n_bare"], c["n_water"])
    ndvi, n_ndvi = mean_ndvi(item, geom)
    usable = v["usable"] and cur["usable"]
    reason = v["unusable_reason"] if not v["usable"] else cur["unusable_reason"]
    metrics = [v["metric"], *cur["metrics"]]
    if ndvi is not None:
        metrics.append(E.metric(round(ndvi, 3), "NDVI", "EQ-007", E.LOW, name="mean_ndvi"))

    t = scene_time(item)
    grid = chip_grid(item, geom)
    now_sha = store_png(render_chip(item, grid))
    then = then_scene(http, geom)
    then_sha = then_t = None
    raw: dict[str, Any] = {
        "collection": COLLECTION, "as_of": as_of.date().isoformat(), "window_days": C.S2_WINDOW_DAYS,
        "scenes_considered": len(items), "scene_cloud_cover": item["properties"].get("eo:cloud_cover"),
        "pixels": {k: c[k] for k in ("n_inside", "n_nodata", "n_valid", "n_veg", "n_bare", "n_water")},
        "ndvi_pixels": n_ndvi,
        "chip": {"crs": str(grid["crs"]), "side_m": round(grid["side_m"], 1), "px": CHIP_PX, "margin_m": CHIP_MARGIN_M},
    }
    note = None
    if then:
        then_item, then_c = then
        then_t = scene_time(then_item)
        then_sha = store_png(render_chip(then_item, grid))
        raw.update({"then_asset_sha256": then_sha, "then_scene_id": then_item["id"],
                    "then_datetime": then_item["properties"]["datetime"], "then_collection": THEN_COLLECTION,
                    "then_provenance_url": self_link(then_item),
                    "then_valid_fraction": round(then_c["eq005"]["f_valid"], 4)})
        note = (f"Then picture: Sentinel-2 L2A scene {then_item['id']} ({then_t.date().isoformat()}, collection "
                f"{THEN_COLLECTION}), same window. A picture only; no number is computed from it.")

    credit_years = sorted({t.year, *( [then_t.year] if then_t else [])})
    limitation = (f"{LIMITS} Pictures are true-colour (TCI) chips with the site outline drawn in. "
                  f"Contains modified Copernicus Sentinel data {' and '.join(str(y) for y in credit_years)}.")
    method = (f"EQ-005: over Sentinel-2 L2A SCL pixels (20 m) with centre inside the site, f_valid = n(SCL in "
              f"{{4,5,6}}) / n(SCL != 0); the best of {len(items)} scenes in [t - S2_WINDOW_DAYS {C.S2_WINDOW_DAYS} d, "
              f"t = {as_of.date().isoformat()}]; usable iff f_valid >= MIN_VALID_FRACTION {C.MIN_VALID_FRACTION}. "
              f"EQ-006: finding = the largest of the SCL 4/5/6 fractions of valid pixels. EQ-007: mean NDVI "
              f"(B08 - B04)/(B08 + B04) on 10 m pixels with centre inside and SCL (nearest to 10 m) in {{4,5}}, "
              f"context only.")
    evidence = {
        "site_id": s["id"], "question": "current", "source_type": "sentinel2",
        "source_name": SOURCE_NAME, "source_version": scene_id,
        "observed_from": t, "observed_to": t, "retrieved_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "finding": cur["finding"] if usable else None, "usable": usable,
        "unusable_reason": None if usable else reason, "metrics": metrics, "method": method,
        "spatial_resolution_m": 20, "limitation": limitation, "provenance_url": self_link(item),
        "asset_sha256": now_sha, "asset_mime": "image/png", "raw": raw, "note": note,
        "is_demo": False,  # real Sentinel-2 data; a demo site itself carries the demo label
    }
    if dry_run:
        print(f"dry-run {s['name']}: {method}")
    else:
        with conn.transaction():
            insert_evidence(conn, evidence)
    out = {"site": s["name"], "scene": scene_id, "date": t.date().isoformat(), "f_valid": v["f_valid"],
           "finding": cur["finding"] if usable else f"unusable ({reason})", "ndvi": ndvi,
           "now_png": f"{now_sha}.png", "then": then_item["id"] if then else None,
           "then_png": f"{then_sha}.png" if then_sha else None,
           "coverage": 1 - c["n_nodata"] / c["n_inside"] if c["n_inside"] else 0.0,
           "fractions": {m["name"]: m["value"] for m in cur["metrics"]}}
    print(f"ok {out}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["test", "main"], required=True)
    ap.add_argument("--as-of", help="t for EQ-005's window, YYYY-MM-DD (default: today, UTC)")
    ap.add_argument("--site", action="append", help="limit to these site ids")
    ap.add_argument("--dry-run", action="store_true", help="compute and render; write nothing to the database")
    a = ap.parse_args()
    as_of = (datetime.fromisoformat(a.as_of).replace(tzinfo=timezone.utc) + timedelta(days=1, seconds=-1)
             if a.as_of else datetime.now(timezone.utc))
    prefix = "TEST_" if a.target == "test" else ""
    owner, app = os.environ[f"{prefix}DATABASE_URL_DIRECT"], os.environ[f"{prefix}DATABASE_URL"]
    with psycopg.connect(owner, row_factory=dict_row) as conn:
        sites = conn.execute("SELECT id, name, ST_AsGeoJSON(geom)::json AS geom FROM site ORDER BY name").fetchall()
    if a.site:
        sites = [s for s in sites if str(s["id"]) in a.site]
    with httpx.Client(timeout=60, headers={"User-Agent": "aide-m-s2-ingest"}) as http, \
            psycopg.connect(app, row_factory=dict_row, prepare_threshold=None) as conn:
        for s in sites:
            ingest_site(http, conn, s, as_of, a.dry_run)


if __name__ == "__main__":
    main()
