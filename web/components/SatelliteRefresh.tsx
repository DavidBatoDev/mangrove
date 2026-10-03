"use client";

// API-007 (ADR-061): check the site's latest Sentinel-2 image from the AWS Open Data archive and add it as
// "What's there now?" evidence. Takes a few seconds; one refresh per site per 10 minutes.

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { ICON_PROPS } from "@/components/visual";
import * as api from "@/lib/api";
import type { Answer, Evidence } from "@/lib/types";

type Result = { evidence: Evidence; answers: Answer[] };

export default function SatelliteRefresh({ siteId, onResult }: { siteId: string; onResult: (r: Result) => void }) {
  const [state, setState] = useState<{ busy: boolean; msg: string | null; error: boolean }>({ busy: false, msg: null, error: false });

  async function run() {
    setState({ busy: true, msg: "Checking the latest Sentinel-2 image…", error: false });
    try {
      const r = await api.sentinelRefresh(siteId);
      onResult(r);
      const e = r.evidence;
      const date = new Date(e.observed_to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      setState({
        busy: false,
        error: false,
        msg: e.usable ? `Added the clearest image from ${date}.` : `Image from ${date} added, not usable: ${e.unusable_reason}.`,
      });
    } catch (err) {
      setState({ busy: false, error: true, msg: err instanceof Error ? err.message : "The satellite check failed." });
    }
  }

  return (
    <div className="sat-refresh">
      <button type="button" className="mg-btn mg-btn--secondary" onClick={run} disabled={state.busy} aria-busy={state.busy}>
        <RefreshCw {...ICON_PROPS} size={16} className={state.busy ? "spin" : undefined} /> Check latest satellite image
      </button>
      {state.msg && (
        <p className={state.error ? "mg-alert" : "meta"} role="status">
          {state.msg}
        </p>
      )}
    </div>
  );
}
