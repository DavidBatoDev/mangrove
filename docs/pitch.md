---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-04
doc: pitch
owns: the spoken pitch — narrative, canvas, timed script, question ownership, interview probes
---

# Pitch — Mangrove

> **What this is.** The pitch for Build Over Nights 2026. The rubric names and the timing live in
> [`context.md`](../context.md) §1 (semifinal and finals weights from the handbook PDF, R38); this file does not restate them.
> Semifinals are 2 minutes plus 2 minutes of questions. Finals, if reached, are 5 plus 5. The script below is the 2-minute version.
> Traces back to: [`idea.md`](../idea.md), [`prd.md`](prd.md), [`context.md`](../context.md).

## 1. Business narrative

Companies fund mangrove restoration in the Philippines and announce the planting. Before the money moves,
the evidence is scattered across maps, reports and photos, and a site that looks empty on a satellite can
be an active fishpond. A partner proposes the site, the benefit in their own words, a timeline and
milestones. A funder commits. The public can open a site before that commitment, and can toggle the map
between sites with a commitment and sites without one. After the commitment, an early milestone is the
partner's photo, GPS and mapped area. The satellite line reads "not yet observable", and that is not a
fail. After the outcome date, the partner's report and the Sentinel-2 vegetated area both have to be
there. If they disagree, the record is flagged and the funder is notified. We do not score sites, we do
not say a project was successful, and we do not certify. We do not take a fee for listing a proposal.
Funders are who we expect to pay for the software, a subscription or monitoring, and we have not proven
they will. The demo is one place, Manila Bay. What we are proving is that the partner's report and the
observable check can disagree in public, which a single map does not show.

> Everyone on the team should be able to say this from memory.

## 2. Business Model Canvas

| Block | Content | Feeds pitch beat |
|-------|---------|------------------|
| **Value proposition** | A partner states the terms, a funder commits, and the public can see when the later report and the check disagree. | Hook + Solution |
| **Customer segments** | **Users:** partners proposing sites; funders committing; the public reading a site or a commitment. **Payers:** funders, for software, not for brokering a deal. Unvalidated. | Problem + Model |
| **Why us / unfair advantage** | Not a moat yet. The bet is a record that links the evidence at decision time to what happened later. Maps and models are not the advantage. | Why now |
| **Key partners** | Field NGOs for ground evidence. Data: Global Mangrove Watch, Copernicus. Infra: our API, Amazon Quick over it. | Solution |
| **Key activities** | Publish a partner proposal, record a funder's commit, append milestone evidence, flag a disagreement and notify the funder. | Solution + demo |
| **Key resources** | The append-only records, if real funders use them. The demo data is labelled demo. | Competition |
| **Cost structure** | A small host, a free Copernicus tier, and partner time. Not priced. | Feasibility |
| **Revenue streams** | Subscription, per-site assessment, monitoring fee. Marketplace fees were rejected (ADR-029). Nobody has paid. | Model + payer |
| **Channels** | Direct to CSR and foundation teams already funding mangroves. Not in the demo. | (support) |
| **Customer relationships** | The public record is the trust. We do not punish anyone; the record makes a miss visible. | Ask |

## 3. Two-minute pitch script

| Time | Beat | What to say | Rubric it feeds |
|------|------|-------------|-----------------|
| 0:00–0:25 | **Hook + problem** | "A company announces 10,000 mangroves. The site they picked can be a fishpond, and a year later nobody can check the announcement. Wetlands International walked Manila Bay candidates and found exactly that kind of surprise." | Pain Point & Contextual Utility |
| 0:25–1:15 | **Demo** | Open the map and toggle to a site with no commitment, then to one with the seeded commitment. Open the comparison. One site was mangrove, is bare now, and the ground report is an active fishpond: conflicting, in red. The other two agree. Show an early milestone: the partner's photo and mapped area, and the satellite line "not yet observable". Say that this is not a fail. Then show the later report of 8 hectares against a mapped 5. The pin turns red and the funder is notified. Say out loud: pixels did not count seedlings, Global Mangrove Watch did not certify that the planting was finished, and this page is not a certification. | Functionality & Platform Compliance · Solution Implementation Judgement |
| 1:15–1:40 | **Why this and not a map** | "Global Mangrove Watch already maps mangroves. The tracker tool already tracks projects. We lock the promise before the money moves and check it after. Statuses come from rules, not from the model. Quick is how you ask why two sites differ; Kiro is how we built it." | Originality & Method · Functionality |
| 1:40–2:00 | **Who pays, and the ask** | "Funders pay, if they pay — we have not sold one. The public reads for free, which is the point. What we want from you is the hard question: would you publish a promise you cannot edit?" | Hook & Q&A Handling |

