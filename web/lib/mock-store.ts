// In-browser fakes for P0 (ADR-038). Reads fixtures in web/mocks/ and keeps writes in sessionStorage,
// so the demo storyboard clicks through without the API. Never deployed: only used when
// NEXT_PUBLIC_USE_MOCKS=true.

import sitesFixture from "@/mocks/api-004-sites.json";
import siteA from "@/mocks/api-005-site-a.json";
import siteB from "@/mocks/api-005-site-b.json";
import siteC from "@/mocks/api-005-site-c.json";
import siteD from "@/mocks/api-005-site-d.json";
import siteE from "@/mocks/api-005-site-e.json";
import recordsFixture from "@/mocks/api-010-records.json";
import recordAFixture from "@/mocks/api-011-record-a.json";
import centroids from "@/mocks/site-centroids.json";
// Extra fictional records across the Philippines so the map previews every pin state (UI preview only).
import uiPreview from "@/mocks/ui-preview-records.json";
import { ApiError } from "@/lib/api-error";
import type {
  Answer,
  Check,
  CompareResponse,
  Dossier,
  Evidence,
  EvidenceInput,
  EvidenceResponse,
  LockBody,
  LockResponse,
  PinState,
  PinsFC,
  RecordDetail,
  SitesFC,
  User,
  VerifyResponse,
} from "@/lib/types";

const DISCLAIMER = "This record is not a certification of restoration success or approval of funding.";
const AREA_TOLERANCE = 0.2; // docs/methods.md §3.1, EQ-009
const STORE_KEY = "mangrove-mock-v2"; // bumped when the seeded fixtures change

const PREVIEW = uiPreview as unknown as { dossiers: Dossier[]; records: RecordDetail[]; pins: PinsFC["features"] };
const DOSSIERS: Dossier[] = [...([siteA, siteB, siteC, siteD, siteE] as unknown as Dossier[]), ...PREVIEW.dossiers];
const USERS: Record<string, User> = {
  "funder@demo.mangrove.test": {
    id: "00000000-0000-4000-8000-000000000f01",
    display_name: "Demo funder",
    role: "funder",
    org: { id: "00000000-0000-4000-8000-000000000f10", name: "Demo Coastal Fund", is_demo: true },
  },
  "partner@demo.mangrove.test": {
    id: "00000000-0000-4000-8000-000000000f02",
    display_name: "Demo partner",
    role: "partner",
    org: { id: "00000000-0000-4000-8000-000000000f20", name: "Demo Bayside Partners", is_demo: true },
  },
};

interface MockState {
  user: User | null;
  records: Record<string, RecordDetail>;
  pins: PinsFC["features"];
  addedEvidence: Record<string, Evidence[]>; // by site id
  recordSite: Record<string, string>; // record id -> site id
  idempotency: Record<string, LockResponse>;
}

function initialState(): MockState {
  const seeded = [structuredClone(recordAFixture) as unknown as RecordDetail, ...structuredClone(PREVIEW.records)];
  const pins = [...structuredClone((recordsFixture as unknown as PinsFC).features), ...structuredClone(PREVIEW.pins)];
  pins.sort((a, b) => b.properties.published_at.localeCompare(a.properties.published_at)); // newest first (API-010)
  return {
    user: null,
    records: Object.fromEntries(seeded.map((r) => [r.record.id, r])),
    pins,
    addedEvidence: {},
    recordSite: Object.fromEntries(seeded.map((r) => [r.record.id, (r.record.snapshot as { site_id: string }).site_id])),
    idempotency: {},
  };
}

let state: MockState | null = null;

function load(): MockState {
  if (state) return state;
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(STORE_KEY) : null;
    state = raw ? (JSON.parse(raw) as MockState) : initialState();
  } catch {
    state = initialState();
  }
  return state;
}

function save() {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: the demo still works until reload.
  }
}

export function resetMocks() {
  state = initialState();
  save();
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Geodesic polygon area on a sphere (ha). Approximates EQ-010 for the mock only. */
function polygonAreaHa(poly: GeoJSON.Polygon): number {
  const R = 6378137;
  const rad = (d: number) => (d * Math.PI) / 180;
  const ringArea = (ring: GeoJSON.Position[]) => {
    let total = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      total += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)));
    }
    return Math.abs((total * R * R) / 2);
  };
  const [outer, ...holes] = poly.coordinates;
  const m2 = ringArea(outer) - holes.reduce((s, h) => s + ringArea(h), 0);
  return Math.round((m2 / 10000) * 100) / 100;
}

