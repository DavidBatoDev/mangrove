"use client";

/* eslint-disable @next/next/no-img-element -- evidence pictures are content-addressed PNGs served by API-014 */

import { useApi } from "@/hooks/useApi";
import * as api from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Evidence } from "@/lib/types";

// The picture behind an evidence item: the current Sentinel-2 chip, beside the 2016–2017 "then" chip when the
// ingest found one (data/ingest/s2_ingest.py). The site outline is drawn into the picture.
export function EvidencePictures({ e, siteName }: { e: Evidence; siteName?: string }) {
  if (!e.asset_url) return null;
  const where = siteName ?? "the site";
  const now = { src: e.asset_url, date: e.observed_to };
  const then = e.asset_then_url ? { src: e.asset_then_url, date: e.asset_then_observed ?? null } : null;
  const isS2 = e.source_type === "sentinel2";
  const years = [then?.date, now.date].filter(Boolean).map((d) => String(d).slice(0, 4));
  return (
    <figure className="ev-pictures">
      <div className={then ? "ev-pictures-pair" : undefined}>
        {then && (
          <div>
            <img src={then.src} alt={`Satellite picture of ${where}, ${formatDate(then.date)}`} loading="lazy" width={512} height={512} />
            <span className="mg-eyebrow">Then · {formatDate(then.date)}</span>
          </div>
        )}
        <div>
          <img
            src={now.src}
            alt={`${isS2 ? "Satellite picture" : "Photo"} of ${where}, ${formatDate(now.date)}`}
            loading="lazy"
            width={512}
            height={512}
          />
          {then && <span className="mg-eyebrow">Now · {formatDate(now.date)}</span>}
        </div>
      </div>
      {isS2 && (
        <figcaption>
          True colour, site outlined. Contains modified Copernicus Sentinel data {[...new Set(years)].join(" and ")}.
        </figcaption>
      )}
    </figure>
  );
}

// Record page: the newest usable "What's there now?" picture of the record's site, read from its dossier.
export function SiteNowPictures({ siteId, siteName }: { siteId: string; siteName?: string }) {
  const d = useApi(() => api.getSite(siteId), [siteId]);
  const e = d.data?.evidence.find((x) => x.question === "current" && x.source_type === "sentinel2" && x.asset_url);
  if (!e) return null;
  return (
    <div className="ev-now">
      <span className="mg-evidence__meta">
        What&apos;s there now? · {e.source_name} · {formatDate(e.observed_to)}
      </span>
      <EvidencePictures e={e} siteName={siteName} />
    </div>
  );
}
