"""Uniform error envelope `{"error": {"code", "message"}}` (docs/api.md §4). No stack traces, SQL or hosts (T-006)."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("mangrove.api")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def not_found(what: str = "Not found") -> ApiError:
    return ApiError(404, "NOT_FOUND", what)


def envelope(status: int, code: str, message: str, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message}}, status_code=status, headers=headers)


_HTTP_CODES = {401: "UNAUTHENTICATED", 403: "FORBIDDEN_ROLE", 404: "NOT_FOUND", 405: "RECORD_IMMUTABLE",
               413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA", 429: "RATE_LIMITED"}


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return envelope(exc.status, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        return envelope(422, "VALIDATION_FAILED", f"Invalid input: {where}".rstrip(": "))

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _HTTP_CODES.get(exc.status_code, "ERROR")
        message = "Not found" if exc.status_code == 404 else str(exc.detail)
        return envelope(exc.status_code, code, message)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled error")
        return envelope(500, "INTERNAL", "Something went wrong")
