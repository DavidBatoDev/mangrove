// Fixed demo ids from data/sites/README.md. Letters are a URL convenience for the demo (/compare?sites=B,D,E).

export const SITE_IDS: Record<string, string> = {
  A: "00000000-0000-4000-8000-0000000000a0",
  B: "00000000-0000-4000-8000-0000000000b0",
  C: "00000000-0000-4000-8000-0000000000c0",
  D: "00000000-0000-4000-8000-0000000000d0",
  E: "00000000-0000-4000-8000-0000000000e0",
};

export const SEEDED_RECORD_ID = "00000000-0000-4000-8000-0000000001a0";

/** Accepts a site letter (A–E) or a UUID and returns the UUID. */
export function resolveSiteId(idOrLetter: string): string {
  const key = idOrLetter.trim().toUpperCase();
  return SITE_IDS[key] ?? idOrLetter.trim();
}

export function siteLetter(id: string): string | null {
  return Object.entries(SITE_IDS).find(([, v]) => v === id)?.[0] ?? null;
}
