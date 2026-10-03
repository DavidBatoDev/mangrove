// Google Maps JavaScript API: display only (imagery backdrop and 3D views). Evidence stays with GMW and
// Sentinel-2; nothing is measured, traced or stored from Google imagery (ADR-043, draft).
// Without NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, without WebGL, or if Google fails to load or rejects the key,
// every map falls back to the MapLibre view.

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Advanced markers on the 2D map need a Map ID; DEMO_MAP_ID is Google's id for development. */
export const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
export const GOOGLE_ENABLED = GOOGLE_KEY.length > 0;

/** Shown on every Google view so the backdrop is never mistaken for evidence. */
export const GOOGLE_IMAGERY_NOTE = "Imagery: Google. Evidence: GMW and Sentinel-2.";

let configured = false;
let authFailed = false;
const authListeners = new Set<() => void>();

function configure() {
  if (configured) return;
  configured = true;
  setOptions({ key: GOOGLE_KEY, v: "weekly" });
  // Google calls this global when the key is rejected (bad key, referrer not allowed, API not enabled).
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    authFailed = true;
    authListeners.forEach((fn) => fn());
  };
}

/** Subscribe to a rejected key so a mounted Google view can swap itself for the fallback. */
export function onGoogleAuthFailure(fn: () => void): () => void {
  if (authFailed) fn();
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** True when a Google view should be attempted in this browser. */
export function googleUsable(): boolean {
  return GOOGLE_ENABLED && !authFailed && typeof window !== "undefined" && hasWebGL();
}

export async function loadMaps(): Promise<google.maps.ImportLibraryMap["maps"]> {
  configure();
  return importLibrary("maps");
}

export async function loadMarker(): Promise<google.maps.ImportLibraryMap["marker"]> {
  configure();
  return importLibrary("marker");
}

export async function loadMaps3d(): Promise<google.maps.ImportLibraryMap["maps3d"]> {
  configure();
  return importLibrary("maps3d");
}

/** GeoJSON [lng, lat] → Google {lat, lng}. The usual bug is swapping these. */
export const toLatLng = ([lng, lat]: GeoJSON.Position): google.maps.LatLngLiteral => ({ lat, lng });

/** Outer rings of a Polygon / MultiPolygon as Google paths. */
export function outerRings(geom: GeoJSON.Geometry): google.maps.LatLngLiteral[][] {
  if (geom.type === "Polygon") return [geom.coordinates[0].map(toLatLng)];
  if (geom.type === "MultiPolygon") return geom.coordinates.map((poly) => poly[0].map(toLatLng));
  return [];
}

export function centroidOf(geom: GeoJSON.Geometry): google.maps.LatLngLiteral | null {
  const pts = outerRings(geom).flat();
  if (!pts.length) return null;
  return { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
}

/** 3D camera limits: stay over the Philippines (same box as the 2D maps) and never see the whole Earth. */
export const GLOBE_LIMITS = {
  bounds: { south: -8, west: 90, north: 30, east: 152 },
  maxAltitude: 2_500_000, // metres; the whole archipelago fits, the globe does not
};
