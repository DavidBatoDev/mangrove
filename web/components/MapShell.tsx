"use client";

// Full-screen map layout: a floating side panel, round map controls on the right, a basemap settings
// dialog and a legend card. The basemap choice is a per-viewer preference kept in localStorage.

import "./map-shell.css";
import { Box, Check, ChevronDown, Compass, Layers, Link2, Maximize2, Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Globe3D from "@/components/Globe3D";
import Map, { type MapEngine } from "@/components/Map";
import { GOOGLE_IMAGERY_NOTE } from "@/lib/google";
import type { MapViewProps } from "@/components/MapView";
import type { MapHandle } from "@/lib/map-handle";
import { BASEMAPS, DEFAULT_BASEMAP, type BasemapId } from "@/lib/basemaps";
import { PIN_WORDS } from "@/lib/format";
import { pinSvg, siteAreaSvg } from "@/lib/pin-icons";
import type { PinState } from "@/lib/types";

// BR-004 pin states, in reading order, with what each means.
const LEGEND_PINS: { state: PinState; hint: string }[] = [
  { state: "awaiting", hint: "A check has no evidence yet, or it is too early" },
  { state: "on_track", hint: "Both checks have agreeing evidence" },
  { state: "conflict", hint: "Some evidence disagrees" },
];

const PREF_KEY = "mangrove-map-prefs-v1";

interface Prefs {
  basemap: BasemapId;
  showSites: boolean;
  showPins: boolean;
}

function readPrefs(): Prefs {
  const fallback: Prefs = { basemap: DEFAULT_BASEMAP, showSites: true, showPins: true };
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Prefs>) } : fallback;
  } catch {
    return fallback;
  }
}

// UI icons: lucide-react at 1.75 stroke (brand/BRAND.md §9).
const ICON = { size: 22, strokeWidth: 1.75, "aria-hidden": true } as const;
const Icon = {
  expand: <Maximize2 {...ICON} />,
  share: <Link2 {...ICON} />,
  layers: <Layers {...ICON} />,
  plus: <Plus {...ICON} />,
  minus: <Minus {...ICON} />,
  close: <X {...ICON} />,
  check: <Check {...ICON} size={16} strokeWidth={2.5} />,
  chevron: <ChevronDown {...ICON} size={18} />,
};

export interface MapShellProps extends Omit<MapViewProps, "basemap" | "showSites" | "showPins" | "onMapReady" | "className"> {
  /** Side panel content. */
  children: React.ReactNode;
  /** Which overlay toggles and legend rows apply on this page. */
  layers: { sites?: boolean; pins?: boolean };
  /** Fly the map here (e.g. to a selected pin), keeping it clear of the side panel. */
  focus?: { center: [number, number]; zoom?: number; key: string } | null;
}

