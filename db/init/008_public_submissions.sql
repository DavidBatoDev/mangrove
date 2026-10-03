-- idempotent: public-only product (ADR-061). No accounts: whoever adds evidence or locks a promise types who they are.
-- Adds nullable columns only; the append-only triggers (004) and the app role's SELECT/INSERT grants (005) are unchanged.
-- contact_email is personal data: stored for follow-up, never displayed, never hashed, never sent to MCP (docs/security.md §3).

ALTER TABLE evidence_item ADD COLUMN IF NOT EXISTS submitter_name text;
ALTER TABLE evidence_item ADD COLUMN IF NOT EXISTS submitter_org  text;
ALTER TABLE evidence_item ADD COLUMN IF NOT EXISTS submitter_role text;
ALTER TABLE evidence_item ADD COLUMN IF NOT EXISTS contact_email  text;
ALTER TABLE evidence_item DROP CONSTRAINT IF EXISTS ck_evidence_submitter_role;
ALTER TABLE evidence_item ADD CONSTRAINT ck_evidence_submitter_role
  CHECK (submitter_role IS NULL OR submitter_role IN ('field_partner', 'funder', 'resident'));

ALTER TABLE promise_record ALTER COLUMN funder_org_id      DROP NOT NULL;
ALTER TABLE promise_record ALTER COLUMN created_by_user_id DROP NOT NULL;
ALTER TABLE promise_record ADD COLUMN IF NOT EXISTS funder_name   text;
ALTER TABLE promise_record ADD COLUMN IF NOT EXISTS funder_org    text;
ALTER TABLE promise_record ADD COLUMN IF NOT EXISTS funder_role   text;
ALTER TABLE promise_record ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE promise_record DROP CONSTRAINT IF EXISTS ck_record_funder_named;
ALTER TABLE promise_record ADD CONSTRAINT ck_record_funder_named
  CHECK (funder_org_id IS NOT NULL OR funder_name IS NOT NULL);
ALTER TABLE promise_record DROP CONSTRAINT IF EXISTS ck_record_funder_role;
ALTER TABLE promise_record ADD CONSTRAINT ck_record_funder_role
  CHECK (funder_role IS NULL OR funder_role IN ('field_partner', 'funder', 'resident'));

ALTER TABLE record_event ALTER COLUMN created_by_user_id DROP NOT NULL;
