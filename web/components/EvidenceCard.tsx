import { DemoLabel, MeasureText } from "@/components/ui";
import { IconBadge, SourceIcon } from "@/components/visual";
import { EQ_LABELS, findingLabel, formatDate, QUESTION_LABELS, shortHash } from "@/lib/format";
import type { Evidence } from "@/lib/types";

// One evidence item with its full provenance (BR-005), in the brand's evidence look:
// copper rule, mono "source · observed date" meta, the finding as the sentence (brand/WEB.md §3).
export default function EvidenceCard({ e }: { e: Evidence }) {
  const range =
    e.observed_from === e.observed_to ? formatDate(e.observed_from) : `${formatDate(e.observed_from)} – ${formatDate(e.observed_to)}`;
  return (
    <article className={`mg-card evidence${e.usable ? "" : " unusable"}`} id={`ev-${e.id}`}>
      <div className="evidence-head">
        <IconBadge tone="root">
          <SourceIcon type={e.source_type} />
        </IconBadge>
        <div className="evidence-title">
          <span className="mg-evidence__meta">
            {e.source_name} · {range}
          </span>
          <p className="evidence-finding">{e.usable ? findingLabel(e.finding) : `Not usable: ${e.unusable_reason}`}</p>
        </div>
        <div className="evidence-tags">
          <span className="tag">{QUESTION_LABELS[e.question] ?? e.question}</span>
          <DemoLabel show={e.is_demo} />
          {e.source_version === "fixture-placeholder" && <span className="placeholder-label">Placeholder value</span>}
        </div>
      </div>

      {e.source_type === "public_report" && e.provenance_url && (
        <p className="evidence-source">
          <a href={e.provenance_url} target="_blank" rel="noopener noreferrer">
            Read the source
          </a>
          {e.source_version ? <span className="mg-mono"> · {e.source_version}</span> : null}
        </p>
      )}

      {e.metrics.length > 0 && (
        <div className="evidence-metrics">
          {e.metrics.map((m, i) => (
            <div key={i} className="metric">
              <span className="metric-name">{m.name ? m.name.replaceAll("_", " ") : (EQ_LABELS[m.eq_id ?? ""] ?? "value")}</span>
              <MeasureText m={m} />
            </div>
          ))}
        </div>
      )}

      <details className="provenance" open>
        <summary>Provenance</summary>
        <dl className="kv">
          <dt>Source</dt>
          <dd>
            {e.source_type}
            {e.submitted_by_org ? ` · ${e.submitted_by_org.name}` : ""}
          </dd>
          <dt>Version</dt>
          <dd>{e.source_version ?? "—"}</dd>
          <dt>Retrieved</dt>
          <dd>{formatDate(e.retrieved_at)}</dd>
          <dt>Method</dt>
          <dd>{e.method ?? "—"}</dd>
          {e.spatial_resolution_m != null && (
            <>
              <dt>Resolution</dt>
              <dd>{e.spatial_resolution_m} m</dd>
            </>
          )}
          <dt>Link</dt>
          <dd>
            {e.provenance_url ? (
              <a href={e.provenance_url} target="_blank" rel="noopener noreferrer">
                {e.provenance_url}
              </a>
            ) : e.asset_url ? (
              <a href={e.asset_url}>Photo</a>
            ) : (
              "—"
            )}
          </dd>
          <dt>Hash</dt>
          <dd className="mono">{shortHash(e.content_hash)}</dd>
        </dl>
      </details>
      {e.limitation && (
        <p className="evidence-limit">
          <span className="mg-eyebrow">Limitation</span>
          {e.limitation}
        </p>
      )}
    </article>
  );
}
