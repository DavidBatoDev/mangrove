"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session";
import { DemoLabel } from "@/components/ui";
import AssistantPanel from "@/components/AssistantPanel";
import { USE_MOCKS } from "@/lib/api";

export default function Header() {
  const { user, ready, signOut } = useSession();
  const router = useRouter();
  const [askOpen, setAskOpen] = useState(false);
  return (
    <>
    <header className="header">
      <Link href="/" className="brand">
        {/* Dark-ground mark on the Canopy header (WEB.md §4). Plain <img>: the logo is a static brand file. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo/mangrove-mark-dark.svg" alt="" width={28} height={28} />
        <span className="brand-name">
          AIDE-M
          <small className="brand-meaning">Accountability In Delivery & Evidence · Mangrove</small>
        </span>
      </Link>
      <nav className="nav">
        <Link href="/">Public map</Link>
        {user && <Link href="/sites">Candidate sites</Link>}
        {user && <Link href="/evidence/new">Add evidence</Link>}
      </nav>
      <div className="session">
        <button
          type="button"
          className="mg-btn mg-btn--secondary ask-btn"
          aria-expanded={askOpen}
          onClick={() => setAskOpen((o) => !o)}
        >
          <Sparkles size={16} aria-hidden /> Ask AIDE-M
        </button>
        {USE_MOCKS && <span className="mock-flag" title="Reading fixtures, not the API (P0)">Fixtures</span>}
        {ready && user ? (
          <>
            <span>
              {user.display_name} · {user.org.name} <DemoLabel show={user.org.is_demo} />
            </span>
            <button
              type="button"
              className="mg-btn mg-btn--secondary"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          ready && <Link href="/sign-in" className="mg-btn mg-btn--primary">Sign in</Link>
        )}
      </div>
    </header>
    <AssistantPanel open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
}
