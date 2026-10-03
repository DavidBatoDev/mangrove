# ADR-059 — Real Post-Yolanda records corrected by a database reset and reseed

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-029, ADR-056, ADR-060, BR-002, EQ-017, DS-009, TC-030, TC-031, [`docs/case-study-yolanda.md`](../case-study-yolanda.md) §13

### Context

A second research pass fetched every source behind the four real records (ADR-056) and quoted them verbatim.
It found errors in `docs/case-study-yolanda.md` that the seeded rows on the main database repeat
(case study §13):

- Paraiso's 2015–2018 planting was funded by Japan's Ministry of Foreign Affairs [37], not DENR; the
  per-seedling pay was OISCA's [38]. Paraiso is not an MBFDP site.
- Bungtod's conflict rested on ERDB's 1,696 ha damage count [10], which includes the 206 ha Campoyong–Bungtod
  plantation that had died by May 2014 [40], set against a recovery study [25] whose 18-month claim belongs to
  Long et al. [39]. The 104.39 ha "recovering" is the whole protected area's figure, not Bungtod's [32].
- The 25% survival is Samar province (western Samar), not Eastern Samar [23]; the NATMANCON-3 "low survival"
  remark was about BFAR's PNAP, not MBFDP [18]; the Cancabato 70 ha is a provincial-government project on DENR
  Region 8 money that the source does not call MBFDP [21].

`evidence_item`, `promise_record` and `record_event` are append-only (BR-002), so the wrong rows cannot be edited.

### Why now

The pitch opens these records. Bungtod is red on a misattributed item and Paraiso names the wrong funder; a
judge who clicks a source would find the mismatch.

### Options considered

1. **Append correction events only** — pros: the history shows the mistake and its fix; no reset / cons:
   Bungtod stays red on a misattributed item and Paraiso keeps a wrong funder on its locked promise, because a
   promise and its findings cannot be changed by a later event.
2. **Reset the main database and reseed corrected rows** — pros: every record reads as the sources say; the
   main database holds only seed data that the seed and ingest scripts regenerate (no partner or public
   submissions yet) / cons: the hashes of the first seed are gone; the reset must not be repeated once real
   users write rows.

### Decision

Reset the main database and reseed it with the corrected real records. Expected pins after the reseed:

| Site | Pin | Basis |
|------|-----|-------|
| F1 Paraiso | on track | Funder: Ministry of Foreign Affairs of Japan, not MBFDP [37]; so not on the ₱1 billion program card (API-026). Work [37][38]; outcome: fringe up 80% over pre-disaster, 3.6 ha by the 10th anniversary [37][31] |
| F2 Cancabato Bay | awaiting | Funder DENR (Region 8 budget), proposer the Provincial Government of Leyte; the source does not call it MBFDP, so it is not on the program card either. Work reported [21]; no source states the outcome of the 70 ha. The city-level "0% in Tacloban" [44] and bay-level regrowth [42] are recorded but stored `usable = false` / as ground context only |
| F3 Naungan | on track | MBFDP 105 ha row in the planters' association history table [20]; afforested stand in Barangay Lao managed by that association, 2023 [26]; species and management [41] |
| F4 Bungtod | on track | Ground: plantation dead by May 2014 [10][40]; outcome: "now recovering" [32], protected-area 104.39 ha [32], Bungtod sampled in 2023 [40] |

Cited organizations are now DENR, the Ministry of Foreign Affairs of Japan, the Barangay Local Government of
Paraiso (Barangay 83), the Provincial Government of Leyte, and the Naungan-San Juan Mangrove Planters
Association; no individual is named in any row (ADR-056).

### Why this option

The main database holds nothing that cannot be regenerated, so a reset loses no one's evidence, while the
append-only path would leave a public record that contradicts its own sources.

### Overrides

- **Prior ADRs and rules:** ADR-056's Consequences pin list (Paraiso on track, Cancabato and Ormoc awaiting,
  Bungtod in conflict) and its Decision's "DENR as funder" for Paraiso.
- **Doc or plan truth:** `docs/case-study-yolanda.md` (fixed in place, §13), `data/sites/real/README.md`,
  `data/sites/README.md`, `docs/tests.md` TC-030 and TC-031, `docs/security.md` §6,
  `docs/design.md` and `docs/api.md` API-026 (program card), `docs/quick-demo.md`. Updated in the same change.
  `docs/prd.md` names no real funder and needs no change.

### Consequences

- **Easier:** every real record and pin matches a quoted source; the mixed result now reads as three on track
  and one awaiting.
- **Harder or owed:** the reseed also re-ingests GMW and Sentinel-2 for every site (ADR-060), since their
  evidence rows go with the reset. `db/seed_real.py` carries the corrected funders, proposers and evidence, and
  the program card's `record_ids` (API-026) list only the MBFDP records, F3 and F4.
- **Follow-up:** once real users write rows, a reset is no longer an option; later corrections are append-only
  events. A freedom-of-information request to DENR Region 8 and ERDB (case study §11) still stands.
