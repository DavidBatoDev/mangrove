"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CountryCard } from "@/components/GmwContext";
import MapShell from "@/components/MapShell";
import {
  DemoLabel,
  Empty,
  RealCaseLabel,
  ErrorBox,
  Loading,
  MeasureText,
} from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { siteLetter } from "@/lib/ids";

// Candidate sites (US-001): polygons + list, pick 2–5 to compare.
export default function SitesPage() {
  const sites = useApi(() => api.listSites(), []);
  const country = useApi(() => api.countryContext("PHL"), []);
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);

  const [focus, setFocus] = useState<{
    center: [number, number];
    zoom: number;
    bounds?: [number, number, number, number];
    key: string;
  } | null>(null);

  const flights = useRef(0);
  // Ticking one site flies the map to it; with two or more ticked, the map frames all of them.
  const toggle = (id: string) => {
    const adding = !picked.includes(id);
    const next = adding ? [...picked, id] : picked.filter((x) => x !== id);
    setPicked(next);
    const feats = (sites.data?.features ?? []).filter((x) => next.includes(x.properties.id));
    const key = `${id}-${++flights.current}`;
    if (feats.length >= 2) {
      const boxes = feats.map((x) => bbox(x.geometry));
      const b: [number, number, number, number] = [
        Math.min(...boxes.map((x) => x[0])),
        Math.min(...boxes.map((x) => x[1])),
        Math.max(...boxes.map((x) => x[2])),
        Math.max(...boxes.map((x) => x[3])),
      ];
      setFocus({ center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], zoom: 15, bounds: b, key });
    } else if (adding && feats.length === 1) {
      const b = bbox(feats[0].geometry);
      setFocus({ center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], zoom: 15, key });
    }
  };
  const compareHref = `/compare?sites=${picked.map((id) => siteLetter(id) ?? id).join(",")}`;
  const canCompare = picked.length >= 2 && picked.length <= 5;
  // The panel has two tabs: the candidate-site list and the national extent statistics.
  const [tab, setTab] = useState<"sites" | "extent">("sites");

  return (
    <MapShell
      sites={sites.data}
      fitToSites
      focus={focus}
      highlightSiteIds={picked}
      onSiteClick={(id) => router.push(`/sites/${id}`)}
      layers={{ sites: true }}
    >
      <div className="panel-tabs" role="tablist" aria-label="Panel">
        <button
          type="button"
          role="tab"
          id="tab-sites"
          aria-controls="tabpanel-sites"
          aria-selected={tab === "sites"}
          className={tab === "sites" ? "is-on" : undefined}
          onClick={() => setTab("sites")}
        >
          Candidate sites{sites.data ? ` (${sites.data.features.length})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-extent"
          aria-controls="tabpanel-extent"
          aria-selected={tab === "extent"}
          className={tab === "extent" ? "is-on" : undefined}
          onClick={() => setTab("extent")}
        >
          Extent stats
        </button>
      </div>

      {tab === "extent" && (
        <div role="tabpanel" id="tabpanel-extent" aria-labelledby="tab-extent">
          {country.loading && <Loading what="Loading statistics" />}
          {country.error && (
            <p className="mg-alert">
              Global Mangrove Watch statistics did not load. Try again later.
            </p>
          )}
          {country.data && <CountryCard c={country.data} />}
        </div>
      )}

      {tab === "sites" && (
        <div role="tabpanel" id="tabpanel-sites" aria-labelledby="tab-sites">
          <h1>Candidate sites</h1>
          <p className="lede">
            Outlines sketched from public map data; not field-verified.
          </p>

          <div
            className="panel-card row"
            style={{ justifyContent: "space-between", flexWrap: "nowrap" }}
          >
            <span className="meta" style={{ color: "var(--mg-text)" }}>
              Tick 2 to 5 sites to compare them side by side.
            </span>
            <Link
              href={canCompare ? compareHref : "#"}
              className="mg-btn mg-btn--primary"
              aria-disabled={!canCompare}
              onClick={(e) => !canCompare && e.preventDefault()}
              style={canCompare ? undefined : { opacity: 0.55 }}
            >
              Compare{picked.length > 0 ? ` (${picked.length})` : ""}
            </Link>
          </div>

          <h2 className="panel-label">Sites</h2>
          {sites.loading && <Loading what="Loading sites" />}
          <ErrorBox error={sites.error} onRetry={sites.reload} />
          {sites.data && sites.data.features.length === 0 && (
            <Empty>No candidate sites in this region yet.</Empty>
          )}
          {sites.data && sites.data.features.length > 0 && (
            <ul className="list">
              {sites.data.features.map((f) => {
                const p = f.properties;
                const on = picked.includes(p.id);
                return (
                  <li key={p.id} className={on ? "selected" : undefined}>
                    <div
                      className="row"
                      style={{ alignItems: "flex-start", flexWrap: "nowrap" }}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Compare ${p.name}`}
                        checked={on}
                        onChange={() => toggle(p.id)}
                        disabled={!on && picked.length >= 5}
                      />
                      <div>
                        <Link href={`/sites/${p.id}`}>
                          <strong>
                            {siteLetter(p.id) ? `${siteLetter(p.id)} · ` : ""}
                            {p.name}
                          </strong>
                        </Link>{" "}
                        <DemoLabel show={p.is_demo} />
                        <RealCaseLabel show={!p.is_demo} />
                        <div className="meta">
                          {p.region} · <MeasureText m={p.area} />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </MapShell>
  );
}

/** [west, south, east, north] of a geometry. */
function bbox(geometry: unknown): [number, number, number, number] {
  let [w, so, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      w = Math.min(w, x);
      e = Math.max(e, x);
      so = Math.min(so, y);
      n = Math.max(n, y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk((geometry as { coordinates?: unknown }).coordinates);
  return [w, so, e, n];
}
