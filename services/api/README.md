# services/api

Python 3.12 + FastAPI evidence API and the deterministic rules engine.
- Read endpoints are public. Write endpoints (select site, publish record, upload evidence) require `ADMIN_TOKEN`.
- Decision flags come from source facts and rules. LLM explanations never set flags.
- Decision records are versioned and SHA-256 hashed.

_Created during the build window in Kiro._
