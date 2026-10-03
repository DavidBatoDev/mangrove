"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense, useCallback } from "react";
import { CountryCard } from "@/components/GmwContext";
import MapShell from "@/components/MapShell";
import PlaceCard from "@/components/PlaceCard";
import { ProgramCallout } from "@/components/ProgramCard";
import { DemoLabel, Empty, ErrorBox, Loading, PinLabel } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { formatDate } from "@/lib/format";
import { pinSvg } from "@/lib/pin-icons";
import type { SitesFC } from "@/lib/types";

// The guided tour runs in the browser only (react-joyride; first visit, then the header's Help button).
const HomeTour = dynamic(() => import("@/components/HomeTour"), { ssr: false });

// Public map (US-009): one pin per published record, colored by BR-004 pin state.
// Clicking a pin (or a list row) opens a place card in the panel; the record is one click further.
// The selection lives in the URL (?record=) so a selected pin can be shared.
function PublicMap() {
  const pins = useApi(() => api.listRecords(), []);
  // National context (API-022) for the no-pin panel: Philippine extent and yearly gain/loss from GMW.
  const country = useApi(() => api.countryContext("PHL"), []);
  // The real case being demoed (API-026): the ₱1 billion Post-Yolanda program and its four records.
  const program = useApi(() => api.programContext("mbfdp"), []);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = params.get("record");
  // Before the tour starts, close an open place card so the record list it points at is on screen.
  const showList = useCallback(() => {
    if (new URLSearchParams(window.location.search).has("record")) router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const select = (id: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (id) q.set("record", id);
    else q.delete("record");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // The selected record's site boundary, drawn on the map (and in the 3D fly-in).
  const selectedSite = useApi(async (): Promise<SitesFC | null> => {
    if (!selectedId) return null;
    const rec = await api.getRecord(selectedId);
    const siteId = (rec.record.snapshot as { site_id?: string }).site_id;
    if (!siteId) return null;
    const { site } = await api.getSite(siteId);
    return { type: "FeatureCollection", features: [{ type: "Feature", geometry: site.geometry, properties: { id: site.id, name: site.name, region: site.region, is_demo: site.is_demo, area: site.area } }] };
  }, [selectedId]);

  const selected = pins.data?.features.find((f) => f.properties.id === selectedId) ?? null;
  const lonLat = selected ? (selected.geometry.coordinates as [number, number]) : null;
  // Zoom all the way in to the site (17 = closest zoom of the EOx imagery; Google goes further but 17 frames a site).
  const focus = lonLat ? { center: lonLat, zoom: 17, key: selectedId ?? "" } : null;

  return (
    <>
    <HomeTour onBeforeStart={showList} />
    <MapShell
      pins={pins.data}
      sites={selectedSite.data}
      layers={{ pins: true }}
      onPinClick={(id) => select(id)}
      selectedPinId={selectedId}
      focus={focus}
    >
      {selected && lonLat ? (
        <PlaceCard
          key={selected.properties.id}
          recordId={selected.properties.id}
          lonLat={lonLat}
          onBack={() => select(null)}
        />
      ) : (
        <>
          {country.data && <CountryCard c={country.data} />}

          <h1>Mangrove funding promises</h1>
          <p className="lede">Each pin is a promise made public before the money moved. Pick one to see whether the evidence agrees.</p>

          {program.data && <ProgramCallout p={program.data} pins={pins.data} />}

          <h2 className="panel-label">Published records</h2>
          {pins.loading && <Loading what="Loading records" />}
          <ErrorBox error={pins.error} onRetry={pins.reload} />
          {pins.data && pins.data.features.length === 0 && <Empty>No promises have been published yet.</Empty>}
          {pins.data && pins.data.features.length > 0 && (
            <ul className="list" data-tour="records">
              {pins.data.features.map((f) => (
                <li key={f.properties.id} className="record-item">
                  <button type="button" className="record-item-btn" onClick={() => select(f.properties.id)}>
                    <span className="record-item-pin" dangerouslySetInnerHTML={{ __html: pinSvg(f.properties.pin_state, 28) }} />
                    <span>
                      <strong className="record-item-name">{f.properties.site_name}</strong>
                      <span className="meta">
                        {f.properties.funder} · {f.properties.is_demo ? "published" : "reconstructed"} {formatDate(f.properties.published_at)}
                      </span>
                      <span className="row" style={{ gap: "var(--mg-space-2)", marginTop: "var(--mg-space-1)" }}>
                        <PinLabel state={f.properties.pin_state} />
                        <DemoLabel show={f.properties.is_demo} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

        </>
      )}
    </MapShell>
    </>
  );
}

export default function PublicMapPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PublicMap />
    </Suspense>
  );
}
