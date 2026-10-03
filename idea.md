---
status: draft
schema_version: 3.0.0
origin: Team Google Doc "mangrove" (Product, context and adrs tabs; ADR-001 to ADR-030) plus the team's simplified product summary of 2026-10-03
payer_status: assumed
---

# Idea: Mangrove — a public map of mangrove funding promises in the Philippines

## 1. Problem statement

Mangroves protect Philippine coasts from storms, and companies, foundations and NGOs spend money to
restore them. Two things go wrong.

**Before the money moves**, it is hard to tell which sites are worth funding. The evidence is scattered
across satellite maps, NGO reports and field photos, each with its own date, resolution and limits, and a
funder has to reconcile them by hand [R03][R04][R05][R09]. Some sites that look good on a map turn out
to be active fishponds or contested land [R09].

**After the money moves**, a funder announces "we planted 10,000 trees", but almost nobody can check
whether the work happened or whether the mangroves actually grew back. Nobody records why the money was
committed or what result was expected, so later reports have nothing to be compared against [R05][R10].

## 2. Target segment

- **Who pays (hypothesis):** restoration funders that split limited money across several candidate
  mangrove sites in the Philippines — corporate sustainability/CSR teams, foundations, NGOs and
  restoration-campaign operators [ADR-011, ADR-025]. Examples of this behaviour already exist:
  Manulife Philippines with Haribon [R17], Maybank with FEED in Bulacan [R18], RAFI with ETI in Lian
  [R19], GCash GForest [R13].
- **Who reads, without paying:** local communities, journalists, local governments, auditors and other
  funders. They make the transparency matter [ADR-013 — participants, not assumed buyers].
- **Frequency:** a funder faces the choice each funding cycle and has to defend it for years afterwards.
  The exact cycle length is unknown.

## 3. Evidence

This is desk research, not interviews. No funder has been interviewed and no money has been committed.

- Remote screening produces false positives. Manila Bay candidates still needed field checks for
  active or abandoned fishponds, water conditions, substrate, ownership and Fishpond Lease Agreement status.
  > [!evidence] Type: did | Source: R09 (Wetlands International Philippines, Manila Bay ground-truthing, 2024) | Date: 2024
- Poor Philippine rehabilitation outcomes have historically come from wrong species and site
  selection. This describes a mechanism; it is not a current failure rate.
  > [!evidence] Type: did | Source: R01 (Primavera & Esteban 2008) | Date: 2008
- Funders struggle to find the right restoration projects. TerraMatch screens proposals, sets
  baselines after funding, and monitors with reports, geotagged photos, satellite analysis and field visits.
  > [!evidence] Type: did | Source: R10 (WRI TerraMatch) | Date: 2026
- Businesses and philanthropies lack access to credible, investment-ready nature projects.
  > [!evidence] Type: did | Source: R11 (WWF NbS Origination Platform) | Date: 2026
- Project variability and high transaction costs hold back nature-based-solutions finance, and
  standardised data and transparent processes help.
  > [!evidence] Type: said | Source: R12 (Climate Policy Initiative) | Date: 2026

| Test | Pass / Fail | Why |
|------|-------------|-----|
| Real | Pass | R09, R10 and R11 show the site-selection and credibility problem in practice. |
| Large | Unknown | Not sized. |
| Significant | Pass | A bad site choice can waste the money outright [R01][R09]. |
| Urgent | Unknown | Current friction is documented [R12]; purchase urgency is not. |

## 4. Root cause (the WHY)

1. Funders cannot compare sites cheaply → the evidence is spread across tools that each answer only part
   of the question and disagree without saying so [R03][R05].
2. Broad maps cannot settle local facts → hydrology, substrate, current land use and tenure need ground
   evidence that maps lack [R04][R09].
3. Nobody records the funding promise → the decision's rationale and expected result are never written
   down in a form outsiders can see.
4. Later reports can't be checked → with no baseline, "we planted 10,000 trees" can't be compared with
   anything, and the public can't tell activity from recovery.

## 5. Market & alternatives

- **Size band:** unknown — not sized.
- **Reachability:** `[assumption]` Philippine corporate CSR and sustainability teams already running mangrove
  partnerships [R17][R18][R19]; the GForest partner network [R13][R14].
