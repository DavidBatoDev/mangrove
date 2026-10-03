---
schema_version: 2.1.0
status: draft
last_updated: 2026-10-03
doc: pitch
owns: the spoken pitch — narrative, canvas, timed script, question ownership, interview probes
---

# Pitch — Mangrove

> **What this is.** The pitch for Build Over Nights 2026. The rubric names and the timing live in
> [`context.md`](../context.md); this file does not restate weights, because the handbook has not published any.
> Semifinals are 2 minutes plus 2 minutes of questions. Finals, if reached, are 5 plus 5. The script below is the 2-minute version.
> Traces back to: [`idea.md`](../idea.md), [`prd.md`](prd.md), [`context.md`](../context.md).

## 1. Business narrative

Companies fund mangrove restoration in the Philippines and announce the planting. Before the money moves,
the evidence is scattered across maps, reports and photos, and a site that looks empty on a satellite can
be an active fishpond. After the money moves, almost nobody can check whether the work happened or whether
the mangroves came back. Mangrove puts the satellite evidence and the ground evidence side by side, with
each answer marked supported, conflicting or missing. When a funder picks a site, we publish the promise so
it cannot be edited, pin it on a public map, and add later evidence to the same record. We do not score
sites and we do not certify success. Funders are who we expect to pay — a subscription, a fee per site,
and a monitoring fee — and we have not proven they will. The demo is one place, Manila Bay, and the thing
we are proving is that combining the sources shows a conflict a single map does not.

> Everyone on the team should be able to say this from memory.

## 2. Business Model Canvas

| Block | Content | Feeds pitch beat |
|-------|---------|------------------|
| **Value proposition** | See the evidence before you fund a site, and leave a public promise people can check later. | Hook + Solution |
| **Customer segments** | **Users:** funders comparing sites; field partners submitting what they saw; the public reading a promise. **Payers:** funders. Unvalidated. | Problem + Model |
| **Why us / unfair advantage** | Not a moat yet. The bet is a record that links the evidence at decision time to what happened later. Maps and models are not the advantage. | Why now |
| **Key partners** | Field NGOs for ground evidence. Data: Global Mangrove Watch, Copernicus. Infra: our API, Amazon Quick over it. | Solution |
| **Key activities** | Assemble a dossier, publish a locked promise, append later evidence, flag a conflict. | Solution + demo |
| **Key resources** | The append-only records, if real funders use them. The demo data is labelled demo. | Competition |
| **Cost structure** | A small host, a free Copernicus tier, and partner time. Not priced. | Feasibility |
| **Revenue streams** | Subscription, per-site assessment, monitoring fee. Marketplace fees were rejected (ADR-029). Nobody has paid. | Model + payer |
| **Channels** | Direct to CSR and foundation teams already funding mangroves. Not in the demo. | (support) |
| **Customer relationships** | The public record is the trust. We do not punish anyone; the record makes a miss visible. | Ask |

## 3. Two-minute pitch script

| Time | Beat | What to say | Rubric it feeds |
|------|------|-------------|-----------------|
| 0:00–0:25 | **Hook + problem** | "A company announces 10,000 mangroves. The site they picked can be a fishpond, and a year later nobody can check the announcement. Wetlands International walked Manila Bay candidates and found exactly that kind of surprise." | Pain Point & Contextual Utility |
| 0:25–1:15 | **Demo** | Open the comparison. One site was mangrove, is bare now, and a partner reports an active fishpond — conflicting, in red. The other two agree. Lock a promise: why, what we'll do, what should happen, what we don't know. Show the pin. Add the later report of 8 hectares against a mapped 5. The pin turns red. Say out loud: we did not ask the satellite to count seedlings, and this is not a certification. | Functionality & Platform Compliance · Solution Implementation Judgement |
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
| "Can the satellite see the trees you planted?" | Data | No. Ten to twenty metre pixels cannot see seedlings. The 8-versus-5 check is the reported area against a GPS-mapped area. The satellite question waits until the outcome date. ADR-033. |
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

- Rubric and format: [`context.md`](../context.md) §1. Weights are unconfirmed; do not invent them.
- Claim boundaries: [`context.md`](../context.md) §5.
- Demo honesty: ADR-033, ADR-034.
