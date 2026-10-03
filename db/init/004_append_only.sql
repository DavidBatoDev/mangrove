-- BR-002 first layer: no UPDATE or DELETE on the append-only tables, whoever asks (docs/data-model.md §3).
CREATE FUNCTION fn_append_only() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'RECORD_IMMUTABLE: % on % is not allowed (append-only, BR-002)', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$fn$;

CREATE TRIGGER trg_evidence_item_append_only BEFORE UPDATE OR DELETE ON evidence_item
  FOR EACH ROW EXECUTE FUNCTION fn_append_only();
CREATE TRIGGER trg_promise_record_append_only BEFORE UPDATE OR DELETE ON promise_record
  FOR EACH ROW EXECUTE FUNCTION fn_append_only();
CREATE TRIGGER trg_record_event_append_only BEFORE UPDATE OR DELETE ON record_event
  FOR EACH ROW EXECUTE FUNCTION fn_append_only();

-- TRUNCATE skips row triggers, so block it as well.
CREATE TRIGGER trg_evidence_item_no_truncate BEFORE TRUNCATE ON evidence_item
  FOR EACH STATEMENT EXECUTE FUNCTION fn_append_only();
CREATE TRIGGER trg_promise_record_no_truncate BEFORE TRUNCATE ON promise_record
  FOR EACH STATEMENT EXECUTE FUNCTION fn_append_only();
CREATE TRIGGER trg_record_event_no_truncate BEFORE TRUNCATE ON record_event
  FOR EACH STATEMENT EXECUTE FUNCTION fn_append_only();
