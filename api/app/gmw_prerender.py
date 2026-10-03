"""Render the GMW map tiles ahead of time into the disk cache (ADR-052), so no viewer waits for a cold tile.

Runs inside the API container at low priority after a deploy (infra/prewarm-tiles.sh):
    nice -n 19 python -m app.gmw_prerender [--max-zoom 12]
It renders every tile over the Philippines that touches a GMW file into the static tile tree (ADR-053): first the
default view (latest extent year, gain and loss since the default baseline) to zoom 12, then every other year and
baseline to zoom 10. Tiles already on disk are skipped, so a rerun is cheap.
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


def jobs(native: range, rest: range):
    """(name, files, zooms, render) in order: the default view to zoom 12 first, then every other year and baseline."""
    ix = g.index()
    years = ix["years"]
    latest = years[-1]
    try:
        cx = g.change_index()
        bases = sorted(int(b) for b in cx["bases"])
    except g.ApiError:
        cx, bases = None, []  # change layer not installed

    def extent(year, zooms):
        return (f"extent {year}", ix["tiles"][str(year)], zooms, lambda z, x, y: g.tile_png(year, z, x, y))

    def change(base, year, only, zooms):
        return (f"{only} {base}-{year}", cx["bases"][str(base)][str(year)], zooms,
                lambda z, x, y: g.change_tile_png(base, year, z, x, y, only))

    out = [extent(latest, native)]
    if bases and str(latest) in cx["bases"][str(bases[0])]:
        out += [change(bases[0], latest, only, native) for only in ("gain", "loss")]
    out += [extent(y, rest) for y in years if y != latest]
    for b in bases:
        for y in sorted(int(v) for v in cx["bases"][str(b)]):
            if (b, y) != (bases[0], latest):
                out += [change(b, y, only, rest) for only in ("gain", "loss")]
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--min-zoom", type=int, default=4)
    ap.add_argument("--rest-max-zoom", type=int, default=10, help="max zoom for years and baselines other than the default")
    a = ap.parse_args()
    for name, entries, zooms, fn in jobs(range(a.min_zoom, g.NATIVE_ZOOM + 1), range(a.min_zoom, a.rest_max_zoom + 1)):
        t0, n = time.time(), 0
        for z, x, y in tiles(entries, zooms):
            fn(z, x, y)
            n += 1
        print(f"prerender {name}: {n} tiles in {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
