#!/usr/bin/env python3
"""Validate the FMD lean-current-truth overlay mechanism (stdlib only).

Checks `docs/index.md`'s "Active semantic overlays" table against `docs/ledger.md`'s
§3 pivots/decisions (stable `DEC-###` IDs), and — when `--build` is given —
also validates `docs/BUILD.md`'s phase table (a phase-split build has exactly one home for "which
phase is current," and this is its structural gate, so a second bespoke script isn't needed).

Deterministic checks:
- every `DEC-###` ID in the decision ledger's §3 is unique
- every active-overlay row's "Active decision" cell names a `DEC-###` that actually exists in §3
- every "Affected IDs/sections" cell resolves to a recognizable `F-/TASK-/DEC-###` ID or a
  `file.md [§ section]` doc reference — not a placeholder
- a ledger entry's `**Superseded by:** DEC-###` (if present) names a `DEC-###` that exists in §3
- (with `--build`) `docs/BUILD.md`'s phase table has exactly one `active` row, every status is a
  valid enum value, every non-dash `DEC-###` cell resolves against the ledger, and — when the
  phase table and the file being checked live on disk together — the active row's plan file exists

Judgment deliberately excluded: whether an overlay's stated scope is actually narrow enough, and
whether a "resolved" doc-section reference points at a heading that's still accurate — this tool
checks structure and cross-references, not semantic correctness of the prose it's pointing at.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

DEC_ID_RE = re.compile(r"^DEC-\d{3}$")
DEC_TOKEN_RE = re.compile(r"\bDEC-\d{3}\b")
ID_TOKEN_RE = re.compile(r"\b(?:F|TASK|DEC)-\d{3}\b")
DOC_REF_RE = re.compile(r"[\w-]+\.md(\s*§\s*\S.+)?", re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r"^\s*(?:—|-|<.*>|\{.*\}|tbd|todo|n/?a)?\s*$", re.IGNORECASE)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
SEPARATOR_RE = re.compile(r"^:?-{3,}:?$")

OVERLAY_HEADER = ("concern", "base owner", "active decision", "affected ids/sections", "consolidate by")
PHASE_HEADER = ("phase", "goal / outcome", "entry criteria", "exit criteria", "plan file", "status", "dec-###")
PHASE_STATUS = {"planned", "active", "done", "cut"}


def _cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def _is_separator(cells: list[str]) -> bool:
    return bool(cells) and all(SEPARATOR_RE.fullmatch(c) for c in cells)


def _find_table(lines: list[str], header: tuple[str, ...]) -> tuple[int, int] | None:
    """Return (header_line_index, first_data_line_index) for the table whose header cells
    case-insensitively match `header`, or None if not found."""
    for i, line in enumerate(lines):
        if not line.lstrip().startswith("|"):
            continue
        if tuple(c.lower() for c in _cells(line)) == header:
            sep_index = i + 1
            if sep_index < len(lines) and _is_separator(_cells(lines[sep_index])):
                return i, sep_index + 1
    return None


def _section_slice(lines: list[str], heading_prefix: str) -> tuple[int, int] | None:
    """Return (start, end) exclusive line-index range for the section whose heading starts with
    `heading_prefix` (e.g. '## 3.'), up to (not including) the next heading of the same or
    shallower depth."""
    start = None
    depth = None
    for i, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if not match:
            continue
        if start is None and line.strip().lower().startswith(heading_prefix.lower()):
            start = i
            depth = len(match.group(1))
            continue
        if start is not None and len(match.group(1)) <= depth:
            return start, i
    if start is not None:
        return start, len(lines)
    return None


@dataclass(frozen=True)
class OverlayRow:
    concern: str
    base_owner: str
    decision_id: str
    affected: str
    consolidate_by: str
    line: int


@dataclass(frozen=True)
class LedgerEntry:
    title: str
    decision_id: str | None
    superseded_by: str | None
    line: int


@dataclass(frozen=True)
class PhaseRow:
    phase: str
    status: str
    plan_file: str
    decision_id: str
    line: int


def parse_overlay_table(text: str) -> tuple[list[OverlayRow], list[str]]:
    lines = text.splitlines()
    errors: list[str] = []
    found = _find_table(lines, OVERLAY_HEADER)
    if found is None:
        return [], ["no 'Active semantic overlays' table found (expected header: "
                     "Concern | Base owner | Active decision | Affected IDs/sections | Consolidate by)"]
    _, start = found
    rows: list[OverlayRow] = []
    for i in range(start, len(lines)):
        line = lines[i]
        if HEADING_RE.match(line) or not line.strip():
            break
        if not line.lstrip().startswith("|"):
            continue
        cells = _cells(line)
        if len(cells) != len(OVERLAY_HEADER) or _is_separator(cells):
            errors.append(f"line {i + 1}: overlay row has {len(cells)} columns; expected {len(OVERLAY_HEADER)}")
            continue
        concern, owner, decision_id, affected, consolidate_by = cells
        if PLACEHOLDER_RE.fullmatch(concern) or PLACEHOLDER_RE.fullmatch(owner):
            errors.append(f"line {i + 1}: overlay row has a missing/placeholder concern or base owner")
        if not DEC_ID_RE.fullmatch(decision_id.strip("`")):
            errors.append(f"line {i + 1}: overlay row's Active decision '{decision_id}' is not a bare DEC-###")
        rows.append(OverlayRow(concern, owner, decision_id.strip("`"), affected, consolidate_by, i + 1))
    return rows, errors


def parse_ledger_entries(text: str) -> tuple[list[LedgerEntry], list[str]]:
    lines = text.splitlines()
    errors: list[str] = []
    section = _section_slice(lines, "## 3.")
    if section is None:
        return [], ["no '## 3.' pivots/decisions section found in the decision ledger"]
    start, end = section

    entry_starts = [i for i in range(start, end) if lines[i].startswith("### ")]
    entries: list[LedgerEntry] = []
    for idx, entry_start in enumerate(entry_starts):
        entry_end = entry_starts[idx + 1] if idx + 1 < len(entry_starts) else end
        title = lines[entry_start][4:].strip()
        decision_id: str | None = None
        superseded_by: str | None = None
        for j in range(entry_start + 1, entry_end):
            id_match = re.match(r"^\s*-\s*\*\*ID:\*\*\s*(DEC-\d{3})\s*$", lines[j])
            if id_match:
                if decision_id is not None:
                    errors.append(f"line {j + 1}: entry '{title}' has more than one **ID:** line")
                decision_id = id_match.group(1)
            sup_match = re.match(r"^\s*-\s*\*\*Superseded by:\*\*\s*(DEC-\d{3})\s*$", lines[j])
            if sup_match:
                superseded_by = sup_match.group(1)
        if decision_id is None:
            errors.append(f"line {entry_start + 1}: entry '{title}' has no **ID:** DEC-### line")
        entries.append(LedgerEntry(title, decision_id, superseded_by, entry_start + 1))
    return entries, errors


def parse_phase_table(text: str) -> tuple[list[PhaseRow], list[str]]:
    lines = text.splitlines()
    errors: list[str] = []
    found = _find_table(lines, PHASE_HEADER)
    if found is None:
        return [], ["no phase table found in BUILD.md (expected header: Phase | Goal / outcome | "
                     "Entry criteria | Exit criteria | Plan file | Status | DEC-###)"]
    _, start = found
    rows: list[PhaseRow] = []
    for i in range(start, len(lines)):
        line = lines[i]
        if HEADING_RE.match(line) or not line.strip():
            break
        if not line.lstrip().startswith("|"):
            continue
        cells = _cells(line)
        if len(cells) != len(PHASE_HEADER) or _is_separator(cells):
            errors.append(f"line {i + 1}: phase row has {len(cells)} columns; expected {len(PHASE_HEADER)}")
            continue
        phase, _goal, _entry, _exit, plan_file, status, decision_id = cells
        rows.append(PhaseRow(phase, status.strip(), plan_file.strip("`"), decision_id.strip("`"), i + 1))
    return rows, errors


def _resolve_affected(cell: str) -> bool:
    if PLACEHOLDER_RE.fullmatch(cell):
        return False
    return bool(ID_TOKEN_RE.search(cell) or DOC_REF_RE.search(cell))


def validate(
    index_text: str,
    ledger_text: str,
    build_text: str | None = None,
    build_dir: Path | None = None,
) -> list[str]:
    errors: list[str] = []

    overlay_rows, overlay_errors = parse_overlay_table(index_text)
    errors.extend(overlay_errors)

    ledger_entries, ledger_errors = parse_ledger_entries(ledger_text)
    errors.extend(ledger_errors)

    decision_ids: dict[str, int] = {}
    for entry in ledger_entries:
        if entry.decision_id is None:
            continue
        if entry.decision_id in decision_ids:
            errors.append(
                f"line {entry.line}: duplicate {entry.decision_id} "
                f"(first at line {decision_ids[entry.decision_id]})"
            )
        else:
            decision_ids[entry.decision_id] = entry.line

    for entry in ledger_entries:
        if entry.superseded_by and entry.superseded_by not in decision_ids:
            errors.append(
                f"line {entry.line}: entry '{entry.title}' is superseded by "
                f"{entry.superseded_by}, which does not exist in the ledger"
            )

    for row in overlay_rows:
        if DEC_ID_RE.fullmatch(row.decision_id) and row.decision_id not in decision_ids:
            errors.append(
                f"line {row.line}: overlay '{row.concern}' references {row.decision_id}, "
                "which does not exist in the decision ledger"
            )
        if not _resolve_affected(row.affected):
            errors.append(
                f"line {row.line}: overlay '{row.concern}' has an unresolvable Affected "
                f"IDs/sections cell '{row.affected}' (expected an F-/TASK-/DEC-### ID or "
                "a 'file.md § section' reference)"
            )

    if build_text is not None:
        phase_rows, phase_errors = parse_phase_table(build_text)
        errors.extend(phase_errors)

        active_rows = [row for row in phase_rows if row.status == "active"]
        if len(active_rows) != 1:
            errors.append(
                f"BUILD.md phase table must have exactly one 'active' row; found {len(active_rows)}"
            )

        for row in phase_rows:
            if row.status not in PHASE_STATUS:
                errors.append(
                    f"line {row.line}: phase '{row.phase}' has invalid status '{row.status}'; "
                    f"allowed: {', '.join(sorted(PHASE_STATUS))}"
                )
            if row.decision_id != "—" and not DEC_TOKEN_RE.search(row.decision_id):
                errors.append(
                    f"line {row.line}: phase '{row.phase}' DEC-### cell '{row.decision_id}' is "
                    "neither — nor a DEC-### reference"
                )
            for dec_id in DEC_TOKEN_RE.findall(row.decision_id):
                if dec_id not in decision_ids:
                    errors.append(
                        f"line {row.line}: phase '{row.phase}' references {dec_id}, which does "
                        "not exist in the decision ledger"
                    )
            if row.status == "active" and build_dir is not None and not PLACEHOLDER_RE.fullmatch(row.plan_file):
                plan_path = build_dir / row.plan_file
                if not plan_path.exists():
                    errors.append(
                        f"line {row.line}: active phase '{row.phase}' names plan file "
                        f"'{row.plan_file}', which does not exist at {plan_path}"
                    )

    return errors


def check(index_path: Path, ledger_path: Path, build_path: Path | None) -> int:
    try:
        index_text = index_path.read_text(encoding="utf-8")
        ledger_text = ledger_path.read_text(encoding="utf-8")
        build_text = build_path.read_text(encoding="utf-8") if build_path else None
    except OSError as exc:
        print(f"ERROR: cannot read input: {exc}", file=sys.stderr)
        return 2

    build_dir = build_path.parent if build_path else None
    errors = validate(index_text, ledger_text, build_text, build_dir)
    if errors:
        print(f"REJECT: {len(errors)} overlay-consistency failure(s)")
        for error in errors:
            print(f"  - {error}")
        return 1
    print(
        "APPROVE: active-overlay table and ledger DEC-### IDs are "
        + ("consistent" if build_path is None else "consistent (BUILD.md phase table included)")
    )
    return 0


def self_test() -> int:
    ledger_valid = """## 3. Pivots & decisions (newest first, append at top)

