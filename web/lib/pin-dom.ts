// The record pin as a DOM element, shared by the MapLibre and Google map views so both look and behave
// the same: a link to the record, a compact marker with a DEMO tag (BR-006), a label on hover/focus.

import { PIN_WORDS } from "@/lib/format";
import { pinSvg } from "@/lib/pin-icons";
import type { PinProps } from "@/lib/types";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildPinElement(p: PinProps, onClick: (id: string) => void): HTMLAnchorElement {
  const el = document.createElement("a");
  el.href = `/records/${p.id}`;
  el.className = `map-pin map-pin-${p.pin_state}`;
  el.dataset.recordId = p.id;
  el.setAttribute("aria-label", `${p.site_name}: ${PIN_WORDS[p.pin_state]}. ${p.is_demo ? "Demo data. " : "Real case, sourced. "}Open record.`);
  el.innerHTML =
    pinSvg(p.pin_state) +
    (p.is_demo ? '<span class="map-pin-demo">Demo</span>' : '<span class="map-pin-real">Real case</span>') +
    `<span class="map-pin-label"><strong>${escapeHtml(p.site_name)}</strong>${PIN_WORDS[p.pin_state]}${p.is_demo ? " · Demo data" : " · Real case · sourced"}</span>`;
  el.addEventListener("click", (ev) => {
    ev.preventDefault();
    onClick(p.id);
  });
  return el;
}
