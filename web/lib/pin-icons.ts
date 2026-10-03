// Map marker drawings, shared by the map pins and the legend so they always match.
// Look per docs/design.md §4 and brand/BRAND.md §6: conflict = Conflict red fill, Mist outline;
// awaiting = Mist fill, Brackish dashed outline; on track = Tidal fill, Mist outline. Each state also has
// its own symbol, so it never depends on color alone. Colors are brand tokens, resolved by the page CSS.

import type { PinState } from "@/lib/types";

const LOOK: Record<PinState, { fill: string; stroke: string; dash: string; glyph: string }> = {
  conflict: { fill: "var(--mg-pin-conflict)", stroke: "var(--mg-mist)", dash: "", glyph: "var(--mg-mist)" },
  awaiting: { fill: "var(--mg-mist)", stroke: "var(--mg-pin-awaiting)", dash: "4 3", glyph: "var(--mg-mudflat)" },
  on_track: { fill: "var(--mg-pin-on-track)", stroke: "var(--mg-mist)", dash: "", glyph: "var(--mg-mist)" },
};

const GLYPHS: Record<PinState, (c: string) => string> = {
  // hourglass: waiting for evidence or for the check date
  awaiting: (c) =>
    `<path d="M12 9.5h8M12 22.5h8M13 9.5c0 4 6 4.5 6 6.5s-6 2.5-6 6.5M19 9.5c0 4-6 4.5-6 6.5s6 2.5 6 6.5" style="fill:none;stroke:${c}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  // check
  on_track: (c) => `<path d="m11 16.5 3.5 3.5 7-8" style="fill:none;stroke:${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  // exclamation
  conflict: (c) => `<path d="M16 9.5v8" style="stroke:${c}" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="22" r="1.6" style="fill:${c}"/>`,
};

/** A teardrop marker, 32×42, tip at the bottom center. */
export function pinSvg(state: PinState, size = 32): string {
  const h = Math.round((size * 42) / 32);
  const l = LOOK[state];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 32 42" aria-hidden="true" focusable="false">
<path d="M16 40C16 40 3.5 26 3.5 16a12.5 12.5 0 0 1 25 0c0 10-12.5 24-12.5 24Z" style="fill:${l.fill};stroke:${l.stroke}" stroke-width="2"${l.dash ? ` stroke-dasharray="${l.dash}"` : ""}/>
${GLYPHS[state](l.glyph)}
</svg>`;
}

/** A small candidate-site outline for the legend: Tidal 2px outline, Tidal 12% fill (design.md §4). */
export function siteAreaSvg(size = 32): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
<path d="M5 9 14 4l13 5-2 12-9 7-10-6Z" style="fill:color-mix(in srgb, var(--mg-tidal) 12%, transparent);stroke:var(--mg-tidal)" stroke-width="2" stroke-linejoin="round"/>
</svg>`;
}
