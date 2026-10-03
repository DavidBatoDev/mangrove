-- Enums (docs/data-model.md §2; finding vocabularies in docs/prd.md §4.1).
CREATE TYPE org_kind       AS ENUM ('funder', 'partner');
CREATE TYPE user_role      AS ENUM ('funder', 'partner');
CREATE TYPE question       AS ENUM ('history', 'current', 'ground', 'work', 'outcome');
CREATE TYPE source_type    AS ENUM ('gmw', 'sentinel2', 'field', 'project_report', 'proposal');
CREATE TYPE planned_action AS ENUM ('planting', 'natural_regeneration', 'hydrological_repair', 'protection', 'other');
CREATE TYPE event_kind     AS ENUM ('evidence_added', 'correction');