- **Top 3 alternatives and where each falls short:**
  1. Global Mangrove Watch [R03][R04] shows extent, change and broad restoration potential, but keeps no
     site-level decision record and holds no ground evidence.
  2. The Mangrove Restoration Tracker Tool [R05][R34] tracks the project lifecycle, but it is a
     tracker: it does not reconcile sources before funding or publish a promise that outsiders check.
  3. Press releases and CSR reports ("do nothing") announce trees planted with no baseline, so nobody can
     check them.
- TerraMatch [R10] and WWF's origination platform [R11] cover screening and origination. Our research
  does not show that cross-source reconciliation, a published promise and a later check are solved
  together as one workflow, and it does not prove that they aren't.

## 6. Value proposition

For **restoration funders** who **can't easily tell which mangrove sites deserve money, or show later that
their spending worked**, this is a **public record of funding promises** that **puts the satellite and
ground evidence side by side before the money moves, then shows everyone whether the promise came true**,
unlike **mangrove maps and project trackers**, because **it locks the promise in public before funding and
checks it against independent evidence afterwards**.

One sentence: "Companies fund mangrove restoration and announce the planting. We make the promise public
before the money moves, then show everyone whether it came true."

## 7. Feature set

| `F-###` | Feature | Priority | Solves (problem from §1/§3) | Why not / what would change it |
|---------|---------|----------|-----------------------------|--------------------------------|
| F-001 | Candidate sites: 3–5 Manila Bay candidate polygons a funder can browse | Must | Before: no common starting set to compare | — |
| F-002 | Evidence dossier per site: every evidence item keeps its source, version, dates, method, resolution, limitation and link | Must | Before: scattered evidence, unclear provenance | — |
| F-003 | Source adapters: Global Mangrove Watch history (pre-ingested) and Sentinel-2 current condition (live via Copernicus, with a stored-snapshot fallback) | Must | Before: funder must reconcile tools by hand | — |
| F-004 | Field evidence submission: a partner uploads a photo, GPS location, an observation and a mapped area | Must | Before: map-only screening misses fishponds and land conflicts | — |
| F-005 | Three-question assessment per site — was this mangrove before, what's there now, what do people on the ground say — each marked supported, conflicting or missing | Must | Before: hidden disagreement between sources | — |
| F-006 | Side-by-side comparison of 3–5 sites | Must | Before: hard to tell which sites are worth funding | — |
| F-007 | Locked promise: the funder picks a site and publishes a record — why, planned action, expected result, check dates, unknowns, evidence used — that can never be edited or deleted | Must | After: no baseline to check against | — |
| F-008 | Public map of the Philippines with a pin per promise; zoom from country to site; click to read the record | Must | After: the public can't find or read promises | — |
| F-009 | Later evidence added to the same record, answering two separate questions: did the work happen, did the mangroves come back ("too early to tell" until the record's check date) | Must | After: nobody checks whether the work happened or recovery appeared | — |
| F-010 | Conflict flagging: when sources disagree (e.g. a report says 8 ha and the partner's mapped area is 5 ha) the record shows a conflict and the pin turns red | Must | After: deviations stay hidden | — |
| F-011 | Amazon Quick analyst: a Quick agent answers "why does Site A differ from Site B?" from our evidence through a read-only MCP server | Must | Before: comparing evidence takes manual analyst work | — |
| F-012 | Record integrity check: anyone can confirm a record and its timeline are unchanged since publication | Should | After: "nobody can edit it" needs to be checkable, not just asserted | — |
| F-013 | In-app plain-language summary of a site's evidence (the model narrates; it never decides a status or makes up a number) | Could | Before: dossiers are dense to read | — |
| F-014 | Upload a new candidate site polygon | Could | Before: limited to pre-loaded sites | — |
| F-025 | Mangrove context from Global Mangrove Watch: mangrove area inside and near each site 1985–2025, a Manila Bay extent map layer, and a Philippines extent and change card | Should | Before: a funder sees one site in isolation, with no sense of the mangrove trend around it | — |
| F-015 | Restoration success score or probability | Won't | Would compress the decision into one number | Reason: fake precision; remote evidence cannot predict success [ADR-023, ADR-028]. Reconsider if: a validated outcome model exists from longitudinal data. |
| F-016 | AlphaEarth satellite-embedding evidence | Won't | Similarity and change detection | Reason: embeddings are not interpretable ecological measurements, and they cost build time [ADR-023, ADR-030]. Reconsider if: the core loop is done with time to spare. |
| F-017 | Live ODK Central integration for field submissions | Won't | Scaled field collection | Reason: a later ground-evidence integration; in-app upload proves the loop [ADR-030]. Reconsider if: a partner already runs ODK forms. |
| F-018 | MRTT project import | Won't | Reuse existing lifecycle data | Reason: no documented live API to depend on; MRTT is a schema reference [ADR-030]. Reconsider if: a partner exports MRTT data for a real site. |
| F-019 | In-app billing and subscriptions | Won't | Revenue collection | Reason: willingness to pay is untested [ADR-029]. Reconsider if: a funder commits to pay after the hackathon. |
| F-020 | Sentinel-1 radar evidence | Won't | Evidence under cloud cover | Reason: optional; Sentinel-2 with a fallback snapshot proves the loop. Reconsider if: cloud cover blocks every Sentinel-2 window for the demo sites. |
| F-021 | Private funder shortlists (candidate comparisons hidden from the public) | Won't | Funder confidentiality before a decision | Reason: all evidence in the demo is public-source or partner-published, and keeping reads public keeps the Amazon Quick connection unauthenticated. Reconsider if: a paying funder needs confidential screening. |

## 8. Success metrics

- **Activation:** a funder goes from comparing sites to a locked, published promise in one session.
- **Retention:** a funder or partner comes back to add later evidence to an existing record.
- **Revenue / value:** a funder pays for an assessment, a subscription or monitoring. Untested;
  it is the first thing to test after the hackathon [ADR-029]. No targets are set; there is no baseline yet.
- **Hackathon success test (from the source doc, Product §12):** combining sources reveals a
  funding-relevant difference, contradiction or missing fact that a single public map does not show.

## 9. Constraints, risks & kill criteria

**Single riskiest assumption:** funders will pay to compare sites and publish their promise, i.e. a public,
checkable record is something they want rather than something they avoid.

**Kill criteria (explicit fail-states):**
- Regulatory: none known. Land tenure, permits and carbon credits are excluded from scope (§10).
- Unit economics: unknown until a funder states a price.
- Technical: reopen or simplify if the MVP cannot tell sites apart beyond what Global Mangrove Watch
  alone shows, or cannot explain the difference with traceable evidence [ADR-021, ADR-027].
- Product: reopen if no plausible funder would change where they investigate or fund because of it
  (source doc Product §12).

**Avoid (optional, not a gate):**
- Saying "we know which site will succeed" — say the evidence makes a site stronger, weaker or
  more uncertain than the alternatives. Revisit if a validated outcome model exists [Product §10].
- Quoting "80–90% of Philippine mangrove projects fail" — the 2008 review documents mechanisms, not a
  current rate [ADR-002]. Revisit if a current national study is published.
- Saying "nobody monitors survival" — some GForest partners do monitor [ADR-009].
- Claiming satellite data shows individual seedlings — 10–20 m pixels cannot see them [ADR-006, ADR-023].
- Claiming public data, AI or the map is the moat — they are accessible ingredients [ADR-026].
- Claiming the record enforces anything — it makes deviations visible; stakeholders act [ADR-024].
- Calling remotely screened sites "qualified" — local conditions can rule them out [R09].

## 10. Out of scope (for now) — non-feature exclusions only

- Certifying restoration success — the product shows evidence; it does not certify.
- Approving or allocating funding — the funder decides [Product §0].
- Land titles, Fishpond Lease Agreements, legal permits, community-consent certification — remote and
  self-reported evidence cannot establish them [ADR-022].
- Carbon-credit verification — a separate regulated domain.
- Selling or brokering projects (marketplace, transaction fees) — needs deal flow, trust and legal
  structure the MVP lacks [ADR-029].
- Countries outside the Philippines, and regions beyond the Manila Bay demo area, this cycle.
- Government procurement as the primary market [ADR-010]; consumers as payers [ADR-013].

Source IDs `[R##]` resolve to the source register in the team Google Doc (context tab §5); `[ADR-###]`
resolve to its adrs tab. See `docs/adr/README.md`.
