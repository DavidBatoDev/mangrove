"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleHelp, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import AssistantPanel from "@/components/AssistantPanel";
import { USE_MOCKS } from "@/lib/api";
import { onAssistantToggle, requestTour } from "@/lib/tour";

export default function Header() {
  const [askOpen, setAskOpen] = useState(false);
  // The guided tour belongs to the public map only, so its Help button shows only on "/".
  const onHome = usePathname() === "/";
  // The tour closes the assistant panel while it points at the map, and opens it at its last stop.
  useEffect(() => onAssistantToggle(setAskOpen), []);
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
      <nav className="nav" data-tour="nav">
        <Link href="/">Public map</Link>
        <Link href="/sites">Candidate sites</Link>
        <Link href="/evidence/new">Add evidence</Link>
      </nav>
      <div className="session">
        <button
          type="button"
          className="mg-btn mg-btn--secondary ask-btn"
          data-tour="ask"
          aria-expanded={askOpen}
          onClick={() => setAskOpen((o) => !o)}
        >
          <Sparkles size={16} aria-hidden /> Ask AIDE-M
        </button>
        {onHome && (
          <button type="button" className="mg-btn mg-btn--secondary ask-btn" onClick={requestTour} title="Show the guided tour">
            <CircleHelp size={16} strokeWidth={1.75} aria-hidden /> <span className="help-label">Help</span>
          </button>
        )}
        {USE_MOCKS && <span className="mock-flag" title="Reading fixtures, not the API (P0)">Fixtures</span>}
      </div>
    </header>
    <AssistantPanel open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
}
