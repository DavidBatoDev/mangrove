"use client";

import { CalendarClock, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useSession } from "@/components/session";
import { DemoLabel, ErrorBox, Loading } from "@/components/ui";
import { BrandIcon, ICON_PROPS, IconBadge, QuestionIcon, StatTile } from "@/components/visual";
import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import type { ApiError } from "@/lib/api-error";
import { ACTION_LABELS, formatDate } from "@/lib/format";
import { resolveSiteId } from "@/lib/ids";
import type { LockBody } from "@/lib/types";

type Phase = "editing" | "confirming" | "publishing";

// Lock promise (US-007): form, then an irreversible confirmation.
export default function LockPage() {
  const { id } = useParams<{ id: string }>();
  const siteId = resolveSiteId(decodeURIComponent(id));
  const router = useRouter();
  const { user, ready } = useSession();
  const site = useApi(() => api.getSite(siteId), [siteId]);
  const idempotencyKey = useRef<string>("");

  const [form, setForm] = useState({
    rationale: "",
    planned_action: "hydrological_repair",
    planned_action_detail: "",
    planned_area_ha: "",
    expected_outcome: "",
    expected_vegetated_ha: "",
    work_check_after: "",
    outcome_check_after: "",
    known_unknowns: "",
  });
  const [phase, setPhase] = useState<Phase>("editing");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!ready || site.loading) return <Loading />;
  if (!user)
    return (
      <div className="state">
        <p>Sign in as a funder to lock a promise.</p>
        <Link className="mg-btn mg-btn--primary" href={`/sign-in?next=/sites/${siteId}/lock`}>
          Sign in
        </Link>
      </div>
    );
  if (user.role !== "funder")
    return (
      <div className="mg-alert" role="alert">
        Only a funder can lock a promise. You are signed in as a partner.
      </div>
    );
  if (site.error) return <ErrorBox error={site.error} onRetry={site.reload} />;
  if (!site.data) return null;

  function validate(): string | null {
    const required: (keyof typeof form)[] = [
      "rationale",
      "planned_action_detail",
      "planned_area_ha",
      "expected_outcome",
      "work_check_after",
      "outcome_check_after",
      "known_unknowns",
    ];
    if (required.some((k) => !form[k].trim())) return "Fill in every field marked required.";
    if (!(Number(form.planned_area_ha) > 0)) return "Planned area must be more than 0 ha.";
    if (form.expected_vegetated_ha && !(Number(form.expected_vegetated_ha) > 0)) return "Expected vegetated area must be more than 0 ha.";
    if (form.outcome_check_after <= form.work_check_after) return "The outcome check date must come after the work check date.";
    return null;
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (!v) {
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
      setPhase("confirming");
    }
  }

  async function publish() {
    setPhase("publishing");
    setError(null);
    const body: LockBody = {
      site_id: siteId,
      rationale: form.rationale.trim(),
      planned_action: form.planned_action,
      planned_action_detail: form.planned_action_detail.trim(),
      planned_area_ha: Number(form.planned_area_ha),
      expected_outcome: form.expected_outcome.trim(),
      expected_vegetated_ha: form.expected_vegetated_ha ? Number(form.expected_vegetated_ha) : null,
      work_check_after: form.work_check_after,
      outcome_check_after: form.outcome_check_after,
      known_unknowns: form.known_unknowns.trim(),
    };
    try {
      const res = await api.lockRecord(body, idempotencyKey.current);
      router.push(res.url);
    } catch (err) {
      setError((err as ApiError).message || "Could not publish. Nothing was saved; try again.");
      setPhase("confirming");
    }
  }

  const s = site.data.site;
  const actionLabel = ACTION_LABELS[form.planned_action] ?? form.planned_action;
  return (
    <div className="lock">
      <p className="meta">
        <Link href={`/sites/${s.id}`}>← {s.name}</Link>
      </p>
      <span className="mg-eyebrow">
        <Lock {...ICON_PROPS} size={14} /> Lock a promise · {s.name} <DemoLabel show={s.is_demo} />
      </span>
      <h1>Say it before the money moves</h1>
      <p className="lede">What you plan, what you expect, and when it can be checked. Today&apos;s evidence on this site is frozen with it as the baseline.</p>

      {phase === "editing" ? (
        <form className="form form--wide" onSubmit={review} noValidate>
          {error && <p className="mg-alert" role="alert">{error}</p>}

          <fieldset className="mg-card form-section">
            <legend className="card-head">
              <IconBadge>
                <BrandIcon name="promise" />
              </IconBadge>
              <span>Why and what</span>
            </legend>
            <div className="field">
              <label htmlFor="rationale">Why this site (required)</label>
              <textarea id="rationale" value={form.rationale} onChange={set("rationale")} />
            </div>
            <div className="field">
              <label htmlFor="planned_action">Planned action</label>
              <select id="planned_action" value={form.planned_action} onChange={set("planned_action")}>
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="planned_action_detail">What will be done (required)</label>
              <textarea id="planned_action_detail" value={form.planned_action_detail} onChange={set("planned_action_detail")} />
            </div>
          </fieldset>

          <fieldset className="mg-card form-section">
            <legend className="card-head">
              <IconBadge>
                <BrandIcon name="baseline" />
              </IconBadge>
              <span>How much</span>
            </legend>
            <div className="field-row">
              <div className="field">
                <label htmlFor="planned_area_ha">Planned area, ha (required)</label>
                <input id="planned_area_ha" type="number" min="0" step="0.1" value={form.planned_area_ha} onChange={set("planned_area_ha")} />
              </div>
              <div className="field">
                <label htmlFor="expected_vegetated_ha">Expected vegetated, ha</label>
                <input id="expected_vegetated_ha" type="number" min="0" step="0.1" value={form.expected_vegetated_ha} onChange={set("expected_vegetated_ha")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="expected_outcome">What should happen (required)</label>
              <textarea id="expected_outcome" value={form.expected_outcome} onChange={set("expected_outcome")} />
            </div>
          </fieldset>

          <fieldset className="mg-card form-section">
            <legend className="card-head">
              <IconBadge>
                <CalendarClock {...ICON_PROPS} />
              </IconBadge>
              <span>When to check</span>
            </legend>
            <div className="field-row">
              <div className="field">
                <label htmlFor="work_check_after">Work check after (required)</label>
                <input id="work_check_after" type="date" value={form.work_check_after} onChange={set("work_check_after")} />
              </div>
              <div className="field">
                <label htmlFor="outcome_check_after">Outcome check after (required)</label>
                <input id="outcome_check_after" type="date" value={form.outcome_check_after} onChange={set("outcome_check_after")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="known_unknowns">What we do not know yet (required)</label>
              <textarea id="known_unknowns" value={form.known_unknowns} onChange={set("known_unknowns")} />
            </div>
          </fieldset>

          <div className="row">
            <button className="mg-btn mg-btn--primary" type="submit">
              Review the promise
            </button>
          </div>
        </form>
      ) : (
        <div className="confirm" role="alertdialog" aria-labelledby="confirm-title">
          <span className="mg-eyebrow mg-label--promise">
            <Lock {...ICON_PROPS} size={14} /> Promise · {s.name}
          </span>
          <p className="record-title record-title--sm">
            {form.planned_area_ha} ha of <em>{actionLabel.toLowerCase()}</em>
          </p>
          <div className="stats stats--3">
            <StatTile icon={<BrandIcon name="promise" />} label="Planned area" m={{ value: Number(form.planned_area_ha), unit: "ha", eq_id: null, confidence: "high" }} />
            <StatTile
              icon={<QuestionIcon q="outcome" />}
              label="Expected vegetated"
              m={form.expected_vegetated_ha ? { value: Number(form.expected_vegetated_ha), unit: "ha", eq_id: null, confidence: "high" } : null}
            />
            <StatTile icon={<CalendarClock {...ICON_PROPS} />} label="Checks" value={formatDate(form.work_check_after)} note={`then ${formatDate(form.outcome_check_after)}`} />
          </div>
          <hr className="mg-waterline" />
          <h2 id="confirm-title">This can never be edited or deleted.</h2>
          <p style={{ margin: 0 }}>
            Once published, this promise is public and cannot be changed through Mangrove. Any later change would break its published hash.
            Corrections are added to its timeline; the original stays.
          </p>
          {error && <p className="mg-alert" role="alert">{error}</p>}
          <div className="row">
            <button className="mg-btn mg-btn--primary" type="button" onClick={publish} disabled={phase === "publishing"}>
              <Lock {...ICON_PROPS} size={18} /> {phase === "publishing" ? "Publishing…" : "Lock this promise"}
            </button>
            <button
              className="mg-btn mg-btn--secondary"
              type="button"
              onClick={() => {
                idempotencyKey.current = ""; // an edited body is a new request (API-009 409 otherwise)
                setPhase("editing");
              }}
              disabled={phase === "publishing"}
            >
              Go back and edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
