"use client";

// Who is submitting, for a public product with no accounts (ADR-061): name (required), organisation, role, and an
// optional contact email that is stored privately and never shown. Remembered in this browser for next time.

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/format";
import type { Submitter, SubmitterRole } from "@/lib/types";

const KEY = "aide-m-submitter-v1";

/** The submitter for a form: empty on first render, then the last one this browser used (after mount, so the
 * server-rendered and first client render match). */
export function useSubmitter(defaultRole: SubmitterRole = "resident"): [Submitter, (s: Submitter) => void] {
  const [who, setWho] = useState<Submitter>({ name: "", organisation: "", role: defaultRole, contact_email: "" });
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Submitter>;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWho({
        name: saved.name ?? "",
        organisation: saved.organisation ?? "",
        role: saved.role ?? defaultRole,
        contact_email: saved.contact_email ?? "",
      });
    } catch {
      // Storage blocked or unreadable: start empty.
    }
    // Load once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = useCallback((s: Submitter) => {
    setWho(s);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // A convenience only.
    }
  }, []);
  return [who, update];
}

/** Trimmed copy for the API; empty optional fields are left out. */
export function cleanSubmitter(s: Submitter): Submitter {
  const org = s.organisation?.trim();
  const email = s.contact_email?.trim();
  return { name: s.name.trim(), role: s.role, ...(org ? { organisation: org } : {}), ...(email ? { contact_email: email } : {}) };
}

export default function SubmitterFields({
  value,
  onChange,
  roles = ["field_partner", "funder", "resident"],
}: {
  value: Submitter;
  onChange: (s: Submitter) => void;
  roles?: SubmitterRole[];
}) {
  const set = (patch: Partial<Submitter>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="submitter">
      <legend>About you</legend>
      <div className="submitter-grid">
        <label className="field">
          <span>
            Name <abbr title="required">*</abbr>
          </span>
          <input required maxLength={80} autoComplete="name" value={value.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="field">
          <span>Organisation (optional)</span>
          <input
            maxLength={120}
            autoComplete="organization"
            value={value.organisation ?? ""}
            onChange={(e) => set({ organisation: e.target.value })}
          />
        </label>
      </div>
      <div className="submitter-roles" role="radiogroup" aria-label="You are a">
        {roles.map((r) => (
          <label key={r} className={`submitter-role${value.role === r ? " is-on" : ""}`}>
            <input type="radio" name="submitter-role" checked={value.role === r} onChange={() => set({ role: r })} />
            {ROLE_LABELS[r]}
          </label>
        ))}
      </div>
      <label className="field">
        <span>Contact email (optional)</span>
        <input
          type="email"
          maxLength={254}
          autoComplete="email"
          value={value.contact_email ?? ""}
          onChange={(e) => set({ contact_email: e.target.value })}
        />
        <small className="meta">Never shown publicly. Only used if the team needs to ask about your submission.</small>
      </label>
      <p className="meta">Your name, organisation and role are shown with your submission.</p>
    </fieldset>
  );
}
