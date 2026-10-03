"""MCP usage trail (API-026): which tools were called, when, and by which client.

Wraps the MCP ASGI app. For each JSON-RPC `tools/call` it logs one line and keeps the call in memory, so a
real Amazon Quick session leaves a trace that can be read back at GET /api/v1/mcp/usage. Only the tool name,
the time and the client's User-Agent are kept: no arguments, no IP address. Memory only; a redeploy clears it.
"""

from __future__ import annotations

import json
import logging
from collections import Counter, deque
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger("aide_m.mcp_usage")

MAX_RECENT = 200
_recent: deque[dict[str, Any]] = deque(maxlen=MAX_RECENT)
_counts: Counter[str] = Counter()
_clients: Counter[str] = Counter()
_since = datetime.now(timezone.utc)


def _client(ua: str) -> str:
    """A coarse client label from the User-Agent, e.g. 'Amazon Quick' when Quick's agent string says so."""
    low = ua.lower()
    if "quick" in low or "amazon" in low or "aws" in low:
        return "Amazon Quick"
    return ua[:80] or "unknown"


def _calls(body: bytes) -> list[str]:
    try:
        msg = json.loads(body)
    except (ValueError, UnicodeDecodeError):
        return []
    msgs = msg if isinstance(msg, list) else [msg]
    return [m["params"]["name"] for m in msgs
            if isinstance(m, dict) and m.get("method") == "tools/call"
            and isinstance(m.get("params"), dict) and isinstance(m["params"].get("name"), str)]


def record(tool: str, user_agent: str) -> None:
    at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    client = _client(user_agent)
    _recent.appendleft({"at": at, "tool": tool, "client": client, "user_agent": user_agent[:200]})
    _counts[tool] += 1
    _clients[client] += 1
    log.warning("mcp tools/call tool=%s client=%r ua=%r", tool, client, user_agent[:200])


def usage() -> dict[str, Any]:
    return {"since": _since.isoformat(timespec="seconds"), "total_calls": sum(_counts.values()),
            "by_tool": dict(_counts), "by_client": dict(_clients), "recent": list(_recent)}


class UsageRecorder:
    """ASGI wrapper: reads a POST body once, records tool calls, then replays the body to the MCP app."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") != "POST":
            return await self.app(scope, receive, send)
        chunks, more = [], True
        while more:
            message = await receive()
            if message["type"] != "http.request":
                break
            chunks.append(message.get("body", b""))
            more = message.get("more_body", False)
        body = b"".join(chunks)
        ua = next((v.decode("latin-1") for k, v in scope.get("headers", []) if k == b"user-agent"), "")
        for tool in _calls(body):
            record(tool, ua)
        sent = False

        async def replay():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        return await self.app(scope, replay, send)
