-- Tables, constraints and indexes (docs/data-model.md §2–§3).

CREATE TABLE organization (
  id       uuid     NOT NULL DEFAULT gen_random_uuid(),
  name     text     NOT NULL,
  kind     org_kind NOT NULL,
  is_demo  boolean  NOT NULL DEFAULT true,
  CONSTRAINT pk_organization PRIMARY KEY (id)
);

CREATE TABLE app_user (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL,
  email         citext      NOT NULL,
  display_name  text        NOT NULL,
  role          user_role   NOT NULL,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_app_user PRIMARY KEY (id),
  CONSTRAINT fk_app_user_org FOREIGN KEY (org_id) REFERENCES organization (id) ON DELETE RESTRICT,
  CONSTRAINT uq_app_user_email UNIQUE (email)
);

CREATE TABLE site (
  id                 uuid                         NOT NULL DEFAULT gen_random_uuid(),
  name               text                         NOT NULL,
  region             text                         NOT NULL,
  geom               geometry(MultiPolygon, 4326) NOT NULL,
  proposal_summary   text,
  proposed_by_org_id uuid,
  is_demo            boolean                      NOT NULL DEFAULT true,
  created_at         timestamptz                  NOT NULL DEFAULT now(),
  CONSTRAINT pk_site PRIMARY KEY (id),
  CONSTRAINT fk_site_proposer FOREIGN KEY (proposed_by_org_id) REFERENCES organization (id) ON DELETE SET NULL
);
CREATE INDEX ix_site_geom ON site USING gist (geom);

CREATE TABLE evidence_item (
  id                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  site_id              uuid                     NOT NULL,
  question             question                 NOT NULL,
  source_type          source_type              NOT NULL,
  source_name          text                     NOT NULL,
  source_version       text,
  observed_from        timestamptz              NOT NULL,
  observed_to          timestamptz              NOT NULL,
  retrieved_at         timestamptz              NOT NULL DEFAULT now(),
  location             geometry(Geometry, 4326),
  finding              text,
  metrics              jsonb                    NOT NULL DEFAULT '[]',
  method               text                     NOT NULL,
  spatial_resolution_m numeric,
  limitation           text                     NOT NULL,
  provenance_url       text,
  asset_sha256         char(64),
  asset_mime           text,
  raw                  jsonb,
  usable               boolean                  NOT NULL,
  unusable_reason      text,
  note                 text,
  submitted_by_user_id uuid,
  submitted_by_org_id  uuid,
  is_demo              boolean                  NOT NULL DEFAULT true,
  created_at           timestamptz              NOT NULL DEFAULT now(),
  content_hash         char(64)                 NOT NULL,
  CONSTRAINT pk_evidence_item PRIMARY KEY (id),
  CONSTRAINT fk_evidence_site FOREIGN KEY (site_id) REFERENCES site (id) ON DELETE RESTRICT,
  -- BR-001: finding is in the question's vocabulary (docs/prd.md §4.1), or null only when unusable.
  CONSTRAINT ck_evidence_finding CHECK (
    (finding IS NULL AND usable = false)
    OR (question = 'history' AND finding IN ('mangrove_recorded', 'no_mangrove_recorded'))
    OR (question = 'current' AND finding IN ('mostly_vegetation', 'mostly_bare_soil', 'mostly_water'))
    OR (question = 'ground'  AND finding IN ('open_for_restoration', 'active_fishpond', 'land_use_dispute_reported', 'existing_mangrove'))
    OR (question = 'work'    AND finding IN ('work_done', 'no_work_seen'))
    OR (question = 'outcome' AND finding IN ('recovery_seen', 'no_recovery_seen'))
  ),
  CONSTRAINT ck_evidence_unusable_reason CHECK (usable = true OR unusable_reason IS NOT NULL)
);
CREATE INDEX ix_evidence_site_question ON evidence_item (site_id, question, created_at);
CREATE INDEX ix_evidence_location ON evidence_item USING gist (location);

CREATE TABLE promise_record (
  id                    uuid           NOT NULL DEFAULT gen_random_uuid(),
  site_id               uuid           NOT NULL,
  funder_org_id         uuid           NOT NULL,
  created_by_user_id    uuid           NOT NULL,
  rationale             text           NOT NULL,
  planned_action        planned_action NOT NULL,
  planned_action_detail text           NOT NULL,
  planned_area_ha       numeric(10,2)  NOT NULL,
  expected_outcome      text           NOT NULL,
  expected_vegetated_ha numeric(10,2),
  work_check_after      date           NOT NULL,
  outcome_check_after   date           NOT NULL,
  known_unknowns        text           NOT NULL,
  snapshot              jsonb          NOT NULL,
  idempotency_key       text           NOT NULL,
  is_demo               boolean        NOT NULL DEFAULT true,
  published_at          timestamptz    NOT NULL DEFAULT now(),
  content_hash          char(64)       NOT NULL,
  CONSTRAINT pk_promise_record PRIMARY KEY (id),
  CONSTRAINT fk_record_site FOREIGN KEY (site_id) REFERENCES site (id) ON DELETE RESTRICT,
  CONSTRAINT fk_record_funder FOREIGN KEY (funder_org_id) REFERENCES organization (id) ON DELETE RESTRICT,
  CONSTRAINT uq_record_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT ck_record_dates CHECK (outcome_check_after >= work_check_after),
  CONSTRAINT ck_record_area CHECK (planned_area_ha > 0)
);

CREATE TABLE record_event (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  record_id          uuid        NOT NULL,
  seq                integer     NOT NULL,
  kind               event_kind  NOT NULL,
  evidence_item_id   uuid,
  body               jsonb,
  created_by_user_id uuid        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  prev_hash          char(64)    NOT NULL,
  event_hash         char(64)    NOT NULL,
  CONSTRAINT pk_record_event PRIMARY KEY (id),
  CONSTRAINT fk_event_record FOREIGN KEY (record_id) REFERENCES promise_record (id) ON DELETE RESTRICT,
  CONSTRAINT fk_event_evidence FOREIGN KEY (evidence_item_id) REFERENCES evidence_item (id) ON DELETE RESTRICT,
  CONSTRAINT uq_event_record_seq UNIQUE (record_id, seq),
  CONSTRAINT ck_event_kind_payload CHECK (
    (kind = 'evidence_added' AND evidence_item_id IS NOT NULL)
    OR (kind = 'correction' AND body IS NOT NULL)
  )
);
