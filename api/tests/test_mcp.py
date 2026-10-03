"""TC-014: MCP tools match the contract (docs/api.md API-015), over the real streamable-HTTP endpoint at /mcp."""

from __future__ import annotations

import json

from conftest import RECORD_A, SITE

SIX = {"list_sites", "get_site_dossier", "compare_sites", "list_records", "get_record", "verify_record"}
HEADERS = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json",
           "MCP-Protocol-Version": "2025-06-18"}


def rpc(client, method, params=None, id_=1):
    r = client.post("/mcp", headers=HEADERS, json={"jsonrpc": "2.0", "id": id_, "method": method, "params": params or {}})
    assert r.status_code == 200, r.text
    if r.headers.get("content-type", "").startswith("text/event-stream"):
        data = [line[5:].strip() for line in r.text.splitlines() if line.startswith("data:")]
        return json.loads(data[-1])
    return r.json()


def test_endpoint_is_exactly_mcp_without_redirect(client):
    r = client.post("/mcp", headers=HEADERS, json={"jsonrpc": "2.0", "id": 0, "method": "ping"},
                    follow_redirects=False)
    assert r.status_code == 200


def test_tools_list_is_exactly_the_six_read_only_tools(client):
    tools = rpc(client, "tools/list")["result"]["tools"]
    assert {t["name"] for t in tools} == SIX and len(tools) == 6
    for t in tools:
        schema = t["inputSchema"]
        assert schema["type"] == "object"
        assert isinstance(schema.get("required", []), list)  # Draft 7: root-level array, never per-property
        assert all("required" not in p for p in schema["properties"].values())
        assert t["annotations"]["readOnlyHint"] is True and t["annotations"]["destructiveHint"] is False
        if t["name"] in {"get_site_dossier", "compare_sites"}:
            assert "agreement" in t["description"]  # BR-001: a status is source agreement, not site quality
    required = {t["name"]: t["inputSchema"].get("required", []) for t in tools}
    assert required["get_site_dossier"] == ["site_id"]
    assert required["compare_sites"] == ["site_ids"]
    assert required["get_record"] == ["record_id"] and required["verify_record"] == ["record_id"]


def _structured(resp):
    result = resp["result"]
    assert not result.get("isError"), result
    return result.get("structuredContent") or json.loads(result["content"][0]["text"])


def test_compare_sites_tool_explains_b_d_e(client):
    out = _structured(rpc(client, "tools/call", {"name": "compare_sites",
                                                  "arguments": {"site_ids": [SITE["B"], SITE["D"], SITE["E"]]}}))
    assert [s["answers"][2]["status"] for s in out["sites"]] == ["supported", "missing", "conflicting"]
    assert out["differing_questions"] == ["ground"]
    assert all(s["site"]["is_demo"] for s in out["sites"])
    assert all(s["site"]["area"]["eq_id"] == "EQ-001" for s in out["sites"])


def test_compare_range_is_a_tool_error(client):
    resp = rpc(client, "tools/call", {"name": "compare_sites", "arguments": {"site_ids": [SITE["B"]]}})
    assert resp.get("error") or resp["result"].get("isError")


def test_record_tools(client):
    rec = _structured(rpc(client, "tools/call", {"name": "get_record", "arguments": {"record_id": RECORD_A}}))
    assert rec["pin_state"] == "awaiting" and rec["record"]["is_demo"] is True
    v = _structured(rpc(client, "tools/call", {"name": "verify_record", "arguments": {"record_id": RECORD_A}}))
    assert v["intact"] is True
    pins = _structured(rpc(client, "tools/call", {"name": "list_records", "arguments": {}}))
    assert [p["id"] for p in pins["records"] if p["is_demo"]] == [RECORD_A]


def test_public_host_is_allowed_and_unknown_host_is_not(client, monkeypatch):
    # localhost (the test client) is allowed; a foreign Host header is rejected by DNS-rebinding protection.
    r = client.post("/mcp", headers={**HEADERS, "Host": "evil.example"},
                    json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
    assert r.status_code == 421
