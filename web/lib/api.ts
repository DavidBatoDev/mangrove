// The one data module every screen uses (ADR-038).
// NEXT_PUBLIC_USE_MOCKS=true → in-browser fakes over web/mocks/; otherwise the real API (docs/api.md).

import { ApiError } from "@/lib/api-error";
import type {
  CompareResponse,
  Dossier,
  EvidenceInput,
  EvidenceResponse,
  LockBody,
  LockResponse,
  PinsFC,
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

/** Demo boundary for site B; fixtures mode only. */
export const demoBoundary = (): Promise<unknown> => mock().then((m) => m.demoBoundary());
