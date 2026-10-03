"use client";

import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";

/** What the GMW map layers offer (API-024, API-025): extent years and change baselines; empty when not installed. */
export function useGmwLayers(): { years: number[]; changeBases: Record<string, number[]>; defaultBase: number | null } {
  const ext = useApi(() => api.gmwExtentTiles().then((t) => t.years).catch(() => [] as number[]), []);
  const chg = useApi(() => api.gmwChangeTiles().catch(() => null), []);
  return { years: ext.data ?? [], changeBases: chg.data?.bases ?? {}, defaultBase: chg.data?.default_base ?? null };
}
