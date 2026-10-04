// The few map actions the shell's own controls need, so MapShell works the same over MapLibre or Google.

export type Padding = number | { top: number; bottom: number; left: number; right: number };

export interface MapHandle {
  zoomIn(): void;
  zoomOut(): void;
  /** Fly to a point, never zooming out from where the viewer already is. */
  flyTo(center: [number, number], minZoom: number, padding: Padding): void;
  /** Frame a box [west, south, east, north], zooming out when it needs to. */
  fitBounds(bounds: [number, number, number, number], padding: Padding): void;
  /** Tilt the camera for a 3D look (on) or back to flat. */
  set3d(on: boolean): void;
  /** North up, no tilt. */
  resetView(): void;
  /** Current center [lng, lat] and zoom. */
  getView(): { center: [number, number]; zoom: number };
}
