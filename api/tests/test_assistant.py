"""TC-033: the in-app assistant (API-027) offers exactly the MCP tools, runs them, labels its answer AI, and is bounded.

The OpenAI client is a stub: no network, no cost, deterministic.
"""

from __future__ import annotations

import json
import sys
import types
from types import SimpleNamespace as NS

import pytest

from conftest import SITE

from app import assistant

SIX = {"list_sites", "get_site_dossier", "compare_sites", "list_records", "get_record", "verify_record"}


class _Responses:
    def __init__(self, seen):
        self.seen, self.round = seen, 0

    async def create(self, *, model, instructions, input, tools):
        self.seen.append({"tools": tools, "input": list(input), "instructions": instructions})
        self.round += 1
        if self.round == 1:
            call = NS(type="function_call", name="compare_sites", call_id="c1",
                      arguments=json.dumps({"site_ids": [SITE["B"], SITE["D"]]}),
                      model_dump=lambda **_: {"type": "function_call", "name": "compare_sites", "call_id": "c1",
                                              "arguments": json.dumps({"site_ids": [SITE["B"], SITE["D"]]})})
            return NS(output=[call], output_text="")
        return NS(output=[NS(type="message")], output_text="They differ on the ground answer. Demo data.")


@pytest.fixture()
def stub_openai(monkeypatch):
    seen: list[dict] = []
    fake = types.ModuleType("openai")
    fake.OpenAIError = type("OpenAIError", (Exception,), {})
    fake.AsyncOpenAI = lambda: NS(responses=_Responses(seen))
    monkeypatch.setitem(sys.modules, "openai", fake)
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    assistant._hits.clear()
    return seen


def ask(client, text="Why do sites B and D differ?", ip="10.0.0.1"):
    return client.post("/api/v1/assistant/chat", headers={"X-Forwarded-For": ip},
                       json={"messages": [{"role": "user", "content": text}]})


def test_offers_exactly_the_six_mcp_tools_and_runs_them(client, stub_openai):
    r = ask(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["generated_by"] == "AI"
    assert [t["name"] for t in body["tool_calls"]] == ["compare_sites"]
    assert {t["name"] for t in stub_openai[0]["tools"]} == SIX and len(stub_openai[0]["tools"]) == 6
    outputs = [i for i in stub_openai[1]["input"] if isinstance(i, dict) and i.get("type") == "function_call_output"]
    assert outputs and "differing_questions" in outputs[0]["output"]  # the real tool result reached the model
    assert "eq_id" in stub_openai[0]["instructions"]  # BR-003 rules are in the instructions


def test_rate_limited_after_twenty_questions(client, stub_openai, monkeypatch):
    async def fast(_req):
        return {"reply": "", "tool_calls": [], "generated_by": "AI", "model": "stub"}
    monkeypatch.setattr(assistant, "chat", fast)
    codes = [ask(client, ip="10.0.0.2").status_code for _ in range(21)]
    assert codes[:20] == [200] * 20 and codes[20] == 429


def test_no_key_is_503(client, stub_openai, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY")
    r = ask(client, ip="10.0.0.3")
    assert r.status_code == 503 and r.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"
