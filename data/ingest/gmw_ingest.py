"""Offline Global Mangrove Watch v4.1.12 ingest (DS-001, DS-007; ADR-045). Never runs at request time.

    data/ingest/.venv/Scripts/python data/ingest/gmw_ingest.py --target test \
        --stack-dir <dir with GMW_N15E120_v4112_mng_ext.tif> \
        --stats-xlsx <gmw_v4_timeseries_4112_gmw_country_stats_corr_area_formatted.xlsx> \
        --chng-dir <dir with PHL_{gains,losses}_gmw_v4112_gmw_cntry_def_corr_area*.parquet> \
        [--context-only | --sites-only]

1. Per site: EQ-002 (mangrove inside the polygon) and EQ-014 (within NEARBY_BUFFER_M, outside the polygon)
   for every year 1985-2025, EQ-003's history finding, appended as ONE `history` evidence item through the
   ledger as the app role. Skipped when the site already has a GMW item of this version (append-only).
2. Context files served by the API (api/app/context_data/): the Philippines statistics (EQ-015, EQ-016)
   and the Manila Bay extent layer every 5 years.

Inputs come from s3://bon-mangrove-evidence-baf5cf/datasets/gmw/ (see data/ingest/README.md).
"""

from __future__ import annotations

import argparse
import glob
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import psycopg
import rasterio
from dotenv import load_dotenv
from psycopg.rows import dict_row
from rasterio.features import geometry_mask, shapes
from rasterio.windows import Window, from_bounds

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "api"))
load_dotenv(ROOT / ".env")

from engine import constants as C  # noqa: E402
from engine import equations as E  # noqa: E402
from ledger.records import insert_evidence  # noqa: E402

VERSION = "v4.1.12"
YEARS = list(range(1985, 2026))  # band 1 = 1985 … band 41 = 2025
DOI = "https://doi.org/10.5281/zenodo.21346457"
SOURCE = {"name": "Global Mangrove Watch", "version": VERSION, "provenance_url": DOI}
CONTEXT_DIR = ROOT / "api" / "app" / "context_data"
LAYER_YEARS = list(range(1985, 2026, 5))
LAYER_BBOX = (120.45, 14.65, 120.95, 14.90)  # the Manila Bay demo area, sites plus margin
LIMITATION = ("GMW starts in 1985; ponds converted earlier are not visible, so no mangrove recorded does not mean "
              "the site was never mangrove. 30 m modelled classification: cannot see seedlings; accuracy varies "
              "locally (GMW global F1 0.93).")


def pixel_area_by_row(transform, n_rows: int) -> np.ndarray:
    """EQ-002 a_px(φ) for each raster row, at the pixel-centre latitude."""
    lat = transform.f + transform.e * (np.arange(n_rows) + 0.5)
    return np.array([E.eq002_pixel_area_ha(float(p)) for p in lat])


def tile_for(stack_dir: str, lon: float, lat: float) -> str:
    name = f"GMW_N{math.floor(lat) + 1:02d}E{math.floor(lon):03d}_{VERSION.replace('.', '')}_mng_ext.tif"
    hits = glob.glob(os.path.join(stack_dir, "**", name), recursive=True)
    if not hits:
        sys.exit(f"missing GMW tile {name} under {stack_dir}")
    return hits[0]


