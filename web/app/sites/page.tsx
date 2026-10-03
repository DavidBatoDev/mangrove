"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CountryCard } from "@/components/GmwContext";
import MapShell from "@/components/MapShell";
import { DemoLabel, Empty, RealCaseLabel, ErrorBox, Loading, MeasureText } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { siteLetter } from "@/lib/ids";

// Candidate sites (US-001): polygons + list, pick 2–5 to compare.
export default function SitesPage() {
  const sites = useApi(() => api.listSites(), []);
  const country = useApi(() => api.countryContext("PHL"), []);
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const compareHref = `/compare?sites=${picked.map((id) => siteLetter(id) ?? id).join(",")}`;
  const canCompare = picked.length >= 2 && picked.length <= 5;

  return (
    <MapShell
      sites={sites.data}
      fitToSites
      highlightSiteIds={picked}
      onSiteClick={(id) => router.push(`/sites/${id}`)}
      layers={{ sites: true }}
    >
      <h1>Candidate sites</h1>
      <p className="lede">Outlines sketched from public map data; not field-verified.</p>

      <div className="panel-card row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
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
      {sites.data && sites.data.features.length === 0 && <Empty>No candidate sites in this region yet.</Empty>}
      {sites.data && sites.data.features.length > 0 && (
        <ul className="list">
          {sites.data.features.map((f) => {
            const p = f.properties;
            const on = picked.includes(p.id);
            return (
              <li key={p.id} className={on ? "selected" : undefined}>
                <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
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
      {country.error && <p className="mg-alert">Global Mangrove Watch statistics did not load. Try again later.</p>}
      {country.data && <CountryCard c={country.data} />}
    </MapShell>
  );
}
