"use client";

// Visual building blocks: icons, stat tiles, the check timeline and the area bar.
// Icons follow brand/BRAND.md §9: lucide-react at 1.75 stroke, plus the custom brand icons in /brand/icons/
// (referenced by URL through .mg-icon, never copied). Every displayed number keeps its EQ id and
// confidence, or says it is an input (AGENTS.md "Before you finish").

import {
  Camera,
  FileText,
  Layers,
  Newspaper,
  Satellite,
  Sprout,
  Users,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { useState } from "react";
import { ConfidenceMark } from "@/components/ui";
import { formatDate, formatMeasure } from "@/lib/format";
import type { EvidenceQuestion, Measure } from "@/lib/types";

export const ICON_PROPS = { strokeWidth: 1.75, "aria-hidden": true } as const;

/** A custom brand icon from /brand/icons/, tinted with currentColor. */
export function BrandIcon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="mg-icon"
      style={{ "--mg-icon": `url(/brand/icons/${name}.svg)`, width: size, height: size } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

/** Icon for an evidence source (BRAND.md §9 "Evidence sources"). */
export function SourceIcon({ type, ...p }: { type: string } & LucideProps) {
  const I: LucideIcon = type === "sentinel2" ? Satellite : type === "gmw" ? Layers : type === "field" ? Camera : type === "public_report" ? Newspaper : FileText;
  return <I {...ICON_PROPS} {...p} />;
}

/** Icon for a question or check. History uses the brand's prop-roots mark. */
export function QuestionIcon({ q, size = 24 }: { q: EvidenceQuestion; size?: number }) {
  if (q === "history") return <BrandIcon name="prop-roots" size={size} />;
  if (q === "work") return <BrandIcon name="follow-through" size={size} />;
  const I: LucideIcon = q === "current" ? Satellite : q === "ground" ? Users : Sprout;
  return <I {...ICON_PROPS} size={size} />;
}

/** A round icon badge used as a small illustration beside a heading or in an empty state. */
export function IconBadge({ children, tone = "tidal", size = "md" }: { children: React.ReactNode; tone?: "tidal" | "root" | "canopy" | "muted"; size?: "md" | "lg" }) {
  return <span className={`icon-badge icon-badge--${tone} icon-badge--${size}`}>{children}</span>;
}

/** One headline number with its source of truth underneath. */
export function StatTile({
  icon,
  label,
  m,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  /** A measured or input number (shown with its EQ id / "input" and confidence). */
  m?: Measure | null;
  /** Or a non-numeric value such as a date. */
  value?: string;
  note?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{m ? formatMeasure(m) : (value ?? "—")}</span>
      <span className="stat-meta">
        {m ? (
          <>
            <span className="mg-mono">{m.eq_id ?? "input"}</span>
            <ConfidenceMark level={m.confidence} />
          </>
        ) : (
          note
        )}
      </span>
    </div>
  );
}

/**
 * Lock → work check → outcome check, with today's position. A drawing of dates, not a number:
 * positions are proportional to time so "how far along" reads at a glance.
 */
export function CheckTimeline({
  lockedAt,
  lockLabel = "Promise locked",
  workAfter,
  outcomeAfter,
}: {
  lockedAt: string;
  lockLabel?: string;
  workAfter: string;
  outcomeAfter: string;
}) {
  const t = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00Z` : s).getTime();
  // A reconstructed record (ADR-051) is published after its check dates, so the rail runs from the earliest
  // date to the latest rather than from the lock.
  const start = Math.min(t(lockedAt), t(workAfter));
  const end = Math.max(t(lockedAt), t(outcomeAfter));
  const span = Math.max(end - start, 1);
  const pos = (ms: number) => Math.min(100, Math.max(0, ((ms - start) / span) * 100));
  // Read the clock once per mount (render must stay pure).
  const [today] = useState(() => Date.now());
  const points = [
    { key: "lock", label: lockLabel, date: lockedAt, at: pos(t(lockedAt)), icon: <BrandIcon name="promise" size={18} /> },
    { key: "work", label: "Work check", date: workAfter, at: pos(t(workAfter)), icon: <BrandIcon name="follow-through" size={18} /> },
    { key: "outcome", label: "Outcome check", date: outcomeAfter, at: pos(t(outcomeAfter)), icon: <Sprout {...ICON_PROPS} size={18} /> },
  ];
  return (
    <div className="ctl" role="img" aria-label={`${lockLabel} ${formatDate(lockedAt)}; work check from ${formatDate(workAfter)}; outcome check from ${formatDate(outcomeAfter)}.`}>
      <div className="ctl-track">
        <div className="ctl-fill" style={{ width: `${pos(today)}%` }} />
        {points.map((p) => (
          <span key={p.key} className={`ctl-node${today >= t(p.date) ? " is-past" : ""}`} style={{ left: `${p.at}%` }}>
            {p.icon}
          </span>
        ))}
        <span className="ctl-today" style={{ left: `${pos(today)}%` }}>
          <span>Today</span>
        </span>
      </div>
      <div className="ctl-labels">
        {points.map((p) => (
          <span key={p.key} style={{ left: `${p.at}%` }} className={`ctl-label ctl-label--${p.key}`}>
            <strong>{p.label}</strong>
            <span className="mg-mono">{formatDate(p.date)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Reported vs mapped area (T07 follow-through bar). The bar shows the mapped share of the reported
 * area visually; no percentage is printed (design-brief §4: no percents).
 */
export function AreaBar({ reported, measured }: { reported: Measure; measured: Measure }) {
  const share = Math.min(1, Math.max(0, measured.value / Math.max(reported.value, measured.value, 0.0001)));
  return (
    <div className="areabar">
      <div className="mg-progress" role="img" aria-label={`Mapped ${formatMeasure(measured)} against reported ${formatMeasure(reported)}`}>
        <div className="mg-progress__fill" style={{ "--value": `${share * 100}%` } as React.CSSProperties} />
      </div>
      <div className="areabar-labels">
        <span>
          <strong className="mg-mono">Mapped {formatMeasure(measured)}</strong>
          <span className="mg-mono">{measured.eq_id ?? "input"}</span> <ConfidenceMark level={measured.confidence} />
          <small>Partner field boundary</small>
        </span>
        <span className="areabar-right">
          <strong className="mg-mono">Reported {formatMeasure(reported)}</strong>
          <span className="mg-mono">{reported.eq_id ?? "input"}</span> <ConfidenceMark level={reported.confidence} />
          <small>Project report</small>
        </span>
      </div>
    </div>
  );
}

/** An empty state with an icon illustration, a short line and an optional action. */
export function EmptyArt({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty-art">
      <IconBadge tone="muted" size="lg">
        {icon}
      </IconBadge>
      <div>
        <strong>{title}</strong>
        {children && <div className="meta">{children}</div>}
      </div>
    </div>
  );
}
