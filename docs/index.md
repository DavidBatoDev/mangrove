# Documentation Index — AIDE-M

**Maintained by:** the team
**Last updated:** 2026-10-04
**FMD version:** 6.1.0

## 0. Source-of-truth map (one fact, one home)

Each concern has one owner. Other docs link to it. When two docs disagree, the owner wins until they are reconciled.

**Precedence** when something looks stale (highest wins):

1. The active overlay row in §0.5 for that concern. It names a `DEC-###`; that ledger entry cites the ADR.
2. The newest Accepted ADR for that concern, until the owning doc is reconciled.
3. The owning document below.
4. Older ADRs and the Google Doc's ADR-001 to ADR-030 (indexed, not copied).

| Concern | Canonical owner | Note |
|---------|-----------------|------|
| Which decision is current · rejected choices · names and immutable IDs | [Ledger](ledger.md) | Append-only. Cites an ADR; does not restate it. |
| Why a choice was made | [ADRs](adr/README.md) | ADR-001 to ADR-030 live in the team Google Doc. ADR-031 onward live here. |
| Problem, who it's for, feature IDs, metrics, exclusions | [idea.md](../idea.md) | The seed brief. |
| Hackathon rules, research, and the `[R##]` source register | [context.md](../context.md) | Not a product spec. |
| What we build (`F-###`, `US-###`, `BR-###`, screens and flow) | [PRD](prd.md) | File is `prd.md`, not `product.md`. |
| How it's built | [System design](system-design.md) | |
| Stored shape | [Data model](data-model.md) | Classification lives in the security doc. |
| Every computed number (`EQ-###`, `DS-###`, confidence) | [Methods](methods.md) | |
| API and MCP contracts (`API-###`) | [API](api.md) | |
| Auth, threats, the demo go/no-go gate | [Security](security.md) | |
| What proves each feature (`TC-###`) | [Tests](tests.md) | |
| Pitch script and question ownership | [Pitch](pitch.md) | Rubric weights stay in `context.md`. |
| Messages between David and Ethan (changes, requests, context) | [`notes/`](../notes/README.md) | A note is a message, not a fact. The fact it announces lives in its owner above (ADR-040). |
| What the design doc must decide | [Design brief](design-brief.md) | Input to `design.md`. Its "no brand seed" line is superseded by ADR-043. |
| Routes, components, visual states, pin colors | [Design](design.md) | Points to `brand/` for tokens, type, components and voice (ADR-043). |
| Tokens, type, voice, keywords, deck template | [`brand/BRAND.md`](../brand/BRAND.md) | The brand kit. The PRD wins on behaviour. |

**The rule:** a fact lives in its owner. Do not restate it elsewhere.

## 0.5 Active semantic overlays

| Concern | Base owner | Active decision | Affected IDs/sections | Consolidate by |
|---------|------------|-----------------|------------------------|----------------|
| Who can act (no accounts) | [PRD](prd.md) | DEC-032 | F-004, F-007, prd.md § 2, prd.md § 5 | After the demo, rewrite the PRD roles as public contributors |
| Routes | [Design](design.md) | DEC-032 | F-004, F-007, design.md § 2 | After the demo |

## 1. Document suite

| Document | File | Status | Last updated |
|----------|------|--------|--------------|
| PRD | [prd.md](prd.md) | draft | 2026-10-04 |
| System Design | [system-design.md](system-design.md) | draft | 2026-10-04 |
| Data Model | [data-model.md](data-model.md) | draft | 2026-10-04 |
| Methods | [methods.md](methods.md) | draft | 2026-10-04 |
| API | [api.md](api.md) | draft | 2026-10-04 |
| Security | [security.md](security.md) | draft | 2026-10-04 |
| Tests | [tests.md](tests.md) | draft | 2026-10-04 |
| Ledger | [ledger.md](ledger.md) | draft | 2026-10-04 |
| Pitch | [pitch.md](pitch.md) | draft | 2026-10-04 |
| Design brief | [design-brief.md](design-brief.md) | draft | 2026-10-03 |
| Design | [design.md](design.md) | draft | 2026-10-04 |

## 2. Health check

- [x] Every Must/Should `F-###` in the PRD has at least one test; every Could without one says why; Won't rows are excluded. Checked 2026-10-03 against `docs/tests.md` §5.
- [x] `python3 tools/check-doc-status.py docs` passes.
- [x] No doc restates a fact owned by another (§0). Reviewed with the suite; the source register lives only in `context.md` §7.
- [x] Every network-exposed surface declares auth in the security doc (`docs/security.md` §4 covers REST, MCP, and pages).
- [x] Every displayed number cites an `EQ-###` in Methods. EQ ids cited from the PRD and the API resolve.
- [x] `python3 tools/check-context-overlay.py --index docs/index.md --ledger docs/ledger.md` passes.
- [x] `AGENTS.md` has no unfilled placeholder and links only docs that exist.

## References

- `fmd/agents/ORCHESTRATOR.md` — how this set was generated. `fmd/` is local and is not committed.
