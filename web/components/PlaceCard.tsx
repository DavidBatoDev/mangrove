"use client";

// Place card for a selected pin, in the side panel (like a maps "place" view): a satellite crop of the site,
// the promise in one line, the two checks, key numbers and the latest evidence, with actions.
// The header image is the same EOxCloudless 2016 imagery as the basemap (docs/prd.md §7), not a photo.

import { ArrowLeft, CalendarClock, Link2, ScrollText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SiteNowPictures } from "@/components/SatellitePictures";
import { DemoLabel, ErrorBox, RealCaseLabel, Loading, PinLabel, StatusBadge } from "@/components/ui";
import { BrandIcon, ICON_PROPS, QuestionIcon, SourceIcon, StatTile } from "@/components/visual";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { ACTION_LABELS, findingLabel, formatDate, formatMeasure, snapshotSite } from "@/lib/format";
import type { Measure, PinState } from "@/lib/types";
import Site3DView, { toneFromPin } from "@/components/Site3DView";

const EOX_URL =
  process.env.NEXT_PUBLIC_BASEMAP_URL || "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg";
const Z = 14;

/** A 3×3 block of satellite tiles, shifted so the site sits in the middle of the frame. */
function SiteImagery({ lon, lat }: { lon: number; lat: number }) {
  const n = 2 ** Z;
  const fx = ((lon + 180) / 360) * n;
  const latR = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx);
  const ty = Math.floor(fy);
  // Offset of the site inside the 3×3 block (256 px tiles), so it can be centred with CSS.
  const px = (fx - tx + 1) * 256;
  const py = (fy - ty + 1) * 256;
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      tiles.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${dx},${dy}`}
          alt=""
          src={EOX_URL.replace("{z}", String(Z)).replace("{x}", String(tx + dx)).replace("{y}", String(ty + dy))}
          style={{ left: (dx + 1) * 256, top: (dy + 1) * 256 }}
        />,
      );
  return (
    <div className="place-imagery" role="img" aria-label="Satellite view of the site (EOxCloudless 2016)">
      <div className="place-tiles" style={{ transform: `translate(calc(50% - ${px}px), calc(50% - ${py}px))` }}>
        {tiles}
      </div>
      <span className="place-target" aria-hidden="true" />
      <span className="place-credit">EOxCloudless 2016 · Sentinel-2</span>
    </div>
  );
}

/** 3D fly-in to the selected site when Google is available; the EOx satellite crop otherwise. */
function PlaceHero3D({ siteId, pin, lonLat }: { siteId?: string; pin: PinState; lonLat: [number, number] }) {
  const site = useApi(() => (siteId ? api.getSite(siteId) : Promise.resolve(null)), [siteId]);
  const fallback = <SiteImagery lon={lonLat[0]} lat={lonLat[1]} />;
  if (!site.data) return fallback;
  return (
    <Site3DView
      className="place-imagery place-3d"
      geometry={site.data.site.geometry}
      tone={toneFromPin(pin)}
      motion="flyin"
      label={`3D view of ${site.data.site.name}`}
      fallback={fallback}
    />
  );
}

export default function PlaceCard({
  recordId,
  lonLat,
  onBack,
}: {
  recordId: string;
  lonLat: [number, number];
  onBack: () => void;
}) {
  const r = useApi(() => api.getRecord(recordId), [recordId]);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/records/${recordId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the "Open record" link still carries the URL.
    }
  }

  return (
    <div className="place">
      <div className="place-top">
        <button type="button" className="place-back" onClick={onBack} aria-label="Back to all records">
          <ArrowLeft {...ICON_PROPS} size={20} />
        </button>
        {r.data ? (
          <PlaceHero3D siteId={snapshotSite(r.data.record).id} pin={r.data.pin_state} lonLat={lonLat} />
        ) : (
          <SiteImagery lon={lonLat[0]} lat={lonLat[1]} />
        )}
      </div>

      {r.loading && <Loading what="Loading record" />}
      <ErrorBox error={r.error} onRetry={r.reload} />
      {r.data &&
        (() => {
          const { record, checks, site_answers, timeline, pin_state } = r.data;
          const lockedSite = snapshotSite(record);
          const snap = { site_id: lockedSite.id, site_name: lockedSite.name };
          const work = checks.find((c) => c.check === "work");
          const outcome = checks.find((c) => c.check === "outcome");
          const sources: Measure = {
            value: site_answers.reduce((s, a) => s + a.source_count.value, 0),
            unit: "items",
            eq_id: "EQ-013",
            confidence: "high",
          };
          const latest = [...timeline].reverse().slice(0, 3);
          return (
            <div className="place-body">
              <div className="place-head">
                <h2>{snap.site_name ?? "Site"}</h2>
                <p className="meta">
                  {record.funder.name} · locked {formatDate(record.published_at)}
                </p>
                <div className="row" style={{ gap: "var(--mg-space-2)" }}>
                  <PinLabel state={pin_state} />
                  <DemoLabel show={record.funder.is_demo} />
                  <RealCaseLabel show={!record.is_demo} />
                </div>
              </div>

              <div className="place-actions">
                <Link className="place-action is-primary" href={`/records/${record.id}`}>
                  <span>
                    <ScrollText {...ICON_PROPS} size={20} />
                  </span>
                  Open record
                </Link>
                {snap.site_id && (
                  <Link className="place-action" href={`/sites/${snap.site_id}`}>
                    <span>
                      <BrandIcon name="evidence-trace" size={20} />
                    </span>
                    Site dossier
                  </Link>
                )}
                <button type="button" className="place-action" onClick={copyLink}>
                  <span>
                    <Link2 {...ICON_PROPS} size={20} />
                  </span>
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>

              <section className="place-section">
                <span className="mg-eyebrow mg-label--promise">Promise</span>
                <p className="place-promise">
                  {formatMeasure(record.planned_area_ha)} of {(ACTION_LABELS[record.planned_action] ?? record.planned_action).toLowerCase()}
                </p>
                <div className="stats stats--2">
                  <StatTile icon={<BrandIcon name="promise" />} label="Planned" m={record.planned_area_ha} />
                  <StatTile icon={<BrandIcon name="baseline" />} label="Sources at lock" m={sources} />
                </div>
              </section>

              <section className="place-section">
                <span className="mg-eyebrow">Follow-through</span>
                {work && (
                  <div className="place-check">
                    <QuestionIcon q="work" size={20} />
                    <div>
                      <strong>{work.label}</strong>
                      <div className="status-line">
                        <StatusBadge status={work.status} />
                        <span className="source-count mg-mono">
                          {work.evidence_ids.length} {work.evidence_ids.length === 1 ? "source" : "sources"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {outcome && (
                  <div className="place-check">
                    <QuestionIcon q="outcome" size={20} />
                    <div>
                      <strong>{outcome.label}</strong>
                      <div className="status-line">
                        <StatusBadge status={outcome.status} />
                        {outcome.status === "too_early" && outcome.checkable_from && (
                          <span className="source-count">
                            <CalendarClock {...ICON_PROPS} size={14} /> from {formatDate(outcome.checkable_from)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="place-section">
                <span className="mg-eyebrow">Site questions</span>
                <ul className="place-questions">
                  {site_answers.map((a) => (
                    <li key={a.question} className={a.status === "conflicting" ? "is-conflict" : undefined}>
                      <QuestionIcon q={a.question} size={18} />
                      <span>{a.label}</span>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              </section>

              {snap.site_id && (
                <section className="place-section">
                  <SiteNowPictures siteId={snap.site_id} siteName={snap.site_name} />
                </section>
              )}

              <section className="place-section">
                <span className="mg-eyebrow">Latest evidence</span>
                {latest.length === 0 ? (
                  <p className="meta" style={{ margin: 0 }}>
                    No evidence added since the promise was published.
                  </p>
                ) : (
                  <ul className="place-evidence">
                    {latest.map((t) =>
                      t.evidence ? (
                        <li key={t.seq}>
                          <span className="place-evidence-icon">
                            <SourceIcon type={t.evidence.source_type} size={16} />
                          </span>
                          <span>
                            <strong>{findingLabel(t.evidence.finding)}</strong>
                            <span className="meta">
                              {t.evidence.source_name} · {formatDate(t.evidence.observed_to)}
                            </span>
                          </span>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </section>

              <p className="place-disclaimer">{r.data.disclaimer}</p>
            </div>
          );
        })()}
    </div>
  );
}
