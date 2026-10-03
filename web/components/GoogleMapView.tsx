"use client";

// Google Maps 2D view with the same props as MapView (MapLibre), used when a Google key is configured.
// Display only: Google imagery is a backdrop; nothing is measured or traced from it. Any load or auth failure
// calls onFail so the caller swaps in the MapLibre view.

import { useEffect, useRef } from "react";
import type { MapViewProps } from "@/components/MapView";
import { gmwChangeTileTemplate, gmwExtentTiles, gmwTileTemplate, mangroveOpacityAt } from "@/lib/api";
import { createFixedTileOverlay, type FixedTileOverlay, type Level } from "@/lib/fixed-tile-overlay";
import { DEFAULT_BASEMAP, type BasemapId } from "@/lib/basemaps";
import { GOOGLE_IMAGERY_NOTE, GOOGLE_MAP_ID, loadMaps, loadMarker, onGoogleAuthFailure, outerRings } from "@/lib/google";
import type { Padding } from "@/lib/map-handle";
import { buildPinElement } from "@/lib/pin-dom";
import { useRouter } from "next/navigation";

const PHILIPPINES = { west: 116.9, south: 4.5, east: 126.6, north: 21.2 };
const MAX_BOUNDS = { west: 90, south: -8, east: 152, north: 30 }; // same box as the MapLibre view

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "gray";

function mapTypeFor(b: BasemapId): { mapTypeId: string; colorScheme: "LIGHT" | "DARK" } {
  if (b === "satellite") return { mapTypeId: "hybrid", colorScheme: "DARK" };
  return { mapTypeId: "roadmap", colorScheme: b === "dark" ? "DARK" : "LIGHT" };
}

const pad = (p: Padding): google.maps.Padding => (typeof p === "number" ? { top: p, bottom: p, left: p, right: p } : p);

