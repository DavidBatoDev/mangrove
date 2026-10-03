"""REST routes under /api/v1 (docs/api.md): API-004, 005, 006, 007, 008, 009, 010, 011, 013, 016, 021-025, 027, plus the BR-002 405s."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import anyio

from fastapi import APIRouter, Header, Query, Request
from fastapi.responses import JSONResponse, Response

from . import assistant, gmw_tiles, reads, sentinel, writes
from .db import connection
from .errors import envelope, not_found

router = APIRouter(prefix="/api/v1")


@router.post("/assistant/chat", summary="API-027 in-app assistant over the read-only MCP tools")
async def assistant_chat(body: assistant.ChatRequest, request: Request) -> dict[str, Any]:
    assistant.check_rate(request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip())
    return await assistant.chat(body)


@router.get("/health", summary="API-016 liveness")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/sites", summary="API-004 list candidate sites")
def list_sites(region: str | None = Query(default=None)) -> dict[str, Any]:
    with connection() as conn:
        return reads.list_sites(conn, region)


@router.get("/sites/{site_id}", summary="API-005 site dossier")
def site_dossier(site_id: str) -> dict[str, Any]:
    with connection() as conn:
        return reads.site_dossier(conn, site_id)


@router.post("/sites/{site_id}/sentinel-refresh", status_code=201, summary="API-007 pull current condition from Sentinel-2")
def sentinel_refresh(site_id: str) -> dict[str, Any]:
    # AWS Open Data via Earth Search (ADR-042). Open like every write in the public product (ADR-061),
    # protected by the per-site rate limit (docs/api.md §5).
    return sentinel.refresh_site(site_id)


@router.get("/compare", summary="API-006 side-by-side comparison")
def compare(site_ids: str = Query(default="", description="2–5 comma-separated site ids")) -> dict[str, Any]:
    with connection() as conn:
        return reads.compare_sites(conn, site_ids.split(","))


@router.get("/records", summary="API-010 map pins")
def list_records() -> dict[str, Any]:
    with connection() as conn:
        return reads.list_records(conn)


@router.get("/records/{record_id}", summary="API-011 read a record")
def get_record(record_id: str) -> dict[str, Any]:
    with connection() as conn:
        return reads.get_record(conn, record_id)


@router.get("/records/{record_id}/verify", summary="API-013 integrity check")
def verify_record(record_id: str) -> dict[str, Any]:
    with connection() as conn:
        return reads.verify_record(conn, record_id)


@router.get("/sites/{site_id}/gmw-timeline", summary="API-021 GMW mangrove area inside and near a site")
def gmw_timeline(site_id: str) -> dict[str, Any]:
    with connection() as conn:
        return reads.gmw_timeline(conn, site_id)


@router.get("/context/countries/{iso3}", summary="API-022 national mangrove extent and change")
def country_context(iso3: str) -> dict[str, Any]:
    return reads.country_context(iso3)


@router.get("/context/programs/{program_id}", summary="API-026 a public funding program, figures as published")
def program_context(program_id: str) -> dict[str, Any]:
    return reads.program_context(program_id)


@router.get("/layers/gmw-extent", summary="API-023 Manila Bay mangrove extent for one year")
def gmw_extent(year: int | None = Query(default=None)) -> dict[str, Any]:
    return reads.gmw_extent_layer(year)


# API-024 responses are public map data; any origin may read them (ADR-049), e.g. a local fixtures-mode web app.
_TILE_CORS = {"Access-Control-Allow-Origin": "*"}
# Tile work gets its own few threads, so queued tiles never take the threads every other route needs (ADR-052).
_TILE_THREADS = anyio.CapacityLimiter(4)


@router.get("/layers/gmw-extent/tiles", summary="API-024 Philippines mangrove extent tiles: years and URL template")
async def gmw_extent_tiles_info() -> JSONResponse:
    return JSONResponse(gmw_tiles.layer_info(), headers=_TILE_CORS)


@router.get("/layers/gmw-extent/tiles/{year}/{z}/{x}/{y}.png", summary="API-024 one 256 px mangrove extent tile")
async def gmw_extent_tile(year: int, z: int, x: int, y: int) -> Response:
    png = await anyio.to_thread.run_sync(gmw_tiles.tile_png, year, z, x, y, limiter=_TILE_THREADS)
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "public, max-age=604800", **_TILE_CORS})


@router.get("/layers/gmw-change/tiles", summary="API-025 Philippines mangrove change tiles: baselines, years, URL template")
async def gmw_change_tiles_info() -> JSONResponse:
    return JSONResponse(gmw_tiles.change_info(), headers=_TILE_CORS)


@router.get("/layers/gmw-change/tiles/{base}/{year}/{z}/{x}/{y}.png", summary="API-025 one 256 px mangrove gain/loss tile")
async def gmw_change_tile(base: int, year: int, z: int, x: int, y: int, only: str | None = Query(default=None)) -> Response:
    png = await anyio.to_thread.run_sync(gmw_tiles.change_tile_png, base, year, z, x, y, only, limiter=_TILE_THREADS)
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "public, max-age=604800", **_TILE_CORS})


# API-014: evidence pictures shipped with the repo (Sentinel-2 chips from data/ingest/s2_ingest.py), by SHA-256.
_ASSET_DIR = Path(__file__).resolve().parent / "evidence_assets"
_SHA256 = re.compile(r"[0-9a-f]{64}")


@router.get("/assets/{sha256}", summary="API-014 evidence picture by SHA-256")
def evidence_asset(sha256: str) -> Response:
    path = _ASSET_DIR / f"{sha256}.png"
    if not _SHA256.fullmatch(sha256) or not path.is_file():
        raise not_found()
    return Response(content=path.read_bytes(), media_type="image/png",
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})


# --- public writes, no accounts (ADR-061) ----------------------------------------------------------------
MAX_BODY = 32 * 1024


def _guard(request: Request, kind: str) -> None:
    if int(request.headers.get("content-length") or 0) > MAX_BODY:
        raise writes.ApiError(413, "PAYLOAD_TOO_LARGE", "The submission is too large")
    writes.rate_limit(kind, writes.client_ip(request))


@router.post("/evidence", status_code=201, summary="API-008 add evidence to a site or record (public)")
def add_evidence(body: writes.EvidenceIn, request: Request) -> dict[str, Any]:
    _guard(request, "evidence")
    return writes.add_evidence(body)


@router.post("/records", status_code=201, summary="API-009 lock a promise (public)")
def lock_promise(body: writes.LockIn, request: Request,
                 idempotency_key: str = Header(default="", alias="Idempotency-Key")) -> dict[str, Any]:
    _guard(request, "lock")
    return writes.lock_promise(body, idempotency_key)


# BR-002: there is no PUT, PATCH or DELETE on evidence, records or timeline entries (docs/api.md §2).
_IMMUTABLE = ["PUT", "PATCH", "DELETE"]


def _immutable() -> JSONResponse:
    return envelope(405, "RECORD_IMMUTABLE", "Published evidence, records and timeline entries cannot be changed",
                    headers={"Allow": "GET, POST"})


for _path in ("/evidence", "/evidence/{rest:path}", "/records", "/records/{rest:path}"):
    router.add_api_route(_path, _immutable, methods=_IMMUTABLE, include_in_schema=False)
