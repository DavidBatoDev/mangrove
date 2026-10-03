"""Render the GMW map tiles ahead of time into the disk cache (ADR-052), so no viewer waits for a cold tile.

Runs inside the API container at low priority after a deploy (infra/prewarm-tiles.sh):
    nice -n 19 python -m app.gmw_prerender [--max-zoom 12]
It renders, for zoom 4..max over the Philippines, every tile that touches a GMW file: the latest extent year, and gain
and loss since the default baseline for that year. Tiles already on disk are skipped, so a rerun is cheap.
"""

from __future__ import annotations

import argparse
import math
import time

from . import gmw_tiles as g

PH_BBOX = (116.0, 4.0, 127.0, 22.0)  # data/ingest/gmw_tiles.py


def _tx(lon: float, z: int) -> int:
    return int((lon + 180) / 360 * (1 << z))


def _ty(lat: float, z: int) -> int:
    r = math.radians(lat)
    return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * (1 << z))


def tiles(entries: list[dict], zooms: range):
    """(z, x, y) over the Philippines that touch at least one file; the rest are empty and cost nothing on demand."""
    w, s, e, n = PH_BBOX
    for z in zooms:
        for x in range(_tx(w, z), _tx(e, z) + 1):
            for y in range(_ty(n, z), _ty(s, z) + 1):
                if g._files_for(entries, z, x, y):
                    yield z, x, y


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--min-zoom", type=int, default=4)
    ap.add_argument("--max-zoom", type=int, default=g.NATIVE_ZOOM)
    a = ap.parse_args()
    zooms = range(a.min_zoom, min(a.max_zoom, g.NATIVE_ZOOM) + 1)
    jobs = []
    ix = g.index()
    year = ix["years"][-1]
    jobs.append((f"extent {year}", ix["tiles"][str(year)], lambda z, x, y: g.tile_png(year, z, x, y)))
    try:
        cx = g.change_index()
        base = str(min(int(b) for b in cx["bases"]))
        if str(year) in cx["bases"][base]:
            entries = cx["bases"][base][str(year)]
            for only in ("gain", "loss"):
                jobs.append((f"{only} {base}-{year}", entries,
                             lambda z, x, y, only=only: g.change_tile_png(int(base), year, z, x, y, only)))
    except g.ApiError:
        pass  # change layer not installed
    for name, entries, fn in jobs:
        t0, n = time.time(), 0
        for z, x, y in tiles(entries, zooms):
            fn(z, x, y)
            n += 1
        print(f"prerender {name}: {n} tiles in {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
