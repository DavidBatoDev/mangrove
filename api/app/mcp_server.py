"""Read-only MCP server for Amazon Quick (docs/api.md API-015), mounted in the API at /mcp.

Exactly six tools. Each calls the same read functions as REST, from the database only, and answers in seconds.
The endpoint is public and unauthenticated by design; no tool writes (docs/security.md §8).
"""

from __future__ import annotations

import os
from typing import Annotated, Any

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ToolAnnotations
from pydantic import Field

from . import reads
from .db import connection
from .errors import ApiError

INSTRUCTIONS = (
    "AIDE-M makes mangrove-restoration funding promises public and shows whether they came true. "
    "Statuses mean agreement among sources (BR-001): 'supported' = usable sources agree on the finding, "
    "'conflicting' = they disagree, 'missing' = no usable source. 'Supported' never means a good site, and "
    "there is no score. Always quote a number together with its eq_id and confidence, and never introduce a "
    "number the tools did not return. Items with is_demo = true are demo data: say so."
)

READ_ONLY = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False)

mcp = MCPServer("mangrove", instructions=INSTRUCTIONS)


def _call(fn, *args) -> dict[str, Any]:
    try:
        with connection() as conn:
            return fn(conn, *args)
    except ApiError as exc:
        raise ToolError(f"{exc.code}: {exc.message}") from None


@mcp.tool(annotations=READ_ONLY, description=(
    "List candidate restoration sites with id, name, region, area (EQ-001, with confidence) and is_demo. "
    "Same data as GET /api/v1/sites."))
def list_sites(
    region: Annotated[str | None, Field(description="Region name, e.g. 'Manila Bay'. Omit for all regions.")] = None,
) -> dict[str, Any]:
    fc = _call(reads.list_sites, region)
    return {"sites": [f["properties"] for f in fc["features"]]}


@mcp.tool(annotations=READ_ONLY, description=(
    "One site's three answers - history ('Was this mangrove before?'), current ('What's there now?'), ground "
    "('What do people on the ground say?') - each with status supported/conflicting/missing (agreement among "
    "sources, not site quality), finding and source count (EQ-013), plus every evidence item with provenance."))
def get_site_dossier(site_id: Annotated[str, Field(description="Site UUID")]) -> dict[str, Any]:
    d = _call(reads.site_dossier, site_id)
    for item in d["evidence"]:
        item.pop("location", None)  # geometry is bulky and adds nothing to an explanation
    d["site"].pop("geometry", None)
    return d


@mcp.tool(annotations=READ_ONLY, description=(
    "Compare 2-5 sites: each site's three answers in the order requested, plus differing_questions, the "
    "questions whose status or finding is not the same across the sites. Use it to explain why sites differ; "
    "a status describes source agreement, not which site is better."))
def compare_sites(
    site_ids: Annotated[list[str], Field(min_length=2, max_length=5, description="2 to 5 site UUIDs")],
) -> dict[str, Any]:
    out = _call(reads.compare_sites, site_ids)
    for s in out["sites"]:
        s["site"].pop("geometry", None)
    out["differing_questions"] = reads.differing_questions(out)
    return out


@mcp.tool(annotations=READ_ONLY, description=(
    "List published promise records with site, funder, publication time, is_demo and pin_state "
    "(conflict, awaiting or on_track, BR-004)."))
def list_records() -> dict[str, Any]:
    fc = _call(reads.list_records)
    return {"records": [f["properties"] for f in fc["features"]]}


@mcp.tool(annotations=READ_ONLY, description=(
    "One promise record: what the funder promised, the two checks ('Did the work happen?', 'Did the mangroves "
    "come back?') with status and the numbers behind them (eq_id, confidence), the site's three answers now, "
    "the append-only timeline and pin_state."))
def get_record(record_id: Annotated[str, Field(description="Promise record UUID")]) -> dict[str, Any]:
    r = _call(reads.get_record, record_id)
    r["record"].pop("snapshot", None)
    r["site"].pop("geometry", None)
    for entry in r["timeline"]:
        if "evidence" in entry:
            entry["evidence"].pop("location", None)
    return r


@mcp.tool(annotations=READ_ONLY, description=(
    "Recompute a record's content hash and timeline hash chain (EQ-011, SHA-256 over RFC 8785 JSON). "
    "intact = true means nothing was altered since publication; otherwise first_mismatch_seq names the first "
    "entry that fails (0 = the record itself)."))
def verify_record(record_id: Annotated[str, Field(description="Promise record UUID")]) -> dict[str, Any]:
    return _call(reads.verify_record, record_id)


def transport_security() -> TransportSecuritySettings:
    """Allow the public host; the SDK's default allows localhost only and answers 421 to everyone else."""
    domain = os.environ.get("DOMAIN", "").strip()
    hosts = ["localhost", "localhost:*", "127.0.0.1", "127.0.0.1:*", "api", "api:*"]
    origins = ["http://localhost:*", "http://127.0.0.1:*"]
    if domain:
        hosts += [domain, f"{domain}:*"]
        origins += [f"https://{domain}"]
    return TransportSecuritySettings(enable_dns_rebinding_protection=True, allowed_hosts=hosts, allowed_origins=origins)


def build_app():
    """The streamable-HTTP ASGI app; mount it at "/" so the endpoint stays exactly /mcp."""
    return mcp.streamable_http_app(stateless_http=True, transport_security=transport_security())
