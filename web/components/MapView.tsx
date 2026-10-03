"use client";

// MapLibre GL JS map (docs/design-brief.md §5). Basemaps: lib/basemaps.ts.
// Pins are HTML markers so each one is a keyboard-reachable link to its record.

import "maplibre-gl/dist/maplibre-gl.css";
import { LngLatBounds, Map as MlMap, Marker, setWorkerUrl } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { basemapById, DEFAULT_BASEMAP, LABEL_FONT_BOLD, type BasemapId } from "@/lib/basemaps";
import { PIN_WORDS } from "@/lib/format";
import { pinSvg } from "@/lib/pin-icons";
import type { PinsFC, SitesFC } from "@/lib/types";

// Served from public/ (scripts/copy-maplibre-worker.mjs); the bundler does not emit the worker file.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const PHILIPPINES: [[number, number], [number, number]] = [
  [116.9, 4.5],
  [126.6, 21.2],
];
// The product covers the Philippines only: panning and zooming out stop at this box. MapLibre keeps the
// whole viewport inside it, so on a wide screen the box's WIDTH sets the furthest zoom-out. It is ~62°
// wide so a 2:1 window can still show the full 4.5–21.2°N extent of the country with margin.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [90.0, -8.0],
  [152.0, 30.0],
];
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export interface MapViewProps {
  sites?: SitesFC | null;
  pins?: PinsFC | null;
  /** Fit to the site polygons instead of the whole country. */
  fitToSites?: boolean;
  onSiteClick?: (siteId: string) => void;
  highlightSiteIds?: string[];
  /** GMW mangrove extent polygons for one year (API-023, F-025); drawn under the sites. */
  extent?: GeoJSON.FeatureCollection | null;
  basemap?: BasemapId;
  showSites?: boolean;
  showPins?: boolean;
  /** Receives the map once created (and null on unmount), for custom controls. */
  onMapReady?: (map: MlMap | null) => void;
  /** Leave room for floating panels when fitting. */
  fitPadding?: { top: number; bottom: number; left: number; right: number } | number;
  className?: string;
}

/** A brand token's resolved value (MapLibre paint cannot read CSS variables). */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "gray";
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function boundsOf(fc: GeoJSON.FeatureCollection): LngLatBounds | null {
  const b = new LngLatBounds();
  let any = false;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      b.extend(c as [number, number]);
      any = true;
    } else if (Array.isArray(c)) c.forEach(visit);
  };
  fc.features.forEach((f) => f.geometry && "coordinates" in f.geometry && visit(f.geometry.coordinates));
  return any ? b : null;
}

