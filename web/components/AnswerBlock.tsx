import { StatusLine } from "@/components/ui";
import { IconBadge, QuestionIcon, SourceIcon } from "@/components/visual";
import { findingLabel, formatDate } from "@/lib/format";
import type { Answer, Evidence } from "@/lib/types";

// One site question: icon, question, status chip + finding + source count, then the sources it rests on,
// each linked to its evidence card. When sources disagree, each finding is named with its source.
export default function AnswerBlock({ a, evidence, siteId }: { a: Answer; evidence?: Evidence[]; siteId: string }) {
  const cited = evidence ? evidence.filter((e) => a.evidence_ids.includes(e.id)) : [];
  const conflict = a.status === "conflicting";
  return (
    <div className={`answer answer--${a.status}`}>
      <IconBadge tone={a.status === "missing" ? "muted" : "tidal"}>
        <QuestionIcon q={a.question} />
      </IconBadge>
      <div className="answer-body">
        <h3>{a.label}</h3>
        <StatusLine status={a.status} finding={a.finding} sourceCount={a.source_count} />
        {cited.length > 0 && conflict && (
          <ul className="disagree">
            {cited.map((e) => (
              <li key={e.id}>
                <a href={`/sites/${siteId}#ev-${e.id}`}>{e.source_name}</a>
                {e.submitted_by_org?.name ? ` · ${e.submitted_by_org.name}` : ""}
                <strong>{findingLabel(e.finding)}</strong>
              </li>
            ))}
          </ul>
        )}
        {cited.length > 0 && !conflict && (
          <ol className="answer-cites" aria-label="Sources">
            {cited.map((e, i) => (
              <li key={e.id}>
                <a href={`/sites/${siteId}#ev-${e.id}`}>
                  <span className="answer-cite-n">{i + 1}</span>
                  <SourceIcon type={e.source_type} size={14} />
                  <span>
                    {e.source_name}
                    {e.source_version ? ` ${e.source_version}` : ""}
                    {e.submitted_by_org?.name ? ` · ${e.submitted_by_org.name}` : ""}
                  </span>
                  <span className="answer-cite-date mg-mono">{formatDate(e.observed_to || e.observed_from)}</span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
