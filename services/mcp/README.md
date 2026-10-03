# services/mcp

Read-only MCP server (official MCP Python SDK, Streamable HTTP at `/mcp`) used by the Amazon Quick analyst chat agent.
- Tools: `list_sites`, `get_evidence_dossier`, `compare_sites`, `get_decision_record`.
- Calls only the API's read endpoints over HTTP. No database access, so it is read-only by design (it has no auth).

_Created during the build window in Kiro._
