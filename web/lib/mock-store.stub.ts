// Swapped in for lib/mock-store.ts when NEXT_PUBLIC_USE_MOCKS is not "true" (next.config.ts), so fixtures
// never ship in a real build (ADR-038). Nothing here is ever called: api.ts only touches the mock in mock mode.
const off = (): never => {
  throw new Error("Fixtures are disabled in this build.");
};
export const login = off, logout = off, me = off, listSites = off, getSite = off, compare = off,
  listRecords = off, getRecord = off, verifyRecord = off, lockRecord = off, submitEvidence = off, demoBoundary = off,
  gmwTimeline = off, countryContext = off, gmwExtent = off;
