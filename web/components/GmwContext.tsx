"use client";

// Mangrove context from Global Mangrove Watch (F-025, US-017, ADR-045). Context only: nothing here sets a
// status, finding or pin (BR-001). Charts follow BRAND.md §8: series Tidal then Root, the zero line drawn as
// the Waterline, Tideline gridlines, mono axis labels, and a data table under every chart (§12).

import { useEffect, useState } from "react";
import { ConfidenceMark, DemoLabel } from "@/components/ui";
import { useMangroveChange } from "@/components/MapShell";
import { BrandIcon } from "@/components/visual";
import type { CountryContext, GmwTimeline, Measure } from "@/lib/types";

const H = 180;

/** The chart's width in CSS px, so SVG text stays at 12 px on a phone. */
function useWidth(fallback = 600): [(el: HTMLElement | null) => void, number] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!el) return;
    const measure = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}
const PAD = { l: 44, r: 12, t: 12, b: 26 };

/** Medium confidence renders as approximate (docs/methods.md §2). */
function num(v: number, digits: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Units spelled out for readers: "ha" → "hectares". */
const unitWord = (u: string) => (u === "ha" ? "hectares" : u);

function fmt(m: Measure | null | undefined, digits = 1, approx = true): string {
  if (!m) return "—";
  return `${approx && m.confidence === "medium" ? "approx. " : ""}${num(Number(m.value), digits)} ${unitWord(m.unit)}`;
}

/** Plain value for table cells; the column header carries the EQ id and confidence. */
const cell = (m: Measure | null | undefined, digits = 1) => fmt(m, digits, false);

function ColHead({ label, eq }: { label: string; eq: string }) {
  return (
    <>
      <small>
        {eq} · medium
      </small>
      {label}
    </>
  );
}

function Cite({ m }: { m: Measure | null | undefined }) {
  if (!m) return null;
  return (
    <span className="gmw-cite">
      <span className="mg-mono">{m.eq_id ?? "input"}</span>
      <ConfidenceMark level={m.confidence} />
    </span>
  );
}

function SourceLine({ name, version, url, extra }: { name: string; version: string; url: string; extra?: string }) {
  return (
    <p className="gmw-source mg-mono">
      <a href={url} target="_blank" rel="noreferrer">
        {name} {version}
      </a>
      {extra ? ` · ${extra}` : ""} · CC BY 4.0
    </p>
  );
}

// --- per-site series --------------------------------------------------------------------------------

export function SiteTrendCard({
  t,
  layerYears,
  layerYear,
  onLayerYear,
}: {
  t: GmwTimeline;
  layerYears: number[];
  layerYear: number | null;
  onLayerYear: (y: number | null) => void;
}) {
  if (!t.source || t.years.length === 0) {
    return (
      <section className="mg-card gmw-card">
        <div className="card-head">
          <BrandIcon name="satellite-pass" /> <h2>Mangrove around this site</h2>
        </div>
        <p className="meta">Global Mangrove Watch is not ingested for this site yet.</p>
      </section>
    );
  }
  return <SiteTrend t={t} layerYears={layerYears} layerYear={layerYear} onLayerYear={onLayerYear} />;
}

function SiteTrend({
  t,
  layerYears,
  layerYear,
  onLayerYear,
}: {
  t: GmwTimeline;
  layerYears: number[];
  layerYear: number | null;
  onLayerYear: (y: number | null) => void;
}) {
  const [box, W] = useWidth();
  const ys = t.years;
  const first = ys[0];
  const last = ys[ys.length - 1];
  const b = t.nearby_buffer;
  const buffer = !b ? "the buffer" : b.unit === "m" && b.value >= 1000 ? `${num(b.value / 1000, 0)} km` : `${b.value} ${b.unit}`;
  const max = Math.max(1, ...ys.map((y) => Math.max(y.nearby.value, y.inside.value)));
  const x = (year: number) => PAD.l + ((year - first.year) / (last.year - first.year)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const path = (k: "nearby" | "inside") => ys.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p[k].value).toFixed(1)}`).join("");
  const area = `${path("nearby")}L${x(last.year)},${y(0)}L${x(first.year)},${y(0)}Z`;
  const ticks = [1985, 1995, 2005, 2015, 2025].filter((v) => v >= first.year && v <= last.year);
  const summary =
    `Mangrove within ${buffer}: ${fmt(first.nearby, 1)} in ${first.year}, ${fmt(last.nearby, 1)} in ${last.year}. ` +
    `Inside the site: ${fmt(last.inside, 1)} in ${last.year}.`;

  return (
    <section className="mg-card gmw-card">
      <div className="card-head">
        <BrandIcon name="satellite-pass" /> <h2>Mangrove around this site</h2> <DemoLabel show={t.is_demo} />
      </div>

      <div className="gmw-duel">
        <div>
          <span className="stat-label">Within {buffer}</span>
          <span className="gmw-duel-pair">
            <span className="mg-mono">{first.year}</span> <strong>{fmt(first.nearby, 1)}</strong>
            <span aria-hidden="true"> → </span>
            <span className="mg-mono">{last.year}</span> <strong>{fmt(last.nearby, 1)}</strong>
          </span>
          <Cite m={last.nearby} />
        </div>
        <div>
          <span className="stat-label">Inside the site</span>
          <span className="gmw-duel-pair">
            <span className="mg-mono">{last.year}</span> <strong>{fmt(last.inside, 1)}</strong>
          </span>
          <Cite m={last.inside} />
        </div>
      </div>

      <figure className="gmw-chart" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
          {[0.5, 1].map((f) => (
            <g key={f}>
              <line className="gmw-grid" x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} />
              <text className="gmw-axis" x={PAD.l - 6} y={y(max * f) + 4} textAnchor="end">
                {(max * f).toFixed(max * f < 10 ? 1 : 0)}
              </text>
            </g>
          ))}
          {layerYear !== null && <line className="gmw-cursor" x1={x(layerYear)} x2={x(layerYear)} y1={PAD.t} y2={y(0)} />}
          <path className="gmw-area" d={area} />
          <path className="gmw-line gmw-line--nearby" d={path("nearby")} />
          <path className="gmw-line gmw-line--inside" d={path("inside")} />
          <line className="gmw-waterline" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />
          <text className="gmw-axis" x={PAD.l - 6} y={y(0) + 4} textAnchor="end">
            0 hectares
          </text>
          {ticks.map((v) => (
            <text key={v} className="gmw-axis" x={x(v)} y={H - 6} textAnchor={v === last.year ? "end" : v === first.year ? "start" : "middle"}>
              {v}
            </text>
          ))}
        </svg>
        <figcaption className="gmw-legend">
          <span>
            <i className="gmw-key gmw-key--nearby" /> Within {buffer} <span className="mg-mono">EQ-014</span>
          </span>
          <span>
            <i className="gmw-key gmw-key--inside" /> Inside the site <span className="mg-mono">EQ-002</span>
          </span>
        </figcaption>
      </figure>

      {layerYears.length > 0 && (
        <div className="gmw-years" role="group" aria-label="Mangrove extent on the map">
          <span className="stat-label">Map layer</span>
          {layerYears.map((yr) => (
            <button key={yr} type="button" className="gmw-year" aria-pressed={layerYear === yr} onClick={() => onLayerYear(yr)}>
              {yr}
            </button>
          ))}
          <button type="button" className="gmw-year" aria-pressed={layerYear === null} onClick={() => onLayerYear(null)}>
            Off
          </button>
        </div>
      )}

      {layerYear !== null && (
        <p className="gmw-maplegend">
          <i className="gmw-key gmw-key--extent" /> GMW mangrove · <span className="mg-mono">{layerYear}</span>
        </p>
      )}
      <p className="gmw-limit">{t.limitation}</p>
      {t.source && <SourceLine name={t.source.name} version={t.source.version} url={t.source.provenance_url} extra="30 m" />}

      <details className="gmw-table">
        <summary>Data table</summary>
        <table className="mg-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>
                <ColHead label="Inside the site" eq="EQ-002" />
              </th>
              <th>
                <ColHead label={`Within ${buffer}`} eq="EQ-014" />
              </th>
            </tr>
          </thead>
          <tbody>
            {ys.map((p) => (
              <tr key={p.year}>
                <td className="mg-mono">{p.year}</td>
                <td className="mg-mono">{cell(p.inside, 2)}</td>
                <td className="mg-mono">{cell(p.nearby, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

// --- national card ----------------------------------------------------------------------------------

export function CountryCard({ c }: { c: CountryContext }) {
  const change = useMangroveChange();
  const [box, W] = useWidth();
  const years = c.years;
  const [year, setYear] = useState(years[years.length - 1].year);
  const row = years.find((r) => r.year === year) ?? years[years.length - 1];
  const base = years[0];
  // EQ-016: net change between two years = EQ-015(y2) − EQ-015(y1).
  const since: Measure = { value: row.extent.value - base.extent.value, unit: "ha", eq_id: "EQ-016", confidence: "medium" };

  const bars = years.filter((r) => r.gain && r.loss);
  const peak = Math.max(1, ...bars.map((r) => Math.max(r.gain!.value, r.loss!.value)));
  const bw = (W - PAD.l - PAD.r) / bars.length;
  const bx = (i: number) => PAD.l + i * bw;
  const mid = (H - PAD.b + PAD.t) / 2;
  const by = (v: number) => (v / peak) * (mid - PAD.t);
  const net = bars.map((r, i) => `${i ? "L" : "M"}${(bx(i) + bw / 2).toFixed(1)},${(mid - by(r.net!.value)).toFixed(1)}`).join("");
  const summary =
    `${c.name}: ${fmt(row.extent, 0)} of mangrove in ${row.year} (95% range ${row.extent.lower.toLocaleString("en-US", { maximumFractionDigits: 0 })}–` +
    `${row.extent.upper.toLocaleString("en-US", { maximumFractionDigits: 0 })} hectares); yearly gains and losses since ${bars[0]?.year}.`;

  return (
    <section className="mg-card gmw-card" data-tour="mangrove">
      <div className="card-head">
        <BrandIcon name="baseline" /> <h2>{c.name} mangrove extent</h2>
      </div>

      <div className="gmw-specimen">
        <strong>{fmt(row.extent, 0)}</strong>
        <span className="mg-mono">
          {row.extent.lower.toLocaleString("en-US", { maximumFractionDigits: 0 })}–{row.extent.upper.toLocaleString("en-US", { maximumFractionDigits: 0 })} hectares · 95%
        </span>
        <Cite m={row.extent} />
      </div>
      <p className="gmw-since">
        <span className="stat-label">Since {base.year}</span> <strong>
          {since.confidence === "medium" ? "approx. " : ""}
          {since.value >= 0 ? "+" : "−"}
          {num(Math.abs(since.value), 0)} {unitWord(since.unit)}
        </strong>{" "}
        <Cite m={since} />
      </p>

      {change && (
        <label className="gmw-switch" data-tour="gainloss">
          <input type="checkbox" role="switch" checked={change.on} onChange={(e) => change.set(e.target.checked)} />
          <span>Show gain and loss since {change.base} on the map</span>
        </label>
      )}

      <label className="gmw-slider">
        <span className="stat-label">Year</span>
        <input
          type="range"
          min={years[0].year}
          max={years[years.length - 1].year}
          step={1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-valuetext={String(year)}
        />
        <span className="mg-mono">{year}</span>
      </label>

      <figure className="gmw-chart" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
          <line className="gmw-grid" x1={PAD.l} x2={W - PAD.r} y1={mid - by(peak)} y2={mid - by(peak)} />
          <line className="gmw-grid" x1={PAD.l} x2={W - PAD.r} y1={mid + by(peak)} y2={mid + by(peak)} />
          <text className="gmw-axis" x={PAD.l - 6} y={mid - by(peak) + 4} textAnchor="end">
            +{Math.round(peak).toLocaleString("en-US")}
          </text>
          <text className="gmw-axis" x={PAD.l - 6} y={mid + by(peak) + 4} textAnchor="end">
            −{Math.round(peak).toLocaleString("en-US")}
          </text>
          {bars.map((r, i) => (
            <g key={r.year} className={r.year === year ? "gmw-bar-on" : undefined}>
              <rect className="gmw-bar gmw-bar--gain" x={bx(i) + 1} width={Math.max(1, bw - 2)} y={mid - by(r.gain!.value)} height={by(r.gain!.value)} />
              <rect className="gmw-bar gmw-bar--loss" x={bx(i) + 1} width={Math.max(1, bw - 2)} y={mid} height={by(r.loss!.value)} />
            </g>
          ))}
          <path className="gmw-line gmw-line--net" d={net} />
          <line className="gmw-waterline" x1={PAD.l} x2={W - PAD.r} y1={mid} y2={mid} />
          {[1990, 2000, 2010, 2020].map((v) => {
            const i = bars.findIndex((r) => r.year === v);
            return i < 0 ? null : (
              <text key={v} className="gmw-axis" x={bx(i) + bw / 2} y={H - 6} textAnchor="middle">
                {v}
              </text>
            );
          })}
        </svg>
        <figcaption className="gmw-legend">
          <span>
            <i className="gmw-key gmw-key--gain" /> Gain
          </span>
          <span>
            <i className="gmw-key gmw-key--loss" /> Loss
          </span>
          <span>
            <i className="gmw-key gmw-key--net" /> Net
          </span>
          <span className="mg-mono">hectares per year · EQ-016</span>
        </figcaption>
      </figure>

      <SourceLine name={c.source.name} version={c.source.version} url={c.source.provenance_url} extra="published country statistics" />

      <details className="gmw-table">
        <summary>Data table</summary>
        <table className="mg-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>
                <ColHead label="Extent" eq="EQ-015" />
              </th>
              <th>
                <ColHead label="95% range" eq="EQ-015" />
              </th>
              <th>
                <ColHead label="Gain" eq="EQ-016" />
              </th>
              <th>
                <ColHead label="Loss" eq="EQ-016" />
              </th>
            </tr>
          </thead>
          <tbody>
            {years.map((r) => (
              <tr key={r.year}>
                <td className="mg-mono">{r.year}</td>
                <td className="mg-mono">{cell(r.extent, 0)}</td>
                <td className="mg-mono">
                  {r.extent.lower.toLocaleString("en-US", { maximumFractionDigits: 0 })}–{r.extent.upper.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td className="mg-mono">{cell(r.gain, 0)}</td>
                <td className="mg-mono">{cell(r.loss, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
