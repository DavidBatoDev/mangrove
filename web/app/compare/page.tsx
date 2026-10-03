"use client";

// Compare (US-004): sites as columns, the three questions as rows, a status chip in every cell
// (docs/design.md §5, brand mg-table). In the order requested; not a ranking.

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  DemoLabel,
  ErrorBox,
  Loading,
  MeasureText,
  StatusBadge,
} from "@/components/ui";
import { ICON_PROPS, IconBadge, QuestionIcon } from "@/components/visual";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { findingLabel, unitWord } from "@/lib/format";
import { resolveSiteId, siteLetter } from "@/lib/ids";
import type {
  Answer,
  CompareResponse,
  Evidence,
  GmwTimeline,
  Question,
} from "@/lib/types";

const QUESTIONS: { q: Question; label: string }[] = [
  { q: "history", label: "Was this mangrove before?" },
  { q: "current", label: "What's there now?" },
  { q: "ground", label: "What do people on the ground say?" },
];

function Cell({
  a,
  evidence,
  siteId,
}: {
  a?: Answer;
  evidence?: Evidence[];
  siteId: string;
}) {
  if (!a) return <td>—</td>;
  const disagree =
    a.status === "conflicting" && evidence
      ? evidence.filter((e) => a.evidence_ids.includes(e.id))
      : [];
  return (
    <td className={`cell cell--${a.status}`}>
      <StatusBadge status={a.status} />
      {a.finding && (
        <span className="cell-finding">{findingLabel(a.finding)}</span>
      )}
      {disagree.map((e) => (
        <span key={e.id} className="cell-disagree">
          <a href={`/sites/${siteId}#ev-${e.id}`}>{e.source_name}</a>:{" "}
          <strong>{findingLabel(e.finding)}</strong>
        </span>
      ))}
      <small>
        {a.source_count.value}{" "}
        {a.source_count.value === 1 ? "source" : "sources"} ·{" "}
        {a.source_count.eq_id}
      </small>
    </td>
  );
}