function dossierFor(siteId: string): Dossier {
  const base = DOSSIERS.find((d) => d.site.id === siteId);
  if (!base) throw new ApiError(404, "NOT_FOUND", "No site with that id.");
  const added = load().addedEvidence[siteId] ?? [];
  const evidence = [...added, ...base.evidence];
  return { site: base.site, answers: computeAnswers(base.answers, evidence), evidence };
}

// BR-001 over the three site questions.
function computeAnswers(template: Answer[], evidence: Evidence[]): Answer[] {
  return template.map((a) => {
    const usable = evidence.filter((e) => e.question === a.question && e.usable);
    const findings = new Set(usable.map((e) => e.finding));
    const status = usable.length === 0 ? "missing" : findings.size === 1 ? "supported" : "conflicting";
    const oldest = usable[usable.length - 1]?.finding;
    return {
      ...a,
      status,
      finding: status === "supported" ? usable[0].finding : null,
      source_count: { ...a.source_count, value: usable.length },
      evidence_ids: usable.map((e) => e.id),
      disagreeing_evidence_ids: status === "conflicting" ? usable.filter((e) => e.finding !== oldest).map((e) => e.id) : [],
    };
  });
}

// Work check: BR-001 over findings plus EQ-009 over reported (project report) vs mapped (EQ-010) area.
function computeWorkCheck(prev: Check, items: Evidence[]): Check {
  const usable = items.filter((e) => e.usable);
  if (usable.length === 0) return { ...prev, status: "missing", finding: null, evidence_ids: [] };
  const report = usable.find((e) => e.source_type === "project_report" && e.reported_area_ha);
  const mapped = usable.find((e) => e.boundary);
  const reported = report?.reported_area_ha ?? null;
  const measured = mapped?.boundary ? polygonAreaHa(mapped.boundary) : null;
  const areaConflict = reported != null && measured != null ? Math.abs(reported - measured) / reported > AREA_TOLERANCE : null;
  const findings = new Set(usable.map((e) => e.finding));
  const status = findings.size > 1 || areaConflict ? "conflicting" : "supported";
  return {
    ...prev,
    status,
    finding: status === "supported" ? usable[0].finding : null,
    reported_area: reported != null ? { value: reported, unit: "ha", eq_id: null, confidence: "low" } : null,
    measured_area: measured != null ? { value: measured, unit: "ha", eq_id: "EQ-010", confidence: "medium" } : null,
    area_conflict: areaConflict != null ? { value: areaConflict, unit: "flag", eq_id: "EQ-009", confidence: "low" } : null,
    evidence_ids: usable.map((e) => e.id),
  };
}

// BR-004.
function pinStateFor(detail: RecordDetail): PinState {
  if (detail.checks.some((c) => c.status === "conflicting") || detail.site_answers.some((a) => a.status === "conflicting"))
    return "conflict";
  if (detail.checks.some((c) => c.status === "missing" || c.status === "too_early")) return "awaiting";
  return "on_track";
}

function requireUser(): User {
  const u = load().user;
  if (!u) throw new ApiError(401, "UNAUTHENTICATED", "Sign in first.");
  return u;
}

// --- operations -----------------------------------------------------------

export async function login(email: string, password: string): Promise<{ user: User }> {
  await delay();
  const user = USERS[email.trim().toLowerCase()];
  if (!user || !password) throw new ApiError(401, "UNAUTHENTICATED", "Email or password is wrong.");
  load().user = user;
  save();
  return { user };
}

export async function logout(): Promise<void> {
  load().user = null;
  save();
}

export async function me(): Promise<{ user: User }> {
  return { user: requireUser() };
}

export async function listSites(): Promise<SitesFC> {
  await delay();
  return sitesFixture as unknown as SitesFC;
}

export async function getSite(siteId: string): Promise<Dossier> {
  await delay();
  return dossierFor(siteId);
}

