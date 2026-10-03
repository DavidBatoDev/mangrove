# api/

FastAPI evidence API (`docs/system-design.md` §2). The only component that writes to the database.
- `engine/`: pure functions for findings, statuses, pin state and every `EQ-###` (`docs/methods.md`).
- `ledger/`: record and timeline creation, canonical-JSON hashing, hash-chain verification (EQ-011).
- `adapters/`: Sentinel-2 live adapter with stored-snapshot fallback; field-upload normalizer.
- MCP server mounted in this app at `/mcp` (streamable HTTP, six read-only tools, `docs/api.md` API-015).
- `tests/`: pytest cases from `docs/tests.md`.

Database: Neon Postgres + PostGIS (ADR-036). Photos: S3, content-addressed by SHA-256 (ADR-037).

_Built during the build window in Kiro._
