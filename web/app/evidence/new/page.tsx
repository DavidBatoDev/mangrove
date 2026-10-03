"use client";

import { Check, FileUp, Lock, MapPin, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import SubmitterFields, { cleanSubmitter, useSubmitter } from "@/components/SubmitterFields";
import { DemoLabel, ErrorBox, Loading } from "@/components/ui";
import {
  BrandIcon,
  ICON_PROPS,
  IconBadge,
  QuestionIcon,
  SourceIcon,
} from "@/components/visual";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { USE_MOCKS } from "@/lib/api";
import type { ApiError } from "@/lib/api-error";
import {
  FINDINGS_BY_QUESTION,
  findingLabel,
  QUESTION_LABELS,
  ROLE_LABELS,
} from "@/lib/format";
import type { EvidenceInput, EvidenceQuestion } from "@/lib/types";

type Phase = "editing" | "uploading" | "done";

function toPolygon(gj: unknown): GeoJSON.Polygon | null {
  const g = gj as {
    type?: string;
    features?: unknown[];
    geometry?: unknown;
    coordinates?: unknown;
  };
  if (g?.type === "Polygon") return g as GeoJSON.Polygon;
  if (g?.type === "Feature") return toPolygon(g.geometry);
  if (g?.type === "FeatureCollection" && g.features?.length)
    return toPolygon(g.features[0]);
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
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

// Add evidence (US-006, US-010), open to anyone (ADR-061): the submitter types who they are. A funder's "Did the work
// happen?" is a project report (claimed area); everything else is a field observation with a GPS point.
function EvidenceForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [who, setWho] = useSubmitter("resident");
  const pins = useApi(() => api.listRecords(), []);
  const sites = useApi(() => api.listSites(), []);

  const [target, setTarget] = useState(() =>
    params.get("record")
      ? `record:${params.get("record")}`
      : params.get("site")
        ? `site:${params.get("site")}`
        : "",
  );
  const isFunder = who.role === "funder";
  const questions: EvidenceQuestion[] = isFunder
    ? ["work", "outcome", "ground", "history"]
    : ["ground", "work", "outcome", "history"];
  const [question, setQuestion] = useState<EvidenceQuestion>(
    params.get("record") ? "work" : "ground",
  );
  const [finding, setFinding] = useState(
    () => FINDINGS_BY_QUESTION[params.get("record") ? "work" : "ground"][0],
  );
  // Today in the viewer's own time zone (toISOString would give yesterday on a Manila morning).
  const [observedAt, setObservedAt] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [reportedHa, setReportedHa] = useState("");
  const [lon, setLon] = useState("");
  const [lat, setLat] = useState("");
  const [boundary, setBoundary] = useState<GeoJSON.Polygon | null>(null);
  const [boundaryName, setBoundaryName] = useState("");
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("editing");
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Same rule as the API: only a funder's work report is a project report.
  const isReport = isFunder && question === "work";
  const targetLabel = target.startsWith("record:")
    ? pins.data?.features.find((f) => f.properties.id === target.slice(7))
        ?.properties.site_name
    : sites.data?.features.find((f) => f.properties.id === target.slice(5))
        ?.properties.name;

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
    if (!target)
      return setError("Pick the site or record this evidence is about.");
    if (!finding) return setError("Pick a finding.");
    if (!who.name.trim()) return setError("Add your name under About you.");
    if (isReport && !(Number(reportedHa) > 0))
      return setError("Enter the reported area in hectares.");
    if (!isReport && !(lon && lat))
      return setError(
        "Field evidence needs the GPS point where it was observed.",
      );

    const input: EvidenceInput = {
      question: question as EvidenceInput["question"],
      finding,
      observed_at: observedAt,
      ...(target.startsWith("record:")
        ? { record_id: target.slice(7) }
        : { site_id: target.slice(5) }),
      ...(isReport && reportedHa
        ? { reported_area_ha: Number(reportedHa) }
        : {}),
      ...(!isReport
        ? {
            point: {
              type: "Point",
              coordinates: [Number(lon), Number(lat)],
            } as GeoJSON.Point,
          }
        : {}),
      ...(boundary ? { boundary } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      submitter: cleanSubmitter(who),
    };
    setPhase("uploading");
    try {
      await api.submitEvidence(input);
      setResultUrl(
        input.record_id
          ? `/records/${input.record_id}`
          : `/sites/${input.site_id}`,
      );
      setPhase("done");
    } catch (err) {
      setError(
        (err as ApiError).message ||
          "Could not save. Nothing was added; try again.",
      );
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
        <p className="meta">
          It is now part of the public history and cannot be removed.
        </p>
        <div className="row">
          <button
            className="mg-btn mg-btn--primary"
            type="button"
            onClick={() => router.push(resultUrl)}
          >
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
            }}
          >
            Add more
          </button>
        </div>
      </div>
    );

  return (
    <div className="ev-layout">
      <form className="form ev-form" onSubmit={onSubmit} noValidate>
        <div className="role-banner">
          <IconBadge tone="root">
            <SourceIcon type={isReport ? "project_report" : "field"} />
          </IconBadge>
          <div>
            <span className="mg-eyebrow" style={{ margin: 0 }}>
              {isReport ? "Project report" : "Field evidence"}
            </span>
            <strong>{who.name.trim() ? `${who.organisation?.trim() || who.name.trim()} · ${ROLE_LABELS[who.role]}` : ROLE_LABELS[who.role]}</strong>
          </div>
        </div>
        <SubmitterFields value={who} onChange={setWho} />
        {error && (
          <p className="mg-alert" role="alert">
            {error}
          </p>
        )}
        {(pins.error || sites.error) && (
          <ErrorBox
            error={pins.error ?? sites.error}
            onRetry={() => (pins.reload(), sites.reload())}
          />
        )}

        <fieldset className="mg-card form-section">
          <legend className="card-head">
            <span className="ev-step">1</span>
            <span>What you observed</span>
          </legend>
          <div className="field">
            <label htmlFor="target">About</label>
            <select
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Choose a record or site…</option>
              {pins.data && pins.data.features.length > 0 && (
                <optgroup label="Published records">
                  {pins.data.features.map((f) => (
                    <option
                      key={f.properties.id}
                      value={`record:${f.properties.id}`}
                    >
                      Record: {f.properties.site_name}
                      {f.properties.is_demo ? " (Demo data)" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {sites.data && (
                <optgroup label="Candidate sites">
                  {sites.data.features.map((f) => (
                    <option
                      key={f.properties.id}
                      value={`site:${f.properties.id}`}
                    >
                      Site: {f.properties.name}
                      {f.properties.is_demo ? " (Demo data)" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="field">
            <span className="field-label">Question</span>
            <div className="ev-qcards" role="radiogroup" aria-label="Question">
              {questions.map((q) => (
                <label
                  key={q}
                  className={`ev-qcard${q === question ? " is-on" : ""}`}
                >
                  <input
                    type="radio"
                    name="question"
                    value={q}
                    checked={q === question}
                    onChange={() => {
                      setQuestion(q);
                      setFinding(FINDINGS_BY_QUESTION[q]?.[0] ?? ""); // keep the finding inside the question's vocabulary
                    }}
                  />
                  <QuestionIcon q={q} size={22} />
                  <span>{QUESTION_LABELS[q]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Finding</span>
            <div className="ev-chips" role="radiogroup" aria-label="Finding">
              {(FINDINGS_BY_QUESTION[question] ?? []).map((f) => (
                <label
                  key={f}
                  className={`ev-chip${f === finding ? " is-on" : ""}`}
                >
                  <input
                    type="radio"
                    name="finding"
                    value={f}
                    checked={f === finding}
                    onChange={() => setFinding(f)}
                  />
                  {f === finding && <Check {...ICON_PROPS} size={14} />}
                  {findingLabel(f)}
                </label>
              ))}
            </div>
          </div>

          <div className="field ev-date">
            <label htmlFor="observed_at">Observed on</label>
            <input
              id="observed_at"
              type="date"
              value={observedAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setObservedAt(e.target.value)}
            />
          </div>

          {isReport && (
            <div className="field">
              <label htmlFor="reported">Reported area, hectares</label>
              <input
                id="reported"
                type="number"
                min="0"
                step="0.1"
                value={reportedHa}
                onChange={(e) => setReportedHa(e.target.value)}
              />
              <span className="hint">
                The area the project report says was worked.
              </span>
            </div>
          )}
        </fieldset>

        <fieldset className="mg-card form-section">
          <legend className="card-head">
            <span className="ev-step">2</span>
            <span>Where, and what you can attach</span>
          </legend>
          {!isReport && (
            <div className="field">
              <span className="field-label">
                <MapPin {...ICON_PROPS} size={14} /> GPS point where observed
              </span>
              <div className="ev-gps">
                <input
                  aria-label="Longitude"
                  placeholder="Longitude"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                />
                <input
                  aria-label="Latitude"
                  placeholder="Latitude"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
                <button
                  className="mg-btn mg-btn--secondary"
                  type="button"
                  onClick={useSiteCentre}
                >
                  Use site centre
                </button>
              </div>
            </div>
          )}

          <div className="field">
            <span className="field-label">
              Mapped boundary (GeoJSON polygon, optional)
            </span>
            <div className="ev-drop-row">
              <label
                className={`ev-drop${boundary ? " is-set" : ""}`}
                htmlFor="boundary"
              >
                <FileUp {...ICON_PROPS} size={22} />
                <span>
                  <strong>{boundaryName || "Choose a GeoJSON file"}</strong>
                  <small>.geojson or .json · one polygon</small>
                </span>
                <input
                  id="boundary"
                  type="file"
                  accept=".geojson,.json,application/geo+json,application/json"
                  onChange={(e) => onBoundaryFile(e.target.files?.[0])}
                />
              </label>
              {USE_MOCKS && (
                <button
                  className="mg-btn mg-btn--secondary"
                  type="button"
                  onClick={useDemoBoundary}
                >
                  Use demo boundary for site B
                </button>
              )}
            </div>
            <span className="hint">
              The worked area is computed from this outline (EQ-010).
            </span>
          </div>

          <div className="field">
            <label htmlFor="note">Note (optional)</label>
            <textarea
              id="note"
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <span className="hint">
              Describe the site, not people. No names or contact details.
            </span>
          </div>
        </fieldset>

        <div className="row">
          <button
            className="mg-btn mg-btn--primary"
            type="submit"
            disabled={phase === "uploading"}
          >
            {phase === "uploading" ? "Saving…" : "Add evidence"}
          </button>
        </div>
      </form>
      <EvidenceSummary
        target={targetLabel}
        question={QUESTION_LABELS[question]}
        q={question}
        finding={finding ? findingLabel(finding) : "—"}
        observedAt={observedAt}
        checks={[
          { label: "Site or record", ok: !!target },
          { label: "Your name", ok: !!who.name.trim() },
          ...(isReport ? [] : [{ label: "GPS point", ok: !!(lon && lat) }]),
          ...(isReport
            ? [{ label: "Reported area", ok: Number(reportedHa) > 0 }]
            : []),
          { label: "Boundary (optional)", ok: !!boundary },
        ]}
        demo={!!sites.data?.features.find((f) => f.properties.id === target.slice(5))?.properties.is_demo}
      />
    </div>
  );
}

/** Live preview of the entry that will be appended, with a readiness checklist. */
function EvidenceSummary({
  target,
  question,
  q,
  finding,
  observedAt,
  checks,
  demo,
}: {
  target?: string;
  question: string;
  q: EvidenceQuestion;
  finding: string;
  observedAt: string;
  checks: { label: string; ok: boolean }[];
  demo: boolean;
}) {
  return (
    <aside className="mg-card ev-summary" aria-label="What will be published">
      <span className="mg-eyebrow" style={{ margin: 0 }}>
        What will be published
      </span>
      <div className="ev-summary-head">
        <IconBadge tone="root">
          <QuestionIcon q={q} size={20} />
        </IconBadge>
        <div>
          <small>{question}</small>
          <strong>{finding}</strong>
        </div>
      </div>
      <dl className="ev-summary-dl">
        <dt>About</dt>
        <dd>{target ?? "Not chosen yet"}</dd>
        <dt>Observed</dt>
        <dd className="mg-mono">{observedAt}</dd>
      </dl>
      <ul className="ev-checks">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? "is-ok" : undefined}>
            <span className="ev-check-dot">
              {c.ok && <Check {...ICON_PROPS} size={12} />}
            </span>
            {c.label}
          </li>
        ))}
      </ul>
      <p className="ev-lock">
        <Lock {...ICON_PROPS} size={14} /> Append-only: once added, it cannot be
        edited or removed.
      </p>
      <DemoLabel show={demo} />
    </aside>
  );
}

export default function NewEvidencePage() {
  return (
    <>
      <span className="mg-eyebrow">
        <Plus {...ICON_PROPS} size={14} /> Add evidence
      </span>
      <h1>Add what you saw</h1>
      <p className="lede">
        Evidence is appended to the public history. It is never edited or
        removed.
      </p>
      <Suspense fallback={<Loading />}>
        <EvidenceForm />
      </Suspense>
    </>
  );
}
