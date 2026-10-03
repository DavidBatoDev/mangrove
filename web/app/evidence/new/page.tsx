"use client";

import { MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useSession } from "@/components/session";
import { DemoLabel, ErrorBox, Loading } from "@/components/ui";
import { BrandIcon, ICON_PROPS, IconBadge, SourceIcon } from "@/components/visual";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { USE_MOCKS } from "@/lib/api";
import type { ApiError } from "@/lib/api-error";
import { FINDINGS_BY_QUESTION, findingLabel, QUESTION_LABELS } from "@/lib/format";
import type { EvidenceInput, EvidenceQuestion } from "@/lib/types";

type Phase = "editing" | "uploading" | "done";

function toPolygon(gj: unknown): GeoJSON.Polygon | null {
  const g = gj as { type?: string; features?: unknown[]; geometry?: unknown; coordinates?: unknown };
  if (g?.type === "Polygon") return g as GeoJSON.Polygon;
  if (g?.type === "Feature") return toPolygon(g.geometry);
  if (g?.type === "FeatureCollection" && g.features?.length) return toPolygon(g.features[0]);
  return null;
}

function centroidOf(geom: GeoJSON.Geometry): [number, number] | null {
  const pts: number[][] = [];
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") pts.push(c as number[]);
    else if (Array.isArray(c)) c.forEach(visit);
  };
  if ("coordinates" in geom) visit(geom.coordinates);
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

