// Home-page tour state (react-joyride): whether this browser has seen it (localStorage), and a request channel so
// the Help button in the header (root layout) can start the tour on the home page without sharing React state.

export const TOUR_KEY = "aide-m-home-tour-v1";
const REQUEST = "aide-m:tour";

/** True once the tour was finished or skipped in this browser. Blocked storage counts as not seen. */
export function tourSeen(): boolean {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "done";
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  try {
    window.localStorage.setItem(TOUR_KEY, "done");
  } catch {
    // A convenience only: the tour may show again next visit.
  }
}

/** Ask the home page to (re)start the tour. */
export function requestTour(): void {
  window.dispatchEvent(new Event(REQUEST));
}

/** Listen for tour requests; returns the unsubscribe. */
export function onTourRequest(fn: () => void): () => void {
  window.addEventListener(REQUEST, fn);
  return () => window.removeEventListener(REQUEST, fn);
}

const ASK = "aide-m:ask";

/** Open or close the Ask AIDE-M panel (the header owns its state). */
export function setAssistantOpen(open: boolean): void {
  window.dispatchEvent(new CustomEvent<boolean>(ASK, { detail: open }));
}

export function onAssistantToggle(fn: (open: boolean) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<boolean>).detail);
  window.addEventListener(ASK, h);
  return () => window.removeEventListener(ASK, h);
}
