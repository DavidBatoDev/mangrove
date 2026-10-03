"""API-024: Global Mangrove Watch v4.1.12 mangrove extent as 256 px Web Mercator map tiles (ADR-048).

Reads the per-year GeoTIFFs built offline by data/ingest/gmw_tiles.py (directory GMW_TILE_DIR, with index.json).
Context only: a tile is a picture of GMW's classification. It sets no status and carries no number (BR-003).

Color: GMW-style cyan, brand token `--mg-data-mangrove` (#1FCFCF, ADR-049), near-opaque like GMW's own viewer.
Zoomed out (z <= DILATE_MAX_ZOOM) every mangrove pixel is grown by one screen pixel so thin coastal fringes read.
Responses carry `Access-Control-Allow-Origin: *` (public data) so a local or fixtures-mode web app can use them.
"""

from __future__ import annotations

import json
import math
import os
import warnings
from functools import lru_cache
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.errors import NotGeoreferencedWarning
from rasterio.io import MemoryFile
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT

from .errors import ApiError

TILE = 256
MAX_ZOOM = 16
WEB_MERCATOR = CRS.from_epsg(3857)
HALF_WORLD = 20037508.342789244
DATA_MANGROVE = (0x1F, 0xCF, 0xCF)  # brand --mg-data-mangrove (ADR-049)
ALPHA_MIN, ALPHA_MAX = 215, 250
DILATE_MAX_ZOOM = 10
STYLE = "cyan-1"  # bump when the look changes; clients put it in the tile URL to bust browser caches


def tile_dir() -> Path:
    return Path(os.environ.get("GMW_TILE_DIR", "/data/gmw-tiles"))


@lru_cache(maxsize=1)
def _index_for(path: str, mtime: float) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def index() -> dict:
    p = tile_dir() / "index.json"
    if not p.is_file():
        raise ApiError(503, "UPSTREAM_UNAVAILABLE", "The mangrove extent layer is not installed on this server")
    return _index_for(str(p), p.stat().st_mtime)


def layer_info() -> dict:
    ix = index()
    return {"years": ix["years"], "version": ix["version"], "bbox": ix["bbox"], "max_zoom": MAX_ZOOM, "style": STYLE,
            "tiles": "/api/v1/layers/gmw-extent/tiles/{year}/{z}/{x}/{y}.png",
            "source": {"name": "Global Mangrove Watch", "version": ix["version"],
                       "provenance_url": "https://doi.org/10.5281/zenodo.21346457"}}


def _mercator_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    size = 2 * HALF_WORLD / (1 << z)
    left = -HALF_WORLD + x * size
    top = HALF_WORLD - y * size
    return left, top - size, left + size, top


def _lonlat_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    n = 1 << z

    def lat(yy: int) -> float:
        return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yy / n))))

    return x / n * 360.0 - 180.0, lat(y + 1), (x + 1) / n * 360.0 - 180.0, lat(y)


def _png(rgba: np.ndarray) -> bytes:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", NotGeoreferencedWarning)
        with MemoryFile() as mem:
            with mem.open(driver="PNG", width=TILE, height=TILE, count=4, dtype="uint8") as dst:
                dst.write(rgba)
            return mem.read()


EMPTY_PNG = _png(np.zeros((4, TILE, TILE), dtype="uint8"))


@lru_cache(maxsize=4096)
def _render(root: str, year: int, z: int, x: int, y: int, built_at: str) -> bytes:
    ix = index()
    w, s, e, n = _lonlat_bounds(z, x, y)
    files = [t["file"] for t in ix["tiles"].get(str(year), [])
             if t["bounds"][0] < e and t["bounds"][2] > w and t["bounds"][1] < n and t["bounds"][3] > s]
    if not files:
        return EMPTY_PNG
    dst_transform = from_bounds(*_mercator_bounds(z, x, y), TILE, TILE)
    acc = np.zeros((TILE, TILE), dtype="uint8")
    for f in files:
        with rasterio.open(Path(root) / f) as src, WarpedVRT(
            src, crs=WEB_MERCATOR, transform=dst_transform, width=TILE, height=TILE,
            resampling=Resampling.max, src_nodata=None, nodata=None,
        ) as vrt:
            np.maximum(acc, vrt.read(1), out=acc)
    if not acc.any():
        return EMPTY_PNG
    core = acc > 0
    shown = core.copy()
    if z <= DILATE_MAX_ZOOM:  # grow by one pixel (4-neighbour) so thin fringes stay visible zoomed out
        shown[1:, :] |= core[:-1, :]
        shown[:-1, :] |= core[1:, :]
        shown[:, 1:] |= core[:, :-1]
        shown[:, :-1] |= core[:, 1:]
    alpha = np.where(core, ALPHA_MIN + (acc.astype("uint16") * (ALPHA_MAX - ALPHA_MIN) // 255), np.where(shown, ALPHA_MIN, 0)).astype("uint8")
    rgba = np.zeros((4, TILE, TILE), dtype="uint8")
    for i, c in enumerate(DATA_MANGROVE):
        rgba[i][shown] = c
    rgba[3] = alpha
    return _png(rgba)


def tile_png(year: int, z: int, x: int, y: int) -> bytes:
    ix = index()
    if year not in ix["years"]:
        raise ApiError(422, "VALIDATION_FAILED", f"year must be one of {ix['years']}")
    if not (0 <= z <= MAX_ZOOM and 0 <= x < (1 << z) and 0 <= y < (1 << z)):
        raise ApiError(422, "VALIDATION_FAILED", f"tile {z}/{x}/{y} is outside zoom 0-{MAX_ZOOM}")
    return _render(str(tile_dir()), year, z, x, y, ix.get("built_at", "") + STYLE)