export async function compare(siteIds: string[]): Promise<CompareResponse> {
  await delay();
  if (siteIds.length < 2 || siteIds.length > 5)
    throw new ApiError(422, "COMPARE_RANGE", "Pick between 2 and 5 sites to compare.");
  return { sites: siteIds.map((id) => { const d = dossierFor(id); return { site: d.site, answers: d.answers }; }) };
}

export async function listRecords(): Promise<PinsFC> {
  await delay();
  const s = load();
  return { type: "FeatureCollection", features: s.pins };
}

export async function getRecord(recordId: string): Promise<RecordDetail> {
  await delay();
  const detail = load().records[recordId];
  if (!detail) throw new ApiError(404, "NOT_FOUND", "No record with that id.");
  return detail;
}

export async function verifyRecord(recordId: string): Promise<VerifyResponse> {
  await delay(400);
  const detail = await getRecord(recordId);
  return { intact: true, content_hash: detail.record.content_hash, events_checked: detail.timeline.length, first_mismatch_seq: null };
}

export async function lockRecord(body: LockBody, idempotencyKey: string): Promise<LockResponse> {
  await delay(500);
  const user = requireUser();
  if (user.role !== "funder") throw new ApiError(403, "FORBIDDEN_ROLE", "Only a funder can lock a promise.");
  const s = load();
  if (s.idempotency[idempotencyKey]) return s.idempotency[idempotencyKey];
  if (body.outcome_check_after <= body.work_check_after)
    throw new ApiError(422, "DATES_ORDER", "The outcome check must come after the work check.");
  const dossier = dossierFor(body.site_id);
  const id = crypto.randomUUID();
  const published_at = new Date().toISOString();
  const snapshot = {
    site_id: dossier.site.id,
    site_name: dossier.site.name,
    site_answers: dossier.answers,
    evidence_ids: dossier.evidence.map((e) => e.id),
  };
  const content_hash = await sha256(JSON.stringify({ ...body, published_at, snapshot }));
  const detail: RecordDetail = {
    record: {
      id,
      funder: { name: user.org.name, is_demo: true },
      published_at,
      rationale: body.rationale,
      planned_action: body.planned_action,
      planned_action_detail: body.planned_action_detail,
      planned_area_ha: { value: body.planned_area_ha, unit: "ha", eq_id: null, confidence: "high" },
      expected_outcome: body.expected_outcome,
      expected_vegetated_ha:
        body.expected_vegetated_ha != null ? { value: body.expected_vegetated_ha, unit: "ha", eq_id: null, confidence: "high" } : null,
      work_check_after: body.work_check_after,
      outcome_check_after: body.outcome_check_after,
      known_unknowns: body.known_unknowns,
      snapshot,
      content_hash,
    },
    checks: [
      { check: "work", label: "Did the work happen?", status: "missing", finding: null, reported_area: null, measured_area: null, area_conflict: null, evidence_ids: [] },
      { check: "outcome", label: "Did the mangroves come back?", status: "too_early", checkable_from: body.outcome_check_after, finding: null, evidence_ids: [] },
    ],
    site_answers: dossier.answers,
    timeline: [],
    pin_state: "awaiting",
    disclaimer: DISCLAIMER,
  };
  detail.pin_state = pinStateFor(detail);
  s.records[id] = detail;
  s.recordSite[id] = body.site_id;
  const coords = (centroids as unknown as Record<string, [number, number]>)[body.site_id];
  s.pins.unshift({
    type: "Feature",
    geometry: { type: "Point", coordinates: coords },
    properties: { id, site_name: dossier.site.name, funder: user.org.name, published_at, pin_state: detail.pin_state, is_demo: true },
  });
  const res: LockResponse = { id, url: `/records/${id}`, published_at, content_hash, is_demo: true };
  s.idempotency[idempotencyKey] = res;
  save();
  return res;
}

