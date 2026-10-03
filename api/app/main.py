"""Mangrove evidence API: FastAPI under /api/v1 plus the MCP server at /mcp (docs/system-design.md §2)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # local dev reads ../.env or ./.env; in compose the variables are already set

from fastapi import FastAPI  # noqa: E402
from starlette.routing import Mount  # noqa: E402

from . import db, errors  # noqa: E402
from .mcp_server import build_app, mcp  # noqa: E402
from .routes import router  # noqa: E402

logging.basicConfig(level=logging.INFO)

mcp_app = build_app()  # must exist before the lifespan touches mcp.session_manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.open_pool()
    async with mcp.session_manager.run():  # without this: "Task group is not initialized"
        yield
    db.close_pool()


app = FastAPI(
    title="Mangrove evidence API",
    version="0.1.0",
    lifespan=lifespan,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url=None,
)
errors.install(app)
app.include_router(router)
# Last, so every /api/v1 route matches first. Mount("/mcp", …) would 307-redirect /mcp to /mcp/.
app.router.routes.append(Mount("/", app=mcp_app))
