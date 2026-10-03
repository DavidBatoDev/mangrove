#!/usr/bin/env python3
"""Deterministic gate: an emitted doc's frontmatter agrees with its docs/index.md §1 row.

WHY THIS EXISTS. `index.md §1` has demanded a `Status` and `Last updated` per doc since it was
written, with no source — the worked example fills both by hand. ADR-0013 gives them a machine-readable
home in each doc's frontmatter. That trade is only an improvement if something checks the two agree:
otherwise "one table with no source" becomes "one table and N frontmatters that disagree", which is
worse, because two dated things that contradict each other both look authoritative.

WHAT IT DOES NOT DO. It does not judge whether a status is *correct* — only that the two homes say the
same thing, and that the values are well-formed. Whether a doc is really `locked` is a human call.

Vocabulary is `changes.md`'s existing lifecycle (draft | locked | superseded), deliberately not a
parallel one. `historical` is additionally accepted in an index row because `index.md` already
instructs marking closed phase files that way.

Usage:
    python3 check-doc-status.py <docs-dir>       # or a path to index.md
    python3 check-doc-status.py --self-test
Exit 0 = PASS.
"""

from __future__ import annotations

import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

STATUSES = {"draft", "locked", "superseded"}
INDEX_EXTRA_STATUSES = {"historical"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# A placeholder is not a value. Kept consistent with check-phase-plan.py: <...> counts, {...} does not
# (the spec cluster standardised on <...> in ADR-0013 for exactly this reason).
PLACEHOLDER_RE = re.compile(r"^\s*(?:—|-|<.*>|tbd|todo|n/?a)?\s*$", re.IGNORECASE)
SUITE_HEADER = ("document", "file", "status", "last updated")
HEADING_RE = re.compile(r"^#{1,6}\s")


@dataclass(frozen=True)
class IndexRow:
    name: str
    file: str
    status: str
    last_updated: str
    line: int


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _is_separator(cells: list[str]) -> bool:
    return all(set(c) <= set("-: ") and c for c in cells)


def _link_target(cell: str) -> str:
    m = re.search(r"\]\(([^)]+)\)", cell)
    return (m.group(1) if m else cell).strip("`")


def parse_frontmatter(text: str) -> tuple[dict[str, str], list[str]]:
    """Return (fields, errors). A doc with no frontmatter yields ({}, []) — absence is reported by
    the caller, which knows whether this doc was supposed to have one."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, []
    fields: dict[str, str] = {}
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return fields, []
        raw = lines[i].split("#", 1)[0].strip()
        if not raw or ":" not in raw:
            continue
        k, v = raw.split(":", 1)
        fields[k.strip()] = v.strip().strip("'\"")
    return fields, ["frontmatter opened with '---' but was never closed"]


def parse_index_suite(text: str) -> tuple[list[IndexRow], list[str]]:
    lines = text.splitlines()
    errors: list[str] = []
    start = None
    for i, line in enumerate(lines):
        if line.lstrip().startswith("|") and tuple(c.lower() for c in _cells(line)) == SUITE_HEADER:
            start = i + 1
            break
    if start is None:
        return [], ["no document-suite table found in index.md "
                    "(expected header: Document | File | Status | Last updated)"]
    rows: list[IndexRow] = []
    for i in range(start, len(lines)):
        line = lines[i]
        if HEADING_RE.match(line):
            break
        if not line.lstrip().startswith("|"):
            continue
        cells = _cells(line)
        if _is_separator(cells):
            continue
        if len(cells) != len(SUITE_HEADER):
            errors.append(f"index.md line {i + 1}: suite row has {len(cells)} columns; expected 4")
            continue
        rows.append(IndexRow(cells[0], _link_target(cells[1]), cells[2], cells[3], i + 1))
    return rows, errors


def check(docs_dir: Path) -> tuple[bool, list[str]]:
    index = docs_dir if docs_dir.is_file() else docs_dir / "index.md"
    if not index.exists():
        return False, [f"no index.md at {index}"]
    base = index.parent
    rows, errors = parse_index_suite(index.read_text(encoding="utf-8"))
    if not rows and not errors:
        errors.append("index.md's document-suite table has no rows")

    for row in rows:
        where = f"index.md line {row.line} ({row.name})"
        if PLACEHOLDER_RE.fullmatch(row.status):
            errors.append(f"{where}: Status is a placeholder, not a value")
        elif row.status.lower() not in STATUSES | INDEX_EXTRA_STATUSES:
            errors.append(f"{where}: Status '{row.status}' is not one of "
                          f"{sorted(STATUSES | INDEX_EXTRA_STATUSES)}")
        if PLACEHOLDER_RE.fullmatch(row.last_updated):
            errors.append(f"{where}: Last updated is a placeholder, not a date")
        elif not DATE_RE.fullmatch(row.last_updated):
            errors.append(f"{where}: Last updated '{row.last_updated}' is not YYYY-MM-DD")

        target = (base / row.file).resolve()
        if row.file.endswith(".md") and not target.exists():
            errors.append(f"{where}: links to '{row.file}', which does not exist")
            continue
        if not row.file.endswith(".md"):
            continue

        fields, fm_errors = parse_frontmatter(target.read_text(encoding="utf-8"))
        errors.extend(f"{row.file}: {e}" for e in fm_errors)
        if not fields:
            errors.append(f"{row.file}: no YAML frontmatter — index.md's Status/Last updated for it "
                          f"has no source to agree with")
            continue
        for key in ("schema_version", "status", "last_updated"):
            if key not in fields:
                errors.append(f"{row.file}: frontmatter is missing '{key}'")
        st, lu = fields.get("status", ""), fields.get("last_updated", "")
        if st and st.lower() not in STATUSES:
            errors.append(f"{row.file}: status '{st}' is not one of {sorted(STATUSES)}")
        if lu and not DATE_RE.fullmatch(lu):
            errors.append(f"{row.file}: last_updated '{lu}' is not YYYY-MM-DD "
                          f"(an unfilled placeholder counts as missing)")
        if st and row.status and st.lower() != row.status.lower() \
                and row.status.lower() not in INDEX_EXTRA_STATUSES:
            errors.append(f"{row.file}: status '{st}' disagrees with index.md line {row.line} "
                          f"'{row.status}'")
        if lu and row.last_updated and lu != row.last_updated:
            errors.append(f"{row.file}: last_updated '{lu}' disagrees with index.md line {row.line} "
                          f"'{row.last_updated}'")

    return not errors, errors


VALID_INDEX = """# Documentation Index — Demo

## 1. Document suite

| Document | File | Status | Last updated |
|----------|------|--------|--------------|
| PRD | [product.md](product.md) | draft | 2026-07-29 |
| System Design | [system-design.md](system-design.md) | locked | 2026-07-28 |
"""

VALID_DOC = """---
schema_version: 1.0.0
status: {status}
last_updated: {date}
---

# {title}
"""


def _write(d: Path, index: str, docs: dict[str, str]) -> Path:
    (d / "index.md").write_text(index, encoding="utf-8")
    for name, body in docs.items():
        (d / name).write_text(body, encoding="utf-8")
    return d


def self_test() -> int:
    good = {
        "product.md": VALID_DOC.format(status="draft", date="2026-07-29", title="PRD"),
        "system-design.md": VALID_DOC.format(status="locked", date="2026-07-28", title="HLD"),
    }
    cases: list[tuple[str, str, dict[str, str], bool]] = [
        ("valid fixture", VALID_INDEX, good, True),
        ("status disagrees", VALID_INDEX,
         {**good, "product.md": VALID_DOC.format(status="locked", date="2026-07-29", title="PRD")}, False),
        ("date disagrees", VALID_INDEX,
         {**good, "product.md": VALID_DOC.format(status="draft", date="2026-01-01", title="PRD")}, False),
        ("no frontmatter", VALID_INDEX, {**good, "product.md": "# PRD\n"}, False),
        ("unclosed frontmatter", VALID_INDEX,
         {**good, "product.md": "---\nstatus: draft\n\n# PRD\n"}, False),
        ("missing schema_version", VALID_INDEX,
         {**good, "product.md": "---\nstatus: draft\nlast_updated: 2026-07-29\n---\n"}, False),
        ("bad status vocabulary", VALID_INDEX,
         {**good, "product.md": VALID_DOC.format(status="frozen", date="2026-07-29", title="PRD")}, False),
        ("placeholder date in doc", VALID_INDEX,
         {**good, "product.md": VALID_DOC.format(status="draft", date="<YYYY-MM-DD>", title="PRD")}, False),
        ("placeholder status in index",
         VALID_INDEX.replace("| draft | 2026-07-29 |", "| {status} | 2026-07-29 |"), good, False),
        ("placeholder date in index",
         VALID_INDEX.replace("| draft | 2026-07-29 |", "| draft | {date} |"), good, False),
        ("index links to a missing file",
         VALID_INDEX.replace("[product.md](product.md)", "[gone.md](gone.md)"), good, False),
        ("no suite table", "# Index\n\nnothing here\n", good, False),
        ("empty suite table",
         "# Index\n\n| Document | File | Status | Last updated |\n|---|---|---|---|\n", {}, False),
        ("wrong column count",
         VALID_INDEX.replace("| PRD | [product.md](product.md) | draft | 2026-07-29 |",
                             "| PRD | [product.md](product.md) | draft |"), good, False),
        ("historical index status is tolerated",
         VALID_INDEX.replace("| draft | 2026-07-29 |", "| historical | 2026-07-29 |"), good, True),
    ]
    failures = 0
    for name, index, docs, want_pass in cases:
        with tempfile.TemporaryDirectory() as td:
            ok, errs = check(_write(Path(td), index, docs))
        if ok != want_pass:
            failures += 1
            print(f"SELF-TEST FAIL: {name!r} expected {'PASS' if want_pass else 'FAIL'}, "
                  f"got {'PASS' if ok else 'FAIL'}: {errs}")
    if failures:
        print(f"SELF-TEST FAIL: {failures} of {len(cases)} cases behaved unexpectedly")
        return 1
    valid = sum(1 for c in cases if c[3])
    print(f"SELF-TEST PASS: {valid} valid + {len(cases) - valid} invalid cases behaved as expected")
    return 0


def main(argv: list[str]) -> int:
    if "--self-test" in argv:
        return self_test()
    if len(argv) != 2:
        print(__doc__)
        return 2
    ok, errors = check(Path(argv[1]))
    if ok:
        print(f"APPROVE: {argv[1]} — every index.md §1 row agrees with its doc's frontmatter")
        return 0
    print(f"REJECT: {argv[1]}")
    for e in errors:
        print(f"  - {e}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