export async function submitEvidence(input: EvidenceInput): Promise<EvidenceResponse> {
  await delay(500);
  const user = requireUser();
  if (input.source_type === "field" && user.role !== "partner")
    throw new ApiError(403, "FORBIDDEN_ROLE", "Field evidence is submitted by a partner.");
  if (input.source_type === "project_report" && user.role !== "funder")
    throw new ApiError(403, "FORBIDDEN_ROLE", "Project reports are submitted by a funder.");
  if (input.question === "current") throw new ApiError(422, "VALIDATION_FAILED", "What's there now comes from satellite only.");
  if (input.source_type === "field" && !input.point) throw new ApiError(422, "VALIDATION_FAILED", "Field evidence needs a GPS point.");
  if (input.source_type === "project_report" && input.question === "work" && !(input.reported_area_ha && input.reported_area_ha > 0))
    throw new ApiError(422, "VALIDATION_FAILED", "A work report needs the reported area in ha.");
  if (input.observed_at > new Date().toISOString().slice(0, 10))
    throw new ApiError(422, "VALIDATION_FAILED", "The observation date cannot be in the future.");

  const s = load();
  const siteId = input.record_id ? s.recordSite[input.record_id] : input.site_id;
  if (!siteId) throw new ApiError(404, "NOT_FOUND", "No site or record with that id.");
  dossierFor(siteId); // 404 check

  const now = new Date().toISOString();
  const observed = `${input.observed_at}T00:00:00Z`;
  const isField = input.source_type === "field";
  const base = {
    id: crypto.randomUUID(),
    question: input.question,
    source_type: input.source_type,
    source_name: isField ? `Partner field visit (${user.org.name})` : `Project report (${user.org.name})`,
    source_version: null,
    observed_from: observed,
    observed_to: observed,
    retrieved_at: now,
    finding: input.finding,
    usable: true,
    unusable_reason: null,
    metrics: [] as Evidence["metrics"],
    method: isField
      ? input.boundary
        ? "Field visit with GPS point; worked area from the partner's mapped boundary (EQ-010)."
        : "Field visit with GPS point."
      : "Stated by the funder in a project report.",
    spatial_resolution_m: null,
    limitation: isField ? "One visit; device GPS accuracy unknown." : "Self-reported by the funder; not independently checked.",
    provenance_url: null,
    asset_url: null,
    submitted_by_org: user.org.name,
    is_demo: true,
    reported_area_ha: input.reported_area_ha ?? null,
    boundary: input.boundary ?? null,
  };
  if (input.boundary)
    base.metrics.push({ name: "mapped_area", value: polygonAreaHa(input.boundary), unit: "ha", eq_id: "EQ-010", confidence: "medium" });
  if (input.reported_area_ha)
    base.metrics.push({ name: "reported_area", value: input.reported_area_ha, unit: "ha", eq_id: null, confidence: "low" });
  const evidence: Evidence = { ...base, content_hash: await sha256(JSON.stringify(base)) };
  (s.addedEvidence[siteId] ??= []).unshift(evidence);

  let record_event: EvidenceResponse["record_event"] = null;
  if (input.record_id) {
    const detail = s.records[input.record_id];
    const prev = detail.timeline.at(-1)?.event_hash ?? detail.record.content_hash;
    const seq = detail.timeline.length + 1;
    const event_hash = await sha256(prev + JSON.stringify(evidence));
    detail.timeline.push({ seq, kind: "evidence_added", created_at: now, evidence, event_hash });
    const workItems = detail.timeline.map((t) => t.evidence).filter((e): e is Evidence => !!e && e.question === "work");
    detail.checks = detail.checks.map((c) => (c.check === "work" ? computeWorkCheck(c, workItems) : c));
    detail.site_answers = dossierFor(siteId).answers;
    detail.pin_state = pinStateFor(detail);
    const pin = s.pins.find((p) => p.properties.id === input.record_id);
    if (pin) pin.properties.pin_state = detail.pin_state;
    record_event = { seq, event_hash };
  }
  save();
  return { evidence, record_event };
}

/** Records on a site, for the dossier and the evidence form (mock-only helper; real API has no such endpoint yet). */
export function recordsForSite(siteId: string): { id: string; published_at: string }[] {
  const s = load();
  return Object.entries(s.recordSite)
    .filter(([, sid]) => sid === siteId)
    .map(([id]) => ({ id, published_at: s.records[id].record.published_at }));
}

/** The demo partner's mapped worked area inside site B (data/sites/demo/, 5.00 ha). */
export async function demoBoundary(): Promise<unknown> {
  return (await import("@/mocks/b-mapped-boundary-5ha.json")).default;
}
