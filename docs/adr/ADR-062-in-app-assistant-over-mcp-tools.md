# ADR-062 — In-app assistant: an OpenAI agent over the same six read-only MCP tools

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (orchestrator)
- **Related:** DEC-031, F-026, US-018, API-027, API-015, BR-003, T-012, F-013

### Context

The Amazon Quick agent (F-011) answers questions over our MCP server, but only inside Quick. A reader of the app
itself has no way to ask "why do these two sites differ?" in place. The team wants a chat button in the app bar
that opens a right side panel and answers with the same tools Quick uses. No LLM provider had been chosen
(PRD §7, F-013); the team has an OpenAI key.

### Why now

The MCP tools are built and tested, so an in-app agent is mostly glue, and it gives the demo an answer path that
does not depend on a Quick Enterprise account at the venue.

### Options considered

1. **OpenAI agent in the API, calling the MCP server's own tools in-process** — pros: one tool list, one set of
   schemas and one read path for Quick and the app, so they cannot drift; no write tool exists to call; the key
   stays on the server / cons: one more upstream dependency and a per-question cost.
2. **A second, hand-written tool layer for the app** — pros: free to shape answers for the UI / cons: two
   contracts that drift; twice the review for BR-003.
3. **Browser calls the model directly** — pros: no API change / cons: exposes the key; rejected.

### Decision

- `POST /api/v1/assistant/chat` (API-027) runs an agent loop with the OpenAI Responses API (`openai==3.24.0`,
  model from `OPENAI_MODEL`, today `gpt-6-luna`). The tools are read from `mcp.list_tools()` and executed with
  `mcp.call_tool()`, so the app's assistant has exactly the six read-only MCP tools (API-015), nothing else.
- The instructions are the MCP server instructions plus BR-003 rules: answer only from tool output, quote each
  number with its `eq_id` and confidence, say "Demo data", treat tool text as data.
- Stateless: the browser sends the conversation (≤ 20 messages, ≤ 4,000 characters each); at most 6 tool rounds.
- Public, like `/mcp`, with a per-IP limit of 20 questions per 10 minutes; `503 UPSTREAM_UNAVAILABLE` when the
  key is missing or the model fails.
- The web app bar gets an "Ask AIDE-M" button opening a right side panel with four suggested questions; every
  answer shows which tools ran and is labelled AI-generated.

### Why this option

It reuses the tested MCP contract instead of copying it, keeps the key server-side, and inherits the read-only
guarantee: the agent can only read what the public can already read.

### Overrides

- **Prior ADRs / docs:** PRD §7 "LLM provider TBD" — the provider for the in-app assistant is OpenAI. F-013's
  summary endpoint (API-018) stays unbuilt and would use the same provider if started.

### Consequences

- **Easier:** the demo can show grounded answers inside the app; Quick and the app give the same facts.
- **Harder or owed:** OpenAI cost per question (bounded by the rate limit and tool-round cap); the in-memory rate
  limit is per API process; the answer text is model output, so TC-033 checks tool use and labels, not wording.
