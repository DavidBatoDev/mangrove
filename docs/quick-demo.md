# Amazon Quick on the live MCP server — demo runbook

How to connect Amazon Quick to AIDE-M and leave a real, checkable trace. The MCP contract is API-015 in
[`api.md`](api.md); the tools are read-only (`security.md` §8). Nothing here is staged: every screenshot
must come from a real session.

## 1. Connect

- MCP server URL: `MCP_PUBLIC_URL` in `docs/ledger.md` §1 (the live host, path `/mcp`).
- Transport: streamable HTTP. Authentication: none (the server is public and read-only).
- In Amazon Quick, add an MCP integration (action connector) with that URL. Quick lists six tools:
  `list_sites`, `get_site_dossier`, `compare_sites`, `list_records`, `get_record`, `verify_record`.
- Screenshot the connector page showing the six tools.

## 2. Ask (in this order)

| # | Prompt | Tools Quick should call | What the answer must contain |
|---|--------|-------------------------|------------------------------|
| 1 | "List the real records in Eastern Visayas and their pin states." | `list_records` | Four real records, `is_demo = false`, each pin state as the API returns it |
| 2 | "Why is the Cancabato Bay record still awaiting? Cite the sources." | `get_record` | Work reported for the 70 ha; no source states its outcome; the city-level "0% in Tacloban" is shown but unusable, with links (ADR-059) |
| 3 | "For DENR's ₱1 billion Post-Yolanda program, what was verified and what was not, at Bungtod?" | `get_record` | The plantation was dead by May 2014; the mangroves are "now recovering"; reconstructed, not locked at the time; no number the tools did not return |
| 4 | "Verify the Paraiso record's hash." | `verify_record` | `intact: true` and the content hash |

Screenshot each answer with the tool-call panel visible.

## 3. Prove it on our side

Right after the session, open `GET /api/v1/mcp/usage` on the live host and screenshot it. It lists every
`tools/call` since the last deploy with time, tool and client (no arguments, no IP). The calls from step 2
appear there with Quick's user agent. The same lines are in the API container log
(`docker compose logs api | grep "mcp tools/call"` on the host).

The counter is in memory: a deploy resets it, so take the screenshot before the next push to `master`.