export default function MapShell({ children, layers, focus, ...mapProps }: MapShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapHandle | null>(null);
  const [engine, setEngine] = useState<MapEngine>("maplibre");
  const [is3d, setIs3d] = useState(false);
  // Google: the 3D button opens the 3D globe at this view (its 2D map only tilts at street zoom).
  const [globeView, setGlobeView] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [globeFailed, setGlobeFailed] = useState(false);
  const useGlobe = engine === "google" && !globeFailed;
  const [prefs, setPrefs] = useState<Prefs>({ basemap: DEFAULT_BASEMAP, showSites: true, showPins: true });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  // The panel overlays the map only on wide screens; on phones it sits below the map.
  const wide = typeof window !== "undefined" && window.innerWidth > 800;

  // Read the saved preference after mount (localStorage is browser-only).
  useEffect(() => {
    const saved = readPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(saved);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        window.localStorage.setItem(PREF_KEY, JSON.stringify(next));
      } catch {
        // Preference only; ignore blocked storage.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!map || !focus) return;
    if (globeView) {
      // 3D mode is on (the 3D button): fly there in 3D.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGlobeView({ center: focus.center, zoom: 15 });
      return;
    }
    map.flyTo(focus.center, focus.zoom ?? 12, wide ? { top: 40, bottom: 40, left: panelOpen ? 450 : 40, right: 100 } : 20);
    // Only when the target (or a recenter request) changes, not on every render or panel toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.key]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSettingsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("Link copied");
    } catch {
      setToast("Copy the address bar to share");
    }
  }

  function fullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shellRef.current?.requestFullscreen?.();
  }

  return (
    <div className={`map-shell basemap-${prefs.basemap}`} ref={shellRef}>
      <Map
        {...mapProps}
        className="map-shell-map"
        basemap={prefs.basemap}
        showSites={prefs.showSites}
        showPins={prefs.showPins}
        onMapReady={setMap}
        onEngine={setEngine}
        fitPadding={wide ? { top: 40, bottom: 40, left: panelOpen ? 450 : 40, right: 100 } : 20}
      />

      {globeView && (
        <Globe3D
          view={globeView}
          pins={mapProps.pins}
          sites={mapProps.sites}
          onPinClick={mapProps.onPinClick}
          onFail={() => {
            setGlobeFailed(true);
            setGlobeView(null);
            setIs3d(false);
          }}
        />
      )}

      <aside className={`map-panel${panelOpen ? "" : " is-collapsed"}`} aria-label="Map panel">
        <button
          type="button"
          className="map-panel-toggle"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
          title={panelOpen ? "Hide panel" : "Show panel"}
        >
          {Icon.chevron}
          <span className="sr-only">{panelOpen ? "Hide panel" : "Show panel"}</span>
        </button>
        {panelOpen && <div className="map-panel-body">{children}</div>}
      </aside>

      <div className="map-controls" role="toolbar" aria-label="Map controls">
        <button type="button" className="map-btn" onClick={fullscreen} title="Full screen" aria-label="Full screen">
          {Icon.expand}
        </button>
        <button type="button" className="map-btn" onClick={share} title="Copy link" aria-label="Copy link to this view">
          {Icon.share}
        </button>
        <button
          type="button"
          className="map-btn"
          onClick={() => setSettingsOpen(true)}
          title="Basemap settings"
          aria-label="Basemap settings"
          aria-haspopup="dialog"
        >
          {Icon.layers}
        </button>
        <button
          type="button"
          className={`map-btn${is3d ? " is-on" : ""}`}
          onClick={() => {
            const on = !is3d;
            if (useGlobe) setGlobeView(on && map ? map.getView() : null);
            else map?.set3d(on);
            setIs3d(on);
          }}
          title={is3d ? "Flat view" : "3D view"}
          aria-label={is3d ? "Switch to flat view" : "Switch to 3D view"}
          aria-pressed={is3d}
        >
          <Box size={22} strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          className="map-btn"
          onClick={() => {
            map?.resetView();
            setGlobeView(null);
            setIs3d(false);
          }}
          title="Reset view (north up, flat)"
          aria-label="Reset view to north up and flat"
        >
          <Compass size={22} strokeWidth={1.75} aria-hidden />
        </button>
        <div className="map-zoom">
          <button type="button" className="map-btn" onClick={() => map?.zoomIn()} title="Zoom in" aria-label="Zoom in">
            {Icon.plus}
          </button>
          <button type="button" className="map-btn" onClick={() => map?.zoomOut()} title="Zoom out" aria-label="Zoom out">
            {Icon.minus}
          </button>
        </div>
      </div>

      <section className={`map-legend${legendOpen ? "" : " is-collapsed"}`} aria-label="Legend">
        <button type="button" className="map-legend-head" aria-expanded={legendOpen} onClick={() => setLegendOpen((o) => !o)}>
          <span>Legend</span>
          {Icon.chevron}
        </button>
        {legendOpen && (
          <ul>
            {layers.pins &&
              LEGEND_PINS.map(({ state, hint }) => (
                <li key={state} className={prefs.showPins ? "" : "is-off"}>
                  <span className="legend-art" dangerouslySetInnerHTML={{ __html: pinSvg(state, 24) }} />
                  <span>
                    <strong>{PIN_WORDS[state]}</strong>
                    <span className="legend-hint">{hint}</span>
                  </span>
                </li>
              ))}
            {layers.sites && (
              <li className={prefs.showSites ? "" : "is-off"}>
                <span className="legend-art" dangerouslySetInnerHTML={{ __html: siteAreaSvg(28) }} />
                <span>
                  <strong>Candidate site</strong>
                  <span className="legend-hint">Sketched for the demo, not field-verified</span>
                </span>
              </li>
            )}
          </ul>
        )}
      </section>

      {toast && (
        <div className="map-toast" role="status">
          {toast}
        </div>
      )}

      {settingsOpen && (
        <div className="settings-backdrop" onClick={() => setSettingsOpen(false)}>
          <div
            className="settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings" autoFocus>
              {Icon.close}
            </button>
            <h2 id="settings-title">Basemap settings</h2>

            <h3 className="settings-label">Map style</h3>
            <div className="style-grid" role="radiogroup" aria-label="Map style">
              {BASEMAPS.map((b) => {
                const on = prefs.basemap === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`style-card${on ? " is-on" : ""}`}
                    onClick={() => update({ basemap: b.id })}
                  >
                    <span className={`style-thumb thumb-${b.id}`}>{on && <span className="style-check">{Icon.check}</span>}</span>
                    <span className="style-name">{b.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="settings-note">
              {engine === "google"
                ? `Google Maps (Satellite = Google hybrid imagery). ${GOOGLE_IMAGERY_NOTE}`
                : "Satellite: EOxCloudless 2016 (Sentinel-2). Light and Dark: OpenFreeMap, © OpenStreetMap contributors."}
            </p>

            {layers.sites && (
              <fieldset className="settings-group">
                <legend className="settings-label">Candidate sites</legend>
                <label className="radio">
                  <input type="radio" name="sites" checked={!prefs.showSites} onChange={() => update({ showSites: false })} /> No layer
                </label>
                <label className="radio">
                  <input type="radio" name="sites" checked={prefs.showSites} onChange={() => update({ showSites: true })} /> Site outlines
                </label>
              </fieldset>
            )}

            {layers.pins && (
              <fieldset className="settings-group">
                <legend className="settings-label">Published promises</legend>
                <label className="radio">
                  <input type="radio" name="pins" checked={!prefs.showPins} onChange={() => update({ showPins: false })} /> No layer
                </label>
                <label className="radio">
                  <input type="radio" name="pins" checked={prefs.showPins} onChange={() => update({ showPins: true })} /> Record pins
                </label>
              </fieldset>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
