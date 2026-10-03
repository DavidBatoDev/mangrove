import { StatusLine } from "@/components/ui";
import { IconBadge, QuestionIcon } from "@/components/visual";
import { findingLabel } from "@/lib/format";
import type { Answer, Evidence } from "@/lib/types";

// One site question: icon, question, status chip + finding + source count. When sources disagree,
// each finding is named with its source.
export default function AnswerBlock({ a, evidence, siteId }: { a: Answer; evidence?: Evidence[]; siteId: string }) {
  const items = a.status === "conflicting" && evidence ? evidence.filter((e) => a.evidence_ids.includes(e.id)) : [];
  return (
    <div className={`answer answer--${a.status}`}>
      <IconBadge tone={a.status === "missing" ? "muted" : "tidal"}>
        <QuestionIcon q={a.question} />
      </IconBadge>
      <div className="answer-body">
        <h3>{a.label}</h3>
        <StatusLine status={a.status} finding={a.finding} sourceCount={a.source_count} />
        {items.length > 0 && (
          <ul className="disagree">
            {items.map((e) => (
              <li key={e.id}>
                <a href={`/sites/${siteId}#ev-${e.id}`}>{e.source_name}</a>
                {e.submitted_by_org ? ` · ${e.submitted_by_org}` : ""}
                <strong>{findingLabel(e.finding)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
