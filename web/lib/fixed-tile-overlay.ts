// GMW mangrove layers on the Google map as fixed tile sets (ADR-054): each level's tiles that hold data are placed
// once and scaled with the map, like a picture pinned to it. Zooming never asks for new tiles or swaps a blurry
// placeholder for a sharp one. A coarse level serves the country view (a fine one shrunk that far loses the thin
// coastal fringes); the fine level takes over from FINE_FROM. Enlarged pixels stay crisp blocks.

export interface FixedTileOverlay {
  setLayers(templates: string[]): void;
  setOpacity(opacity: number): void;
  remove(): void;
}

const lng = (x: number, z: number) => (x / (1 << z)) * 360 - 180;
const lat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (1 << z)))) * 180) / Math.PI;

/** Needs the Maps JS API loaded (the class extends google.maps.OverlayView). */
export type Level = { z: number; tiles: [number, number][] };
const FINE_FROM = 9; // map zoom where the finest level replaces the coarser one

export function createFixedTileOverlay(map: google.maps.Map, levels: Level[]): FixedTileOverlay {
  const sorted = [...levels].sort((a, b) => a.z - b.z);
  const pick = (zoom: number) => (zoom >= FINE_FROM ? sorted[sorted.length - 1] : sorted[0]);

  class LevelOverlay extends google.maps.OverlayView {
    root = document.createElement("div");
    cells = new Map<string, HTMLDivElement>();
    templates: string[] = [];

    constructor(
      readonly z: number,
      readonly tiles: [number, number][],
    ) {
      super();
      this.root.style.position = "absolute";
      this.root.style.pointerEvents = "none";
    }

    onAdd() {
      this.getPanes()?.overlayLayer.appendChild(this.root);
    }

    onRemove() {
      this.root.remove();
    }

    cell(x: number, y: number): HTMLDivElement {
      const k = `${x}/${y}`;
      let c = this.cells.get(k);
      if (!c) {
        c = document.createElement("div");
        c.style.position = "absolute";
        this.fill(c, x, y);
        this.root.appendChild(c);
        this.cells.set(k, c);
      }
      return c;
    }

    fill(c: HTMLDivElement, x: number, y: number) {
      c.replaceChildren(
        ...this.templates.map((t) => {
          const img = document.createElement("img");
          img.src = t.replace("{z}", String(this.z)).replace("{x}", String(x)).replace("{y}", String(y));
          img.alt = "";
          img.decoding = "async";
          img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
          return img;
        }),
      );
    }

    draw() {
      const proj = this.getProjection();
      const view = this.getMap() instanceof google.maps.Map ? (this.getMap() as google.maps.Map).getBounds() : null;
      if (!proj || !view) return;
      const zoom = (this.getMap() as google.maps.Map).getZoom() ?? 6;
      const on = pick(zoom).z === this.z;
      this.root.style.display = on ? "" : "none";
      if (!on) return;
      // Enlarged: crisp data pixels; shrunk: smooth, so thin fringes average instead of vanishing.
      this.root.style.imageRendering = zoom > this.z ? "pixelated" : "auto";
      const z = this.z;
      for (const [x, y] of this.tiles) {
        const sw = new google.maps.LatLng(lat(y + 1, z), lng(x, z));
        const ne = new google.maps.LatLng(lat(y, z), lng(x + 1, z));
        const k = `${x}/${y}`;
        // Create a tile only once it is in view; keep it after (the browser has it cached anyway).
        if (!this.cells.has(k) && !view.intersects(new google.maps.LatLngBounds(sw, ne))) continue;
        const a = proj.fromLatLngToDivPixel(sw);
        const b = proj.fromLatLngToDivPixel(ne);
        if (!a || !b) continue;
        const s = this.cell(x, y).style;
        s.left = `${a.x}px`;
        s.top = `${b.y}px`;
        s.width = `${b.x - a.x}px`;
        s.height = `${a.y - b.y}px`;
      }
    }
  }

  const os = sorted.map((l) => new LevelOverlay(l.z, l.tiles));
  os.forEach((o) => o.setMap(map));
  const idle = map.addListener("idle", () => os.forEach((o) => o.draw()));
  return {
    setLayers(templates) {
      for (const o of os) {
        o.templates = templates;
        o.cells.forEach((c, k) => {
          const [x, y] = k.split("/").map(Number);
          o.fill(c, x, y);
        });
        o.draw();
      }
    },
    setOpacity(opacity) {
      os.forEach((o) => (o.root.style.opacity = String(opacity)));
    },
    remove() {
      idle.remove();
      os.forEach((o) => o.setMap(null));
    },
  };
}
