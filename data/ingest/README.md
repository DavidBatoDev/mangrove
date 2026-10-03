# data/ingest/

Offline Global Mangrove Watch v4.1.12 ingest (DS-001, DS-007; ADR-045). GMW is never called at runtime.

`gmw_ingest.py` does two things:

1. **Per site** (EQ-002, EQ-003, EQ-014): mangrove area inside the polygon and within `NEARBY_BUFFER_M` of it,
   for every year 1985–2025, and the history finding. Appends ONE `history` evidence item per site through the
   ledger, as the app role. Skips sites that already have a GMW item of this version (append-only).
2. **Context files** in `api/app/context_data/` (committed, served by API-022 and API-023): the Philippines
   statistics (EQ-015, EQ-016) and the Manila Bay extent layer every 5 years.

## Inputs (from the project bucket, `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/`)

```sh
B=s3://bon-mangrove-evidence-baf5cf/datasets/gmw/v4.1.12/zenodo-21346457
mkdir -p gmw/stack gmw/chng
aws s3 cp $B/gmw_mng_ext_v4112_stack.tar.gz - | tar xz -C gmw/stack --wildcards '*N15E120*'   # 1.4 GB stream, keeps 1 tile
aws s3 cp $B/gmw_v4_timeseries_4112_gmw_country_stats_corr_area_formatted.xlsx gmw/stats.xlsx
aws s3 cp $B/gmw_mng_chng_stats_v4112_corrected.tar.gz - | tar xz -C gmw/chng --wildcards '*PHL_*'
```

## Run (Windows, from the repo root)

```sh
py -3.12 -m venv data/ingest/.venv && data/ingest/.venv/Scripts/python -m pip install -r data/ingest/requirements.txt
data/ingest/.venv/Scripts/python data/ingest/gmw_ingest.py --target test --stack-dir gmw/stack --stats-xlsx gmw/stats.xlsx --chng-dir gmw/chng
data/ingest/.venv/Scripts/python data/ingest/gmw_ingest.py --target main --sites-only --stack-dir gmw/stack
```

Whatever GMW shows is what the product shows: for the demo polygons that is no mangrove inside since 1985
(ADR-045). Do not move a polygon or change a threshold to change that.

## Sentinel-2 "What's there now?" with pictures (DS-002; EQ-005, EQ-006, EQ-007)

`s2_ingest.py` needs no download and no account: it searches Earth Search STAC (`sentinel-2-c1-l2a`) and reads
small windows of the public COGs over HTTP. Per site it scores every scene in `[t - S2_WINDOW_DAYS, t]` on SCL
(EQ-005), keeps the best, and appends ONE `current` evidence item (EQ-006 finding, EQ-007 NDVI as context),
skipping a site that already has an item for that scene id. It also writes two true-colour PNG chips per site to
`api/app/evidence_assets/<sha256>.png` (commit them): the chosen scene, and the earliest clear 2016-2017 scene of
the same window (`sentinel-2-l2a`, since Collection 1 has nothing that early here). API-014 serves them.

```sh
api/.venv/bin/python -m pip install -r data/ingest/requirements.txt
api/.venv/bin/python data/ingest/s2_ingest.py --target test --dry-run   # compute and render, write nothing
api/.venv/bin/python data/ingest/s2_ingest.py --target test             # then --target main
```

Whatever the scene shows is what the product shows. Do not move a polygon or change a threshold to change it.
`--as-of YYYY-MM-DD` fixes `t`; by default it is now. On Windows use `data/ingest/.venv/Scripts/python`.

## Philippines extent layer for the map (ADR-048)

`gmw_change_tiles.py` builds the gain/loss GeoTIFFs that API-025 serves (ADR-050): for baselines 1985, 1990, 2000 and 2010,
one 2-band file per later layer year and tile into `<out>/change/`, plus `change_index.json`. Run it like `gmw_tiles.py`
with `--chng-dir <change stacks> --out-dir /opt/bon/gmw-tiles`.

`gmw_tiles.py` builds the per-year GeoTIFFs that API-024 serves as map tiles: the 93 GMW tiles touching the
Philippines, years 1985–2025 every 5 years, values 0/255 with averaged overviews, plus `index.json`. It runs on
the demo host into `/opt/bon/gmw-tiles` (mounted read-only into the API). rasterio's wheel needs `libexpat1` on
slim images. Steps used on 2026-10-04 (about 6 minutes in all on a t3.medium):

1. `aws s3 cp --recursive s3://bon-mangrove-evidence-baf5cf/datasets/gmw/v4.1.12/jaxa-eorc/ zips/`
2. Extract every `GMW_N{lat}E{lon}_v4112_mng_ext.tif` with lon 116–126 and NW-corner lat 05–22 into `stacks/`.
3. `docker run --rm -v $PWD:/work -v /opt/bon/gmw-tiles:/out python:3.12-slim bash -c "apt-get update -qq && apt-get install -y -qq libexpat1 && pip install -q rasterio==1.5.2 && python /work/data/ingest/gmw_tiles.py --stack-dir /work/stacks --out-dir /out"`

A built copy (73 MB) is in `s3://bon-mangrove-evidence-baf5cf/datasets/gmw/derived/ph-extent-tiles/`;
`aws s3 sync` of that prefix into `/opt/bon/gmw-tiles` restores it without rebuilding.
