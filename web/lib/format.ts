// Plain-language labels. Copy rules: docs/design-brief.md §4.

import type { CheckStatus, Measure, PinState } from "@/lib/types";

const FINDINGS: Record<string, string> = {
  mangrove_recorded: "Mangrove recorded here before",
  no_mangrove_recorded: "No mangrove recorded here before",
  mostly_vegetation: "Mostly vegetation",
  mostly_bare_soil: "Mostly bare soil",
  mostly_water: "Mostly water",
  open_for_restoration: "Open for restoration",
  active_fishpond: "Active fishpond",
  land_use_dispute_reported: "Land-use dispute reported",
  existing_mangrove: "Existing mangrove",
  work_done: "Work done",
  no_work_seen: "No work seen",
  recovery_seen: "Recovery seen",
  no_recovery_seen: "No recovery seen",
};

export const findingLabel = (f: string | null | undefined) => (f ? (FINDINGS[f] ?? f.replaceAll("_", " ")) : "");

export const FINDINGS_BY_QUESTION: Record<string, string[]> = {
  history: ["mangrove_recorded", "no_mangrove_recorded"],
  ground: ["open_for_restoration", "active_fishpond", "land_use_dispute_reported", "existing_mangrove"],
  work: ["work_done", "no_work_seen"],
  outcome: ["recovery_seen", "no_recovery_seen"],
};

export const QUESTION_LABELS: Record<string, string> = {
  history: "Was this mangrove before?",
  current: "What's there now?",
  ground: "What do people on the ground say?",
  work: "Did the work happen?",
  outcome: "Did the mangroves come back?",
};

export const STATUS_WORDS: Record<CheckStatus, string> = {
  supported: "Supported",
  conflicting: "Conflicting",
  missing: "Missing",
  too_early: "Too early to tell",
};

export const PIN_WORDS: Record<PinState, string> = {
  conflict: "Sources disagree",
  awaiting: "Awaiting evidence",
  on_track: "On track",
};

export const ACTION_LABELS: Record<string, string> = {
  natural_regeneration: "Natural regeneration",
  hydrological_repair: "Hydrological repair",
  planting: "Planting",
  protection: "Protection",
  other: "Other",
};

export function formatMeasure(m: Measure | null | undefined): string {
  if (!m) return "—";
  const v =
    typeof m.value === "number"
      ? m.value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(m.value) ? 0 : 2 })
      : String(m.value);
  return m.unit === "items" ? v : `${v} ${m.unit}`;
}

export function formatDate(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts.length === 10 ? `${ts}T00:00:00Z` : ts);
  // Philippine time (UTC+8): a record published late in the UTC day carries the local date it was made.
  // Date-only values parse as UTC midnight, so they keep their calendar day.
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" });
}

export const shortHash = (h: string) => `${h.slice(0, 12)}…${h.slice(-6)}`;

// Short labels for computed numbers, from the equation table in docs/methods.md §2.
export const EQ_LABELS: Record<string, string> = {
  "EQ-001": "Site area",
  "EQ-002": "Mangrove area by year",
  "EQ-003": "Historical mangrove share",
  "EQ-004": "Change since peak",
  "EQ-005": "Valid-pixel fraction",
  "EQ-006": "Class fraction",
  "EQ-007": "Mean NDVI",
  "EQ-008": "Vegetated area",
  "EQ-010": "Mapped area",
  "EQ-013": "Sources",
  "EQ-017": "Quoted from a public report",
};

/** The record's site as locked in its snapshot. The API stores `snapshot.site` (data-model.md); older mock
 * fixtures used flat `site_id` / `site_name`. Falls back to the record's own site_id. */
export function snapshotSite(record: { site_id?: string; snapshot: Record<string, unknown> }): { id?: string; name?: string } {
  const snap = record.snapshot as { site?: { id?: string; name?: string }; site_id?: string; site_name?: string };
  return { id: snap.site?.id ?? snap.site_id ?? record.site_id, name: snap.site?.name ?? snap.site_name };
}
