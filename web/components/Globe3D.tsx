"use client";

// Google's 3D globe for the map screens, opened by the 3D button when Google is the map engine.
// Google's 2D map only tilts at street-level zoom, so "3D" here swaps in Map3DElement at the current view,
// with record pins (Marker3DInteractiveElement) and site outlines. Display only (ADR-046).

import { useEffect, useRef } from "react";
import { GOOGLE_IMAGERY_NOTE, loadMaps3d, loadMarker, outerRings } from "@/lib/google";
import { GLOBE_LIMITS } from "@/lib/google";
import { PIN_WORDS } from "@/lib/format";
import type { PinsFC, SitesFC } from "@/lib/types";

const tok = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888888";
const PIN_TOKENS = { conflict: "--mg-pin-conflict", awaiting: "--mg-brackish", on_track: "--mg-pin-on-track" } as const;

/** Camera distance that shows about what a 2D map shows at this zoom. */
const rangeForZoom = (zoom: number, lat: number) => (156543 * Math.cos((lat * Math.PI) / 180) * 800) / 2 ** zoom;

export default function Globe3D({
  view,
  pins,
  sites,
  onPinClick,
  onFail,
}: {
  view: { center: [number, number]; zoom: number };
  pins?: PinsFC | null;
  sites?: SitesFC | null;
  onPinClick?: (id: string) => void;
  onFail: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.maps3d.Map3DElement | null>(null);
  const clickRef = useRef(onPinClick);
  useEffect(() => {
    clickRef.current = onPinClick;
  });

  useEffect(() => {
    let alive = true;
    let map3d: google.maps.maps3d.Map3DElement | null = null;
    (async () => {
      try {
        const { Map3DElement, Marker3DInteractiveElement, Polygon3DElement } = await loadMaps3d();
        const { PinElement } = await loadMarker();
        if (!alive || !host.current) return;
        const [lng, lat] = view.center;
        const range = rangeForZoom(view.zoom, lat);
        map3d = new Map3DElement({ center: { lat, lng, altitude: 0 }, range, tilt: 0, heading: 0, mode: "HYBRID", defaultUIHidden: true, ...GLOBE_LIMITS });
        map3d.style.width = "100%";
        map3d.style.height = "100%";
        for (const f of sites?.features ?? []) {
          drawn.current.add(f.properties.id);
          for (const path of outerRings(f.geometry)) {
            const poly = new Polygon3DElement({ altitudeMode: "CLAMP_TO_GROUND", strokeColor: tok("--mg-tidal-lift"), fillColor: "rgba(77, 179, 171, 0.2)", strokeWidth: 3 });
            poly.path = path;
            map3d.append(poly);
          }
        }
        for (const f of pins?.features ?? []) {
          const p = f.properties;
          const [plng, plat] = f.geometry.coordinates;
          const m = new Marker3DInteractiveElement({ position: { lat: plat, lng: plng }, label: `${PIN_WORDS[p.pin_state]}${p.is_demo ? " · Demo" : ""}` });
          const color = tok(PIN_TOKENS[p.pin_state]);
          m.append(new PinElement({ background: color, borderColor: tok("--mg-mist"), glyphColor: tok("--mg-mist") }));
          m.addEventListener("gmp-click", () => clickRef.current?.(p.id));
          map3d.append(m);
        }
        host.current.append(map3d);
        mapRef.current = map3d;
        map3d.flyCameraTo({ endCamera: { center: { lat, lng, altitude: 0 }, range, tilt: 60, heading: 340 }, durationMillis: view.zoom > 11 ? 3500 : 1500 });
      } catch {
        if (alive) onFail();
      }
    })();
    return () => {
      alive = false;
      map3d?.remove();
    };
    // Built once per opening; pins/sites changes re-open via the key in the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Site outlines can arrive after the globe opened (the selected site is fetched): add them when they do.
  const drawn = useRef(new Set<string>());
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    (async () => {
      const { Polygon3DElement } = await loadMaps3d();
      for (const f of sites?.features ?? []) {
        if (drawn.current.has(f.properties.id)) continue;
        drawn.current.add(f.properties.id);
        for (const path of outerRings(f.geometry)) {
          const poly = new Polygon3DElement({ altitudeMode: "CLAMP_TO_GROUND", strokeColor: tok("--mg-tidal-lift"), fillColor: "rgba(77, 179, 171, 0.2)", strokeWidth: 4 });
          poly.path = path;
          m.append(poly);
        }
      }
    })();
  }, [sites]);

  // Already open and the target changes (another pin clicked): fly from here to there.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const m = mapRef.current;
    if (!m) return;
    const [lng, lat] = view.center;
    m.flyCameraTo({ endCamera: { center: { lat, lng, altitude: 0 }, range: rangeForZoom(view.zoom, lat), tilt: 62, heading: 340 }, durationMillis: 3000 });
  }, [view.center, view.zoom]);

  return (
    <div className="globe3d">
      <div ref={host} className="site3d-host" />
      <span className="gmap-note">{GOOGLE_IMAGERY_NOTE}</span>
    </div>
  );
}
