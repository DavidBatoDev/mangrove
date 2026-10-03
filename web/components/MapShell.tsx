"use client";

// Full-screen map layout: a floating side panel, round map controls on the right, a basemap settings
// dialog and a legend card. The basemap choice is a per-viewer preference kept in localStorage.

import "./map-shell.css";
import { Box, Check, ChevronDown, Compass, Eye, EyeOff, Layers, Link2, Maximize2, Minus, Plus, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Globe3D from "@/components/Globe3D";
import Map, { type MapEngine } from "@/components/Map";
import { useGmwLayers } from "@/hooks/useGmwLayers";
import { GOOGLE_IMAGERY_NOTE } from "@/lib/google";
import type { MapViewProps } from "@/components/MapView";
import type { MapHandle } from "@/lib/map-handle";
import { BASEMAPS, DEFAULT_BASEMAP, type BasemapId } from "@/lib/basemaps";
import { PIN_WORDS } from "@/lib/format";
import { pinSvg, siteAreaSvg } from "@/lib/pin-icons";
import type { MangroveLayers, PinState } from "@/lib/types";

// BR-004 pin states, in reading order, with what each means.
const LEGEND_PINS: { state: PinState; hint: string }[] = [
  { state: "awaiting", hint: "A check has no evidence yet, or it is too early" },
  { state: "on_track", hint: "Both checks have agreeing evidence" },
  { state: "conflict", hint: "Some evidence disagrees" },
];

const PREF_KEY = "mangrove-map-prefs-v2"; // v2: satellite default (ADR-063) reaches earlier visitors too

interface Prefs {
  basemap: BasemapId;
  showSites: boolean;
  showPins: boolean;
  /** Pin states hidden by the legend filter. */
  hiddenPins: PinState[];
  /** GMW mangrove extent layer (API-024, ADR-048). */
  showMangroves: boolean;
  /** null = the latest year the layer has. */
  mangroveYear: number | null;
  /** GMW mangrove gain and loss since the default baseline (API-025); off by default, switched from the side panel. */
  showChange: boolean;
  /** 0.1-1 for the mangrove layers; they fade further when zoomed far in. */
  mangroveOpacity: number;
}

const DEFAULT_PREFS: Prefs = {
  basemap: DEFAULT_BASEMAP,
  showSites: true,
  showPins: true,
  hiddenPins: [],
  showMangroves: true,
  mangroveYear: null,
  showChange: false,
  mangroveOpacity: 1,
};

/** The side panel's switch for the gain/loss map layers (ADR-057); null outside a MapShell or without the layer. */
const MangroveChangeContext = createContext<{ on: boolean; base: number; set: (on: boolean) => void } | null>(null);
export const useMangroveChange = () => useContext(MangroveChangeContext);

/** Eye icon for a legend row: open = shown on the map. */
function Eyes({ on }: { on: boolean }) {
  const Ico = on ? Eye : EyeOff;
  return <Ico size={15} strokeWidth={1.75} aria-hidden className="legend-eye" />;
}

function readPrefs(): Prefs {
  const fallback = DEFAULT_PREFS;
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
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  // GMW layers: their legend rows hide when a layer is not installed on the server.
  const gmw = useGmwLayers();
  const mangroveYears = gmw.years;
  // Always the latest GMW year (2025); no year picker (ADR-057).
  const mangroveYear = mangroveYears.at(-1) ?? null;
  const bases = Object.keys(gmw.changeBases).map(Number).sort((a, b) => a - b);
  const changeBase = gmw.defaultBase ?? bases[0] ?? null;
  // Change exists only for map years after the baseline.
  const changeOk =
    changeBase !== null && mangroveYear !== null && (gmw.changeBases[String(changeBase)] ?? []).includes(mangroveYear);
  const mangrove: MangroveLayers | null =
    mangroveYear === null
      ? null
      : {
          extentYear: prefs.showMangroves ? mangroveYear : null,
          change:
            changeOk && changeBase !== null && prefs.showChange
              ? { base: changeBase, year: mangroveYear, gain: true, loss: true }
              : null,
          opacity: prefs.mangroveOpacity,
        };
  const hidden = prefs.hiddenPins ?? [];
  const pins = mapProps.pins
    ? { ...mapProps.pins, features: mapProps.pins.features.filter((f) => !hidden.includes(f.properties.pin_state)) }
    : mapProps.pins;
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
        pins={pins}
        mangrove={mangrove}
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
        {panelOpen && (
          <div className="map-panel-body">
            <MangroveChangeContext.Provider
              value={changeOk && changeBase !== null ? { on: prefs.showChange, base: changeBase, set: (on) => update({ showChange: on }) } : null}
            >
              {children}
            </MangroveChangeContext.Provider>
          </div>
        )}
      </aside>

      <div className="map-controls" role="toolbar" aria-label="Map controls" data-tour="controls">
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

      <section data-tour="legend" className={`map-legend map-legend--compact${legendOpen ? "" : " is-collapsed"}`} aria-label="Legend and layers">
        <button type="button" className="map-legend-head" aria-expanded={legendOpen} onClick={() => setLegendOpen((o) => !o)}>
          <span>Legend</span>
          {Icon.chevron}
        </button>
        {legendOpen && (
          <ul>
            {layers.pins &&
              LEGEND_PINS.map(({ state, hint }) => {
                const on = prefs.showPins && !hidden.includes(state);
                return (
                  <li key={state}>
                    <button
                      type="button"
                      className="legend-row"
                      aria-pressed={on}
                      title={hint}
                      onClick={() =>
                        update({ showPins: true, hiddenPins: on ? [...hidden, state] : hidden.filter((p) => p !== state) })
                      }
                    >
                      <span className="legend-art" dangerouslySetInnerHTML={{ __html: pinSvg(state, 18) }} />
                      <span className="legend-label">{PIN_WORDS[state]}</span>
                      <Eyes on={on} />
                    </button>
                  </li>
                );
              })}
            {layers.sites && (
              <li>
                <button
                  type="button"
                  className="legend-row"
                  aria-pressed={prefs.showSites}
                  title="Sketched for the demo, not field-verified"
                  onClick={() => update({ showSites: !prefs.showSites })}
                >
                  <span className="legend-art" dangerouslySetInnerHTML={{ __html: siteAreaSvg(18) }} />
                  <span className="legend-label">Candidate site</span>
                  <Eyes on={prefs.showSites} />
                </button>
              </li>
            )}
            {mangroveYear !== null && (
              <>
                <li className="legend-group">
                  <span>Mangroves · {mangroveYear}</span>
                </li>
                <li>
                  <button
                    type="button"
                    className="legend-row"
                    aria-pressed={prefs.showMangroves}
                    title="Global Mangrove Watch v4.1.12 mangrove extent, 30 m. Context only, not a status."
                    onClick={() => update({ showMangroves: !prefs.showMangroves })}
                  >
                    <span className="legend-art">
                      <span className="legend-swatch legend-swatch--mangrove" />
                    </span>
                    <span className="legend-label">Coastline coverage</span>
                    <Eyes on={prefs.showMangroves} />
                  </button>
                </li>
                {mangrove?.change && (
                  <>
                    <li className="legend-group legend-group--sub">
                      <span>Change since {mangrove.change.base}</span>
                    </li>
                    {(["gain", "loss"] as const).map((k) => (
                      <li key={k} className="legend-key" title={`Global Mangrove Watch v4.1.12 mangrove ${k}. Context only, not a status.`}>
                        <span className="legend-art">
                          <span className={`legend-swatch legend-swatch--${k}`} />
                        </span>
                        <span className="legend-label">{k === "gain" ? "Gain" : "Loss"}</span>
                      </li>
                    ))}
                  </>
                )}
                <li className="legend-opacity">
                  <label>
                    <span>Opacity</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={prefs.mangroveOpacity}
                      onChange={(e) => update({ mangroveOpacity: Number(e.target.value) })}
                    />
                  </label>
                </li>
              </>
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

            <p className="settings-note">Show, hide and filter layers in the legend.</p>
          </div>
        </div>
      )}
    </div>
  );
}
