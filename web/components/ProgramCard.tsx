"use client";

// The public funding program behind the real records (API-026): the ₱1 billion Post-Yolanda MBFDP.
// Every figure is quoted as published (EQ-017, low confidence, DS-009) with a link to its source and the
// exact sentence on hover. Comparisons are a table; nothing here is red (no conflict is claimed).

import { Banknote, CircleDashed, Coins, ExternalLink, MapPin, Percent, Sprout } from "lucide-react";
import Link from "next/link";
import { ConfidenceMark, RealCaseLabel } from "@/components/ui";
import { BrandIcon, ICON_PROPS } from "@/components/visual";
import { formatDate } from "@/lib/format";
import type { PinsFC, ProgramContext, ProgramSource, QuotedFigure } from "@/lib/types";

const num = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** ₱ figures read as the sources write them: ₱1 billion, ₱400 million, ₱16,500/ha. */
export function formatQuoted(f: Pick<QuotedFigure, "value" | "unit" | "upper">): string {
  const v = f.value;
  if (f.unit === "PHP" || f.unit === "PHP/ha") {
    const peso = v >= 1e9 ? `₱${num(v / 1e9)} billion` : v >= 1e6 ? `₱${num(v / 1e6)} million` : `₱${num(v)}`;
    return f.unit === "PHP/ha" ? `${peso}/ha` : peso;
  }
  const value = f.upper != null ? `${num(v)}–${num(f.upper)}` : num(v);
  return f.unit === "%" ? `${value}%` : `${value} ${f.unit}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2015-02-05" → 5 Feb 2015, "2015-03" → Mar 2015, "2016-02/2016-05" → Feb–May 2016, "2014" → 2014. */
export function formatAsOf(s: string | null | undefined): string {
  if (!s) return "date not shown";
  if (s.includes("/")) {
    const [a, b] = s.split("/");
    const [ya, yb] = [a.slice(0, 4), b.slice(0, 4)];
    return ya === yb ? `${MONTHS[+a.slice(5, 7) - 1]}–${formatAsOf(b)}` : `${formatAsOf(a)}–${formatAsOf(b)}`;
  }
  if (s.length === 10) return formatDate(s);
  if (s.length === 7) return `${MONTHS[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
  return s;
}

const shortFunder = (funder: string) => funder.match(/\(([^)]+)\)/)?.[1] ?? funder;

/** "₱1 billion · DENR · Post-Yolanda MBFDP" */
export function programTitle(p: ProgramContext): string {
  const allocation = p.facts.find((f) => f.id === "allocation");
  return [allocation && formatQuoted(allocation), shortFunder(p.funder), p.short_name].filter(Boolean).join(" · ");
}

/** Source link: publisher · date, opening the cited page. The exact quoted sentence is the tooltip. */
function SourceLink({ source, quote }: { source: ProgramSource; quote?: string }) {
  return (
    <a className="mg-cite program-source" href={source.url} target="_blank" rel="noreferrer" title={quote ? `“${quote}” (${source.case_study_ref})` : source.case_study_ref}>
      {source.publisher}
      {source.date ? ` · ${formatDate(source.date)}` : ""} <ExternalLink {...ICON_PROPS} size={12} />
    </a>
  );
}

/** EQ-017 · ◔ Low · as published */
function QuotedMeta({ f }: { f: QuotedFigure }) {
  return (
    <>
      <span className="mg-mono">{f.eq_id}</span>
      <ConfidenceMark level={f.confidence} />
      <span className="mg-mono">as published</span>
    </>
  );
}

const TILE_ICONS: Record<string, React.ReactNode> = {
  first_release: <Banknote {...ICON_PROPS} />,
  planted: <Sprout {...ICON_PROPS} />,
  eastern_visayas: <MapPin {...ICON_PROPS} />,
  unit_cost: <Coins {...ICON_PROPS} />,
  survival_denr: <Percent {...ICON_PROPS} />,
};

function QuotedTile({ f }: { f: QuotedFigure }) {
  return (
    <div className="stat program-stat">
      <span className="stat-icon">{TILE_ICONS[f.id] ?? <BrandIcon name="evidence-trace" />}</span>
      <span className="stat-label">{f.label}</span>
      <span className="stat-value" title={`“${f.quote}”`}>
        {formatQuoted(f)}
      </span>
      <span className="stat-meta">
        <QuotedMeta f={f} />
      </span>
      <span className="stat-meta program-stat-src">
        <span>{formatAsOf(f.as_of)}</span>
        <SourceLink source={f.source} quote={f.quote} />
      </span>
      {f.limitation && <span className="program-stat-note">{f.limitation}</span>}
    </div>
  );
}

/** Need vs targets vs reported, one row each, bars on one scale (BRAND.md §0: comparisons are tables). */
function TargetTable({ rows }: { rows: QuotedFigure[] }) {
  const max = Math.max(...rows.map((r) => r.upper ?? r.value));
  return (
    <table className="mg-table program-table">
      <thead>
        <tr>
          <th scope="col">Hectares</th>
          <th scope="col">When</th>
          <th scope="col" aria-hidden="true" className="program-bar-col" />
          <th scope="col">Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <th scope="row">
              <span className="program-row-label">{r.label}</span>
              <strong className="program-row-value">{formatQuoted(r)}</strong>
            </th>
            <td className="mg-mono">{formatAsOf(r.as_of)}</td>
            <td className="program-bar-col">
              <span className={`program-bar program-bar--${r.id === "need_independent" ? "need" : r.id === "planted" ? "planted" : "target"}`} style={{ width: `${Math.max(0.6, ((r.upper ?? r.value) / max) * 100)}%` }} />
            </td>
            <td>
              <SourceLink source={r.source} quote={r.quote} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Full card for the record page of a record that belongs to the program. */
export default function ProgramCard({ p }: { p: ProgramContext }) {
  const allocation = p.facts.find((f) => f.id === "allocation");
  const tiles = p.facts.filter((f) => f.id !== "allocation" && f.id !== "need_independent");
  const need = p.facts.find((f) => f.id === "need_independent");
  const planted = p.facts.find((f) => f.id === "planted");
  const scale = [need, ...p.target_history, planted].filter((f): f is QuotedFigure => !!f);

  return (
    <section className="mg-card program-card" aria-label={p.name}>
      <div className="program-head">
        <span className="mg-eyebrow">
          Program <RealCaseLabel />
        </span>
        <h2 className="program-title" title={p.name}>
          {programTitle(p)}
        </h2>
        {allocation && (
          <span className="stat-meta">
            <QuotedMeta f={allocation} />
            <span>{formatAsOf(allocation.as_of)}</span>
            <SourceLink source={allocation.source} quote={allocation.quote} />
          </span>
        )}
      </div>

      <div className="stats program-stats">
        {tiles.map((f) => (
          <QuotedTile key={f.id} f={f} />
        ))}
      </div>

      <h3 className="program-sub">Need, targets and reported planting</h3>
      <TargetTable rows={scale} />

      <hr className="mg-waterline" />

      <p className="program-framing">{p.framing.line}</p>
      <ul className="program-proof">
        {p.framing.proof.map((q) => (
          <li key={q.quote}>
            <span>{q.quote.replace(/\s*\[\d+\]\.?$/, ".")}</span> <SourceLink source={q.source} quote={q.quote} />
          </li>
        ))}
      </ul>

      <h3 className="program-sub">Not found in any public source</h3>
      <ul className="program-missing">
        {p.not_found.map((item) => (
          <li key={item}>
            <CircleDashed {...ICON_PROPS} size={16} /> {item}
          </li>
        ))}
      </ul>
      <p className="meta program-foot mg-mono">
        Quoted as published · EQ-017 · {p.not_found_ref.replace("case-study-yolanda.md", "case study")}
      </p>
    </section>
  );
}

/** Compact callout for the public map panel: the program, one figure, the framing line, the four real records. */
export function ProgramCallout({ p, pins }: { p: ProgramContext; pins: PinsFC | null }) {
  const planted = p.facts.find((f) => f.id === "planted");
  const names = new Map(pins?.features.map((f) => [f.properties.id, f.properties.site_name]) ?? []);
  return (
    <section className="mg-card program-callout" aria-label={p.name}>
      <span className="mg-eyebrow">
        Program <RealCaseLabel />
      </span>
      <strong className="program-callout-title">{programTitle(p)}</strong>
      {planted && (
        <span className="stat-meta">
          <strong className="program-callout-figure" title={`“${planted.quote}”`}>
            {formatQuoted(planted)}
          </strong>
          <span>reported planted</span>
          <QuotedMeta f={planted} />
          <SourceLink source={planted.source} quote={planted.quote} />
        </span>
      )}
      <p className="program-framing program-framing--sm">{p.framing.line}</p>
      <ul className="program-records">
        {p.record_ids.map((id) => (
          <li key={id}>
            <Link href={`/records/${id}`}>{names.get(id) ?? "Real record"} →</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
