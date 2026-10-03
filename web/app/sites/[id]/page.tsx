"use client";

// Site dossier (US-002, US-003): the three questions first, then every evidence item with its provenance.

import { Lock, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AnswerBlock from "@/components/AnswerBlock";
import EvidenceCard from "@/components/EvidenceCard";
import { SiteTrendCard } from "@/components/GmwContext";
import SatelliteRefresh from "@/components/SatelliteRefresh";
import Map from "@/components/Map";
import Site3DView, { toneFromAnswers } from "@/components/Site3DView";
import { useSession } from "@/components/session";
import { DemoLabel, ErrorBox, Loading, RealCaseLabel } from "@/components/ui";
import { BrandIcon, EmptyArt, ICON_PROPS, QuestionIcon, StatTile } from "@/components/visual";
import { useApi } from "@/hooks/useApi";
import { useGmwLayers } from "@/hooks/useGmwLayers";
import * as api from "@/lib/api";
import { QUESTION_LABELS } from "@/lib/format";
import { resolveSiteId, siteLetter } from "@/lib/ids";
import type { Answer, Evidence, Measure, SitesFC } from "@/lib/types";

export default function SiteDossierPage() {
  const { id } = useParams<{ id: string }>();
  const siteId = resolveSiteId(decodeURIComponent(id));
  const { user } = useSession();
  const d = useApi(() => api.getSite(siteId), [siteId]);
  const trend = useApi(() => api.gmwTimeline(siteId), [siteId]);
  // GMW mangrove extent on the map (API-024 tiles, ADR-048): on by default at the latest year; the trend
  // card's year buttons pick another year or turn it off. undefined = not chosen yet.
  const gmw = useGmwLayers();
  const tileYears = gmw.years;
  // Always the latest GMW year (2025); no year picker (ADR-057).
  const layerYear = tileYears.at(-1) ?? null;
  // Extent only; gain and loss are switched on from the national card on the map pages (ADR-057).
  const mangrove = layerYear === null ? null : { extentYear: layerYear, change: null, opacity: 1 };
  const [view3d, setView3d] = useState(false);
  // A satellite refresh (API-007) adds one item and new answers without reloading the page.
  const [fresh, setFresh] = useState<{ answers: Answer[]; added: Evidence[] } | null>(null);

  if (d.loading) return <Loading what="Loading site" />;
  if (d.error) return <ErrorBox error={d.error} onRetry={d.reload} />;
  if (!d.data) return null;
  const { site } = d.data;
  const answers = fresh?.answers ?? d.data.answers;
  const evidence = [...(fresh?.added ?? []), ...d.data.evidence];
  const fc: SitesFC = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: site.geometry, properties: { id: site.id, name: site.name, region: site.region, is_demo: site.is_demo, area: site.area } }],
  };
  // Usable sources across the three questions (sum of EQ-013 counts).
  const sources: Measure = { value: answers.reduce((s, a) => s + a.source_count.value, 0), unit: "items", eq_id: "EQ-013", confidence: "high" };
  const letter = siteLetter(site.id);
  const groups = (["ground", "current", "history", "work", "outcome"] as const)
    .map((q) => ({ q, items: evidence.filter((e) => e.question === q) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="dossier">
      <p className="meta">
        <Link href="/sites">← Candidate sites</Link>
      </p>
      <span className="mg-eyebrow">
        Site{letter ? ` ${letter}` : ""} · {site.region} <DemoLabel show={site.is_demo} /> <RealCaseLabel show={!site.is_demo} />
      </span>
      <div className="page-head">
        <h1>{site.name}</h1>
        <div className="row">
          {user?.role === "funder" && (
            <Link className="mg-btn mg-btn--primary" href={`/sites/${site.id}/lock`}>
              <Lock {...ICON_PROPS} size={18} /> Lock a promise
            </Link>
          )}
          {user && (
            <Link className="mg-btn mg-btn--secondary" href={`/evidence/new?site=${site.id}`}>
              <Plus {...ICON_PROPS} size={18} /> Add evidence
            </Link>
          )}
          {!user && (
            <Link className="mg-btn mg-btn--secondary" href={`/sign-in?next=/sites/${site.id}`}>
              Sign in to act
            </Link>
          )}
        </div>
      </div>
      {site.proposal_summary && <p className="lede">{site.proposal_summary}</p>}

      <div className="dossier-top">
        <div className="stack">
          <div className="stats stats--2">
            <StatTile icon={<BrandIcon name="baseline" />} label="Site area" m={site.area} />
            <StatTile icon={<BrandIcon name="evidence-trace" />} label="Usable sources" m={sources} />
          </div>
          <section className="mg-card">
            <div className="card-head">
              <h2>Three questions</h2>
            </div>
            <SatelliteRefresh
              siteId={site.id}
              onResult={(r) => setFresh((f) => ({ answers: r.answers, added: [r.evidence, ...(f?.added ?? [])] }))}
            />
            <div className="answers-list">
              {answers.map((a) => (
                <AnswerBlock key={a.question} a={a} evidence={evidence} siteId={site.id} />
              ))}
            </div>
          </section>
          {trend.error && <p className="mg-alert">Global Mangrove Watch did not respond. Try again later.</p>}
          {trend.data && (
            <SiteTrendCard t={trend.data} layerYears={[]} layerYear={layerYear} onLayerYear={() => {}} />
          )}
        </div>
        <div className="dossier-mapbox">
          {view3d ? (
            <Site3DView
              className="dossier-map"
              geometry={site.geometry}
              tone={toneFromAnswers(answers.map((a) => a.status))}
              motion="flyin"
              label={`3D view of ${site.name}`}
              fallback={<Map sites={fc} fitToSites basemap="satellite" mangrove={mangrove} className="map dossier-map" />}
            />
          ) : (
            <Map sites={fc} fitToSites basemap="satellite" mangrove={mangrove} className="map dossier-map" />
          )}
          <div className="dossier-map-toggle" role="group" aria-label="Map view">
            <button type="button" className="gmw-year" aria-pressed={!view3d} onClick={() => setView3d(false)}>
              Map
            </button>
            <button type="button" className="gmw-year" aria-pressed={view3d} onClick={() => setView3d(true)}>
              3D
            </button>
          </div>
        </div>
      </div>

      <h2 className="section-title">
        <BrandIcon name="evidence-trace" /> Evidence <span className="count">{evidence.length}</span>
      </h2>
      {evidence.length === 0 ? (
        <EmptyArt icon={<BrandIcon name="field-observation" size={32} />} title="No evidence yet.">
          Field partners can add the first item.
        </EmptyArt>
      ) : (
        groups.map((g) => (
          <section key={g.q} className="evidence-group">
            <h3 className="group-title">
              <QuestionIcon q={g.q} size={20} /> {QUESTION_LABELS[g.q]}
            </h3>
            <div className="evidence-grid">
              {g.items.map((e) => (
                <EvidenceCard key={e.id} e={e} siteName={site.name} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
