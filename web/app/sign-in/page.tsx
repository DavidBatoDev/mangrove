"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useSession } from "@/components/session";
import { USE_MOCKS } from "@/lib/api";
import type { ApiError } from "@/lib/api-error";

function SignInForm() {
  const { signIn } = useSession();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      router.push(next && next.startsWith("/") ? next : user.role === "funder" ? "/sites" : "/evidence/new");
    } catch (err) {
      const e = err as ApiError;
      setError(e.status === 401 ? "Email or password is wrong." : e.message || "Could not sign in. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {error && <p className="mg-alert" role="alert">{error}</p>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="row">
        <button className="mg-btn mg-btn--primary" type="submit" disabled={submitting || !email || !password}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </div>
      {USE_MOCKS && (
        <p className="meta">
          Fixtures mode: <code>funder@demo.mangrove.test</code> or <code>partner@demo.mangrove.test</code>, any password.
        </p>
      )}
    </form>
  );
}

export default function SignInPage() {
  return (
    <div className="signin">
      <div className="mg-card signin-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo/mangrove-mark.svg" alt="" width={56} height={56} className="signin-mark" />
        <h1>Sign in</h1>
        <p className="lede">Funders lock promises. Field partners add evidence. Reading records needs no account.</p>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
