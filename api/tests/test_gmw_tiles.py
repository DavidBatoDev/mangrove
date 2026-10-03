"""TC-027: API-024 serves the GMW mangrove extent as map tiles (F-025, ADR-048).

Uses a tiny synthetic GMW-style tile written to a temp dir, so the test needs no real GMW download.
"""

from __future__ import annotations

import json
import math

import numpy as np
import pytest
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds

from app import gmw_tiles

pytestmark = pytest.mark.filterwarnings("ignore::rasterio.errors.NotGeoreferencedWarning")


def _xy(lon: float, lat: float, z: int) -> tuple[int, int]:
    n = 1 << z
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


@pytest.fixture()
def tile_dir(tmp_path, monkeypatch):
    # A 1x1 degree "GMW" tile over Manila Bay (lon 120-121, lat 14-15) with a block of mangrove in its east half.
    size = 400
    data = np.zeros((size, size), dtype="uint8")
    data[40:240, 240:380] = 255
    year_dir = tmp_path / "2025"
    year_dir.mkdir()
    path = year_dir / "GMW_N15E120_v4112_mng_ext_2025.tif"
    with rasterio.open(path, "w", driver="GTiff", width=size, height=size, count=1, dtype="uint8", crs="EPSG:4326",
                       transform=from_bounds(120, 14, 121, 15, size, size), tiled=True, blockxsize=256, blockysize=256) as dst:
        dst.write(data, 1)
        dst.build_overviews([2, 4], Resampling.average)
    (tmp_path / "index.json").write_text(json.dumps({
        "version": "v4.1.12", "bbox": [116, 4, 127, 22], "built_at": "test", "years": [2020, 2025],
        "tiles": {"2020": [], "2025": [{"file": "2025/GMW_N15E120_v4112_mng_ext_2025.tif", "bounds": [120, 14, 121, 15]}]},
    }))
    monkeypatch.setenv("GMW_TILE_DIR", str(tmp_path))
    gmw_tiles._index_for.cache_clear()
    gmw_tiles._render.cache_clear()
    yield tmp_path
    gmw_tiles._index_for.cache_clear()
    gmw_tiles._render.cache_clear()


def _alpha(png: bytes) -> np.ndarray:
    with rasterio.MemoryFile(png) as mem, mem.open() as src:
        assert src.count == 4 and src.width == 256 and src.height == 256
        return src.read(4)


def test_tc027_layer_info(client, tile_dir):
    body = client.get("/api/v1/layers/gmw-extent/tiles").json()
    assert body["years"] == [2020, 2025]
    assert body["tiles"].endswith("/{year}/{z}/{x}/{y}.png")
    assert body["source"]["name"] == "Global Mangrove Watch"
    assert body["style"]


def test_tc027_tile_over_mangrove_is_drawn(client, tile_dir):
    x, y = _xy(120.8, 14.7, 9)
    r = client.get(f"/api/v1/layers/gmw-extent/tiles/2025/9/{x}/{y}.png")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert "max-age" in r.headers["cache-control"]
    assert r.headers["access-control-allow-origin"] == "*"
    alpha = _alpha(r.content)
    assert (alpha > 0).any(), "mangrove pixels must be visible"
    assert (alpha == 0).any(), "non-mangrove pixels must stay transparent"


def test_tc027_tile_far_away_is_transparent(client, tile_dir):
    x, y = _xy(0.5, 0.5, 9)
    r = client.get(f"/api/v1/layers/gmw-extent/tiles/2025/9/{x}/{y}.png")
    assert r.status_code == 200
    assert not _alpha(r.content).any()


def test_tc027_year_without_files_is_transparent(client, tile_dir):
    x, y = _xy(120.8, 14.7, 9)
    r = client.get(f"/api/v1/layers/gmw-extent/tiles/2020/9/{x}/{y}.png")
    assert r.status_code == 200 and not _alpha(r.content).any()


def test_tc027_bad_year_and_zoom_are_rejected(client, tile_dir):
    assert client.get("/api/v1/layers/gmw-extent/tiles/1999/9/0/0.png").status_code == 422
    assert client.get("/api/v1/layers/gmw-extent/tiles/2025/30/0/0.png").status_code == 422
    x, y = _xy(120.8, 14.7, 20)  # deep zoom still draws (GMW pixels as blocks), never 422
    assert client.get(f"/api/v1/layers/gmw-extent/tiles/2025/20/{x}/{y}.png").status_code == 200


