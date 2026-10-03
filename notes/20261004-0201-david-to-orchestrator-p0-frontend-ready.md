---
from: david
to: orchestrator
sent: 2026-10-04T02:01+08:00
phase: P0
branch: person/david @ b44fed9
type: change
reply_to: 20261003-2330-orchestrator-to-david-p0-handoff.md
---

# P0 frontend is on person/david: every storyboard screen clickable on fixtures

## What changed / what I need

Pushed after the 01:30 target. `web/` is scaffolded and the storyboard steps 1–9 click through on fixtures.

- **Stack:** Next.js 16.3.8 (App Router, Turbopack, Node runtime), React 19.2.8, MapLibre GL 6.11.2, lucide-react 1.51.0. Versions pinned in `web/package.json`.
- **One data module:** `web/lib/api.ts`. `NEXT_PUBLIC_USE_MOCKS=true` reads `web/mocks/`; otherwise the browser calls `/api/v1/...`. A Next.js rewrite proxies that to `API_INTERNAL_URL` (default `http://localhost:8000`). Env names are in `web/.env.example`.
- **Fixtures:** `web/mocks/`, one file per operation, in the `docs/api.md` §3 shapes: `api-004-sites.json`, `api-005-site-a…e.json`, `api-006-compare-b-d-e.json`, `api-010-records.json`, `api-011-record-a.json`, `api-013-verify-a.json`. Fixed ids and the cast follow `data/sites/README.md`. Satellite items say `"source_version": "fixture-placeholder"`.
- **Fakes for the writes:** sign-in (API-001), lock (API-009 with `Idempotency-Key`) and evidence (API-008) are in-browser fakes. They apply the EQ-009 work check (0.20 tolerance) and the BR-004 pin state. B's 8 ha report vs 5 ha boundary turns B conflicting with a red pin.
- **Fixtures never ship:** a real build (`NEXT_PUBLIC_USE_MOCKS` not `true`) aliases the mock store to a stub (`next.config.ts`, `turbopack.resolveAlias`).
- **UI preview data:** `web/mocks/ui-preview-records.json` holds nine extra records, so the map shows every pin state. They are fictional, `is_demo`, outside the Manila Bay cast, and fixtures-only. The A–E storyboard is unchanged.
- **Deploy image:** `web/Dockerfile` (Node 22, `npm ci && npm run build`, `next start -p 3000`). `docker build -t mangrove-web web/` passes and the container serves on port 3000.
- **MapLibre worker:** v6 loads its worker from a URL that Turbopack does not emit. `web/scripts/copy-maplibre-worker.mjs` copies it to `public/maplibre/` (git-ignored) before every dev run and build.
- **Brand kit (ADR-042):** `web/scripts/sync-brand.mjs` copies `../brand` to `web/public/brand/` before every dev run and build. The copy is committed because the Docker context is `web/` only.

Decisions for you or the designer. These are team choices that differ from the docs, and none has an ADR yet:

1. **Basemaps:** Light and Dark use OpenFreeMap (OSM data, no key). Satellite stays EOxCloudless 2016, with OpenFreeMap place labels on top. `docs/prd.md` §7 names EOx only. Default is Light, per `docs/design.md` §4.
2. **One typeface:** Schibsted Grotesk everywhere. `brand/BRAND.md` §5's Newsreader and IBM Plex Mono are not used. These are overrides in `web/app/globals.css`; `brand/` is untouched.
3. **Card radius:** 16px (`--app-radius` in `web/app/pages.css`); the kit's `--mg-radius-md` is 8px.
4. **Map bounds:** pan and zoom are limited to a box around the Philippines (90–152°E, 8°S–30°N).

## Why

P0 goal from the handoff: the whole demo exists on screen while Ethan builds the backend (ADR-038). Points 1–4 came from David during the build. They change look only, not behaviour or numbers.

## What you need to do

- Check my fixtures against Ethan's real responses at the P0 integration (ADR-039). If a shape differs, tell me; I won't change `docs/api.md` on my branch.
- Decide whether points 1–4 need an ADR (next free: ADR-043) and a `brand/BRAND.md` §5 update. I can draft them.
- `docs/api.md` doesn't fix the error body shape: §4 lists codes only. `web/lib/api.ts` accepts `{error:{code,message}}` or `{code,message}`. Please confirm Ethan's shape.

## Affects

`web/` only. Reads API-001, 003, 004, 005, 006, 008, 009, 010, 011, 013. Env: `NEXT_PUBLIC_USE_MOCKS`, `NEXT_PUBLIC_BASEMAP_URL`, `API_INTERNAL_URL`. No contract docs touched.

## How to check

```sh
cd web && npm ci
# mocks: create .env.local from .env.example (NEXT_PUBLIC_USE_MOCKS=true), then
npm run dev        # http://localhost:3000, sign in as funder@ / partner@demo.mangrove.test, any password
npm run lint && npx tsc --noEmit
NEXT_PUBLIC_USE_MOCKS=false npm run build   # real-mode build, no fixture data in .next/static
docker build -t mangrove-web .
```

Walk storyboard steps 1–9. `/compare?sites=B,D,E` shows supported / missing / conflicting. After step 9, B's record shows "Conflicting" (8 ha reported vs about 5 ha mapped) and its pin is red.
