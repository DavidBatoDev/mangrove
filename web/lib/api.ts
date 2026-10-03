// The one data module every screen uses (ADR-038).
// NEXT_PUBLIC_USE_MOCKS=true → in-browser fakes over web/mocks/; otherwise the real API (docs/api.md).

import { ApiError } from "@/lib/api-error";
import type {
  Answer,
  Evidence,
  CompareResponse,
  CountryContext,
  Dossier,
  EvidenceInput,
  EvidenceResponse,
  GmwExtentLayer,
  GmwChangeTiles,
  GmwExtentTiles,
  GmwTimeline,
  LockBody,
  LockResponse,
  PinsFC,
  ProgramContext,
  RecordDetail,
  SitesFC,
  User,
  VerifyResponse,
} from "@/lib/types";

export { ApiError };
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// Loaded only in mock mode; NEXT_PUBLIC_USE_MOCKS is inlined at build time, so a real build drops the fixtures.
// The "mangrove-mocks" alias points at a stub in real builds (next.config.ts).
const mock = () => import("mangrove-mocks");

function baseUrl(): string {
  // Browser: relative, proxied by the Next.js rewrite (or Caddy in production).
  if (typeof window !== "undefined") return "/api/v1";
  return `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1`;
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, { credentials: "include", cache: "no-store", ...init });
  } catch {
    throw new ApiError(0, "NETWORK", "Could not reach the server.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error ?? body ?? {};
    throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? `Request failed (${res.status}).`);
  }
  return body as T;
}

const json = (method: string, data: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(data),
});

// API-007: pull the site's current condition from Sentinel-2 (AWS Open Data, ADR-061). Live data only:
// fixtures mode has no satellite archive behind it.
export const sentinelRefresh = (siteId: string): Promise<{ evidence: Evidence; answers: Answer[] }> =>
  USE_MOCKS
    ? Promise.reject(new ApiError(503, "UPSTREAM_UNAVAILABLE", "Satellite refresh needs the live API, not demo fixtures."))
    : http(`/sites/${siteId}/sentinel-refresh`, { method: "POST" });

// API-001
export const login = (email: string, password: string): Promise<{ user: User }> =>
  USE_MOCKS ? mock().then((m) => m.login(email, password)) : http("/auth/login", json("POST", { email, password }));

// API-002
export const logout = (): Promise<void> => (USE_MOCKS ? mock().then((m) => m.logout()) : http("/auth/logout", { method: "POST" }));

// API-003
export const me = (): Promise<{ user: User }> => (USE_MOCKS ? mock().then((m) => m.me()) : http("/auth/me"));

// API-004
export const listSites = (): Promise<SitesFC> => (USE_MOCKS ? mock().then((m) => m.listSites()) : http("/sites"));

// API-005
export const getSite = (siteId: string): Promise<Dossier> =>
  USE_MOCKS ? mock().then((m) => m.getSite(siteId)) : http(`/sites/${encodeURIComponent(siteId)}`);

// API-006
export const compare = (siteIds: string[]): Promise<CompareResponse> =>
  USE_MOCKS ? mock().then((m) => m.compare(siteIds)) : http(`/compare?site_ids=${siteIds.map(encodeURIComponent).join(",")}`);

// API-010
export const listRecords = (): Promise<PinsFC> => (USE_MOCKS ? mock().then((m) => m.listRecords()) : http("/records"));

// API-011
export const getRecord = (recordId: string): Promise<RecordDetail> =>
  USE_MOCKS ? mock().then((m) => m.getRecord(recordId)) : http(`/records/${encodeURIComponent(recordId)}`);

// API-013
export const verifyRecord = (recordId: string): Promise<VerifyResponse> =>
  USE_MOCKS ? mock().then((m) => m.verifyRecord(recordId)) : http(`/records/${encodeURIComponent(recordId)}/verify`);

// API-009
export const lockRecord = (body: LockBody, idempotencyKey: string): Promise<LockResponse> =>
  USE_MOCKS ? mock().then((m) => m.lockRecord(body, idempotencyKey)) : http("/records", json("POST", body, { "Idempotency-Key": idempotencyKey }));

// API-008 (multipart/form-data)
export function submitEvidence(input: EvidenceInput): Promise<EvidenceResponse> {
  if (USE_MOCKS) return mock().then((m) => m.submitEvidence(input));
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (value == null || value === "") continue;
    if (value instanceof File) form.append(key, value);
    else if (typeof value === "object") form.append(key, JSON.stringify(value));
    else form.append(key, String(value));
  }
  return http("/evidence", { method: "POST", body: form });
}

