"use client";

import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";

/** Years of the Philippines mangrove extent layer (API-024, ADR-048), or [] when the layer is not installed. */
export function useGmwTileYears(): number[] {
  const r = useApi(() => api.gmwExtentTiles().then((t) => t.years).catch(() => [] as number[]), []);
  return r.data ?? [];
}
