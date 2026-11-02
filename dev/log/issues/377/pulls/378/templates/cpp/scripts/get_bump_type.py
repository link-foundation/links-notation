#!/usr/bin/env python3
"""Determine the release bump type from the pending changelog fragments.

Every fragment in changelog.d/ may declare ``bump: patch|minor|major`` in its
front matter (default: patch). The highest bump among all pending fragments
wins, so a breaking change is never released as a patch.

Usage: python3 scripts/get_bump_type.py [--cpp-root DIR] [--default patch]

Outputs: bump_type, fragment_count, has_fragments.
"""

from __future__ import annotations

import argparse
import sys

import cpp_project as cp


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--default", default="patch", choices=sorted(cp.BUMP_PRIORITY))
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    try:
        fragments = cp.read_fragments(layout.changelog_dir)
    except ValueError as exc:
        cp.error(str(exc), title="Invalid changelog fragment")
        return 1

    for fragment in fragments:
        print(f"  {layout.relative(fragment.path)}: {fragment.bump}")
    bump_type = cp.highest_bump(fragments, default=args.default)
    print(f"Found {len(fragments)} changelog fragment(s); bump type: {bump_type}")

    cp.set_output("bump_type", bump_type)
    cp.set_output("fragment_count", len(fragments))
    cp.set_output("has_fragments", bool(fragments))
    return 0


if __name__ == "__main__":
    sys.exit(main())