> If the live satellite call fails, the stored snapshot is the demo. Do not refresh on stage unless it has already succeeded once that hour.
> Finals stretch the same beats to 5 minutes; the extra time goes to the lock screen and one question about the hash, not to new features.

## 4. Q&A ownership

No personal names are assigned yet. Fill the owner column with a teammate before the pitch. Until then the role owns it.

| Likely question | Owner | One-line answer |
|-----------------|-------|-----------------|
| "Is this data real?" | Data | The satellite sources are real (GMW v4.1, Sentinel-2). The sites, organizations and field reports in the demo are labelled demo. We have not run a funder interview. |
| "Isn't this just Global Mangrove Watch?" | Product | GMW tells you extent. It does not publish a funder's promise or hold a partner's photo next to it. ADR-005 is why we are not another map. |
| "Can the satellite see the trees you planted?" | Data | No. Ten to twenty metre pixels cannot see seedlings. The 8-versus-5 check is the reported area against a GPS-mapped area. Before the outcome date the satellite line is "not yet observable", and that is not a fail. ADR-033, ADR-044. |
| "Did Global Mangrove Watch certify that the planting is done?" | Data | No. GMW is annual extent from 1985, shown as history. It is not a completion check for this season's planting. |
| "What stops the funder editing the promise?" | Tech | The database role cannot update or delete those rows, and the page shows a hash anyone can recompute. A superuser with the database could rewrite it, and we say so. We do not say tamper-proof. ADR-034. |
| "Is the AI deciding?" | Tech | No. Statuses and numbers come from rules in `docs/methods.md`. Quick and any summary only repeat them. There is no score. |
| "Why Quick and Kiro?" | Tech | Both are required. Quick calls six read-only tools on our API. Kiro holds the specs and the build. Neither is the product. |
| "Who pays?" | Product | Our hypothesis is the funder: subscription, per site, and monitoring. Willingness to pay is untested. That is the first thing to test after tonight. |
| "Are you certifying carbon or land titles?" | Product | No. Out of scope, on purpose. Remote evidence cannot establish either. |
| "What if the sources disagree?" | Data | The status becomes conflicting and the pin turns red. We do not average them. |
| "Does it scale?" | Tech | The demo is one host and five sites. Reads are database queries. The satellite call is a button, not a page load. |

## 5. Interview probe sheet

Target: a person who has actually allocated money to a mangrove site in the Philippines — CSR, a foundation program officer, or an NGO fundraising lead.
Riskiest assumption under test: **they will publish a promise they cannot later edit.**

1. Walk me through the last time you chose a mangrove site to fund — every step, from the first proposal to the announcement.
2. Was there a moment you weren't sure the site was what the proposal said? What did you do?
3. After the planting, what did you publish, and what did someone ask you that you couldn't answer?
4. Have you paid anyone to check a site — a consultant, a satellite report, a field visit? How much, how often?
5. Show me the last report you received. What in it could an outsider have checked?
6. If a page had published your promise before you spent the money, and you could not edit it, what would you have left out?
7. Who do you think should be able to see that page — your board, the community, a journalist?
8. (Only at the end) Here is what we built. Would you have used it on that project? — treat the answer as color, not proof.

> Log the answers verbatim. "I'd use it" does not move willingness to pay out of UNVALIDATED in [`ledger.md`](ledger.md) §2.

## References

- Rubric, weights and format: [`context.md`](../context.md) §1 (handbook PDF, R38).
- Claim boundaries: [`context.md`](../context.md) §5.
- Demo honesty: ADR-033, ADR-034.