// API-021
export const gmwTimeline = (siteId: string): Promise<GmwTimeline> =>
  USE_MOCKS ? mock().then((m) => m.gmwTimeline(siteId)) : http(`/sites/${encodeURIComponent(siteId)}/gmw-timeline`);

// API-022
export const countryContext = (iso3: string): Promise<CountryContext> =>
  USE_MOCKS ? mock().then((m) => m.countryContext(iso3)) : http(`/context/countries/${encodeURIComponent(iso3)}`);

// API-026: a public funding program (the real Post-Yolanda case), figures quoted as published.
export const programContext = (programId: string): Promise<ProgramContext> =>
  USE_MOCKS ? mock().then((m) => m.programContext(programId)) : http(`/context/programs/${encodeURIComponent(programId)}`);

// API-023
export const gmwExtent = (year?: number): Promise<GmwExtentLayer> =>
  USE_MOCKS ? mock().then((m) => m.gmwExtent(year)) : http(`/layers/gmw-extent${year ? `?year=${year}` : ""}`);

// API-024: the Philippines mangrove extent as map tiles (ADR-048, ADR-049). The tiles are real public GMW data,
// not fixtures, so fixtures mode and local dev read them from the live API (it allows any origin); a deployed
// build reads them from its own origin. NEXT_PUBLIC_GMW_TILES_ORIGIN overrides both.
const LIVE_API_ORIGIN = "https://18-140-211-157.sslip.io";
const TILE_ORIGIN = process.env.NEXT_PUBLIC_GMW_TILES_ORIGIN || (USE_MOCKS ? LIVE_API_ORIGIN : "");
/** Bump with the API's STYLE (api/app/gmw_tiles.py) so browsers drop tiles cached in an older look. */
const TILE_STYLE = "cyan-2";

async function tileInfo<T>(path: string): Promise<T> {
  if (!TILE_ORIGIN) return http(path);
  const res = await fetch(`${TILE_ORIGIN}/api/v1${path}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) throw new ApiError(res?.status ?? 0, "UPSTREAM_UNAVAILABLE", "The mangrove layer is not reachable.");
  return res.json();
}

// Tiles are static files (ADR-053): Caddy serves stored ones straight from disk, like GMW's own tile host.
const tileBase = () => `${TILE_ORIGIN || (typeof window !== "undefined" ? window.location.origin : "")}/tiles/gmw/${TILE_STYLE}`;

export const gmwExtentTiles = (): Promise<GmwExtentTiles> => tileInfo("/layers/gmw-extent/tiles");

// API-025: mangrove change (gain / loss) against a baseline year.
export const gmwChangeTiles = (): Promise<GmwChangeTiles> => tileInfo("/layers/gmw-change/tiles");

/** Absolute XYZ template for one year (map engines fetch tiles outside fetch(), so the origin is spelled out). */
export const gmwTileTemplate = (year: number): string => `${tileBase()}/extent/${year}/{z}/{x}/{y}.png`;

/** Absolute XYZ template for gain or loss against a baseline year. */
export const gmwChangeTileTemplate = (base: number, year: number, only: "gain" | "loss"): string =>
  `${tileBase()}/change/${base}/${year}/${only}/{z}/{x}/{y}.png`;

/** Layer opacity at a zoom: full until z13, fading to 30% by z16 so the imagery shows through when zoomed in. */
export function mangroveOpacityAt(zoom: number, opacity: number): number {
  const f = zoom <= 13 ? 1 : zoom >= 16 ? 0.3 : 1 - ((zoom - 13) / 3) * 0.7;
  return Math.max(0, Math.min(1, opacity * f));
}

/** Demo boundary for site B; fixtures mode only. */
export const demoBoundary = (): Promise<unknown> => mock().then((m) => m.demoBoundary());

// API-027: in-app assistant over the read-only MCP tools (ADR-062). Always the live API, also in fixtures mode:
// the agent reads the database through its own tools, so there is nothing to fake.
export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantReply = { reply: string; tool_calls: { name: string; arguments: Record<string, unknown> }[]; generated_by: "AI"; model: string };
export const assistantChat = (messages: AssistantMessage[]): Promise<AssistantReply> =>
  http("/assistant/chat", json("POST", { messages }));
