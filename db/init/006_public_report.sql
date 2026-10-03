-- idempotent: re-run on every apply (db/apply.py). ADR-055.
-- A published document (news, proceedings, government statement) quoted by Mangrove; cited by provenance_url.
-- Its own file: a new enum value cannot be used in the transaction that adds it (007 uses it).
ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'public_report';
