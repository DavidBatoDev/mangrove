"use client";

// A 3D view of one site on Google's photorealistic/satellite globe, used for one strong moment:
// the fly-in when a site is selected and the slow orbit at the top of a record.
// Display only (ADR-043, draft): the boundary is drawn on Google imagery; nothing is measured or traced
// from it, and the label says the evidence comes from GMW and Sentinel-2. Without a key, without WebGL,
// or on any failure, the caller's 2D fallback renders instead.

import { useEffect, useRef, useState } from "react";
import { centroidOf, GOOGLE_IMAGERY_NOTE, googleUsable, loadMaps3d, onGoogleAuthFailure, outerRings } from "@/lib/google";
import { GLOBE_LIMITS } from "@/lib/google";

/** Visual state of the boundary, using the same tokens as pins and status chips (BRAND.md §6). */
export type SiteTone = "conflict" | "supported" | "awaiting" | "missing";

const TONE_TOKENS: Record<SiteTone, { stroke: string; fillAlpha: number }> = {
  conflict: { stroke: "--mg-conflict", fillAlpha: 0.28 }, // red only for conflict
  supported: { stroke: "--mg-tidal-lift", fillAlpha: 0.22 },
  awaiting: { stroke: "--mg-mist", fillAlpha: 0.16 },
  missing: { stroke: "--mg-on-dark-muted", fillAlpha: 0.12 },
};

function tokenRgba(name: string, alpha: number): string {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace("#", "");
  if (hex.length !== 6) return `rgba(244, 247, 245, ${alpha})`;
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Camera distance that frames the site with some coast around it. */
function rangeFor(geom: GeoJSON.Geometry): number {
  const pts = outerRings(geom).flat();
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111_320;
  const dLng = (Math.max(...lngs) - Math.min(...lngs)) * 111_320 * Math.cos(((lats[0] ?? 0) * Math.PI) / 180);
  return Math.max(900, Math.max(dLat, dLng) * 3.2);
}

export default function Site3DView({
  geometry,
  tone,
  motion,
  fallback,
  className,
  label,
}: {
  geometry: GeoJSON.Geometry;
  tone: SiteTone;
  /** "flyin": from the bay into a tilted view. "orbit": fly in, then circle slowly. */
  motion: "flyin" | "orbit";
  /** The 2D view to show when 3D is unavailable. */
  fallback: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(() => typeof window === "undefined" || !googleUsable());

  useEffect(() => {
    if (failed || !host.current) return;
    let alive = true;
    let map3d: google.maps.maps3d.Map3DElement | null = null;
    const off = onGoogleAuthFailure(() => setFailed(true));
    const center = centroidOf(geometry);
    if (!center) return;
    const range = rangeFor(geometry);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      try {
        const { Map3DElement, Polygon3DElement } = await loadMaps3d();
        if (!alive || !host.current) return;
        // Start high over the bay, looking straight down, then fly in.
        map3d = new Map3DElement({
          center: { ...center, altitude: 0 },
          range: range * 12,
          tilt: 0,
          heading: 0,
          mode: "HYBRID",
          defaultUIHidden: true, ...GLOBE_LIMITS,
        });
        map3d.style.width = "100%";
        map3d.style.height = "100%";
        const t = TONE_TOKENS[tone];
        for (const path of outerRings(geometry)) {
          const poly = new Polygon3DElement({
            altitudeMode: "CLAMP_TO_GROUND",
            strokeColor: tokenRgba(t.stroke, 1),
            fillColor: tokenRgba(t.stroke, t.fillAlpha),
            strokeWidth: 4,
            drawsOccludedSegments: true,
          });
          poly.path = path;
          map3d.append(poly);
        }
        host.current.append(map3d);
        const endCamera = { center: { ...center, altitude: 0 }, range, tilt: 62, heading: 25 };
        if (motion === "orbit" && !reduce) {
          map3d.addEventListener(
            "gmp-animationend",
            () => map3d?.flyCameraAround({ camera: endCamera, durationMillis: 90_000, repeatCount: Infinity }),
            { once: true },
          );
        }
        map3d.flyCameraTo({ endCamera, durationMillis: reduce ? 0 : 4_000 });
      } catch {
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
      off();
      map3d?.stopCameraAnimation();
      map3d?.remove();
    };
  }, [failed, geometry, tone, motion]);

  if (failed) return <>{fallback}</>;
  return (
    <div className={`site3d ${className ?? ""}`} role="img" aria-label={label ?? "3D view of the site boundary on Google imagery"}>
      <div ref={host} className="site3d-host" />
      <span className="gmap-note">{GOOGLE_IMAGERY_NOTE}</span>
    </div>
  );
}

/** The boundary tone for a site from its three answers: any conflict wins, then missing, else supported. */
export function toneFromAnswers(statuses: string[]): SiteTone {
  if (statuses.includes("conflicting")) return "conflict";
  if (statuses.includes("missing")) return "missing";
  return "supported";
}

/** The boundary tone for a record from its pin state (BR-004). */
export function toneFromPin(pin: "conflict" | "awaiting" | "on_track"): SiteTone {
  return pin === "conflict" ? "conflict" : pin === "on_track" ? "supported" : "awaiting";
}
