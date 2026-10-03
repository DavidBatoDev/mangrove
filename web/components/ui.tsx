// Shared pieces on the brand kit's classes (brand/mangrove.css, BRAND.md §6). Status, confidence and pin
// state are always mark + word; red only for conflict; "Demo data" on every demo entity (BR-006).

import Link from "next/link";
import type { ApiError } from "@/lib/api-error";
import { findingLabel, formatMeasure, PIN_WORDS, STATUS_WORDS } from "@/lib/format";
import type { CheckStatus, Confidence, Measure, PinState } from "@/lib/types";

const kebab = (s: string) => s.replaceAll("_", "-");

export function DemoLabel({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return <span className="mg-demo">Demo data</span>;
}

/** Real, sourced case record (is_demo = false; ADR-051): every figure cites a public report. Never red. */
export function RealCaseLabel({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return <span className="real-case">Real case · sourced</span>;
}

export function StatusBadge({ status }: { status: CheckStatus }) {
  return <span className={`mg-chip mg-chip--${kebab(status)}`}>{STATUS_WORDS[status]}</span>;
}

/** Status + finding + source count, together. */
export function StatusLine({
  status,
  finding,
  sourceCount,
}: {
  status: CheckStatus;
  finding: string | null;
  sourceCount?: Measure;
}) {
  return (
    <div className="status-line">
      <StatusBadge status={status} />
      {finding && <span className="finding">{findingLabel(finding)}</span>}
      {sourceCount && (
        <span className="source-count mg-mono">
          {sourceCount.value} {sourceCount.value === 1 ? "source" : "sources"}
        </span>
      )}
    </div>
  );
}

/** Pin state as legend mark + word. */
export function PinLabel({ state }: { state: PinState }) {
  return <span className={`mg-pin mg-pin--${kebab(state)}`}>{PIN_WORDS[state]}</span>;
}

export function ConfidenceMark({ level }: { level: Confidence }) {
  return <span className={`mg-conf mg-conf--${level}`}>{level}</span>;
}

/** A displayed number with its EQ id and confidence (AGENTS.md "Before you finish"). */
export function MeasureText({ m, label }: { m: Measure | null | undefined; label?: string }) {
  if (!m) return <span className="measure">—</span>;
  return (
    <span className="measure">
      <strong className="mg-mono">{formatMeasure(m)}</strong>
      {label && ` ${label}`}
      <span className="measure-meta">
        <span className="mg-mono">{m.eq_id ?? "input"}</span>
        <ConfidenceMark level={m.confidence} />
      </span>
    </span>
  );
}

export function Disclaimer({ text }: { text?: string }) {
  return (
    <p className="mg-disclaimer">
      {text ?? "This record is not a certification of restoration success or approval of funding."}
    </p>
  );
}

export function Loading({ what = "Loading" }: { what?: string }) {
  return (
    <div className="state state-loading" role="status">
      <span className="skeleton" aria-hidden="true" />
      <span className="mg-mono">{what}…</span>
    </div>
  );
}

/** Errors are caution, never red (red is conflict only). */
export function ErrorBox({ error, onRetry }: { error: ApiError | Error | null; onRetry?: () => void }) {
  if (!error) return null;
  const notFound = "status" in error && error.status === 404;
  return (
    <div className="mg-alert state-alert" role="alert">
      <div>
        <strong>{notFound ? "Not found." : "That didn't load."}</strong> {error.message}
        <div className="row" style={{ marginTop: "var(--mg-space-3)" }}>
          {onRetry && !notFound && (
            <button type="button" className="mg-btn mg-btn--secondary" onClick={onRetry}>
              Try again
            </button>
          )}
          {notFound && <Link href="/">Back to the map</Link>}
        </div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="state state-empty">{children}</div>;
}
