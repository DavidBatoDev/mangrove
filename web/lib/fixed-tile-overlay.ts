// GMW mangrove layers on the Google map as ONE fixed set of tiles (ADR-054): the tiles of a single zoom that hold
// data are placed once and scaled with the map, like a picture pinned to it. Zooming never asks for new tiles or
// swaps a blurry placeholder for a sharp one, so the layer never flickers or waits. Pixels stay crisp blocks.

export interface FixedTileOverlay {
  setLayers(templates: string[]): void;
  setOpacity(opacity: number): void;
  remove(): void;
}

const lng = (x: number, z: number) => (x / (1 << z)) * 360 - 180;
const lat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (1 << z)))) * 180) / Math.PI;

/** Needs the Maps JS API loaded (the class extends google.maps.OverlayView). */
export function createFixedTileOverlay(map: google.maps.Map, z: number, tiles: [number, number][]): FixedTileOverlay {
  class Overlay extends google.maps.OverlayView {
    root = document.createElement("div");
    cells = new Map<string, HTMLDivElement>();
    templates: string[] = [];

    constructor() {
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
          img.src = t.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
          img.alt = "";
          img.decoding = "async";
          img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;";
          return img;
        }),
      );
    }

    draw() {
      const proj = this.getProjection();
      const view = this.getMap() instanceof google.maps.Map ? (this.getMap() as google.maps.Map).getBounds() : null;
      if (!proj || !view) return;
      for (const [x, y] of tiles) {
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

  const o = new Overlay();
  o.setMap(map);
  const idle = map.addListener("idle", () => o.draw());
  return {
    setLayers(templates) {
      o.templates = templates;
      o.cells.forEach((c, k) => {
        const [x, y] = k.split("/").map(Number);
        o.fill(c, x, y);
      });
      o.draw();
    },
    setOpacity(opacity) {
      o.root.style.opacity = String(opacity);
    },
    remove() {
      idle.remove();
      o.setMap(null);
    },
  };
}
