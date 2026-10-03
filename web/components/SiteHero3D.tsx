"use client";

// The 3D band at the top of a record (orbit) or a dossier (fly-in). Fetches the site boundary, then shows
// Site3DView; without Google it falls back to the 2D MapLibre site map.

import Map from "@/components/Map";
import Site3DView, { type SiteTone } from "@/components/Site3DView";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import type { SitesFC } from "@/lib/types";

export default function SiteHero3D({ siteId, tone, motion }: { siteId: string; tone: SiteTone; motion: "flyin" | "orbit" }) {
  const site = useApi(() => api.getSite(siteId), [siteId]);
  if (!site.data) return <div className="site-hero site-hero--empty" aria-hidden="true" />;
  const s = site.data.site;
  const fc: SitesFC = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: s.geometry, properties: { id: s.id, name: s.name, region: s.region, is_demo: s.is_demo, area: s.area } }],
  };
  return (
    <Site3DView
      className="site-hero"
      geometry={s.geometry}
      tone={tone}
      motion={motion}
      label={`3D view of ${s.name}`}
      fallback={<Map sites={fc} fitToSites basemap="satellite" className="site-hero site-hero--2d" />}
    />
  );
}
