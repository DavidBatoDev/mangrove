"""API-024 / API-025: Global Mangrove Watch v4.1.12 mangrove extent, and change (gain / loss), as 256 px Web Mercator
map tiles (ADR-048, ADR-049, ADR-050).

Reads the per-year GeoTIFFs built offline by data/ingest/gmw_tiles.py (directory GMW_TILE_DIR, with index.json).
Context only: a tile is a picture of GMW's classification. It sets no status and carries no number (BR-003).

Color: GMW-style cyan, brand token `--mg-data-mangrove` (#1FCFCF, ADR-049), near-opaque like GMW's own viewer.
Zoomed out (z <= DILATE_MAX_ZOOM) every mangrove pixel is grown by one screen pixel so thin coastal fringes read.
Tiles up to NATIVE_ZOOM are rendered once and kept on disk (GMW_TILE_CACHE), so restarts and deploys keep them; above it a
tile is cut from its NATIVE_ZOOM parent and enlarged, since GMW's 30 m pixels hold no more detail (ADR-052).
Responses carry `Access-Control-Allow-Origin: *` (public data) so a local or fixtures-mode web app can use them.
"""

from __future__ import annotations

import json
import math
import os
import warnings
import threading
from functools import lru_cache
from pathlib import Path
from typing import Callable

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
MAX_ZOOM = 22  # past ~z16 GMW's 30 m pixels show as blocks, like GMW's own viewer; tiles never vanish when zoomed in
WEB_MERCATOR = CRS.from_epsg(3857)
HALF_WORLD = 20037508.342789244
DATA_MANGROVE = (0x1F, 0xCF, 0xCF)  # brand --mg-data-mangrove (ADR-049)
ALPHA_MIN, ALPHA_MAX = 215, 250
DATA_GAIN = (0x9E, 0xD3, 0x3A)  # brand --mg-data-gain (ADR-050)
DATA_LOSS = (0xE4, 0x47, 0x3A)  # brand --mg-data-loss: GMW-style red for loss, map data only (ADR-050)
DILATE_MAX_ZOOM = 10
# The demo host has 2 CPUs: more parallel GDAL renders only thrash it and starve every other request.
_RENDER_SLOTS = threading.BoundedSemaphore(2)
NATIVE_ZOOM = 12  # rendered from the GeoTIFFs at or below this zoom; enlarged from the parent above it (ADR-052)
STYLE = "cyan-2"  # bump when the look changes; clients put it in the tile URL to bust browser caches


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


COVERAGE_ZOOMS = (7, 10)  # the fixed tile levels the Google map draws and scales: country view, then close (ADR-054)


@lru_cache(maxsize=4)
def _coverage(built_at: str, z: int) -> list[list[int]]:
    """[x, y] of every zoom-z tile over the Philippines that touches a GMW file; all others are empty."""
    ix = index()
    seen: dict[str, dict] = {}
    for entries in ix["tiles"].values():
        for t in entries:
            seen[json.dumps(t["bounds"])] = t
    files = list(seen.values())
    w, s_, e, n = ix["bbox"]
    x0, x1 = int((w + 180) / 360 * (1 << z)), int((e + 180) / 360 * (1 << z))
    ty = lambda lat: int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * (1 << z))
    return [[x, y] for x in range(x0, x1 + 1) for y in range(ty(n), ty(s_) + 1) if _files_for(files, z, x, y)]


