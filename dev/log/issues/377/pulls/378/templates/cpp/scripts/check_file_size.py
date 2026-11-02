#!/usr/bin/env python3
"""Keep source and documentation files small enough to review (and for AI
agents to read in one pass).

Limits (lines):  code 1000 (warning at 900), markdown 2500 (warning at 2250).
Only files tracked by git are checked, so build trees never count.
Collected raw evidence under docs/case-studies/*/data/ is exempt.

Usage: python3 scripts/check_file_size.py [--root DIR]
Exit code 1 when a file exceeds its limit.
"""

from __future__ import annotations

import argparse
import fnmatch
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import cpp_project as cp

CODE_LIMIT = (1000, 900)
DOC_LIMIT = (2500, 2250)
LIMITS: Dict[str, Tuple[int, int]] = {
    **{ext: CODE_LIMIT for ext in (
        ".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx", ".ipp", ".inl",
        ".cmake", ".py", ".sh",
    )},
    ".md": DOC_LIMIT,
}
NAMED_LIMITS = {"CMakeLists.txt": CODE_LIMIT}
EXEMPT_PATTERNS = ("docs/case-studies/*/data/*",)


def limit_for(path: str):
    name = path.rsplit("/", 1)[-1]
    if name in NAMED_LIMITS:
        return NAMED_LIMITS[name]
    return LIMITS.get(Path(name).suffix)


def is_exempt(path: str) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in EXEMPT_PATTERNS)


def count_lines(path: Path) -> int:
    with path.open("rb") as handle:
        return sum(1 for _ in handle)


def check(root: Path, files: List[str]):
    warnings, violations = [], []
    for relative in files:
        limit = limit_for(relative)
        path = root / relative
        if limit is None or is_exempt(relative) or not path.is_file():
            continue
        lines = count_lines(path)
        max_lines, warn_lines = limit
        if lines > max_lines:
            violations.append((relative, lines, max_lines))
        elif lines > warn_lines:
            warnings.append((relative, lines, max_lines))
    return warnings, violations


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Check file line counts")
    parser.add_argument("--root", default=".")
    args = parser.parse_args(argv)
    root = Path(args.root)
    files = cp.git("ls-files", cwd=root).splitlines()
    warnings, violations = check(root, files)
    for path, lines, max_lines in warnings:
        print(f"::warning file={path}::{path} has {lines} lines, close to the limit of {max_lines}")
    for path, lines, max_lines in violations:
        print(f"::error file={path}::{path} has {lines} lines; the limit is {max_lines}. Split it.")
    if violations:
        return 1
    print(f"All {len(files)} tracked files are within their size limits.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
