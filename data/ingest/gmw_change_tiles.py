"""Build the Philippines GMW mangrove change layer (gain / loss) that API-025 serves as map tiles (ADR-050).

Input:  GMW v4.1.12 change stacks against a baseline year B (1985, 1990, 2000, 2010), one GeoTIFF per 1x1 degree
        tile named GMW_N{top-lat:02d}E{lon:03d}_v4112_mng_chng_base{B}.tif, found under --chng-dir. Band n is the
        change between year B + n and B; values 1 = gain, 2 = loss, 0 = no change (GMW README, Zenodo 21346457).
Output: --out-dir/change/base{B}/{year}/<tile>_{year}.tif for each LAYER_YEARS year after B with any change in the
        tile: two uint8 bands (1 = gain, 2 = loss; 0 / 255), 512 px tiles, deflate, averaged overviews; plus
        --out-dir/change_index.json listing bases, years and files with their lon/lat bounds.

Offline build, run once on the demo host (data/ingest/README.md). GMW is never called at runtime.
Usage: python gmw_change_tiles.py --chng-dir <dir> --out-dir <dir>
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone

import numpy as np
import rasterio
from rasterio.enums import Resampling

VERSION = "v4.1.12"
BASES = [1985, 1990, 2000, 2010]
LAYER_YEARS = list(range(1985, 2026, 5))  # same years as the extent layer (ADR-048)
PH_BBOX = (116.0, 4.0, 127.0, 22.0)
NAME = re.compile(r"GMW_N(\d{2})E(\d{3})_v4112_mng_chng_base(\d{4})\.tif$")
OVERVIEWS = [2, 4, 8, 16, 32, 64]


def _one_tile(path: str, out_dir: str) -> list[tuple[int, int, dict]]:
    """Write the gain/loss files for one GMW change tile; return (base, year, index entry) rows."""
    m = NAME.search(path)
    top, lon, base = int(m.group(1)), int(m.group(2)), int(m.group(3))
    bounds = [float(lon), float(top - 1), float(lon + 1), float(top)]
    years = [y for y in LAYER_YEARS if y > base]
    rows: list[tuple[int, int, dict]] = []
    with rasterio.open(path) as src:
        profile = {"driver": "GTiff", "width": src.width, "height": src.height, "count": 2, "dtype": "uint8",
                   "crs": src.crs, "transform": src.transform, "tiled": True, "blockxsize": 512, "blockysize": 512,
                   "compress": "deflate", "predictor": 2, "interleave": "band"}
        stack = src.read([y - base for y in years])  # one pass: the source bands are pixel-interleaved
    for band, year in zip(stack, years):
        gain, loss = band == 1, band == 2
        if not (gain.any() or loss.any()):
            continue
        out = os.path.join(out_dir, "change", f"base{base}", str(year), os.path.basename(path).replace(".tif", f"_{year}.tif"))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with rasterio.open(out, "w", **profile) as dst:
            dst.write(np.where(gain, 255, 0).astype("uint8"), 1)
            dst.write(np.where(loss, 255, 0).astype("uint8"), 2)
            dst.build_overviews(OVERVIEWS, Resampling.average)
            dst.update_tags(ns="rio_overview", resampling="average")
            dst.update_tags(source=f"Global Mangrove Watch {VERSION} change vs {base}", year=str(year),
                            gain_pixels=str(int(gain.sum())), loss_pixels=str(int(loss.sum())))
        rows.append((base, year, {"file": os.path.relpath(out, out_dir).replace(os.sep, "/"), "bounds": bounds}))
    return rows


def build(chng_dir: str, out_dir: str, workers: int = 2) -> dict:
    paths = []
    for path in sorted(glob.glob(os.path.join(chng_dir, "**", "*.tif"), recursive=True)):
        m = NAME.search(path)
        if not m:
            continue
        lat_top, lon = int(m.group(1)), int(m.group(2))
        if lon < PH_BBOX[2] and lon + 1 > PH_BBOX[0] and lat_top - 1 < PH_BBOX[3] and lat_top > PH_BBOX[1]:
            paths.append(path)
    index: dict = {"version": VERSION, "bbox": list(PH_BBOX), "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                   "bases": {str(b): {str(y): [] for y in LAYER_YEARS if y > b} for b in BASES}}
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for path, rows in zip(paths, pool.map(_one_tile, paths, [out_dir] * len(paths))):
            for base, year, entry in rows:
                index["bases"][str(base)][str(year)].append(entry)
            print(f"ok {os.path.basename(path)}", flush=True)
    with open(os.path.join(out_dir, "change_index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))
    print("bases:", {b: {y: len(v) for y, v in ys.items()} for b, ys in index["bases"].items()}, flush=True)
    return index


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--chng-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    a = ap.parse_args()
    build(a.chng_dir, a.out_dir)


if __name__ == "__main__":
    main()
