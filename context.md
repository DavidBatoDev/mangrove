---
# FMD context block — schema 1.1.0
team_size: 2                # David and Ethan (ADR-039); the handbook cap is 4 members per team [R38]
mode: team
build_type: hackathon
time_budget: 12h
judged: true
computes_numbers: true      # areas, satellite class fractions, area-discrepancy ratios
exposed_surface: true       # public web app, REST API, public MCP endpoint for Amazon Quick
outlives_demo: false
selection_mode: auto

competition:
  name: Build Over Nights 2026 (October 3–4, 2026; AWS Office, Arthaland Century Pacific Tower, Taguig)
  theme: Climate Change track — "Smarter Ecosystems" — bring transparency to disaster mitigation; make public infrastructure and environmental tracking visible and accountable
  format: "Semifinals: 2-min pitch + 2-min Q&A, projects submitted in advance, judges review submissions for 1h30 before pitches. Grand Finals (top 3 per track): 5-min pitch + 5-min Q&A, four judges, emphasis on live demo and technical defense."
  rubric:                   # semifinal weights from the handbook PDF [R38]
    - MVP & Technical Implementation (Functionality & Platform Compliance): 30
    - Problem Statement & Domain Fit (Pain Point & Contextual Utility): 25
    - Technology & Automation Judgment (Solution Implementation Judgement): 25
    - Innovation & Approach (Originality & Method): 15
    - Live Pitch & Defensive Engagement (Hook & Q&A Handling): 5
  finals_rubric:            # Grand Finals weights from the handbook PDF [R38]
    - Real-World Impact & Problem Significance: 30
    - Practical Deployment & Feasibility: 25
    - Scalability & Long-Term Viability: 20
    - Innovation & Solution Design: 15
    - Presentation & Professional Defense: 10
  hard_requirements:
    - Kiro used as the primary development environment (missing platform = immediate 5-point deduction)
    - Amazon Quick used properly (missing platform = immediate 5-point deduction)
    - Functional MVP inside the 12-hour build window, ready for a live demo
    - GitHub repository accurate — judges may verify claimed features exist in source
    - Submission form completed in advance (fields in §1.6; the handbook says they may change during the event)
---

# Context — hackathon, research, sources

The frontmatter above is the machine-read intake that sized the doc set. The body below brings the team
Google Doc's "context" tab into the repo, so that every teammate and agent can read it without the doc.
It is context, not the product spec: the product lives in [`idea.md`](idea.md) and [`docs/prd.md`](docs/prd.md).

**Read order:** the PRD for what we build → this file when competition rules or evidence matter → the
ledger and ADRs ([`docs/ledger.md`](docs/ledger.md), [`docs/adr/`](docs/adr/)) when the reason behind a decision matters.

`[R##]` citations used across the repo resolve to §7 below.

## 1. Hackathon context — keep separate from the product

### 1.1 Operational source of truth

- **Event:** Build Over Nights 2026, October 3–4, 2026, at the AWS Office (15th and 21st floors), Arthaland Century Pacific Tower, 4th Ave and 30th St, Taguig, Metro Manila [R37].
- **Build period:** 12 hours. Kiro and Amazon Quick are required for every team [R37].
- **Confirmed by the handbook PDF [R38]:** maximum of 4 members per team; development starts **10:00 PM, October 3** and ends **10:00 AM, October 4**. Semifinal pitching runs 1:10–2:10 PM on October 4; Grand Finals pitching 3:30–5:42 PM. The prohibition on pre-built products comes from earlier participant material and is not restated in the handbook [R37][R38].
- When the handbook and the public site disagree, the current handbook and on-site organizer instructions win; the public site has shown an older event context [R29][R37].

### 1.2 Climate Change track — "Smarter Ecosystems"