// Submit evidence (US-006, US-010): a funder adds a project report, a partner adds field evidence.
function EvidenceForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready } = useSession();
  const pins = useApi(() => api.listRecords(), []);
  const sites = useApi(() => api.listSites(), []);

  const [target, setTarget] = useState(() =>
    params.get("record") ? `record:${params.get("record")}` : params.get("site") ? `site:${params.get("site")}` : "",
  );
  const isFunder = user?.role === "funder";
  const questions: EvidenceQuestion[] = isFunder ? ["work", "outcome", "ground", "history"] : ["ground", "work", "outcome", "history"];
  const [question, setQuestion] = useState<EvidenceQuestion>(params.get("record") ? "work" : "ground");
  const [finding, setFinding] = useState(() => FINDINGS_BY_QUESTION[params.get("record") ? "work" : "ground"][0]);
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportedHa, setReportedHa] = useState("");
  const [lon, setLon] = useState("");
  const [lat, setLat] = useState("");
  const [boundary, setBoundary] = useState<GeoJSON.Polygon | null>(null);
  const [boundaryName, setBoundaryName] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("editing");
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  if (!ready) return <Loading />;
  if (!user)
    return (
      <div className="state">
        <p>Sign in as a funder or a partner to add evidence.</p>
        <Link className="mg-btn mg-btn--primary" href={`/sign-in?next=${encodeURIComponent(`/evidence/new?${params.toString()}`)}`}>
          Sign in
        </Link>
      </div>
    );

  async function useSiteCentre() {
    setError(null);
    try {
      let siteId = target.startsWith("site:") ? target.slice(5) : null;
      if (!siteId && target.startsWith("record:")) {
        const rec = await api.getRecord(target.slice(7));
        siteId = (rec.record.snapshot as { site_id?: string }).site_id ?? null;
      }
      if (!siteId) return setError("Pick a site or record first.");
      const c = centroidOf((await api.getSite(siteId)).site.geometry);
      if (c) {
        setLon(c[0].toFixed(5));
        setLat(c[1].toFixed(5));
      }
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  async function onBoundaryFile(file: File | undefined) {
    if (!file) return;
    try {
      const poly = toPolygon(JSON.parse(await file.text()));
      if (!poly) throw new Error();
      setBoundary(poly);
      setBoundaryName(file.name);
    } catch {
      setError("That file is not a GeoJSON polygon.");
    }
  }

  async function useDemoBoundary() {
    setBoundary(toPolygon(await api.demoBoundary()));
    setBoundaryName("B-mapped-boundary-5ha.geojson (demo)");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!target) return setError("Pick the site or record this evidence is about.");
    if (!finding) return setError("Pick a finding.");
    if (isFunder && question === "work" && !(Number(reportedHa) > 0)) return setError("Enter the reported area in ha.");
    if (!isFunder && !(lon && lat)) return setError("Field evidence needs the GPS point where it was observed.");
    if (photo && photo.size > 10 * 1024 * 1024) return setError("The photo is over 10 MB.");

    const input: EvidenceInput = {
      source_type: isFunder ? "project_report" : "field",
      question,
      finding,
      observed_at: observedAt,
      ...(target.startsWith("record:") ? { record_id: target.slice(7) } : { site_id: target.slice(5) }),
      ...(isFunder && reportedHa ? { reported_area_ha: Number(reportedHa) } : {}),
      ...(!isFunder ? { point: { type: "Point", coordinates: [Number(lon), Number(lat)] } as GeoJSON.Point } : {}),
      ...(boundary ? { boundary } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(photo ? { photo } : {}),
    };
    setPhase("uploading");
    try {
      await api.submitEvidence(input);
      setResultUrl(input.record_id ? `/records/${input.record_id}` : `/sites/${input.site_id}`);
      setPhase("done");
    } catch (err) {
      setError((err as ApiError).message || "Could not save. Nothing was added; try again.");
      setPhase("editing");
    }
  }

  if (phase === "done" && resultUrl)
    return (
      <div className="mg-card done-card">
        <IconBadge tone="canopy" size="lg">
          <BrandIcon name="evidence-trace" size={32} />
        </IconBadge>
        <h2>Evidence added</h2>
        <p className="meta">It is now part of the public history and cannot be removed.</p>
        <div className="row">
          <button className="mg-btn mg-btn--primary" type="button" onClick={() => router.push(resultUrl)}>
            See it
          </button>
          <button
            className="mg-btn mg-btn--secondary"
            type="button"
            onClick={() => {
              setPhase("editing");
              setBoundary(null);
              setBoundaryName("");
              setNote("");
              setPhoto(null);
            }}
          >
            Add more
          </button>
        </div>
      </div>
    );

  return (
    <form className="form form--wide" onSubmit={onSubmit} noValidate>
      <div className="role-banner">
        <IconBadge tone="root">
          <SourceIcon type={isFunder ? "project_report" : "field"} />
        </IconBadge>
        <div>
          <span className="mg-eyebrow" style={{ margin: 0 }}>
            {isFunder ? "Project report" : "Field evidence"}
          </span>
          <strong>{user.org.name}</strong> <DemoLabel show={user.org.is_demo} />
        </div>
      </div>
      {error && <p className="mg-alert" role="alert">{error}</p>}
      {(pins.error || sites.error) && <ErrorBox error={pins.error ?? sites.error} onRetry={() => (pins.reload(), sites.reload())} />}

      <fieldset className="mg-card form-section">
        <legend className="card-head">
          <IconBadge>
            <BrandIcon name="field-observation" />
          </IconBadge>
          <span>What you observed</span>
        </legend>
      <div className="field">
        <label htmlFor="target">About</label>
        <select id="target" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Choose a record or site…</option>
          {pins.data && pins.data.features.length > 0 && (
            <optgroup label="Published records">
              {pins.data.features.map((f) => (
                <option key={f.properties.id} value={`record:${f.properties.id}`}>
                  Record: {f.properties.site_name}
                  {f.properties.is_demo ? " (Demo data)" : ""}
                </option>
              ))}
            </optgroup>
          )}
          {sites.data && (
            <optgroup label="Candidate sites">
              {sites.data.features.map((f) => (
                <option key={f.properties.id} value={`site:${f.properties.id}`}>
                  Site: {f.properties.name}
                  {f.properties.is_demo ? " (Demo data)" : ""}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="field-row field-row--3">
        <div className="field">
          <label htmlFor="question">Question</label>
          <select id="question" value={question} onChange={(e) => {
              const q = e.target.value as EvidenceQuestion;
              setQuestion(q);
              setFinding(FINDINGS_BY_QUESTION[q]?.[0] ?? ""); // keep the finding inside the question's vocabulary
            }}>
            {questions.map((q) => (
              <option key={q} value={q}>
                {QUESTION_LABELS[q]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="finding">Finding</label>
          <select id="finding" value={finding} onChange={(e) => setFinding(e.target.value)}>
            {(FINDINGS_BY_QUESTION[question] ?? []).map((f) => (
              <option key={f} value={f}>
                {findingLabel(f)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="observed_at">Observed on</label>
          <input id="observed_at" type="date" value={observedAt} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setObservedAt(e.target.value)} />
        </div>
      </div>

      {isFunder && question === "work" && (
        <div className="field">
          <label htmlFor="reported">Reported area, ha</label>
          <input id="reported" type="number" min="0" step="0.1" value={reportedHa} onChange={(e) => setReportedHa(e.target.value)} />
          <span className="hint">The area the project report says was worked.</span>
        </div>
      )}

      </fieldset>

      <fieldset className="mg-card form-section">
        <legend className="card-head">
          <IconBadge>
            <MapPin {...ICON_PROPS} />
          </IconBadge>
          <span>Where, and what you can attach</span>
        </legend>
      {!isFunder && (
        <div className="field">
          <label>GPS point where observed</label>
          <div className="row">
            <input aria-label="Longitude" placeholder="Longitude" value={lon} onChange={(e) => setLon(e.target.value)} />
            <input aria-label="Latitude" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
            <button className="mg-btn mg-btn--secondary" type="button" onClick={useSiteCentre}>
              Use site centre
            </button>
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="boundary">Mapped boundary (GeoJSON polygon, optional)</label>
        <div className="row">
          <input id="boundary" type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={(e) => onBoundaryFile(e.target.files?.[0])} />
          {USE_MOCKS && (
            <button className="mg-btn mg-btn--secondary" type="button" onClick={useDemoBoundary}>
              Use demo boundary for site B
            </button>
          )}
        </div>
        {boundaryName && <span className="hint">Boundary: {boundaryName}</span>}
        <span className="hint">The worked area is computed from this outline (EQ-010).</span>
      </div>

      <div className="field">
        <label htmlFor="photo">Photo (JPEG or PNG, optional)</label>
        <input id="photo" type="file" accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </div>

      <div className="field">
        <label htmlFor="note">Note (optional)</label>
        <textarea id="note" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        <span className="hint">Describe the site, not people. No names or contact details.</span>
      </div>

      </fieldset>

      <div className="row">
        <button className="mg-btn mg-btn--primary" type="submit" disabled={phase === "uploading"}>
          {phase === "uploading" ? "Saving…" : "Add evidence"}
        </button>
      </div>
    </form>
  );
}

export default function NewEvidencePage() {
  return (
    <>
      <span className="mg-eyebrow">
        <Plus {...ICON_PROPS} size={14} /> Add evidence
      </span>
      <h1>Add what you saw</h1>
      <p className="lede">Evidence is appended to the public history. It is never edited or removed.</p>
      <Suspense fallback={<Loading />}>
        <EvidenceForm />
      </Suspense>
    </>
  );
}
