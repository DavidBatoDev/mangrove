"""Build the Philippines-wide GMW mangrove extent layer that API-024 serves as map tiles (ADR-048).

Input:  GMW v4.1.12 extent stacks (one 1x1 degree GeoTIFF per tile, 41 bands, band 1 = 1985 ... band 41 = 2025,
        DN 1 = mangrove), named GMW_N{top-lat:02d}E{lon:03d}_v4112_mng_ext.tif, found anywhere under --stack-dir.
Output: --out-dir/{year}/GMW_N..E..._v4112_mng_ext_{year}.tif for each LAYER_YEARS year that has mangrove in that
        tile: one uint8 band (0 = none, 255 = mangrove), 512 px tiles, deflate, with averaged overviews so a zoomed-out
        map tile still shows thin mangrove fringes (any value > 0 means "some mangrove under this pixel"), plus
        --out-dir/index.json listing each year's files and their lon/lat bounds.

This is an offline build, run once on the demo host (see data/ingest/README.md). GMW is never called at runtime.
Usage:  python gmw_tiles.py --stack-dir <dir> --out-dir <dir>
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
from datetime import datetime, timezone

import numpy as np
import rasterio
from rasterio.enums import Resampling

VERSION = "v4.1.12"
FIRST_YEAR = 1985  # band 1
LAYER_YEARS = list(range(1985, 2026, 5))  # same years as API-023 and the site trend card (ADR-045)
# The Philippines with a margin: tiles whose lon/lat box touches this are built (neighbours' coasts are harmless).
PH_BBOX = (116.0, 4.0, 127.0, 22.0)  # west, south, east, north
NAME = re.compile(r"GMW_N(\d{2})E(\d{3})_v4112_mng_ext\.tif$")
OVERVIEWS = [2, 4, 8, 16, 32, 64]


def tile_bounds(lat_top: int, lon_left: int) -> tuple[float, float, float, float]:
    return (float(lon_left), float(lat_top - 1), float(lon_left + 1), float(lat_top))


def intersects(a, b) -> bool:
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


def build(stack_dir: str, out_dir: str) -> dict:
    paths = sorted(p for p in glob.glob(os.path.join(stack_dir, "**", "*.tif"), recursive=True) if NAME.search(p))
    index: dict = {"version": VERSION, "bbox": list(PH_BBOX), "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                   "years": LAYER_YEARS, "tiles": {str(y): [] for y in LAYER_YEARS}}
    for path in paths:
        m = NAME.search(path)
        b = tile_bounds(int(m.group(1)), int(m.group(2)))
        if not intersects(b, PH_BBOX):
            continue
        with rasterio.open(path) as src:
            profile = {"driver": "GTiff", "width": src.width, "height": src.height, "count": 1, "dtype": "uint8",
                       "crs": src.crs, "transform": src.transform, "tiled": True, "blockxsize": 512, "blockysize": 512,
                       "compress": "deflate", "predictor": 2, "interleave": "band"}
            for year in LAYER_YEARS:
                band = src.read(year - FIRST_YEAR + 1)
                n = int(np.count_nonzero(band == 1))
                if n == 0:
                    continue
                out = os.path.join(out_dir, str(year), os.path.basename(path).replace(".tif", f"_{year}.tif"))
                os.makedirs(os.path.dirname(out), exist_ok=True)
                with rasterio.open(out, "w", **profile) as dst:
                    dst.write(np.where(band == 1, 255, 0).astype("uint8"), 1)
                    dst.build_overviews(OVERVIEWS, Resampling.average)
                    dst.update_tags(ns="rio_overview", resampling="average")
                    dst.update_tags(source=f"Global Mangrove Watch {VERSION}", year=str(year), mangrove_pixels=str(n))
                index["tiles"][str(year)].append({"file": os.path.relpath(out, out_dir).replace(os.sep, "/"), "bounds": list(b)})
        print(f"ok {os.path.basename(path)}", flush=True)
    with open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))
    print("years:", {y: len(v) for y, v in index["tiles"].items()}, flush=True)
    return index


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--stack-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    build(a.stack_dir, a.out_dir)


if __name__ == "__main__":
    main()
