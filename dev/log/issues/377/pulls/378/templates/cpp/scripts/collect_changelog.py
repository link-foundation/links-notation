#!/usr/bin/env python3
"""Collect changelog.d/ fragments into CHANGELOG.md under a new version entry.

The entry ``## [X.Y.Z] - YYYY-MM-DD`` is inserted above the newest existing
``## [`` entry, fragment front matter is dropped, and the fragments are
deleted. Running it without fragments is a no-op.

Usage: python3 scripts/collect_changelog.py --version 1.2.3 [--cpp-root DIR]
       [--date YYYY-MM-DD] [--description TEXT]

Outputs: collected (true/false), fragment_count.
"""

from __future__ import annotations

import argparse
import datetime
import sys
from pathlib import Path
from typing import List, Optional

import cpp_project as cp

DEFAULT_HEADER = """# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
"""


def render_entry(version: str, date: str, bodies: List[str], description: Optional[str] = None) -> str:
    parts = [f"## [{version}] - {date}"]
    if description and description.strip():
        parts.append(description.strip())
    parts.extend(body for body in bodies if body.strip())
    return "\n\n".join(parts) + "\n"


def insert_entry(changelog: str, entry: str) -> str:
    """Insert ``entry`` before the first ``## [`` heading (or at the end)."""
    if not changelog.strip():
        changelog = DEFAULT_HEADER
    lines = changelog.splitlines(keepends=True)
    for index, line in enumerate(lines):
        if line.startswith("## ["):
            return "".join(lines[:index]) + entry + "\n" + "".join(lines[index:])
    return changelog.rstrip("\n") + "\n\n" + entry


def collect(
    layout: cp.CppLayout,
    version: str,
    date: Optional[str] = None,
    description: Optional[str] = None,
) -> int:
    """Collect the fragments; return how many were collected."""
    fragments = cp.read_fragments(layout.changelog_dir)
    if not fragments and not (description and description.strip()):
        return 0
    date = date or datetime.date.today().isoformat()
    changelog_path: Path = layout.changelog_file
    existing = changelog_path.read_text(encoding="utf-8") if changelog_path.is_file() else ""
    if f"## [{version}]" in existing:
        raise ValueError(f"{layout.relative(changelog_path)} already has an entry for {version}")
    entry = render_entry(version, date, [f.body for f in fragments], description)
    changelog_path.write_text(insert_entry(existing, entry), encoding="utf-8")
    for fragment in fragments:
        fragment.path.unlink()
    return len(fragments)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--version", required=True)
    parser.add_argument("--date")
    parser.add_argument("--description")
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    version = cp.normalize_version(args.version)
    cp.parse_semver(version)
    try:
        count = collect(layout, version, args.date, args.description)
    except ValueError as exc:
        cp.error(str(exc), title="Changelog collection failed")
        return 1
    print(f"Collected {count} fragment(s) into {layout.relative(layout.changelog_file)}")
    cp.set_output("collected", count > 0 or bool(args.description))
    cp.set_output("fragment_count", count)
    return 0


if __name__ == "__main__":
    sys.exit(main())
