// Shapes from docs/api.md §3. Keep in step with the contract; do not add fields here first.

export type Confidence = "high" | "medium" | "low";

export interface Measure<T = number> {
  value: T;
  unit: string;
  eq_id: string | null;
  confidence: Confidence;
}

export type Question = "history" | "current" | "ground";
export type EvidenceQuestion = Question | "work" | "outcome";
export type Status = "supported" | "conflicting" | "missing";
export type CheckStatus = Status | "too_early";
export type PinState = "conflict" | "awaiting" | "on_track";
export type Role = "funder" | "partner";

export interface Site {
  id: string;
  name: string;
  region: string;
  is_demo: boolean;
  geometry: GeoJSON.Geometry;
  area: Measure;
  proposal_summary: string | null;
}

export interface Answer {
  question: Question;
  label: string;
  status: Status;
  finding: string | null;
  source_count: Measure;
  evidence_ids: string[];
  disagreeing_evidence_ids: string[];
}

export interface Evidence {
  id: string;
  question: EvidenceQuestion;
  source_type: string;
  source_name: string;
  source_version: string | null;
  observed_from: string;
  observed_to: string;
  retrieved_at: string;
  finding: string | null;
  usable: boolean;
  unusable_reason: string | null;
  metrics: (Measure & { name?: string })[];
  method: string | null;
  spatial_resolution_m: number | null;
  limitation: string | null;
  provenance_url: string | null;
  asset_url: string | null;
  submitted_by_org: string | null;
  is_demo: boolean;
  content_hash: string;
  // Present on mock items that carry the reported or mapped area (DS-004, DS-005).
  reported_area_ha?: number | null;
  boundary?: GeoJSON.Polygon | null;
}

export interface SiteFeatureProps {
  id: string;
  name: string;
  region: string;
  is_demo: boolean;
  area: Measure;
}
export type SitesFC = GeoJSON.FeatureCollection<GeoJSON.Geometry, SiteFeatureProps>;

export interface Dossier {
  site: Site;
  answers: Answer[];
  evidence: Evidence[];
}

export interface CompareResponse {
  sites: { site: Site; answers: Answer[] }[];
}

export interface PinProps {
  id: string;
  site_name: string;
  funder: string;
  published_at: string;
  pin_state: PinState;
  is_demo: boolean;
}
export type PinsFC = GeoJSON.FeatureCollection<GeoJSON.Point, PinProps>;

export interface Check {
  check: "work" | "outcome";
  label: string;
  status: CheckStatus;
  finding: string | null;
  checkable_from?: string;
  reported_area?: Measure | null;
  measured_area?: Measure | null;
  area_conflict?: Measure<boolean> | null;
  evidence_ids: string[];
}

export interface PromiseRecord {
  id: string;
  funder: { name: string; is_demo: boolean };
  published_at: string;
  rationale: string;
  planned_action: string;
  planned_action_detail: string;
  planned_area_ha: Measure;
  expected_outcome: string;
  expected_vegetated_ha: Measure | null;
  work_check_after: string;
  outcome_check_after: string;
  known_unknowns: string;
  snapshot: Record<string, unknown>;
  content_hash: string;
}

export interface TimelineEvent {
  seq: number;
  kind: string;
  created_at: string;
  evidence?: Evidence;
  event_hash: string;
}

export interface RecordDetail {
  record: PromiseRecord;
  checks: Check[];
  site_answers: Answer[];
  timeline: TimelineEvent[];
  pin_state: PinState;
  disclaimer: string;
}

export interface VerifyResponse {
  intact: boolean;
  content_hash: string;
  events_checked: number;
  first_mismatch_seq: number | null;
}

export interface User {
  id: string;
  display_name: string;
  role: Role;
  org: { id: string; name: string; is_demo: boolean };
}

export interface LockBody {
  site_id: string;
  rationale: string;
  planned_action: string;
  planned_action_detail: string;
  planned_area_ha: number;
  expected_outcome: string;
  expected_vegetated_ha: number | null;
  work_check_after: string;
  outcome_check_after: string;
  known_unknowns: string;
}

export interface LockResponse {
  id: string;
  url: string;
  published_at: string;
  content_hash: string;
  is_demo: boolean;
}

export interface EvidenceInput {
  site_id?: string;
  record_id?: string;
  source_type: "field" | "project_report";
  question: EvidenceQuestion;
  finding: string;
  observed_at: string;
  point?: GeoJSON.Point;
  boundary?: GeoJSON.Polygon;
  reported_area_ha?: number;
  note?: string;
  photo?: File;
}

export interface EvidenceResponse {
  evidence: Evidence;
  record_event: { seq: number; event_hash: string } | null;
}

export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
}

// --- GMW context (F-025, ADR-045; docs/api.md API-023..023) ---

export interface GmwSource {
  name: string;
  version: string;
  provenance_url: string;
  evidence_id?: string;
}

/** API-021: GMW mangrove area inside (EQ-002) and near (EQ-014) a site, per year. */
export interface GmwTimeline {
  site_id: string;
  is_demo: boolean;
  source: GmwSource | null;
  nearby_buffer: Measure | null;
  limitation: string;
  years: { year: number; inside: Measure; nearby: Measure }[];
}

export interface RangeMeasure extends Measure {
  lower: number;
  upper: number;
}

/** API-022: national extent (EQ-015) and gain/loss/net (EQ-016), as published by GMW. */
export interface CountryContext {
  iso3: string;
  name: string;
  source: GmwSource;
  years: { year: number; extent: RangeMeasure; gain: Measure | null; loss: Measure | null; net: Measure | null }[];
}

/** API-023: GMW extent polygons for the Manila Bay demo area, one year. */
/** API-024: the Philippines mangrove extent layer as map tiles (ADR-048). */
export interface GmwExtentTiles {
  years: number[];
  version: string;
  bbox: [number, number, number, number];
  max_zoom: number;
  /** Relative URL template with {year}, {z}, {x}, {y}. */
  tiles: string;
  source: GmwSource;
}

export interface GmwExtentLayer extends GeoJSON.FeatureCollection {
  year: number;
  available_years: number[];
  bbox?: GeoJSON.BBox;
  source: GmwSource;
}
