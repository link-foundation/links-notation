#!/usr/bin/env python3
"""Create a changelog fragment in changelog.d/.

Used by developers and by the ``changelog-pr`` release mode, which opens a
pull request with a fragment instead of releasing immediately.

Usage: python3 scripts/create_changelog_fragment.py --bump-type minor
       [--description TEXT] [--section Added] [--name slug] [--cpp-root DIR]

Outputs: fragment (path of the new file).
"""

from __future__ import annotations

import argparse
import datetime
import re
import sys

import cpp_project as cp

SECTIONS = ("Added", "Changed", "Deprecated", "Removed", "Fixed", "Security")
SECTION_BY_BUMP = {"major": "Changed", "minor": "Added", "patch": "Fixed"}


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return slug[:48].rstrip("_") or "change"


def render_fragment(bump_type: str, description: str, section: str) -> str:
    lines = [line.strip() for line in description.strip().splitlines() if line.strip()]
    if not lines:
        lines = [f"Manual {bump_type} release"]
    items = "\n".join(line if line.startswith("- ") else f"- {line}" for line in lines)
    return f"---\nbump: {bump_type}\n---\n\n### {section}\n{items}\n"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--bump-type", required=True, choices=sorted(cp.BUMP_PRIORITY))
    parser.add_argument("--description", default="")
    parser.add_argument("--section", choices=SECTIONS)
    parser.add_argument("--name", help="Slug appended to the timestamped file name")
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    layout.changelog_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    slug = slugify(args.name or args.description or f"{args.bump_type}_release")
    path = layout.changelog_dir / f"{timestamp}_{slug}.md"
    section = args.section or SECTION_BY_BUMP[args.bump_type]
    path.write_text(render_fragment(args.bump_type, args.description, section), encoding="utf-8")
    print(f"Created {layout.relative(path)}")
    cp.set_output("fragment", layout.relative(path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