def test_tc027_layer_missing_is_503(client, tmp_path, monkeypatch):
    monkeypatch.setenv("GMW_TILE_DIR", str(tmp_path / "nope"))
    gmw_tiles._index_for.cache_clear()
    r = client.get("/api/v1/layers/gmw-extent/tiles")
    assert r.status_code == 503 and r.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"


# --- TC-028: API-025 change (gain / loss) tiles (F-025, ADR-050) -----------------------------------------------


@pytest.fixture()
def change_dir(tile_dir):
    size = 400
    gain = np.zeros((size, size), dtype="uint8")
    loss = np.zeros((size, size), dtype="uint8")
    gain[20:80, 240:380] = 255  # lat 14.95-14.80
    loss[100:140, 240:380] = 255  # lat 14.75-14.65, inside the z9 test tile (14.60-15.28)
    d = tile_dir / "change" / "base1985" / "2025"
    d.mkdir(parents=True)
    path = d / "GMW_N15E120_v4112_mng_chng_base1985_2025.tif"
    with rasterio.open(path, "w", driver="GTiff", width=size, height=size, count=2, dtype="uint8", crs="EPSG:4326",
                       transform=from_bounds(120, 14, 121, 15, size, size), tiled=True, blockxsize=256, blockysize=256) as dst:
        dst.write(gain, 1)
        dst.write(loss, 2)
        dst.build_overviews([2, 4], Resampling.average)
    (tile_dir / "change_index.json").write_text(json.dumps({
        "version": "v4.1.12", "bbox": [116, 4, 127, 22], "built_at": "test",
        "bases": {"1985": {"2020": [], "2025": [{"file": "change/base1985/2025/GMW_N15E120_v4112_mng_chng_base1985_2025.tif",
                                                 "bounds": [120, 14, 121, 15]}]},
                  "2010": {"2015": [], "2020": [], "2025": []}},
    }))
    gmw_tiles._change_index_for.cache_clear()
    gmw_tiles._render_change.cache_clear()
    yield tile_dir
    gmw_tiles._change_index_for.cache_clear()
    gmw_tiles._render_change.cache_clear()


def _rgba(png: bytes) -> np.ndarray:
    with rasterio.MemoryFile(png) as mem, mem.open() as src:
        return src.read()


def test_tc028_change_info(client, change_dir):
    r = client.get("/api/v1/layers/gmw-change/tiles")
    assert r.status_code == 200 and r.headers["access-control-allow-origin"] == "*"
    body = r.json()
    assert body["bases"] == {"1985": [2020, 2025], "2010": [2015, 2020, 2025]}
    assert body["default_base"] == 1985 and body["tiles"].endswith("/{base}/{year}/{z}/{x}/{y}.png")


def test_tc028_gain_and_loss_are_drawn_in_their_colors(client, change_dir):
    x, y = _xy(120.8, 14.7, 9)
    r = client.get(f"/api/v1/layers/gmw-change/tiles/1985/2025/9/{x}/{y}.png")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    px = _rgba(r.content)
    visible = px[3] > 0
    colors = {tuple(int(c) for c in px[:3, i, j]) for i, j in zip(*np.nonzero(visible))}
    assert tuple(gmw_tiles.DATA_GAIN) in colors and tuple(gmw_tiles.DATA_LOSS) in colors
    assert (~visible).any()


def test_tc028_only_gain_or_only_loss(client, change_dir):
    x, y = _xy(120.8, 14.7, 9)
    for only, want, other in (("gain", gmw_tiles.DATA_GAIN, gmw_tiles.DATA_LOSS), ("loss", gmw_tiles.DATA_LOSS, gmw_tiles.DATA_GAIN)):
        px = _rgba(client.get(f"/api/v1/layers/gmw-change/tiles/1985/2025/9/{x}/{y}.png?only={only}").content)
        colors = {tuple(int(c) for c in px[:3, i, j]) for i, j in zip(*np.nonzero(px[3] > 0))}
        assert tuple(want) in colors and tuple(other) not in colors
    assert client.get(f"/api/v1/layers/gmw-change/tiles/1985/2025/9/{x}/{y}.png?only=both").status_code == 422


def test_tc028_bad_base_or_year_is_rejected(client, change_dir):
    assert client.get("/api/v1/layers/gmw-change/tiles/1999/2025/9/0/0.png").status_code == 422
    assert client.get("/api/v1/layers/gmw-change/tiles/1985/1985/9/0/0.png").status_code == 422


def test_tc028_change_layer_missing_is_503(client, tile_dir):
    gmw_tiles._change_index_for.cache_clear()
    r = client.get("/api/v1/layers/gmw-change/tiles")
    assert r.status_code == 503 and r.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"
