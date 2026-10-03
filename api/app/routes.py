"""REST routes under /api/v1 (docs/api.md): API-004, 005, 006, 010, 011, 013, 016, 021-025, plus the BR-002 405s."""

from __future__ import annotations

from typing import Any

import anyio

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response

from . import gmw_tiles, reads
from .db import connection
from .errors import envelope

router = APIRouter(prefix="/api/v1")


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


# BR-002: there is no PUT, PATCH or DELETE on evidence, records or timeline entries (docs/api.md §2).
_IMMUTABLE = ["PUT", "PATCH", "DELETE"]


def _immutable() -> JSONResponse:
    return envelope(405, "RECORD_IMMUTABLE", "Published evidence, records and timeline entries cannot be changed",
                    headers={"Allow": "GET, POST"})


for _path in ("/evidence", "/evidence/{rest:path}", "/records", "/records/{rest:path}"):
    router.add_api_route(_path, _immutable, methods=_IMMUTABLE, include_in_schema=False)