- **Problem framing:** worsening Philippine climate hazards expose weaknesses in public works and mitigation plans. The central accountability failure is that local governments and citizens often cannot verify whether flood-control systems or climate-adaptation projects are actually complete. The challenge is to close the gap between theoretical climate planning and physical reality [R37].
- **Build instruction:** help communities adapt by bringing transparency to disaster mitigation. Public infrastructure and environmental tracking should be visible to the public. Choose an appropriate technology approach that empowers vulnerable groups and holds mitigation systems accountable against escalating seasonal threats [R37].

### 1.3 Semifinals — format and judging

- After the build, ten teams per track present. All tracks pitch simultaneously. **2 minutes to pitch, 2 minutes of Q&A.** Projects are submitted in advance; judges get **1 hour 30 minutes** to review submissions before the live pitches [R37].
- **Criteria and weights [R38]:** MVP & Technical Implementation **30%** (Functionality & Platform Compliance) · Problem Statement & Domain Fit **25%** (Pain Point & Contextual Utility) · Technology & Automation Judgment **25%** (Solution Implementation Judgement) · Innovation & Approach **15%** (Originality & Method) · Live Pitch & Defensive Engagement **5%** (Hook & Q&A Handling) [R37][R38].
  - *Functionality & Platform Compliance:* stability, utility, execution speed, effective Kiro integration, proper Quick use. **Each missing required platform = immediate 5-point deduction.**
  - *Pain Point & Contextual Utility:* is the problem real, urgent, domain-specific and tied to actual workflows rather than a theoretical need.
  - *Solution Implementation Judgement:* rewards choosing the appropriate approach, and recognizing when a simpler, deterministic or established solution beats a more complex technology.
  - *Originality & Method:* why the approach is meaningfully different from existing tools or standard alternatives.
  - *Hook & Q&A Handling:* the 2-minute live pitch, judge interest, and the team's ability to defend functional choices. Platform minipitch submissions are background context for judges.
- **Rubric weights:** stated above, from the handbook PDF [R38]. The Canva copy's accessible text did not expose them [R37].

### 1.4 Grand Finals — format

- Top three teams per track advance to a dedicated panel of four judges; placements are Champion, 1st Runner-Up and 2nd Runner-Up per track. **5 minutes to pitch, 5 minutes of Q&A**, emphasis on live demonstration, technical execution and defending the solution [R37].
- **Grand Finals criteria and weights [R38]:** Real-World Impact & Problem Significance **30%** · Practical Deployment & Feasibility **25%** (operational, regulatory and systemic constraints) · Scalability & Long-Term Viability **20%** (market viability, cost-efficiency, path to adoption) · Innovation & Solution Design **15%** · Presentation & Professional Defense **10%**.

### 1.5 Required technology

- **Kiro** is mandatory and expected to be the primary development environment. The handbook names agentic engineering, spec-driven development and parallel agent workflows as intended uses during the sprint [R37].
- **Amazon Quick** is mandatory and is framed as the agentic AI orchestration layer: connecting data sources, automating workflows, and synthesizing research into actionable outputs. That is a stronger expectation than just mentioning Quick in the demo [R37].
- **How this product uses them:** a Quick agent answers "why does Site A differ from Site B?" over our read-only MCP server ([`docs/api.md`](docs/api.md) API-015); Kiro specs keep requirements, design and tasks traceable during the build. Neither is presented as the product's own intelligence [R35][R36][ADR-030].

### 1.6 Submission, demo and technical defense

- Avoid purely conceptual or "toy" projects. Prioritize high-impact features and deliver a functional MVP within the window, ready for a live demo [R37].
- Keep the GitHub repository accurate: judges may verify that claimed features are actually implemented in the source. Be ready to defend technical decisions; judges consider technical implementation, feasibility, scalability, security, overall quality and real-world applicability [R37].
- **Submission form fields [R38]** ("may be subject to change as the event progresses"): Project Name · Project Overview · Target Market · The "Pain Point" (Evidence) · The "How" (Solution) · Strategic Integration (how Kiro, Quick and AWS infrastructure were used) · Sustainability & Growth · Video Demonstration (YouTube, Loom or Google Drive link) · GitHub Repository Link · Google Play Store Share Link / Website URL.

