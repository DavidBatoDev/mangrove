#!/usr/bin/env bash
# Redeploy the Mangrove stack on the demo host (ADR-047).
# Called by .github/workflows/deploy.yml through AWS SSM, as user `ubuntu`, after /opt/bon/mangrove has been
# reset to the commit being deployed. Safe to run by hand on the host: bash /opt/bon/mangrove/infra/deploy.sh
#
# Steps: keep the running images as :previous -> build -> up -> health check through Caddy ->
# on failure, put the previous images back and exit 1 (the site keeps serving the last good build).
set -euo pipefail

cd "$(dirname "$0")"            # infra/
ENV_FILE=../.env
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE on the host (never committed; see docs/security.md §7)"; exit 1; }
DOMAIN=$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)
[ -n "$DOMAIN" ] || { echo "DOMAIN is not set in $ENV_FILE"; exit 1; }
SHA=$(git -C .. rev-parse --short HEAD)
compose() { docker compose --env-file "$ENV_FILE" "$@"; }

echo "== deploying $SHA to https://$DOMAIN"

# Keep the image each running container actually uses (not whatever :latest points at) for rollback.
for svc in web api; do
  cid=$(compose ps -q "$svc" 2>/dev/null || true)
  if [ -n "$cid" ]; then
    docker tag "$(docker inspect --format '{{.Image}}' "$cid")" "infra-$svc:previous"
  fi
done

# Rendered map tiles live on the host so deploys keep them (ADR-051); the API runs as uid 999.
sudo install -d -o 999 -g 999 /opt/bon/gmw-tile-cache

# A failed build exits here (set -e) and the running containers are left untouched.
compose build
compose up -d

healthy() {
  curl -fsS -m 10 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/v1/health" >/dev/null &&
  curl -fsS -m 20 -o /dev/null --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/"
}

for _ in $(seq 1 30); do
  if healthy; then
    docker image prune -f >/dev/null 2>&1 || true
    echo "== deployed $SHA"
    # Render any GMW map tiles not yet on disk (ADR-051), in the background at low priority.
    setsid nohup bash ./prewarm-tiles.sh >/tmp/mangrove-prewarm.log 2>&1 </dev/null &
    exit 0
  fi
  sleep 5
done

echo "== health check failed for $SHA; rolling back to the previous images"
for svc in web api; do
  if docker image inspect "infra-$svc:previous" >/dev/null 2>&1; then
    docker tag "infra-$svc:previous" "infra-$svc:latest"
  fi
done
compose up -d --no-build
compose ps
exit 1
