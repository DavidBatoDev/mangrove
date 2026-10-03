// MapLibre GL JS v6 loads its worker from a URL next to its own module. Turbopack does not emit that file,
// so serve the worker (and the shared chunk it imports) from public/ and point setWorkerUrl at it.
import { copyFileSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist/";
const to = "public/maplibre/";
mkdirSync(to, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(from + f, to + f);