### 2026-07-28 — Adopt the lean overlay
- **ID:** DEC-011
- **Type:** platform
- **Change:** flat plan -> phase-split + overlays
- **Why:** teammates' agents should read canonical docs only, not resync
- **Invalidated:** none

### 2026-07-20 — Earlier pivot
- **ID:** DEC-010
- **Superseded by:** DEC-011
- **Type:** need
- **Change:** X -> Y
- **Why:** because

## 4. Rejected approaches

| Approach considered | Rejected because | Would revisit if |
|---|---|---|
| a | b | c |

## 5. Open items / risks
- none
"""

    index_valid = """## 0. Source-of-truth map (one fact, one home)

| Concern | Canonical owner | Note |
|---------|-----------------|------|
| Decisions | Decision Ledger | — |

## 0.5 Active semantic overlays

| Concern | Base owner | Active decision | Affected IDs/sections | Consolidate by |
|---------|------------|------------------|------------------------|-----------------|
| Auth rule | security.md | DEC-011 | F-001, security.md § Auth | Phase-1 close |
| Task status semantics | BUILD.md | DEC-011 | TASK-001 | Phase-1 close |

## 1. Document suite

| Document | File | Status | Last updated |
|----------|------|--------|---------------|
| PRD | product.md | done | 2026-07-28 |
"""

    build_valid = """## 3. Phase table

