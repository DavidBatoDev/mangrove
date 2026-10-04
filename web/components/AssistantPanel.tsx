"use client";

// In-app assistant (API-027, ADR-062): a right side panel that asks the AI agent over the six read-only MCP tools.
// Answers are labelled AI-generated; numbers come only from tool output (BR-003).

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, GitCompareArrows, Map as MapIcon, Maximize2, Minimize2, ScrollText, ShieldCheck, Sparkles, X } from "lucide-react";
import { assistantChat, type AssistantMessage } from "@/lib/api";

type Turn = AssistantMessage & { tools?: string[] };

const SUGGESTIONS = [
  { icon: MapIcon, text: "Which candidate sites are there, and how big are they?" },
  { icon: GitCompareArrows, text: "Why do Pamarawan and Orani differ?" },
  { icon: ScrollText, text: "Which funding promises are still awaiting evidence?" },
  { icon: ShieldCheck, text: "Is every published record still intact?" },
];

const TOOL_LABEL: Record<string, string> = {
  list_sites: "Listed sites",
  get_site_dossier: "Read a site dossier",
  compare_sites: "Compared sites",
  list_records: "Listed records",
  get_record: "Read a record",
  verify_record: "Checked record integrity",
};

// Minimal markdown: **bold**, `code`, [links](url), lists, pipe tables and paragraphs. The model's text is never injected as HTML.
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.length > 2 && p.startsWith("`") && p.endsWith("`")) return <code key={i}>{p.slice(1, -1).replace(/_/g, " ")}</code>;
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link && /^https?:\/\//.test(link[2]))
      return <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.length >= 2 && lines.every((l) => l.trim().startsWith("|"))) {
          const rows = lines.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
          const [head, ...body] = rows;
          return (
            <div className="mg-scroll-x" key={i}>
              <table className="mg-table">
                <thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
                <tbody>{body.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*] /, ""))}</li>)}</ul>;
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </>
  );
}

export default function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setDraft("");
    setError(null);
    setBusy(true);
    try {
      const res = await assistantChat(next.slice(-20).map(({ role, content }) => ({ role, content })));
      setTurns([...next, { role: "assistant", content: res.reply, tools: res.tool_calls.map((t) => t.name) }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className={`assistant${open ? " assistant--open" : ""}${wide ? " assistant--wide" : ""}`} aria-label="AIDE-M assistant" aria-hidden={!open}>
      <div className="assistant-head">
        <span className="assistant-title">
          <Sparkles size={18} aria-hidden /> Ask AIDE-M
        </span>
        {turns.length > 0 && (
          <button type="button" className="assistant-icon-btn" onClick={() => { setTurns([]); setError(null); }}>
            New chat
          </button>
        )}
        <button type="button" className="assistant-icon-btn" onClick={() => setWide((w) => !w)} aria-label={wide ? "Narrow panel" : "Widen panel"}>
          {wide ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button type="button" className="assistant-icon-btn" onClick={onClose} aria-label="Close assistant">
          <X size={16} />
        </button>
      </div>

      <div className="assistant-body">
        {turns.length === 0 ? (
          <div className="assistant-empty">
            <svg className="assistant-art" viewBox="0 0 120 96" aria-hidden>
              <rect x="6" y="18" width="84" height="66" rx="10" fill="var(--mg-surface-sunk)" />
              <rect x="20" y="34" width="40" height="8" rx="4" fill="var(--mg-border)" />
              <rect x="20" y="48" width="30" height="8" rx="4" fill="var(--mg-canopy)" />
              <rect x="20" y="62" width="22" height="8" rx="4" fill="var(--mg-border)" />
              <path d="M70 84 C70 70 74 62 80 58 M80 58 C84 64 88 72 88 84 M80 58 L80 46" stroke="var(--mg-root)" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="92" cy="22" r="18" fill="var(--mg-canopy)" />
              <path d="M92 11 L95 19 L103 22 L95 25 L92 33 L89 25 L81 22 L89 19 Z" fill="var(--mg-propagule)" />
            </svg>
            <h2 className="assistant-heading">Ask about sites, promises and evidence</h2>
            <p className="assistant-sub">Pick a question or ask your own.</p>
            <div className="assistant-suggest">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button key={text} type="button" className="assistant-card" onClick={() => ask(text)}>
                  <Icon size={18} aria-hidden />
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="assistant-thread">
            {turns.map((t, i) => (
              <li key={i} className={`assistant-msg assistant-msg--${t.role}`}>
                {t.role === "assistant" ? (
                  <>
                    {t.tools && t.tools.length > 0 && (
                      <div className="assistant-tools">
                        {[...new Set(t.tools)].map((n) => <span key={n} className="assistant-tool">{TOOL_LABEL[n] ?? n}</span>)}
                      </div>
                    )}
                    <Markdown text={t.content} />
                    <span className="assistant-ai">AI-generated from AIDE-M data. Check the cited sources.</span>
                  </>
                ) : (
                  <p>{t.content}</p>
                )}
              </li>
            ))}
            {busy && <li className="assistant-msg assistant-msg--assistant assistant-thinking">Checking the evidence…</li>}
          </ol>
        )}
        {error && <p className="mg-alert assistant-error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>

      <form className="assistant-input" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <textarea
          ref={inputRef}
          value={draft}
          rows={1}
          maxLength={4000}
          placeholder="Ask AIDE-M…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); }
          }}
        />
        <button type="submit" className="assistant-send" disabled={busy || !draft.trim()} aria-label="Send">
          <ArrowUp size={18} />
        </button>
      </form>
    </aside>
  );
}