### 1.7 Logistics that can affect execution

- Smart casual attire and closed shoes. Coordinate large luggage or special equipment in advance. Bring laptops, devices, extension wires, compact comfort items. Meals are provided [R37].
- If a team leaves before midnight and plans to return in the morning, tell organizers beforehand; it may disadvantage the team if it is late for its pitch. On-site organizer support, a help desk and the official group chat are available [R37].

### 1.8 Source inconsistencies and unresolved details

- The Focus Tracks page lists Climate Change, Educational Crisis, and Health & Well-Being, while the FAQ says "all four tracks" pitch simultaneously. No fourth track is identified — do not invent one [R37].
- Day 1 and Day 2 schedules are in the handbook PDF [R38]: event start 8:15 PM Oct 3, development 10:00 PM–10:00 AM, semifinals 1:10 PM, finalists announced ~2:55 PM, Grand Finals 3:30 PM, awarding 6:45 PM Oct 4. On-site organizer instructions still win if they differ.

## 2. Research conclusions behind the product

### A. Site selection matters
- Historical Philippine evidence links poor rehabilitation outcomes to inappropriate species and site selection — e.g. planting *Rhizophora* on exposed or low-intertidal areas where mangroves were not naturally suited. This is a historical mechanism, **not** a current national failure rate [R01].
- A 2022 systematic review of 335 Southeast Asian mangrove-restoration studies covers ecological and social attributes and reinforces that outcomes depend on more than planting trees [R02].

### B. Broad data finds opportunities but cannot prove local feasibility
- Global Mangrove Watch provides extent/change information and a restoration-potential layer built from historical loss and environmental variables. Its own guidance says practical planning still needs local ecological, social and economic knowledge [R03][R04].
- Wetlands International's 2024 Manila Bay work is the concrete Philippine warning against overclaiming: spatially identified candidates still needed field checks for active or abandoned fishpond use, water conditions, substrate, ownership and Fishpond Lease Agreement status, and some issues could hamper restoration [R09].

### C. Monitoring and project tracking already exist
- The Mangrove Restoration Tracker Tool records and tracks projects across their lifecycle with standardized field and desk-based information — so we must not be "another tracker" [R05].
- PhilSA already runs a nationwide mangrove-map validation program using field validation and ODK Collect, so ground evidence is a credible escalation path when remote evidence is insufficient [R08].

### D. Funders value screening and credible opportunities
- WRI's TerraMatch says funders struggle to find the right restoration projects; it screens proposals with standard criteria, sets baselines after funding, and monitors with project reports, geotagged photos, satellite analysis and field visits. This supports the value of screening and transparent evidence, not willingness to pay for our product [R10].
- WWF's Nature-Based Solutions Origination Platform exists because businesses and philanthropies lack access to credible, large-scale projects; it curates investment-ready opportunities with measurable outcomes [R11].
- Climate Policy Initiative (2026): nature-based solutions face project variability and high transaction costs; standardization, data and transparent processes matter for investment readiness [R12].

### E. Product conclusion for the hackathon
Do not attempt full investment readiness or legal due diligence. Focus on the environmental decision, preserve the rationale publicly, and connect it to later evidence. The team's simplified version (2026-10-03) expresses this as three questions per site and a public map of locked promises — see [`docs/ledger.md`](docs/ledger.md) DEC-002.

### F. Pressure test of the thesis