export default function GoogleMapView({
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
  onFail,
}: MapViewProps & { onFail: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polys = useRef<Map<string, google.maps.Polygon[]>>(new Map());
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerLib = useRef<google.maps.MarkerLibrary | null>(null);
  const gmwOverlay = useRef<FixedTileOverlay | null>(null);
  const gmwCoverage = useRef<Level[] | null>(null);
  const gmwOpacity = useRef(1);
  const zoomListener = useRef<google.maps.MapsEventListener | null>(null);
  const router = useRouter();
  const latest = useRef({ onSiteClick, onPinClick, fitPadding, basemap, mangrove });
  useEffect(() => {
    latest.current = { onSiteClick, onPinClick, fitPadding, basemap, mangrove };
  });
  const onFailRef = useRef(onFail);
  const onReadyRef = useRef(onMapReady);
  useEffect(() => {
    onFailRef.current = onFail;
    onReadyRef.current = onMapReady;
  });

  // Create the map once.
  useEffect(() => {
    let alive = true;
    const off = onGoogleAuthFailure(() => onFailRef.current());
    (async () => {
      try {
        const { Map } = await loadMaps();
        markerLib.current = await loadMarker();
        if (!alive || !container.current) return;
        const map = new Map(container.current, {
          mapId: GOOGLE_MAP_ID,
          ...mapTypeFor(latest.current.basemap),
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          restriction: { latLngBounds: MAX_BOUNDS, strictBounds: false },
        });
        map.fitBounds(PHILIPPINES, pad(latest.current.fitPadding));
        mapRef.current = map;
        onReadyRef.current?.({
          set3d: (on) => {
            map.setTilt(on ? 67.5 : 0);
            map.setHeading(on ? 340 : 0);
          },
          getView: () => {
            const c = map.getCenter();
            return { center: [c?.lng() ?? 121, c?.lat() ?? 12], zoom: map.getZoom() ?? 6 };
          },
          resetView: () => {
            map.setTilt(0);
            map.setHeading(0);
          },
          zoomIn: () => map.setZoom((map.getZoom() ?? 6) + 1),
          zoomOut: () => map.setZoom((map.getZoom() ?? 6) - 1),
          flyTo: (center, minZoom, padding) => {
            const p = typeof padding === "number" ? { top: padding, bottom: padding, left: padding, right: padding } : padding;
            map.setZoom(Math.max(map.getZoom() ?? 6, minZoom));
            map.panTo({ lat: center[1], lng: center[0] });
            // Keep the point in the middle of the area the side panel leaves visible.
            map.panBy(-(p.left - p.right) / 2, -(p.top - p.bottom) / 2);
          },
        });
        // Let the data effects run now that the map exists.
        window.dispatchEvent(new Event("mangrove:gmap-ready"));
      } catch {
        if (alive) onFailRef.current();
      }
    })();
    const polyStore = polys.current;
    return () => {
      alive = false;
      off();
      onReadyRef.current?.(null);
      polyStore.forEach((ps) => ps.forEach((p) => p.setMap(null)));
      polyStore.clear();
      markers.current.forEach((m) => (m.map = null));
      markers.current = [];
      mapRef.current = null;
    };
     
  }, []);

  // Re-run a data effect once the async map exists.
  const whenReady = (fn: (map: google.maps.Map) => void) => {
    if (mapRef.current) {
      fn(mapRef.current);
      return () => {};
    }
    const h = () => mapRef.current && fn(mapRef.current);
    window.addEventListener("mangrove:gmap-ready", h, { once: true });
    return () => window.removeEventListener("mangrove:gmap-ready", h);
  };

  // Basemap → Google map type.
  useEffect(
    () =>
      whenReady((map) => {
        const t = mapTypeFor(basemap);
        map.setMapTypeId(t.mapTypeId);
      }),
     
    [basemap],
  );

  // Candidate-site polygons (docs/design.md §4: Tidal outline, light fill; selected Canopy/Mist 3px).
  useEffect(
    () =>
      whenReady((map) => {
        polys.current.forEach((ps) => ps.forEach((p) => p.setMap(null)));
        polys.current.clear();
        const dark = basemap !== "light";
        const outline = token(dark ? "--mg-tidal-lift" : "--mg-tidal");
        for (const f of sites?.features ?? []) {
          const id = f.properties.id;
          const ps = outerRings(f.geometry).map(
            (path) =>
              new google.maps.Polygon({
                paths: path,
                strokeColor: outline,
                strokeWeight: 2,
                fillColor: outline,
                fillOpacity: 0.12,
                map: showSites ? map : null,
                clickable: true,
              }),
          );
          ps.forEach((p) => p.addListener("click", () => latest.current.onSiteClick?.(id)));
          polys.current.set(id, ps);
        }
        if (sites && fitToSites && sites.features.length) {
          const b = new google.maps.LatLngBounds();
          for (const f of sites.features) outerRings(f.geometry).flat().forEach((p) => b.extend(p));
          map.fitBounds(b, pad(latest.current.fitPadding));
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sites, fitToSites, basemap],
  );

  // Highlight and visibility.
  useEffect(
    () =>
      whenReady((map) => {
        const dark = basemap !== "light";
        const outline = token(dark ? "--mg-tidal-lift" : "--mg-tidal");
        const selected = token(dark ? "--mg-mist" : "--mg-canopy");
        polys.current.forEach((ps, id) => {
          const on = !!highlightSiteIds?.includes(id);
          ps.forEach((p) => {
            p.setOptions({ strokeColor: on ? selected : outline, strokeWeight: on ? 3 : 2, fillOpacity: on ? 0.24 : 0.12 });
            p.setMap(showSites ? map : null);
          });
        });
      }),
     
    [highlightSiteIds, showSites, sites, basemap],
  );

  // GMW mangrove layers (API-024 extent, API-025 gain and loss) as fixed zoom-7 and zoom-10 tile sets, scaled with the
  // map instead of reloaded per zoom (ADR-054). Opacity follows the zoom (lib/api.ts mangroveOpacityAt).
  const mangroveKey = mangrove ? JSON.stringify({ ...mangrove, opacity: undefined }) : "";
  useEffect(() => {
    let alive = true;
    const apply = (map: google.maps.Map) => {
      const cov = gmwCoverage.current;
      if (!cov) return;
      gmwOverlay.current ??= createFixedTileOverlay(map, cov);
      const m = latest.current.mangrove;
      gmwOverlay.current.setLayers(
        [
          m?.extentYear != null ? gmwTileTemplate(m.extentYear) : null,
          m?.change?.gain ? gmwChangeTileTemplate(m.change.base, m.change.year, "gain") : null,
          m?.change?.loss ? gmwChangeTileTemplate(m.change.base, m.change.year, "loss") : null,
        ].filter((u): u is string => !!u),
      );
      gmwOverlay.current.setOpacity(mangroveOpacityAt(map.getZoom() ?? 6, gmwOpacity.current));
    };
    let off = () => {};
    if (gmwCoverage.current) off = whenReady(apply);
    else
      gmwExtentTiles()
        .then((info) => {
          if (!alive || !info.coverage?.length) return;
          gmwCoverage.current = info.coverage;
          off = whenReady(apply);
        })
        .catch(() => {});
    return () => {
      alive = false;
      off();
    };
  }, [mangroveKey]);

  // Opacity: the viewer's setting, faded when zoomed far in (tiles stay, at 30%).
  useEffect(() => {
    gmwOpacity.current = mangrove?.opacity ?? 1;
    const off = whenReady((map) => {
      const apply = () => gmwOverlay.current?.setOpacity(mangroveOpacityAt(map.getZoom() ?? 6, gmwOpacity.current));
      apply();
      zoomListener.current ??= map.addListener("zoom_changed", apply);
    });
    return off;
  }, [mangrove?.opacity]);
  useEffect(
    () => () => {
      gmwOverlay.current?.remove();
      gmwOverlay.current = null;
    },
    [],
  );
  useEffect(() => () => zoomListener.current?.remove(), []);

  // Record pins as advanced markers carrying the shared pin element.
  useEffect(
    () =>
      whenReady((map) => {
        const lib = markerLib.current;
        if (!lib) return;
        markers.current.forEach((m) => (m.map = null));
        markers.current = (pins?.features ?? []).map((f) => {
          const el = buildPinElement(f.properties, (id) =>
            latest.current.onPinClick ? latest.current.onPinClick(id) : router.push(`/records/${id}`),
          );
          const [lng, lat] = f.geometry.coordinates;
          return new lib.AdvancedMarkerElement({ map: showPins ? map : null, position: { lat, lng }, content: el, title: f.properties.site_name });
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pins],
  );

  useEffect(
    () =>
      whenReady((map) => {
        markers.current.forEach((m) => {
          m.map = showPins ? map : null;
          const el = m.content as HTMLElement | null;
          const on = el?.dataset.recordId === selectedPinId;
          el?.classList.toggle("is-selected", on);
          el?.setAttribute("aria-pressed", String(on));
          m.zIndex = on ? 1000 : null;
        });
      }),
     
    [showPins, selectedPinId, pins],
  );

  return (
    <div className={`${className ?? "map"} gmap`}>
      <div ref={container} className="gmap-canvas" />
      <span className="gmap-note">{GOOGLE_IMAGERY_NOTE}</span>
    </div>
  );
}