def site_series(stack_dir: str, site_geom: dict, ring_geom: dict) -> tuple[list[float], list[float]]:
    """(inside, nearby) hectares per year: pixel centres inside the site / inside the buffer ring."""
    xs, ys = [], []

    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for x in c:
                walk(x)

    walk(ring_geom["coordinates"])
    walk(site_geom["coordinates"])
    path = tile_for(stack_dir, (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    with rasterio.open(path) as ds:
        b = ds.bounds
        if not (b.left <= min(xs) and max(xs) <= b.right and b.bottom <= min(ys) and max(ys) <= b.top):
            sys.exit("site plus buffer crosses a GMW tile edge; not handled")
        w = from_bounds(min(xs), min(ys), max(xs), max(ys), ds.transform).round_offsets().round_lengths()
        w = Window(w.col_off - 1, w.row_off - 1, w.width + 2, w.height + 2)
        stack = ds.read(window=w)
        tr = ds.window_transform(w)
    shape = stack.shape[1:]
    inside = ~geometry_mask([site_geom], out_shape=shape, transform=tr, all_touched=False)
    ring = ~geometry_mask([ring_geom], out_shape=shape, transform=tr, all_touched=False) & ~inside
    pa = pixel_area_by_row(tr, shape[0])
    mangrove = stack == 1
    inside_ha = [float((mangrove[i] & inside).sum(axis=1) @ pa) for i in range(len(YEARS))]
    nearby_ha = [float((mangrove[i] & ring).sum(axis=1) @ pa) for i in range(len(YEARS))]
    return inside_ha, nearby_ha


def ingest_sites(stack_dir: str, owner_url: str, app_url: str) -> None:
    with psycopg.connect(owner_url, row_factory=dict_row) as conn:
        sites = conn.execute(
            f"""SELECT id, name, ST_AsGeoJSON(geom)::json AS geom, {E.EQ001_SQL} AS area_ha,
                       ST_AsGeoJSON(ST_Buffer(geom::geography, %s)::geometry)::json AS ring
                FROM site ORDER BY name""",
            (C.NEARBY_BUFFER_M,),
        ).fetchall()
    now = datetime.now(timezone.utc)
    with psycopg.connect(app_url, row_factory=dict_row, prepare_threshold=None) as conn:
        for s in sites:
            done = conn.execute(
                "SELECT 1 FROM evidence_item WHERE site_id = %s AND source_type = 'gmw' AND source_version = %s",
                (s["id"], VERSION),
            ).fetchone()
            if done:
                print(f"skip {s['name']}: GMW {VERSION} already ingested")
                continue
            inside, nearby = site_series(stack_dir, s["geom"], s["ring"])
            hist = E.eq003_history(dict(zip(YEARS, inside)), float(s["area_ha"]))
            metrics = list(hist["metrics"])
            metrics += [E.metric(E.ha(a), "ha", "EQ-002", E.MEDIUM, name=f"inside_mangrove_area_{y}") for y, a in zip(YEARS, inside)]
            metrics += [E.metric(E.ha(a), "ha", "EQ-014", E.MEDIUM, name=f"nearby_mangrove_area_{y}") for y, a in zip(YEARS, nearby)]
            metrics.append(E.metric(C.NEARBY_BUFFER_M, "m", None, E.HIGH, name="nearby_buffer"))
            with conn.transaction():
                insert_evidence(conn, {
                    "site_id": s["id"], "question": "history", "source_type": "gmw",
                    "source_name": "Global Mangrove Watch", "source_version": VERSION,
                    "observed_from": datetime(1985, 1, 1, tzinfo=timezone.utc),
                    "observed_to": datetime(2025, 12, 31, tzinfo=timezone.utc),
                    "retrieved_at": now, "created_at": now,
                    "finding": hist["finding"], "usable": True, "metrics": metrics,
                    "method": (f"EQ-002: sum of GMW {VERSION} DN=1 pixel areas with centre inside the site, 41 annual bands "
                               f"1985-2025; EQ-003: finding = mangrove_recorded iff max area / site area >= "
                               f"HISTORY_MIN_FRACTION {C.HISTORY_MIN_FRACTION}; EQ-014: same sum within "
                               f"NEARBY_BUFFER_M {C.NEARBY_BUFFER_M} m outside the site (context only)."),
                    "spatial_resolution_m": 30, "limitation": LIMITATION, "provenance_url": DOI,
                    "raw": {"tile": os.path.basename(tile_for(stack_dir, s["geom"]["coordinates"][0][0][0][0], s["geom"]["coordinates"][0][0][0][1]))},
                    "is_demo": False,  # real GMW data; the site itself carries the demo label
                })
            print(f"ok {s['name']}: {hist['finding']}, max inside {hist['a_max']:.2f} ha ({hist['y_max']}), "
                  f"nearby 1985 {nearby[0]:.1f} -> 2025 {nearby[-1]:.1f} ha")


def write_country(stats_xlsx: str, chng_dir: str, iso3: str = "PHL") -> None:
    import openpyxl
    import pyarrow.parquet as pq

    wb = openpyxl.load_workbook(stats_xlsx, read_only=True, data_only=True)
    sheets = {}
    for key, title in (("value", "Extent"), ("lower", "lower95th"), ("upper", "upper95th")):
        rows = list(wb[title].iter_rows(values_only=True))
        head = [str(h) for h in rows[0]]
        row = next(r for r in rows[1:] if r[0] == iso3)
        sheets[key] = {int(h): float(v) for h, v in zip(head[2:], row[2:]) if h.isdigit()}
        name = row[1]

    def diag(kind: str) -> dict[int, float]:
        f = glob.glob(os.path.join(chng_dir, "**", f"{iso3}_{kind}_gmw_v4112_gmw_cntry_def_corr_area.parquet"), recursive=True)[0]
        d = pq.read_table(f).to_pydict()
        bases = d.get("__index_level_0__") or list(range(1985, 1985 + len(d["1986"])))
        out = {}
        for i, base in enumerate(bases):
            target = str(int(base) + 1)
            if target in d:
                out[int(target)] = float(d[target][i])
        return out

    gains, losses = diag("gains"), diag("losses")
    m = lambda v: None if v is None else {"value": round(v, 2), "unit": "ha", "eq_id": "EQ-016", "confidence": "medium"}
    years = []
    for y in YEARS:
        g, l = gains.get(y), losses.get(y)
        years.append({
            "year": y,
            "extent": {"value": round(sheets["value"][y], 2), "lower": round(sheets["lower"][y], 2),
                       "upper": round(sheets["upper"][y], 2), "unit": "ha", "eq_id": "EQ-015", "confidence": "medium"},
            "gain": m(g), "loss": m(l), "net": m(None if g is None or l is None else g - l),
        })
    out = {"iso3": iso3, "name": name, "source": SOURCE, "years": years}
    CONTEXT_DIR.mkdir(parents=True, exist_ok=True)
    (CONTEXT_DIR / f"gmw_country_{iso3}.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    first, last = years[0]["extent"]["value"], years[-1]["extent"]["value"]
    print(f"ok {name}: {first:,.0f} ha (1985) -> {last:,.0f} ha (2025); 1986 gain {years[1]['gain']['value']} loss {years[1]['loss']['value']}")


def round_coords(c, places=5):
    return [round_coords(x, places) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], places), round(c[1], places)]


def write_layers(stack_dir: str) -> None:
    cx, cy = (LAYER_BBOX[0] + LAYER_BBOX[2]) / 2, (LAYER_BBOX[1] + LAYER_BBOX[3]) / 2
    path = tile_for(stack_dir, cx, cy)
    CONTEXT_DIR.mkdir(parents=True, exist_ok=True)
    with rasterio.open(path) as ds:
        w = from_bounds(*LAYER_BBOX, ds.transform).round_offsets().round_lengths()
        tr = ds.window_transform(w)
        for y in LAYER_YEARS:
            band = ds.read(YEARS.index(y) + 1, window=w)
            feats = [{"type": "Feature", "properties": {},
                      "geometry": {"type": g["type"], "coordinates": [round_coords(r) for r in g["coordinates"]]}}
                     for g, v in shapes(band, mask=band == 1, transform=tr)]
            fc = {"type": "FeatureCollection", "year": y, "bbox": list(LAYER_BBOX), "source": SOURCE, "features": feats}
            (CONTEXT_DIR / f"gmw_extent_{y}.geojson").write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
            print(f"ok layer {y}: {len(feats)} polygons")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["test", "main"])
    ap.add_argument("--stack-dir", required=True)
    ap.add_argument("--stats-xlsx")
    ap.add_argument("--chng-dir")
    ap.add_argument("--context-only", action="store_true")
    ap.add_argument("--sites-only", action="store_true")
    a = ap.parse_args()
    if not a.sites_only:
        if not (a.stats_xlsx and a.chng_dir):
            sys.exit("--stats-xlsx and --chng-dir are needed for the context files")
        write_country(a.stats_xlsx, a.chng_dir)
        write_layers(a.stack_dir)
    if not a.context_only:
        if not a.target:
            sys.exit("--target test|main is needed to ingest sites")
        prefix = "TEST_" if a.target == "test" else ""
        owner, app = os.environ[f"{prefix}DATABASE_URL_DIRECT"], os.environ[f"{prefix}DATABASE_URL"]
        ingest_sites(a.stack_dir, owner, app)


if __name__ == "__main__":
    main()
