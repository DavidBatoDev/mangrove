# ADR-051 — The product is named AIDE-M

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team (applied by the orchestrator at the team's request)
- **Related:** DEC-021, ADR-043

### Context

The product shipped under the name "Mangrove" (ledger §1, ADR-043). That is also the name of the ecosystem
it is about, so "Mangrove" on a slide or a page reads as a topic, not as a product, and copy such as
"mangrove promises on Mangrove" is ambiguous. The team chose a new public name before the pitch.

### Why now

The pitch deck, the web header and the MCP server instructions are what judges see today. A name that can
be confused with the subject weakens all three.

### Options considered

1. **Keep "Mangrove"** — pros: no change / cons: the product and the ecosystem share one word.
2. **AIDE-M, "Accountability In D' Environment · Mangrove"** (the team's first draft) — pros: the team's own / cons: "D'" reads as slang in written copy.
3. **AIDE-M, "Accountability In Delivery & Evidence · Mangrove"** — pros: D and E name the product's two halves (was the promise delivered, what the evidence shows); "aide" also means a helper / cons: an acronym needs its meaning shown once.

### Decision

- The public product name is **AIDE-M**, written in capitals with the hyphen.
- Its meaning is **Accountability In Delivery & Evidence · Mangrove**. It appears only in small type under the
  wordmark (logo lockup, site header, deck cover) and at the first mention in a document. Everywhere else the
  name is AIDE-M alone.
- "Mangrove" and "mangrove" stay where they mean the ecosystem, a dataset (Global Mangrove Watch) or a map
  layer.
- Technical identifiers are unchanged: the repo name, the `mg-` CSS prefix, `brand/mangrove.css`, the
  `brand/logo/mangrove-*.svg` file names, the `bon-mangrove` AWS resources and the Figma file URL.

### Why this option

It keeps the team's acronym and fixes the one letter that would not read well on a slide. The meaning repeats
the brand idea: the promise above, the evidence below.

### Overrides

- **Prior ADRs:** ADR-043, for the name of the brand kit and product only ("named **Mangrove**").
- **Doc or plan truth:** `docs/ledger.md` §1 (public product name), `brand/BRAND.md`, the product-name
  mentions in `docs/`, `AGENTS.md`, `README.md`, the web header and page title, the API title and MCP
  instructions, and the Figma deck. Updated in the same change.
- **Out of scope:** Accepted ADRs and sent notes keep their wording.

### Consequences

- **Easier:** the product name no longer collides with the subject.
- **Harder or owed:** the Quick MCP connector shows the new server instructions after the next deploy; the
  Figma file slug still says "Mangrove" until someone renames the file in Figma.
- **Follow-up:** none.
