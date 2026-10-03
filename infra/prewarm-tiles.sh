#!/usr/bin/env bash
# Render the GMW map tiles (API-024, API-025) for zoom 4-12 over the Philippines into the API's disk cache (ADR-051),
# so no viewer waits for a cold tile. Started in the background by infra/deploy.sh; tiles already on disk are skipped,
# so a rerun after a deploy takes seconds. Runs inside the API container at the lowest CPU priority.
# Usage: bash prewarm-tiles.sh
set -uo pipefail
cd "$(dirname "$0")"
docker compose --env-file ../.env exec -T api nice -n 19 python -m app.gmw_prerender
echo "prewarm done"
