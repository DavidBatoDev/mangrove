-- BR-002 second layer (ADR-034): the API's role may only read, and append to the append-only tables.
-- {app_role} is substituted by db/apply.py from DATABASE_APP_ROLE (quoted as an identifier).
GRANT USAGE ON SCHEMA public TO {app_role};
REVOKE ALL ON organization, app_user, site, evidence_item, promise_record, record_event FROM {app_role};
GRANT SELECT ON organization, app_user, site TO {app_role};
GRANT SELECT, INSERT ON evidence_item, promise_record, record_event TO {app_role};
GRANT SELECT ON spatial_ref_sys TO {app_role};