| Test | What the evidence actually supports |
|------|-------------------------------------|
| **Decision pain?** | Yes. TerraMatch says funders struggle to find the right projects and uses structured screening; WWF's platform exists because businesses and philanthropies lack credible projects [R10][R11]. |
| **Consequential?** | Yes. Poor outcomes are linked to inappropriate species and site selection; Manila Bay candidates still needed checks for fishpond use, water, substrate, ownership and tenure [R01][R09]. |
| **Already solved?** | Partly. GMW provides broad opportunity and change data, MRTT tracks the lifecycle, TerraMatch screens projects. That argues strongly against another map or tracker. It does not establish that cross-source reconciliation, a funding rationale and a later promise-versus-reality check are solved as one workflow [R03][R04][R05][R10]. |
| **Current pressure?** | Current, but immediate purchase urgency is not proven [R12]. |
| **Commercially plausible?** | Plausible, not validated. Screening and origination already consume organizational effort; willingness to pay, price and first-converting buyer are unknown [R10][R11][R12]. |
| **Technically feasible?** | Yes for a narrow MVP: GMW v4.1 structured extent data, Copernicus Sentinel-2 APIs including polygon statistics, ODK submissions with geometry and attachments, MRTT structured lifecycle data — a three-source loop, not seven integrations [R31][R32][R33][R34]. |
| **Differentiated?** | Potentially. The mechanism — reconcile evidence around one funding decision, expose conflicts and gaps, preserve the rationale, compare later reality with that baseline — fills a gap the research supports, but market-level uniqueness is not proven [R03][R05][R10][R12]. |
| **Accountability mechanism?** | Supported as traceability, not enforcement. MRTT links baseline, intervention and monitoring; TerraMatch sets baselines and combines reports, photos, satellite and field visits. Nothing shows a public record by itself creates consequences [R05][R10]. |
| **Still unproven** | The first paying buyer; willingness to pay and price; whether integrated evidence changes a real allocation decision better than existing workflows; whether the longitudinal decision-to-outcome dataset becomes a defensible advantage. |

## 3. Data sources and what each can actually tell us

