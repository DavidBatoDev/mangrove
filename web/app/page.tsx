"use client";

import Link from "next/link";
import MapShell from "@/components/MapShell";
import { DemoLabel, Empty, ErrorBox, Loading, PinLabel } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { formatDate } from "@/lib/format";
import { pinSvg } from "@/lib/pin-icons";

// Public map (US-009): one pin per published record, colored by BR-004 pin state.
export default function PublicMapPage() {
  const pins = useApi(() => api.listRecords(), []);

  return (
    <MapShell pins={pins.data} layers={{ pins: true }}>
      <h1>Mangrove funding promises</h1>
      <p className="lede">Each pin is a promise made public before the money moved. Open one to see whether the evidence agrees.</p>

      <h2 className="panel-label">Published records</h2>
      {pins.loading && <Loading what="Loading records" />}
      <ErrorBox error={pins.error} onRetry={pins.reload} />
      {pins.data && pins.data.features.length === 0 && <Empty>No promises have been published yet.</Empty>}
      {pins.data && pins.data.features.length > 0 && (
        <ul className="list">
          {pins.data.features.map((f) => (
            <li key={f.properties.id} className="record-item">
              <span className="record-item-pin" dangerouslySetInnerHTML={{ __html: pinSvg(f.properties.pin_state, 28) }} />
              <div>
                <Link href={`/records/${f.properties.id}`}>
                  <strong>{f.properties.site_name}</strong>
                </Link>
                <div className="meta">
                  {f.properties.funder} · published {formatDate(f.properties.published_at)}
                </div>
                <div className="row" style={{ gap: "var(--mg-space-2)", marginTop: "var(--mg-space-1)" }}>
                  <PinLabel state={f.properties.pin_state} />
                  <DemoLabel show={f.properties.is_demo} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MapShell>
  );
}