export default function MapView({
  sites,
  pins,
  fitToSites,
  onSiteClick,
  highlightSiteIds,
  extent,
  basemap = DEFAULT_BASEMAP,
  showSites = true,
  showPins = true,
  onMapReady,
  fitPadding = 60,
  className,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const loaded = useRef(false);
  const pending = useRef<(() => void)[]>([]);
  const router = useRouter();

  // Latest props, read when the style (re)loads and overlays are re-added.
  const latest = useRef({ sites, highlightSiteIds, extent, showSites, basemap, onSiteClick, fitPadding });
  useEffect(() => {
    latest.current = { sites, highlightSiteIds, extent, showSites, basemap, onSiteClick, fitPadding };
  });
  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  });

  const whenReady = (fn: () => void) => (loaded.current ? fn() : pending.current.push(fn));

  // Create the map once. Overlays are (re)added on every style load, so basemap switches keep them.
  useEffect(() => {
    if (!container.current) return;
    const initial = basemapById(latest.current.basemap);
    const map = new MlMap({
      container: container.current,
      style: initial.style,
      bounds: PHILIPPINES,
      maxBounds: MAX_BOUNDS,
      renderWorldCopies: false,
      fitBoundsOptions: { padding: latest.current.fitPadding },
      attributionControl: { compact: true },
    });

    const applyHighlight = () => {
      const { sites: s, highlightSiteIds: h } = latest.current;
      s?.features.forEach((f) => map.setFeatureState({ source: "sites", id: f.properties.id }, { highlight: !!h?.includes(f.properties.id) }));
    };

    map.on("style.load", () => {
      const { sites: s, showSites: visible, basemap: bm } = latest.current;
      // Candidate sites (docs/design.md §4): Tidal 2px outline, Tidal 12% fill; selected Canopy 3px.
      // On dark grounds the lifted Tidal and Mist read where Tidal and Canopy would vanish.
      const dark = basemapById(bm).ground === "dark";
      const outline = token(dark ? "--mg-tidal-lift" : "--mg-tidal");
      const selected = token(dark ? "--mg-mist" : "--mg-canopy");
      // GMW mangrove extent (F-025): Prop Root, the evidence color, so it never reads as a status or a pin.
      if (!map.getSource("gmw-extent")) map.addSource("gmw-extent", { type: "geojson", data: latest.current.extent ?? EMPTY });
      if (!map.getLayer("gmw-extent-fill"))
        map.addLayer({
          id: "gmw-extent-fill",
          type: "fill",
          source: "gmw-extent",
          paint: { "fill-color": token("--mg-root"), "fill-opacity": dark ? 0.75 : 0.55 },
        });
      if (!map.getSource("sites")) map.addSource("sites", { type: "geojson", data: s ?? EMPTY, promoteId: "id" });
      const visibility = visible ? "visible" : "none";
      if (!map.getLayer("sites-fill"))
        map.addLayer({
          id: "sites-fill",
          type: "fill",
          source: "sites",
          layout: { visibility },
          paint: {
            "fill-color": outline,
            "fill-opacity": ["case", ["boolean", ["feature-state", "highlight"], false], 0.24, 0.12],
          },
        });
      if (!map.getLayer("sites-line"))
        map.addLayer({ id: "sites-line", type: "line", source: "sites", layout: { visibility }, paint: {
            "line-color": ["case", ["boolean", ["feature-state", "highlight"], false], selected, outline],
            "line-width": ["case", ["boolean", ["feature-state", "highlight"], false], 3, 2],
          },
        });
      // Site names on the polygons once zoomed in far enough to tell them apart.
      if (!map.getLayer("sites-label"))
        map.addLayer({
          id: "sites-label",
          type: "symbol",
          source: "sites",
          minzoom: 9,
          layout: {
            visibility,
            "text-field": ["get", "name"],
            "text-font": LABEL_FONT_BOLD,
            "text-size": ["interpolate", ["linear"], ["zoom"], 9, 11, 14, 15],
            "text-max-width": 10,
            "text-padding": 4,
            // Below the polygon so the outline stays visible.
            "text-anchor": "top",
            "text-offset": [0, 0.8],
          },
          paint: {
            // Brand colors that do not change with the page theme (the map ground is what matters):
            // lifted Tidal on dark/satellite maps, Canopy on the light map. Bold, so they read as our sites.
            "text-color": token(dark ? "--mg-tidal-lift" : "--mg-canopy"),
            "text-halo-color": token(dark ? "--mg-night" : "--mg-mist"),
            "text-halo-width": 1.6,
          },
        });
      applyHighlight();
      loaded.current = true;
      pending.current.splice(0).forEach((fn) => fn());
    });

    map.on("click", "sites-fill", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id && latest.current.onSiteClick) latest.current.onSiteClick(String(id));
    });
    map.on("mouseenter", "sites-fill", () => (map.getCanvas().style.cursor = latest.current.onSiteClick ? "pointer" : ""));
    map.on("mouseleave", "sites-fill", () => (map.getCanvas().style.cursor = ""));

    mapRef.current = map;
    onMapReadyRef.current?.(map);
    return () => {
      onMapReadyRef.current?.(null);
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.remove();
      mapRef.current = null;
      loaded.current = false;
      pending.current = []; // callbacks queued for this map instance must not run on the next one
    };
  }, []);

  // Basemap switch. Overlays come back in the style.load handler.
  const firstBasemap = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (firstBasemap.current) {
      firstBasemap.current = false;
      return;
    }
    loaded.current = false;
    map.setStyle(basemapById(basemap).style, { diff: false });
  }, [basemap]);

  // Site polygons.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    whenReady(() => {
      (map.getSource("sites") as { setData?: (d: GeoJSON.GeoJSON) => void } | undefined)?.setData?.(sites ?? EMPTY);
      if (sites && fitToSites) {
        const b = boundsOf(sites);
        if (b) map.fitBounds(b, { padding: latest.current.fitPadding, duration: 0, maxZoom: 13 });
      }
    });
     
  }, [sites, fitToSites]);

  // GMW extent layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    whenReady(() => (map.getSource("gmw-extent") as { setData?: (d: GeoJSON.GeoJSON) => void } | undefined)?.setData?.(extent ?? EMPTY));
     
  }, [extent]);

  // Highlight.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sites) return;
    whenReady(() =>
      sites.features.forEach((f) =>
        map.setFeatureState({ source: "sites", id: f.properties.id }, { highlight: !!highlightSiteIds?.includes(f.properties.id) }),
      ),
    );
     
  }, [sites, highlightSiteIds]);

  // Site layer visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    whenReady(() => {
      for (const id of ["sites-fill", "sites-line", "sites-label"])
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", showSites ? "visible" : "none");
    });
     
  }, [showSites]);

  // Record pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = (pins?.features ?? []).map((f) => {
      const p = f.properties;
      const el = document.createElement("a");
      el.href = `/records/${p.id}`;
      el.className = `map-pin map-pin-${p.pin_state}`;
      el.setAttribute("aria-label", `${p.site_name}: ${PIN_WORDS[p.pin_state]}. ${p.is_demo ? "Demo data. " : ""}Open record.`);
      // Compact marker; the full label opens on hover/focus. The DEMO tag stays visible (BR-006).
      el.innerHTML =
        pinSvg(p.pin_state) +
        (p.is_demo ? '<span class="map-pin-demo">Demo</span>' : "") +
        `<span class="map-pin-label"><strong>${escapeHtml(p.site_name)}</strong>${PIN_WORDS[p.pin_state]}${p.is_demo ? " · Demo data" : ""}</span>`;
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        router.push(`/records/${p.id}`);
      });
      return new Marker({ element: el, anchor: "bottom" }).setLngLat(f.geometry.coordinates as [number, number]).addTo(map);
    });
  }, [pins, router]);

  // Pin visibility.
  useEffect(() => {
    markers.current.forEach((m) => (m.getElement().style.display = showPins ? "" : "none"));
  }, [showPins, pins]);

  return <div ref={container} className={className ?? "map"} />;
}