| Source | Useful for | Limit |
|--------|-----------|-------|
| **Global Mangrove Watch** | Habitat extent, historical change/loss, alerts, contextual layers, broad restoration potential [R03][R04] | Cannot prove land tenure, detailed hydrology, community acceptance, intervention quality or future success |
| **Sentinel-2** | Recent optical surface condition, vegetation/water patterns, time-series change; 13 spectral bands at 10/20/60 m [R06] | Clouds and optical ambiguity; cannot claim individual-seedling survival from 10 m pixels |
| **AlphaEarth / Google Satellite Embedding** (not built — F-016 Won't) | 10 m annual embeddings for classification, similarity, regression, change detection [R07] | Learned features, not interpretable ecological measurements; supporting evidence only |
| **Sentinel-1** (not built — F-020 Won't) | Radar context under cloud cover | Keep optional unless it clearly improves the demo |
| **MRTT** (not built — F-018 Won't) | Standard restoration lifecycle; structuring baseline/intervention/outcome records [R05] | Already a tracker; do not rebuild it |
| **Project / field / community evidence** | Site polygons, proposal claims, geotagged photos, field observations, monitoring reports, local knowledge, later verification | Quality varies; preserve provenance and flag missing evidence rather than treating all sources as equally reliable |
| **PhilSA / ODK ground validation** | Precedent for smartphone-based location, species and validation submissions that refine mangrove maps [R08] | Precedent, not an integration in this build (F-017 Won't) |

## 4. Integration and technical feasibility

- **Decision-layer implication:** integrate evidence around a funding decision, not maps for their own sake. The useful unit is a site-level evidence dossier that preserves provenance, limitations, contradictions, missing evidence and later updates. This extends ADR-007 without reopening ADR-005.
- **Global Mangrove Watch v4.1:** annual extent for 41 epochs, 1985–2025, at 30 m. Use for historical extent/change, not local feasibility [R31]. *Verified 2026-10-03:* v4.1.12 is on Zenodo (record 21346457) as a 41-band GeoTIFF stack (band 1 = 1985 … band 41 = 2025; DN 1 = mangrove) plus per-year GeoPackage vectors; JAXA's download requires email registration.
- **Copernicus Data Space:** catalog/STAC, processing and Statistical APIs. The Statistical API computes polygon-level statistics without downloading scenes, which makes Sentinel-2 a practical live source [R32]. *Verified 2026-10-03:* endpoint `https://sh.dataspace.copernicus.eu/statistics/v1`, OAuth client credentials, free tier 10,000 requests/month and 300/minute.
- **ODK Central:** REST/OData access to submissions, GeoJSON geometry and attachments — a credible later integration, not needed for the first demo [R33].
- **MRTT:** structures pre-restoration baseline, intervention and post-restoration monitoring, and supports export. Treat as a schema reference and possible import source; never depend on an undocumented live API [R34].
- **Amazon Quick:** agents analyze connected data and invoke connected tools, including remote MCP integrations. The clean role is an analyst interface over our evidence API, not the evidence engine [R35]. *Verified 2026-10-03:* remote servers only (streamable HTTP preferred), unauthenticated servers supported, tool schemas must be JSON Schema Draft 7+, 5-minute operation timeout, requires a Quick Enterprise subscription.
- **Kiro Specs:** generate requirements, design and implementation tasks. Use them to keep the build traceable and testable; do not present Kiro as the product's proprietary intelligence [R36]. *Verified 2026-10-03:* Kiro reads a root `AGENTS.md` automatically as steering.
- **Commercial implication:** the strongest near-term case is B2B decision infrastructure for organizations allocating restoration money: platform access, per-project assessment, monitoring/verification, later enterprise/API. Transaction fees only if the product actually intermediates capital. Market evidence supports screening and due-diligence friction, not willingness to pay for this product [R10][R11][R12].

## 5. Claim boundaries — do not oversell

- Do not say "we know which site will succeed." Say "the available environmental evidence makes this site stronger or weaker relative to the alternatives."
- Do not say "the most degraded site creates the most impact." Need, feasibility, potential benefit and uncertainty are separate.
- Do not output unsupported success probabilities or a fake universal impact score.
- Do not call remotely screened candidates "fully qualified sites"; local conditions can invalidate them [R09].
- Do not claim GMW, Sentinel, AlphaEarth, an LLM or a map interface as a moat; they are accessible ingredients.
- Do not claim the public record alone enforces accountability. It creates traceability and makes deviations inspectable; consequences belong to stakeholders.
- Do not claim a current Philippine national restoration failure rate from the 2008 Primavera & Esteban review; use it for historical failure mechanisms [R01].

## 6. Decision history (summary)

The canonical decision history is the Google Doc's adrs tab (ADR-001 to ADR-030), indexed in
[`docs/adr/README.md`](docs/adr/README.md). Decisions made from this repo onward start at ADR-031 and are
listed in [`docs/ledger.md`](docs/ledger.md).

## 7. Source register

**Core product and science sources**

- [R01] Primavera & Esteban (2008), A review of mangrove rehabilitation in the Philippines — <https://animorepository.dlsu.edu.ph/faculty_research/4038/>
- [R02] Gerona-Daga & Salmo (2022), systematic review of 335 Southeast Asian mangrove-restoration studies — <https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2022.987737/full>
- [R03] Global Mangrove Watch — current global map, extent/change/alerts — <https://www.globalmangrovewatch.org/>
- [R04] Global Mangrove Alliance — Mangrove Restoration Potential Map — <https://www.mangrovealliance.org/news/mangrove-restoration-potential-map>
- [R05] Global Mangrove Alliance — Mangrove Restoration Tracker Tool — <https://www.mangrovealliance.org/news/new-the-mangrove-restoration-tracker-tool>
- [R06] Copernicus Data Space — Sentinel-2 documentation — <https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html>
- [R07] Google Earth Engine — Satellite Embedding V1 / AlphaEarth Foundations — <https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_SATELLITE_EMBEDDING_V1_ANNUAL?hl=en>
- [R08] Philippine Space Agency — Mangrove Map Validation / ODK Collect — <https://philsa.gov.ph/mangrove-map-validation/>
- [R09] Wetlands International Philippines — Manila Bay restoration-site validation and ground truthing — <https://philippines.wetlands.org/blog/true-thick-or-thin-validation-and-ground-truthing-activity-for-potential-mangrove-restoration-sites-in-manila-bay/>
- [R10] World Resources Institute — TerraMatch — <https://www.wri.org/initiatives/terramatch>
- [R11] WWF — Nature-Based Solutions Origination Platform — <https://www.worldwildlife.org/our-work/forests/the-nature-based-solutions-origination-platform/>
- [R12] Climate Policy Initiative (2026) — Scaling NbS finance through standardization, data, and transparent processes — <https://www.climatepolicyinitiative.org/scaling-nature-based-solutions-finance-through-standardization-data-and-transparent-processes/>
- [R13] GCash Help — GForest overview — <https://help.gcash.com/hc/en-us/articles/47625000848537-What-is-GForest>
- [R14] Silliman University — GForest project first-year monitoring example — <https://su.edu.ph/su-gforest-project-marks-first-year-with-convention-stakeholder-recognition/>
- [R15] LSE Grantham Institute (2026) — blue finance and mangrove livelihoods in the Philippines — <https://www.lse.ac.uk/granthaminstitute/publication/scaling-up-blue-finance-to-support-mangrove-based-livelihoods-in-the-philippines/>
- [R16] SEC Philippines — MC No. 16, Series of 2025, sustainability disclosure/reporting guidance — <https://www.sec.gov.ph/mc-2025/sec-mc-no-16-series-of-2025/>
- [R17] Manulife Philippines / Haribon — private mangrove-restoration partnership example — <https://www.manulife.com/ph/whats-new/news/manulife-philippines-broadens-partnership-with-haribon-foundation-to-plant-15000-mangrove-trees-in-quezon-province>
- [R18] FEED / Maybank — Bulacan mangrove-restoration partnership example — <https://feed.org.ph/media-centre/press-releases-2025/maybanks-mangrove-planting-in-bulacan-strengthening-coastal-protection-community-partnerships-for-climate-resilience/>
- [R19] RAFI / ETI — Lian mangrove-rehabilitation collaboration example — <https://www.rafi.org.ph/2026/05/12/rafi-ott-eti-collaboration-mangrove-rehab-in-lian/>
- [R20] Commission on Audit / INTOSAI (2019) — National Greening Program performance audit — <https://www.intosai.org/fileadmin/downloads/focus_areas/SDG_atlas_reports/Philippines/Philippines_2019_E_15_FuRep_NGP.pdf>
- [R21] DENR — Enhanced National Greening Program IRR — <https://forestry.denr.gov.ph/fmb_web/wp-content/uploads/2023/06/eNGP-IRR.pdf>
- [R22] Davao del Sur PNAP study — site-level survival variation — <https://osjournal.org/ojs/index.php/OSJ/article/view/349>
- [R23] Davao Occidental study — site-level survival variation — <https://journalajfar.com/index.php/AJFAR/article/view/790>
- [R24] Philippine News Agency — DENR DAO 2026-30 / NbS monitoring and registry context — <https://www.pna.gov.ph/articles/1278647>
- [R25] Climate Change Commission — 2026 MRV/MEAL and transparency work — <https://climate.gov.ph/news/1134>
- [R26] Climate Change Commission — 2026 evidence-based ecological monitoring research — <https://climate.gov.ph/news/1140>
- [R27] WWF Philippines — Blue Carbon Stock Monitoring consultant role — <https://www.wwf.org.ph/jobs/consultant_for_the_blue_carbon_stock_monitoring_of_mangrove_restoration_sites_in_tbpps/>
- [R28] WWF Philippines — Blue Carbon Stock Monitoring research-assistant role — <https://www.wwf.org.ph/jobs/research_assistant_for_the_blue_carbon_stock_monitoring_of_mangrove_restoration_sites_in_tbpps/>
- [R29] Build Over Nights — public event site — <https://buildovernights.com/>
- [R30] Global Mangrove Alliance — Best Practice Guidelines for Mangrove Restoration — <https://www.mangrovealliance.org/wp-content/uploads/2023/10/Best-Practice-for-Mangrove-Restoration-Guidelines-v2.pdf>

**Data access and platform sources**

- [R31] JAXA/EORC — Global Mangrove Watch v4.1 dataset (1985–2025; 30 m) — <https://www.eorc.jaxa.jp/ALOS/en/dataset/gmw_e.htm> (Zenodo: <https://zenodo.org/records/21346457>)
- [R32] Copernicus Data Space Ecosystem — Sentinel Hub Statistical API — <https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html>
- [R33] ODK — Central API submission GeoJSON and attachments — <https://docs.getodk.org/central-api-submission-management/>
- [R34] Global Mangrove Alliance — Mangrove Restoration Tracker Tool Guide — <https://www.mangrovealliance.org/wp-content/uploads/2023/11/MRTT-Guide-v22-FINAL.pdf>
- [R35] Amazon Quick — chat agents <https://docs.aws.amazon.com/quick/latest/userguide/working-with-agents.html> and MCP integration <https://docs.aws.amazon.com/quick/latest/userguide/mcp-integration.html>
- [R36] Kiro — Specs (requirements, design, and tasks) — <https://kiro.dev/docs/specs/> · Steering / AGENTS.md — <https://kiro.dev/docs/steering/>
- [R37] Build Over Nights 2026 — Participants Handbook (Canva) — <https://www.canva.com/design/DAHWNuv17CE/2IGnmuXmkYAXtTs5hdcxOQ/edit>
- [R38] Build Over Nights 2026 — Participants Handbook, PDF export (25 pages, distributed to participants; read 2026-10-03). Same handbook as R37 with the schedule, rubric weights and submission fields readable.

**Internal research pointers (Google Docs, team access only)**

- Prior hackathon context + active mangrove research — Doc ID `16X58Auf_dan1pGHYIv5Jm40GhP3b6zWiEY03kOURWA0`
- Climate Hackathon Reverse Engineering — Doc ID `1EuiMlrjzN3tEfGrU8_q8Lv-v3-_lFHRfvp03HuSjv5E`
- Source of this file and the ADR history — Doc ID `1-be18BqqkKIr4C2g5qmQkwt7s8t-RK8CNFcs2NXMoJg`

## 8. Why this doc set (FMD selection)

**Selected (auto mode, from `fmd/manifest.json` conditions):**

- Always: `context` · `index` · `idea` · `prd` · `system-design` · `data-model` · `tests`
- `exposed_surface: true` → `security`
- `computes_numbers: true` → `methods`
- the product exposes an API (REST + MCP for Amazon Quick) → `api`
- `mode: team` → `ledger` (+ `docs/adr/` and `hooks/`)
- `judged: true` → `pitch`

**Not selected, and why:**

- `design` — written by a teammate; [`docs/design-brief.md`](docs/design-brief.md) is the brief they generate it from.
- `crew` / `build` / `phase-plan` — Kiro specs (`.kiro/specs/*/tasks.md`) are the task tracker, and Kiro is a hard requirement. A second task ledger would drift from Kiro's within the night.
- `changes` / `proposal` — a 12-hour build; the ledger and ADRs carry decisions.
- `onboarding` — `AGENTS.md` plus `docs/index.md` already orient a teammate.
- `operations` — `outlives_demo: false`.
- `release` — no release or market plan is needed for the judged demo.
- `business` / `market` / `frd` / `quality` / `internals` — below company scale; vision stays in `idea.md`.
