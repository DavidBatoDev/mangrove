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
