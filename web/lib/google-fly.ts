// Smooth camera flight for the Google 2D map, like MapLibre's flyTo: center and zoom move together over a short,
// eased animation, pulling back a little on long hops so the viewer keeps their bearings. Google's own setZoom/panTo
// jump instead of animating. A new flight or a drag cancels the one in progress.

import type { Padding } from "@/lib/map-handle";

const TILE = 256;
const toWorld = (lng: number, lat: number): [number, number] => {
  const s = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return [((lng + 180) / 360) * TILE, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE];
};
const toLngLat = (x: number, y: number): google.maps.LatLngLiteral => ({
  lng: (x / TILE) * 360 - 180,
  lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / TILE))) * 180) / Math.PI,
});
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const flights = new WeakMap<google.maps.Map, { stop: () => void }>();

export function flyGoogle(map: google.maps.Map, center: [number, number], minZoom: number, padding: Padding): void {
  flights.get(map)?.stop();
  const p = typeof padding === "number" ? { top: padding, bottom: padding, left: padding, right: padding } : padding;
  const c0 = map.getCenter();
  const z0 = map.getZoom() ?? 6;
  const z1 = Math.max(z0, minZoom);
  const [px, py] = toWorld(center[0], center[1]);
  // Keep the point in the middle of the area the side panel leaves visible.
  const s1 = Math.pow(2, z1);
  const x1 = px - (p.left - p.right) / 2 / s1;
  const y1 = py - (p.top - p.bottom) / 2 / s1;
  const [x0, y0] = c0 ? toWorld(c0.lng(), c0.lat()) : [x1, y1];

  // Pull back mid-flight when the hop is long compared with the screen.
  const width = map.getDiv().clientWidth || 800;
  const hopPx = Math.hypot(x1 - x0, y1 - y0) * Math.pow(2, Math.min(z0, z1));
  const bump = Math.min(4, Math.max(0, Math.log2(hopPx / width)));
  const duration = Math.min(2000, 700 + 250 * (Math.abs(z1 - z0) + bump));

  let raf = 0;
  const start = performance.now();
  const drag = map.addListener("dragstart", () => stop());
  const stop = () => {
    cancelAnimationFrame(raf);
    drag.remove();
    flights.delete(map);
  };
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const e = ease(t);
    map.moveCamera({
      center: toLngLat(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e),
      zoom: z0 + (z1 - z0) * e - bump * Math.sin(Math.PI * e),
    });
    if (t < 1) raf = requestAnimationFrame(frame);
    else stop();
  };
  flights.set(map, { stop });
  raf = requestAnimationFrame(frame);
}