def layer_info() -> dict:
    ix = index()
    return {"years": ix["years"], "version": ix["version"], "bbox": ix["bbox"], "max_zoom": MAX_ZOOM, "style": STYLE,
            "coverage": [{"z": z, "tiles": _coverage(ix.get("built_at", ""), z)} for z in COVERAGE_ZOOMS],
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


def _files_for(entries: list[dict], z: int, x: int, y: int) -> list[str]:
    w, s, e, n = _lonlat_bounds(z, x, y)
    return [t["file"] for t in entries if t["bounds"][0] < e and t["bounds"][2] > w and t["bounds"][1] < n and t["bounds"][3] > s]


def _warp_max(root: str, files: list[str], z: int, x: int, y: int, band: int | list[int]) -> np.ndarray:
    """Band(s) of every file, reprojected to the web tile with max resampling, combined by max."""
    dst_transform = from_bounds(*_mercator_bounds(z, x, y), TILE, TILE)
    acc = np.zeros((TILE, TILE) if isinstance(band, int) else (len(band), TILE, TILE), dtype="uint8")
    with _RENDER_SLOTS:
        for f in files:
            with rasterio.open(Path(root) / f) as src, WarpedVRT(
                src, crs=WEB_MERCATOR, transform=dst_transform, width=TILE, height=TILE,
                resampling=Resampling.max, src_nodata=None, nodata=None,
            ) as vrt:
                np.maximum(acc, vrt.read(band), out=acc)
    return acc


def _grow(core: np.ndarray, z: int) -> np.ndarray:
    """Zoomed out, grow by one pixel (4-neighbour) so thin coastal fringes stay visible."""
    shown = core.copy()
    if z <= DILATE_MAX_ZOOM:
        shown[1:, :] |= core[:-1, :]
        shown[:-1, :] |= core[1:, :]
        shown[:, 1:] |= core[:, :-1]
        shown[:, :-1] |= core[:, 1:]
    return shown


def _paint(rgba: np.ndarray, acc: np.ndarray, shown: np.ndarray, color: tuple[int, int, int]) -> None:
    core = acc > 0
    for i, c in enumerate(color):
        rgba[i][shown] = c
    rgba[3][shown] = np.where(core[shown], ALPHA_MIN + (acc[shown].astype("uint16") * (ALPHA_MAX - ALPHA_MIN) // 255), ALPHA_MIN)


@lru_cache(maxsize=4096)
def _render(root: str, year: int, z: int, x: int, y: int, built_at: str) -> bytes:
    files = _files_for(index()["tiles"].get(str(year), []), z, x, y)
    if not files:
        return EMPTY_PNG
    acc = _warp_max(root, files, z, x, y, 1)
    if not acc.any():
        return EMPTY_PNG
    rgba = np.zeros((4, TILE, TILE), dtype="uint8")
    _paint(rgba, acc, _grow(acc > 0, z), DATA_MANGROVE)
    return _png(rgba)


def cache_dir() -> Path | None:
    """Disk cache for rendered tiles (writable; survives restarts). None = memory only (tests, local dev)."""
    d = os.environ.get("GMW_TILE_CACHE")
    return Path(d) if d else None


def _decode(png: bytes) -> np.ndarray:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", NotGeoreferencedWarning)
        with MemoryFile(png) as mem, mem.open() as src:
            return src.read()


@lru_cache(maxsize=2048)
def _enlarge(parent: bytes, d: int, sx: int, sy: int) -> bytes:
    """The (sx, sy) child d zooms below a parent tile, by nearest-neighbour enlargement."""
    rows = (sy * TILE + np.arange(TILE)) >> d
    cols = (sx * TILE + np.arange(TILE)) >> d
    return _png(np.ascontiguousarray(_decode(parent)[:, rows][:, :, cols]))


def _serve(key: str, z: int, x: int, y: int, render: Callable[[int, int, int], bytes]) -> bytes:
    """A tile from the static tile tree, made and stored there on first request.

    The tree's layout is the public URL `/tiles/gmw/<key>/<z>/<x>/<y>.png`, so Caddy serves stored tiles as plain files
    and only a missing one reaches the API (ADR-053). A rebuilt layer or new STYLE needs the tree cleared.
    """
    root = cache_dir()
    path = root / key / str(z) / str(x) / f"{y}.png" if root else None
    if path is not None:
        try:
            return path.read_bytes()
        except OSError:
            pass
    if z > NATIVE_ZOOM:
        d = z - NATIVE_ZOOM
        parent = _serve(key, NATIVE_ZOOM, x >> d, y >> d, render)
        png = EMPTY_PNG if parent == EMPTY_PNG else _enlarge(parent, d, x & ((1 << d) - 1), y & ((1 << d) - 1))
    else:
        png = render(z, x, y)
    if path is not None:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
            tmp.write_bytes(png)
            os.replace(tmp, path)
        except OSError:
            pass  # a read-only or full disk only costs speed
    return png


def tile_png(year: int, z: int, x: int, y: int) -> bytes:
    ix = index()
    if year not in ix["years"]:
        raise ApiError(422, "VALIDATION_FAILED", f"year must be one of {ix['years']}")
    if not (0 <= z <= MAX_ZOOM and 0 <= x < (1 << z) and 0 <= y < (1 << z)):
        raise ApiError(422, "VALIDATION_FAILED", f"tile {z}/{x}/{y} is outside zoom 0-{MAX_ZOOM}")
    root, built = str(tile_dir()), ix.get("built_at", "") + STYLE
    key = f"{STYLE}/extent/{year}"
    return _serve(key, z, x, y, lambda z, x, y: _render(root, year, z, x, y, built))


# --- API-025: change (gain / loss) against a GMW baseline year (ADR-050) ----------------------------------------


@lru_cache(maxsize=1)
def _change_index_for(path: str, mtime: float) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def change_index() -> dict:
    p = tile_dir() / "change_index.json"
    if not p.is_file():
        raise ApiError(503, "UPSTREAM_UNAVAILABLE", "The mangrove change layer is not installed on this server")
    return _change_index_for(str(p), p.stat().st_mtime)


def change_info() -> dict:
    cx = change_index()
    bases = {b: sorted(int(y) for y in ys) for b, ys in sorted(cx["bases"].items())}
    return {"bases": bases, "default_base": min(int(b) for b in bases), "version": cx["version"], "bbox": cx["bbox"],
            "max_zoom": MAX_ZOOM, "style": STYLE,
            "tiles": "/api/v1/layers/gmw-change/tiles/{base}/{year}/{z}/{x}/{y}.png",
            "classes": {"gain": "mangrove in the year, not in the baseline", "loss": "mangrove in the baseline, not in the year"},
            "source": {"name": "Global Mangrove Watch", "version": cx["version"],
                       "provenance_url": "https://doi.org/10.5281/zenodo.21346457"}}


@lru_cache(maxsize=512)
def _change_bands(root: str, base: int, year: int, z: int, x: int, y: int, built_at: str) -> np.ndarray | None:
    """Gain and loss for one tile, read in one pass; the gain-only and loss-only requests share it."""
    files = _files_for(change_index()["bases"].get(str(base), {}).get(str(year), []), z, x, y)
    return _warp_max(root, files, z, x, y, [1, 2]) if files else None


@lru_cache(maxsize=4096)
def _render_change(root: str, base: int, year: int, z: int, x: int, y: int, only: str | None, built_at: str) -> bytes:
    bands = _change_bands(root, base, year, z, x, y, built_at)
    if bands is None:
        return EMPTY_PNG
    none = np.zeros((TILE, TILE), dtype="uint8")
    gain = bands[0] if only in (None, "gain") else none
    loss = bands[1] if only in (None, "loss") else none
    if not (gain.any() or loss.any()):
        return EMPTY_PNG
    rgba = np.zeros((4, TILE, TILE), dtype="uint8")
    _paint(rgba, gain, _grow(gain > 0, z), DATA_GAIN)
    _paint(rgba, loss, _grow(loss > 0, z), DATA_LOSS)  # loss drawn last: it wins where both show zoomed out
    return _png(rgba)


def change_tile_png(base: int, year: int, z: int, x: int, y: int, only: str | None = None) -> bytes:
    cx = change_index()
    years = cx["bases"].get(str(base))
    if years is None:
        raise ApiError(422, "VALIDATION_FAILED", f"base must be one of {sorted(int(b) for b in cx['bases'])}")
    if str(year) not in years:
        raise ApiError(422, "VALIDATION_FAILED", f"year must be one of {sorted(int(y) for y in years)} for base {base}")
    if only not in (None, "gain", "loss"):
        raise ApiError(422, "VALIDATION_FAILED", "only must be gain or loss")
    if not (0 <= z <= MAX_ZOOM and 0 <= x < (1 << z) and 0 <= y < (1 << z)):
        raise ApiError(422, "VALIDATION_FAILED", f"tile {z}/{x}/{y} is outside zoom 0-{MAX_ZOOM}")
    root, built = str(tile_dir()), cx.get("built_at", "") + STYLE
    key = f"{STYLE}/change/{base}/{year}/{only or 'all'}"
    return _serve(key, z, x, y, lambda z, x, y: _render_change(root, base, year, z, x, y, only, built))
