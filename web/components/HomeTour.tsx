"use client";

// First-visit guided tour of the public map (react-joyride v3). Starts by itself once per browser (localStorage,
// lib/tour.ts) and again whenever the header's Help button asks. Steps whose target is not on screen are left out.

import { useCallback, useEffect, useState } from "react";
import { ACTIONS, EVENTS, Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { markTourSeen, onTourRequest, setAssistantOpen, tourSeen } from "@/lib/tour";

const STEPS: Step[] = [
  {
    target: '[data-tour="records"]',
    title: "Public promises",
    content: "Each pin is a promise made public before the money moved. Pick one to see if the evidence agrees.",
    placement: "right",
  },
  {
    target: '[data-tour="mangrove"]',
    title: "Mangroves in the Philippines",
    content: "Mangrove area from Global Mangrove Watch, with the change since 1985.",
    placement: "right",
  },
  {
    target: '[data-tour="gainloss"]',
    title: "Gain and loss",
    content: "Show where mangroves were gained and lost on the map.",
    placement: "right",
  },
  {
    target: '[data-tour="legend"]',
    title: "Legend",
    content: "Turn layers and pin types on or off, and set the mangrove layer's opacity.",
    placement: "left",
  },
  {
    target: '[data-tour="controls"]',
    title: "Map controls",
    content: "Full screen, share this view, basemap, 3D and zoom.",
    placement: "left",
  },
  {
    target: '[data-tour="nav"]',
    title: "Go further",
    content: "Browse candidate sites, or add evidence yourself. No account needed.",
    placement: "bottom",
  },
  {
    target: '[data-tour="ask"]',
    title: "Ask AIDE-M",
    content: "Ask questions about any site or promise.",
    placement: "bottom",
  },
  {
    target: ".assistant",
    title: "Ask in plain words",
    content: "Type a question, like “Why does this site show a conflict?”. Answers come from the same public data you see on the map.",
    placement: "left",
    // Open the panel first, and give it time to slide in before the spotlight measures it.
    before: async () => {
      setAssistantOpen(true);
      await new Promise((r) => window.setTimeout(r, 450));
    },
  },
];

// Targets live in their own scroll containers (the side panel, the legend), which the page-level scroll that Joyride
// does cannot reach. Bring each one into view inside its container first, then let the spotlight measure it.
async function bringIntoView(data: { step: { target: Step["target"] } }): Promise<void> {
  // The assistant panel would cover the legend and map controls; only the last stop opens it.
  setAssistantOpen(false);
  const t = data.step.target;
  const el = typeof t === "string" ? document.querySelector(t) : null;
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  await new Promise((r) => window.setTimeout(r, reduce ? 50 : 350));
}

const present = (s: Step) => typeof s.target !== "string" || !!document.querySelector(s.target);

export default function HomeTour({ onBeforeStart }: { onBeforeStart?: () => void }) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  // A new key remounts Joyride, so a replay always starts from the first step.
  const [round, setRound] = useState(0);

  const start = useCallback(() => {
    onBeforeStart?.();
    // Let the page settle (e.g. the record list come back) before checking which targets are on screen.
    window.setTimeout(() => {
      const on = STEPS.filter(present);
      if (!on.length) return;
      setSteps(on);
      setRound((r) => r + 1);
      setRun(true);
    }, 400);
  }, [onBeforeStart]);

  useEffect(() => {
    const off = onTourRequest(start);
    // First visit: start once the map shell is on screen.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (tourSeen()) return window.clearInterval(timer);
      if (document.querySelector('[data-tour="records"]') || ++tries > 20) {
        window.clearInterval(timer);
        start();
      }
    }, 300);
    return () => {
      off();
      window.clearInterval(timer);
    };
  }, [start]);

  function onEvent(data: EventData) {
    const ended =
      data.status === STATUS.FINISHED ||
      data.status === STATUS.SKIPPED ||
      data.type === EVENTS.TOUR_END ||
      data.action === ACTIONS.CLOSE;
    if (ended) {
      markTourSeen();
      setRun(false);
    }
  }

  if (!steps.length) return null;
  return (
    <Joyride
      key={round}
      run={run}
      steps={steps}
      continuous
      onEvent={onEvent}
      locale={{ back: "Back", close: "Close", last: "Done", next: "Next", skip: "Skip tour" }}
      options={{
        before: bringIntoView,
        skipScroll: true,
        skipBeacon: true,
        showProgress: true,
        buttons: ["back", "skip", "primary"],
        primaryColor: "var(--mg-tidal)",
        textColor: "var(--mg-text)",
        backgroundColor: "var(--mg-surface)",
        arrowColor: "var(--mg-surface)",
        overlayColor: "rgba(4, 30, 26, 0.55)",
        spotlightRadius: 12,
        zIndex: 1000,
      }}
    />
  );
}
