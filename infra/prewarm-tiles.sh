#!/usr/bin/env bash
# Warm the zoomed-out GMW mangrove extent tiles (API-024, ADR-048) for the latest year, through Caddy on this host.
# Started in the background by infra/deploy.sh after a healthy deploy. Usage: bash prewarm-tiles.sh <domain>
# Zoom 4-8 over the Philippines is about 200 tiles; each reads many source files the first time.
set -uo pipefail
domain=$1

year=$(curl -fsS -m 20 --resolve "$domain:443:127.0.0.1" "https://$domain/api/v1/layers/gmw-extent/tiles" |
  python3 -c 'import sys, json; print(json.load(sys.stdin)["years"][-1])') || exit 0

python3 - "$year" <<'PY' | xargs -P 3 -I{} curl -fsS -m 60 -o /dev/null --resolve "$domain:443:127.0.0.1" "https://$domain{}"
import math
import sys

year = sys.argv[1]
w, s, e, n = 116.0, 4.0, 127.0, 22.0  # the Philippines (data/ingest/gmw_tiles.py PH_BBOX)


def tx(lon, z):
    return int((lon + 180) / 360 * (1 << z))


def ty(lat, z):
    return int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * (1 << z))


for z in range(4, 9):
    for x in range(tx(w, z), tx(e, z) + 1):
        for y in range(ty(n, z), ty(s, z) + 1):
            print(f"/api/v1/layers/gmw-extent/tiles/{year}/{z}/{x}/{y}.png")
PY
echo "prewarm done for $year"