function CompareView() {
  const raw = useSearchParams().get("sites") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(resolveSiteId);
  const key = ids.join(",");
  const valid = ids.length >= 2 && ids.length <= 5;

  const res = useApi(async () => {
    if (!valid) return null;
    const cmp = await api.compare(ids);
    // Name the disagreeing sources: fetch the evidence for sites that have a conflict.
    const evidence: Record<string, Evidence[]> = {};
    await Promise.all(
      cmp.sites
        .filter((s) => s.answers.some((a) => a.status === "conflicting"))
        .map(
          async (s) =>
            (evidence[s.site.id] = (await api.getSite(s.site.id)).evidence),
        ),
    );
    // GMW context per site (API-021); a site without it still compares.
    const trends: Record<string, GmwTimeline | null> = {};
    await Promise.all(
      cmp.sites.map(
        async (s) =>
          (trends[s.site.id] = await api
            .gmwTimeline(s.site.id)
            .catch(() => null)),
      ),
    );
    return { cmp, evidence, trends };
  }, [key]);

  if (!valid)
    return (
      <div className="mg-alert" role="alert">
        <div>
          <strong>Pick between 2 and 5 sites.</strong> This link has{" "}
          {ids.length}. <Link href="/sites">Choose sites</Link>
        </div>
      </div>
    );
  if (res.loading) return <Loading what="Loading comparison" />;
  if (res.error) return <ErrorBox error={res.error} onRetry={res.reload} />;
  if (!res.data) return null;
  const { cmp, evidence, trends } = res.data;

  return (
    <>
      <div className="compare-stats">
        {cmp.sites.map((s) => (
          <SiteStat key={s.site.id} s={s} t={trends[s.site.id]} />
        ))}
      </div>
      <div className="mg-card compare-card">
        <div className="mg-scroll-x">
          <table className="mg-table compare-table">
            <thead>
              <tr>
                <th scope="col">
                  <small>Question</small>
                </th>
                {cmp.sites.map(({ site }) => (
                  <th key={site.id} scope="col">
                    <small>
                      Site {siteLetter(site.id) ?? ""} ·{" "}
                      <MeasureText m={site.area} />
                    </small>
                    <Link href={`/sites/${site.id}`}>{site.name}</Link>
                    <div>
                      <DemoLabel show={site.is_demo} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUESTIONS.map(({ q, label }) => (
                <tr key={q}>
                  <th scope="row">
                    <span className="row-q">
                      <IconBadge tone="tidal">
                        <QuestionIcon q={q} size={20} />
                      </IconBadge>
                      {label}
                    </span>
                  </th>
                  {cmp.sites.map(({ site, answers }) => (
                    <Cell
                      key={site.id}
                      a={answers.find((a) => a.question === q)}
                      evidence={evidence[site.id]}
                      siteId={site.id}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const approx = (v: number, conf: string) =>
  `${conf === "medium" ? "≈ " : ""}${v.toLocaleString("en-US", { maximumFractionDigits: 1 })}`;

/** One stat card per site, like the side panel: headline number, change since the first year, a sparkline. */
function SiteStat({
  s,
  t,
}: {
  s: CompareResponse["sites"][number];
  t: GmwTimeline | null | undefined;
}) {
  const { site, answers } = s;
  const ys = t?.source ? t.years : [];
  const first = ys[0];
  const last = ys[ys.length - 1];
  const delta = first && last ? last.nearby.value - first.nearby.value : null;
  const peak = Math.max(1, ...ys.map((y) => y.nearby.value));
  const W = 240,
    H = 56;
  const line = ys
    .map(
      (y, i) =>
        `${i ? "L" : "M"}${((i / Math.max(1, ys.length - 1)) * W).toFixed(1)},${(H - 4 - (y.nearby.value / peak) * (H - 8)).toFixed(1)}`,
    )
    .join("");
  return (
    <section className="mg-card compare-stat">
      <header>
        <span className="compare-stat-letter">
          {siteLetter(site.id) ?? "·"}
        </span>
        <div>
          <Link href={`/sites/${site.id}`}>{site.name}</Link>
          <div className="meta">
            <MeasureText m={site.area} /> <DemoLabel show={site.is_demo} />
          </div>
        </div>
      </header>
      {last ? (
        <>
          <p className="compare-stat-label">Mangrove nearby, {last.year}</p>
          <p className="compare-stat-num">
            {approx(last.nearby.value, last.nearby.confidence)}{" "}
            <span>{unitWord(last.nearby.unit)}</span>
          </p>
          {delta !== null && (
            <p
              className={`compare-stat-delta ${delta >= 0 ? "is-up" : "is-down"}`}
            >
              {delta >= 0 ? "▲ +" : "▼ −"}
              {Math.abs(delta).toLocaleString("en-US", {
                maximumFractionDigits: 1,
              })}{" "}
              {unitWord(last.nearby.unit)} since {first.year}
            </p>
          )}
          <svg
            className="compare-spark"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Mangrove nearby ${first.year}–${last.year}`}
          >
            <path
              d={`${line}L${W},${H}L0,${H}Z`}
              className="compare-spark-area"
            />
            <path d={line} className="compare-spark-line" />
          </svg>
          <p className="compare-stat-foot mg-mono">
            Inside site {approx(last.inside.value, last.inside.confidence)}{" "}
            {unitWord(last.inside.unit)} · {last.nearby.eq_id} · GMW {t?.source?.version}
          </p>
        </>
      ) : (
        <p className="meta">
          Global Mangrove Watch is not ingested for this site yet.
        </p>
      )}
      <ul className="compare-stat-answers">
        {QUESTIONS.map(({ q, label }) => {
          const a = answers.find((x) => x.question === q);
          return (
            <li key={q}>
              <QuestionIcon q={q} size={16} /> <span>{label}</span>{" "}
              {a ? <StatusBadge status={a.status} /> : "—"}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ComparePage() {
  return (
    <>
      <span className="mg-eyebrow">
        <ArrowLeftRight {...ICON_PROPS} size={14} /> Compare
      </span>
      <h1>What the sources say, side by side</h1>
      <p className="lede">
        Each cell shows whether the sources agree, and on what. It is not a
        ranking.
      </p>
      <Suspense fallback={<Loading />}>
        <CompareView />
      </Suspense>
    </>
  );
}
