"use client";

// Record (US-008, US-011, US-012, US-014), laid out like deck slide T07 "Follow-through":
// the promise above the waterline, the two checks below it, then integrity, baseline and timeline.

import { CalendarClock, History, Lock, Plus, ShieldCheck, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AnswerBlock from "@/components/AnswerBlock";
import EvidenceCard from "@/components/EvidenceCard";
import ProgramCard, { ProgramStrip } from "@/components/ProgramCard";
import { SiteNowPictures } from "@/components/SatellitePictures";
import SiteHero3D from "@/components/SiteHero3D";
import { toneFromPin } from "@/components/Site3DView";
import { DemoLabel, Disclaimer, RealCaseLabel, ErrorBox, Loading, PinLabel, StatusBadge } from "@/components/ui";
import { AreaBar, BrandIcon, CheckTimeline, EmptyArt, ICON_PROPS, IconBadge, QuestionIcon, SourceIcon, StatTile } from "@/components/visual";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import type { ApiError } from "@/lib/api-error";
import { ACTION_LABELS, findingLabel, formatDate, formatMeasure, shortHash, snapshotSite } from "@/lib/format";
import type { Check, Evidence, Measure, VerifyResponse } from "@/lib/types";

function WorkCheck({ c, from, evidence }: { c: Check; from: string; evidence: Evidence[] }) {
  const hasAreas = c.reported_area && c.measured_area;
  // When the findings themselves disagree (not only the areas), name each one with its source.
  const items = evidence.filter((e) => c.evidence_ids.includes(e.id));
  const findingsDisagree = c.status === "conflicting" && new Set(items.map((e) => e.finding)).size > 1;
  return (
    <div className="check">
      <div className="check-head">
        <IconBadge tone="root">
          <QuestionIcon q="work" />
        </IconBadge>
        <span className="mg-eyebrow mg-label--observed">{c.label}</span>
      </div>
      {c.measured_area ? (
        <p className="check-figure">{formatMeasure(c.measured_area)} mapped</p>
      ) : c.evidence_ids.length > 0 && c.finding ? (
        <p className="check-figure">{findingLabel(c.finding)}</p>
      ) : (
        <p className="check-figure check-figure--muted">No work evidence yet</p>
      )}
      <div className="status-line">
        <StatusBadge status={c.status as Exclude<Check["status"], "too_early">} />
        {c.finding && <span className="finding">{findingLabel(c.finding)}</span>}
        <span className="source-count mg-mono">
          {c.evidence_ids.length} {c.evidence_ids.length === 1 ? "source" : "sources"}
        </span>
      </div>
      {c.area_conflict?.value === true && hasAreas && (
        <p className="check-note">
          Sources disagree. The project report says {formatMeasure(c.reported_area)}; the partner&apos;s mapped boundary is{" "}
          {formatMeasure(c.measured_area)}. They differ by more than the tolerance{" "}
          <span className="mg-cite">{c.area_conflict.eq_id}</span>.
        </p>
      )}
      {findingsDisagree && (
        <ul className="disagree">
          {items.map((e) => (
            <li key={e.id}>
              {e.source_name} · {formatDate(e.observed_to)}
              <strong>{findingLabel(e.finding)}</strong>
            </li>
          ))}
        </ul>
      )}
      {hasAreas && <AreaBar reported={c.reported_area as Measure} measured={c.measured_area as Measure} />}
      {!c.measured_area && c.status === "missing" && <p className="check-note">Checkable from {formatDate(from)}. Field partners and the funder can add evidence any time.</p>}
    </div>
  );
}

function OutcomeCheck({ c }: { c: Check }) {
  return (
    <div className="check">
      <div className="check-head">
        <IconBadge tone="canopy">
          <QuestionIcon q="outcome" />
        </IconBadge>
        <span className="mg-eyebrow mg-label--observed">{c.label}</span>
      </div>
      <p className="check-figure check-figure--muted">{c.status === "too_early" ? "Too early to tell" : findingLabel(c.finding) || "No evidence yet"}</p>
      <div className="status-line">
        <StatusBadge status={c.status} />
        {c.status !== "too_early" && (
          <span className="source-count mg-mono">
            {c.evidence_ids.length} {c.evidence_ids.length === 1 ? "source" : "sources"}
          </span>
        )}
        {c.checkable_from && (
          <span className="source-count">
            <CalendarClock {...ICON_PROPS} size={16} /> Checkable from {formatDate(c.checkable_from)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RecordPage() {
  const { id } = useParams<{ id: string }>();
  const r = useApi(() => api.getRecord(id), [id]);
  // The real Post-Yolanda records belong to a public program (API-026); its card sits above the promise.
  const program = useApi(() => api.programContext("mbfdp"), []);
  const [verify, setVerify] = useState<VerifyResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (r.loading) return <Loading what="Loading record" />;
  if (r.error) return <ErrorBox error={r.error} onRetry={r.reload} />;
  if (!r.data) return null;
  const { record, checks, site_answers, timeline, pin_state, disclaimer } = r.data;
  const lockedSite = snapshotSite(record);
  const snap = { site_id: lockedSite.id, site_name: lockedSite.name };
  const work = checks.find((c) => c.check === "work");
  const outcome = checks.find((c) => c.check === "outcome");
  // Usable sources behind the three site answers when the promise was locked (sum of EQ-013 counts).
  const baselineSources: Measure = {
    value: site_answers.reduce((s, a) => s + a.source_count.value, 0),
    unit: "items",
    eq_id: "EQ-013",
    confidence: "high",
  };
  const today = new Date().toISOString().slice(0, 10);
  const nextCheck =
    record.work_check_after > today
      ? { date: record.work_check_after, label: "Did the work happen?" }
      : { date: record.outcome_check_after, label: "Did the mangroves come back?" };
  const checksPast = record.outcome_check_after <= today;
  const action = ACTION_LABELS[record.planned_action] ?? record.planned_action;

  async function runVerify() {
    setVerifying(true);
    setVerifyError(null);
    try {
      setVerify(await api.verifyRecord(record.id));
    } catch (e) {
      setVerifyError((e as ApiError).message);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="record">
      <p className="meta">
        <Link href="/">← Public map</Link>
      </p>

      {snap.site_id && <SiteHero3D siteId={snap.site_id} tone={toneFromPin(pin_state)} motion="orbit" />}

      {/* The promise leads the page; the program it belongs to is one line here and the full card below the checks. */}
      {program.data?.record_ids.includes(record.id) && <ProgramStrip p={program.data} />}

      {/* Above the waterline: the promise */}
      <span className="mg-eyebrow">
        Record · {snap.site_name ?? "Site"} <DemoLabel show={record.funder.is_demo} /> <RealCaseLabel show={!record.is_demo} />
      </span>
      {!record.is_demo && (
        <p className="meta">
          Reconstructed {formatDate(record.published_at)} from cited public reports. Not locked before the money moved.
        </p>
      )}
      <div className="record-hero">
        <div>
          <span className="mg-eyebrow mg-label--promise">
            {record.is_demo || record.locked_by ? (
              <>
                <Lock {...ICON_PROPS} size={14} /> Promise · locked {formatDate(record.published_at)} by {record.funder.name}
                {record.locked_by && record.locked_by.name !== record.funder.name ? ` (${record.locked_by.name})` : ""}
              </>
            ) : (
              <>
                <FileText {...ICON_PROPS} size={14} /> Promise of {record.funder.name} · reconstructed {formatDate(record.published_at)}
              </>
            )}
          </span>
          <h1 className="record-title">
            {formatMeasure(record.planned_area_ha)} of <em>{action.toLowerCase()}</em>
          </h1>
          <p className="record-detail">{record.planned_action_detail}</p>
        </div>
        <div className="record-pin">
          <span className="mg-eyebrow">On the map</span>
          <PinLabel state={pin_state} />
        </div>
      </div>

      <div className="stats">
        <StatTile icon={<BrandIcon name="promise" />} label="Planned area" m={record.planned_area_ha} />
        <StatTile icon={<QuestionIcon q="outcome" />} label="Expected vegetated" m={record.expected_vegetated_ha} />
        <StatTile icon={<BrandIcon name="baseline" />} label="Sources at lock" m={baselineSources} />
        <StatTile icon={<CalendarClock {...ICON_PROPS} />} label={checksPast ? "Outcome check was due" : "Next check"} value={formatDate(nextCheck.date)} note={nextCheck.label} />
      </div>

      <CheckTimeline
        lockedAt={record.published_at}
        lockLabel={record.is_demo ? "Promise locked" : "Reconstructed"}
        workAfter={record.work_check_after}
        outcomeAfter={record.outcome_check_after}
      />

      <hr className="mg-waterline" />

      {/* Below the waterline: what was observed */}
      <div className="mg-split checks">
        {work && (
          <WorkCheck c={work} from={record.work_check_after} evidence={timeline.flatMap((t) => (t.evidence ? [t.evidence] : []))} />
        )}
        {outcome && <OutcomeCheck c={outcome} />}
      </div>
      <p style={{ marginTop: "var(--mg-space-5)" }}>
        <Link className="mg-btn mg-btn--secondary" href={`/evidence/new?record=${record.id}`}>
          <Plus {...ICON_PROPS} size={18} /> Add evidence to this record
        </Link>
      </p>

      {program.data?.record_ids.includes(record.id) && <ProgramCard p={program.data} />}

      <div className="record-grid">
        <section className="mg-card">
          <div className="card-head">
            <IconBadge>
              <BrandIcon name="promise" />
            </IconBadge>
            <h2>The promise in full</h2>
          </div>
          <dl className="kv">
            <dt>Why this site</dt>
            <dd>{record.rationale}</dd>
            <dt>Expected outcome</dt>
            <dd>{record.expected_outcome}</dd>
            <dt>Not known yet</dt>
            <dd>{record.known_unknowns}</dd>
          </dl>
        </section>

        <section className="mg-card">
          <div className="card-head">
            <IconBadge tone="canopy">
              <ShieldCheck {...ICON_PROPS} />
            </IconBadge>
            <h2>Integrity</h2>
          </div>
          <p className="meta" style={{ marginTop: 0 }}>
            The record cannot be edited through AIDE-M. Any change to it would break this published hash.
          </p>
          <div className="hash" title={record.content_hash}>
            <span className="mg-mono">{shortHash(record.content_hash)}</span>
            <span className="mg-cite">EQ-011</span>
          </div>
          <div className="row" style={{ marginTop: "var(--mg-space-3)" }}>
            <button className="mg-btn mg-btn--primary" type="button" onClick={runVerify} disabled={verifying}>
              <ShieldCheck {...ICON_PROPS} size={18} /> {verifying ? "Checking…" : "Verify the hash"}
            </button>
            {verify &&
              (verify.intact ? (
                <span className="verify-ok">
                  Intact · record + {verify.events_checked} {verify.events_checked === 1 ? "event" : "events"} match
                </span>
              ) : (
                <span className="mg-chip mg-chip--conflicting">
                  Does not match at {verify.first_mismatch_seq === 0 ? "the record itself" : `event ${verify.first_mismatch_seq}`}
                </span>
              ))}
            {verifyError && <span role="alert">{verifyError}</span>}
          </div>
        </section>
      </div>

      <section className="mg-card" style={{ marginTop: "var(--mg-space-5)" }}>
        <div className="card-head">
          <IconBadge>
            <BrandIcon name="baseline" />
          </IconBadge>
          <h2>Baseline at lock</h2>
          {snap.site_id && (
            <Link className="card-head-link" href={`/sites/${snap.site_id}`}>
              Open the site dossier →
            </Link>
          )}
        </div>
        <div className="answers-grid">
          {site_answers.map((a) => (
            <AnswerBlock key={a.question} a={a} siteId={snap.site_id ?? ""} />
          ))}
        </div>
        {snap.site_id && <SiteNowPictures siteId={snap.site_id} siteName={snap.site_name} />}
      </section>

      <h2 className="section-title">
        <History {...ICON_PROPS} /> Timeline
      </h2>
      {timeline.length === 0 ? (
        <EmptyArt icon={<BrandIcon name="evidence-trace" size={32} />} title="No evidence added since the promise was published.">
          Field partners and the funder can add the first item.
        </EmptyArt>
      ) : (
        <ol className="timeline">
          {timeline.map((t) => (
            <li key={t.seq}>
              <span className="timeline-dot">{t.evidence ? <SourceIcon type={t.evidence.source_type} size={16} /> : null}</span>
              <div className="meta">
                <span className="mg-mono">#{t.seq}</span> · {t.kind.replaceAll("_", " ")} · {formatDate(t.created_at)} ·{" "}
                <span className="mg-mono">{t.event_hash.slice(0, 12)}…</span>
              </div>
              {t.evidence && <EvidenceCard e={t.evidence} siteName={snap.site_name} />}
            </li>
          ))}
        </ol>
      )}

      <Disclaimer text={disclaimer} />
    </div>
  );
}