| Phase | Goal / outcome | Entry criteria | Exit criteria | Plan file | Status | DEC-### |
|-------|-----------------|-----------------|-----------------|-----------|--------|---------|
| Phase-1 | first slice | none | demo works | phase-01-x.md | active | DEC-011 |
| Phase-2 | polish | Phase-1 done | shipped | phase-02-x.md | planned | — |
"""

    failures: list[str] = []

    valid_errors = validate(index_valid, ledger_valid, build_valid, build_dir=None)
    if valid_errors:
        failures.append("valid fixture set was rejected: " + "; ".join(valid_errors))

    dup_ledger = ledger_valid.replace("**ID:** DEC-010", "**ID:** DEC-011", 1)
    if not validate(index_valid, dup_ledger):
        failures.append("duplicate DEC-011 in the ledger was accepted")

    dangling_overlay = index_valid.replace("DEC-011", "DEC-999", 1)
    if not validate(dangling_overlay, ledger_valid):
        failures.append("overlay referencing nonexistent DEC-999 was accepted")

    unresolvable_affected = index_valid.replace(
        "F-001, security.md § Auth", "some vague area", 1
    )
    if not validate(unresolvable_affected, ledger_valid):
        failures.append("overlay with an unresolvable Affected IDs/sections cell was accepted")

    dangling_supersession = ledger_valid.replace("**Superseded by:** DEC-011", "**Superseded by:** DEC-999", 1)
    if not validate(index_valid, dangling_supersession):
        failures.append("entry superseded by nonexistent DEC-999 was accepted")

    two_active = build_valid.replace("| Phase-2 | polish | Phase-1 done | shipped | phase-02-x.md | planned | — |",
                                      "| Phase-2 | polish | Phase-1 done | shipped | phase-02-x.md | active | — |", 1)
    if not validate(index_valid, ledger_valid, two_active, build_dir=None):
        failures.append("BUILD.md with two active phases was accepted")

    zero_active = build_valid.replace("| Phase-1 | first slice | none | demo works | phase-01-x.md | active | DEC-011 |",
                                       "| Phase-1 | first slice | none | demo works | phase-01-x.md | planned | DEC-011 |", 1)
    if not validate(index_valid, ledger_valid, zero_active, build_dir=None):
        failures.append("BUILD.md with zero active phases was accepted")

    invalid_status = build_valid.replace("| planned | — |", "| someday | — |", 1)
    if not validate(index_valid, ledger_valid, invalid_status, build_dir=None):
        failures.append("BUILD.md phase row with an invalid status was accepted")

    dangling_phase_dec = build_valid.replace("| active | DEC-011 |", "| active | DEC-999 |", 1)
    if not validate(index_valid, ledger_valid, dangling_phase_dec, build_dir=None):
        failures.append("BUILD.md phase row referencing nonexistent DEC-999 was accepted")

    if failures:
        print("SELF-TEST FAIL")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("SELF-TEST PASS: valid fixture + 8 invalid cases behaved as expected")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", type=Path, help="path to docs/index.md")
    parser.add_argument("--ledger", type=Path, help="path to docs/ledger.md")
    parser.add_argument("--build", type=Path, help="optional path to docs/BUILD.md")
    parser.add_argument("--self-test", action="store_true", help="run built-in positive/negative tests")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.index or not args.ledger:
        parser.error("--index and --ledger are required, or use --self-test")
    return check(args.index, args.ledger, args.build)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
