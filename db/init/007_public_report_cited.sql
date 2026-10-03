-- idempotent: re-run on every apply (db/apply.py). ADR-051.
-- A public report is only evidence with its link: every public_report item carries provenance_url.
-- No change to the append-only triggers or the grants.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_evidence_public_report_cited') THEN
    ALTER TABLE evidence_item ADD CONSTRAINT ck_evidence_public_report_cited
      CHECK (source_type <> 'public_report' OR provenance_url IS NOT NULL);
  END IF;
END
$do$;
