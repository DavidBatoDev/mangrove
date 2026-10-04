"use client";

// MapLibre GL JS map (docs/design-brief.md §5). Basemaps: lib/basemaps.ts.
// Pins are HTML markers so each one is a keyboard-reachable link to its record.

import "maplibre-gl/dist/maplibre-gl.css";
import { LngLatBounds, Map as MlMap, Marker, setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gmwChangeTileTemplate, gmwTileTemplate } from "@/lib/api";
import { basemapById, DEFAULT_BASEMAP, LABEL_FONT_BOLD, type BasemapId } from "@/lib/basemaps";
import type { MapHandle } from "@/lib/map-handle";
import { buildPinElement } from "@/lib/pin-dom";
import type { MangroveLayers, PinsFC, SitesFC } from "@/lib/types";

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
  /** When set, clicking a pin selects it (e.g. opens a place card) instead of navigating to its record. */
  onPinClick?: (recordId: string) => void;
  selectedPinId?: string | null;
  highlightSiteIds?: string[];
  /** GMW mangrove extent and change layers (API-024, API-025; F-025, ADR-048 to ADR-050), drawn under the sites. */
  mangrove?: MangroveLayers | null;
  basemap?: BasemapId;
  showSites?: boolean;
  showPins?: boolean;
  /** Receives the map once created (and null on unmount), for custom controls. */
  onMapReady?: (map: MapHandle | null) => void;
  /** Leave room for floating panels when fitting. */
  fitPadding?: { top: number; bottom: number; left: number; right: number } | number;
  className?: string;
}

/** A brand token's resolved value (MapLibre paint cannot read CSS variables). */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "gray";
}

const GMW_LAYERS = ["gmw-extent", "gmw-gain", "gmw-loss"] as const;
const GMW_ATTRIBUTION = "Mangroves: © Global Mangrove Watch v4.1.12 (CC BY 4.0)";

/** Raster opacity by zoom: as set until z13, fading to 30% by z16 so imagery shows through (lib/api.ts). */
function opacityByZoom(opacity: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 13, opacity, 16, opacity * 0.3];
}

/** GMW mangrove layers (API-024 extent, API-025 gain and loss), colors baked into the PNGs, under the sites. */
function applyMangrove(map: MlMap, m: MangroveLayers | null | undefined): void {
  for (const id of GMW_LAYERS) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  }
  if (!m) return;
  const tiles: [string, string | null][] = [
    ["gmw-extent", m.extentYear != null ? gmwTileTemplate(m.extentYear) : null],
    ["gmw-gain", m.change?.gain ? gmwChangeTileTemplate(m.change.base, m.change.year, "gain") : null],
    ["gmw-loss", m.change?.loss ? gmwChangeTileTemplate(m.change.base, m.change.year, "loss") : null],
  ];
  const before = map.getLayer("sites-fill") ? "sites-fill" : undefined;
  for (const [id, url] of tiles) {
    if (!url) continue;
    map.addSource(id, { type: "raster", tiles: [url], tileSize: 256, maxzoom: 10, attribution: GMW_ATTRIBUTION });
    map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opacityByZoom(m.opacity) } }, before);
  }
}

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

/** MapLibre needs WebGL2; without it the constructor throws and would take the whole page down. */
function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export default function MapView({
  sites,
  pins,
  fitToSites,
  onSiteClick,
  onPinClick,
  selectedPinId,
  highlightSiteIds,
  mangrove = null,
  basemap = DEFAULT_BASEMAP,
  showSites = true,
  showPins = true,
  onMapReady,
  fitPadding = 60,
  className,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [supported] = useState(() => typeof window === "undefined" || hasWebGL2());
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const loaded = useRef(false);
  const pending = useRef<(() => void)[]>([]);
  const router = useRouter();

  // Latest props, read when the style (re)loads and overlays are re-added.
  const latest = useRef({ sites, highlightSiteIds, mangrove, showSites, basemap, onSiteClick, onPinClick, fitPadding });
  useEffect(() => {
    latest.current = { sites, highlightSiteIds, mangrove, showSites, basemap, onSiteClick, onPinClick, fitPadding };
  });
  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  });

  const whenReady = (fn: () => void) => (loaded.current ? fn() : pending.current.push(fn));

  // Create the map once. Overlays are (re)added on every style load, so basemap switches keep them.
  useEffect(() => {
    if (!supported || !container.current) return;
    const initial = basemapById(latest.current.basemap);
    let map: MlMap;
    try {
      map = new MlMap({
        container: container.current,
        style: initial.style,
        bounds: PHILIPPINES,
        maxBounds: MAX_BOUNDS,
        renderWorldCopies: false,
        fitBoundsOptions: { padding: latest.current.fitPadding },
        attributionControl: { compact: true },
      });
    } catch (err) {
      // Leave the rest of the page working; the map area stays empty.
      console.warn("Map unavailable:", err);
      return;
    }

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
      applyMangrove(map, latest.current.mangrove);
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
    onMapReadyRef.current?.({
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      flyTo: (center, minZoom, padding) => map.flyTo({ center, zoom: Math.max(map.getZoom(), minZoom), padding, duration: 900 }),
      fitBounds: ([w, s, e, n], padding) => map.fitBounds([[w, s], [e, n]], { padding, maxZoom: 15, duration: 900 }),
      set3d: (on) => map.easeTo({ pitch: on ? 60 : 0, bearing: on ? -20 : 0, duration: 800 }),
      resetView: () => map.easeTo({ pitch: 0, bearing: 0, duration: 800 }),
      getView: () => ({ center: map.getCenter().toArray() as [number, number], zoom: map.getZoom() }),
    });
    return () => {
      onMapReadyRef.current?.(null);
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.remove();
      mapRef.current = null;
      loaded.current = false;
      pending.current = []; // callbacks queued for this map instance must not run on the next one
    };
  }, [supported]);

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

  // GMW mangrove layers: re-added when what they show changes; opacity alone is a paint change.
  const mangroveKey = mangrove ? JSON.stringify({ ...mangrove, opacity: undefined }) : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    whenReady(() => applyMangrove(map, latest.current.mangrove));
     
  }, [mangroveKey]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mangrove) return;
    whenReady(() => {
      for (const id of GMW_LAYERS) if (map.getLayer(id)) map.setPaintProperty(id, "raster-opacity", opacityByZoom(mangrove.opacity));
    });
     
  }, [mangrove?.opacity]);

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
      const el = buildPinElement(p, (id) => (latest.current.onPinClick ? latest.current.onPinClick(id) : router.push(`/records/${id}`)));
      return new Marker({ element: el, anchor: "bottom" }).setLngLat(f.geometry.coordinates as [number, number]).addTo(map);
    });
  }, [pins, router]);

  // Selected pin.
  useEffect(() => {
    markers.current.forEach((m) => {
      const el = m.getElement();
      const on = el.dataset.recordId === selectedPinId;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-pressed", String(on));
    });
  }, [selectedPinId, pins]);

  // Pin visibility.
  useEffect(() => {
    markers.current.forEach((m) => (m.getElement().style.display = showPins ? "" : "none"));
  }, [showPins, pins]);

  if (!supported)
    return (
      <div className={`${className ?? "map"} map-unavailable`} role="note">
        <p>This browser cannot draw the map (it needs WebGL2). Everything else on this page still works.</p>
      </div>
    );
  return <div ref={container} className={className ?? "map"} />;
}
