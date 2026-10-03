"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import AssistantPanel from "@/components/AssistantPanel";
import { USE_MOCKS } from "@/lib/api";

export default function Header() {
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
        <Link href="/sites">Candidate sites</Link>
        <Link href="/evidence/new">Add evidence</Link>
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
      </div>
    </header>
    <AssistantPanel open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
}
