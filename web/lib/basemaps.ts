// Basemaps offered in the map settings. Satellite is EOxCloudless 2016, the only imagery the PRD allows
// (docs/prd.md §7, CC BY 4.0; later vintages are CC BY-NC-SA). Light and Dark are OpenFreeMap vector styles
// (OpenStreetMap data; free, no key; attribution comes from their TileJSON). Satellite gets OpenFreeMap place
// labels on top so towns and provinces are named on every basemap.

import type { StyleSpecification } from "maplibre-gl";

export type BasemapId = "light" | "dark" | "satellite";

const EOX_URL =
  process.env.NEXT_PUBLIC_BASEMAP_URL || "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg";
const EOX_ATTRIBUTION =
  '<a href="https://cloudless.eox.at" target="_blank" rel="noopener">EOxCloudless https://cloudless.eox.at</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)';

// Place names over the satellite imagery: OpenFreeMap vector tiles (OpenStreetMap data, ODbL; free, no key).
// Same font and name field as the Light/Dark styles so labels read the same on every basemap.
export const LABEL_FONT = ["Noto Sans Regular"];
export const LABEL_FONT_BOLD = ["Noto Sans Bold"];
export const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
const PLACE_NAME = ["coalesce", ["get", "name_en"], ["get", "name"]];
const placeLayer = (id: string, classes: string[], minzoom: number, size: [number, number, number, number]) => ({
  id,
  type: "symbol" as const,
  source: "places",
  "source-layer": "place",
  minzoom,
  filter: ["match", ["get", "class"], classes, true, false],
  layout: {
    "text-field": PLACE_NAME,
    "text-font": LABEL_FONT,
    "text-size": ["interpolate", ["linear"], ["zoom"], size[0], size[1], size[2], size[3]],
    "text-max-width": 8,
  },
  // MapLibre paint cannot read CSS variables: these are the brand's Mist (#F4F7F5) on a Night (#0B1714) halo.
  paint: { "text-color": "#F4F7F5", "text-halo-color": "rgba(11, 23, 20, 0.85)", "text-halo-width": 1.5 },
});

export interface Basemap {
  id: BasemapId;
  label: string;
  style: string | StyleSpecification;
  /** Light or dark ground, so overlays pick brand colors that read on it. */
  ground: "light" | "dark";
}

export const BASEMAPS: Basemap[] = [
  { id: "light", label: "Light", style: "https://tiles.openfreemap.org/styles/positron", ground: "light" },
  { id: "dark", label: "Dark", style: "https://tiles.openfreemap.org/styles/dark", ground: "dark" },
  {
    id: "satellite",
    label: "Satellite",
    style: {
      version: 8,
      glyphs: GLYPHS,
      sources: {
        basemap: { type: "raster", tiles: [EOX_URL], tileSize: 256, attribution: EOX_ATTRIBUTION, maxzoom: 17 },
        places: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      },
      layers: [
        { id: "basemap", type: "raster", source: "basemap" },
        placeLayer("place-village", ["village", "suburb"], 11, [11, 11, 15, 14]),
        placeLayer("place-town", ["town"], 8, [8, 11, 14, 15]),
        placeLayer("place-city", ["city"], 5, [5, 12, 12, 18]),
        placeLayer("place-state", ["state", "province"], 6, [6, 11, 9, 14]),
        placeLayer("place-country", ["country"], 2, [2, 13, 6, 18]),
      ],
    } as StyleSpecification,
    ground: "dark",
  },
];

// Muted light basemap by default so the pins carry the color (docs/design.md §4).
export const DEFAULT_BASEMAP: BasemapId = "light";
export const basemapById = (id: BasemapId) => BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[2];
