#!/usr/bin/env python3
"""Bump the C++ project version in every manifest that carries it.

project(VERSION) in CMakeLists.txt is the source of truth; vcpkg.json mirrors
it. conanfile.py reads CMakeLists.txt, and the vcpkg port, NuGet package and
Doxygen PROJECT_NUMBER are rendered from it at build time, so they need no
edit.

Usage:
  python3 scripts/bump_version.py --bump-type minor [--cpp-root DIR]
  python3 scripts/bump_version.py --set-version 1.2.3 [--cpp-root DIR]
  python3 scripts/bump_version.py --bump-type patch --dry-run

Outputs: old_version, new_version.
"""

from __future__ import annotations

import argparse
import sys
from typing import List, Optional

import cpp_project as cp


def compute_new_version(
    current: str,
    bump_type: Optional[str] = None,
    set_version: Optional[str] = None,
    published: Optional[List[str]] = None,
) -> str:
    """Return the next version, always above every already-published version."""
    if set_version:
        cp.parse_semver(set_version)
        return set_version
    if not bump_type:
        raise ValueError("either bump_type or set_version is required")
    new_version = cp.bump_semver(current, bump_type)
    highest = cp.max_version(published or [])
    if highest and cp.parse_semver(highest) >= cp.parse_semver(new_version):
        new_version = cp.bump_semver(highest, bump_type)
    return new_version


def apply_version(layout: cp.CppLayout, version: str) -> List[str]:
    """Write ``version`` into the manifests; return the changed paths."""
    changed = []
    if cp.write_project_version(layout.cmake_file, version):
        changed.append(layout.relative(layout.cmake_file))
    if cp.write_vcpkg_version(layout.vcpkg_manifest, version):
        changed.append(layout.relative(layout.vcpkg_manifest))
    return changed


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--bump-type", choices=sorted(cp.BUMP_PRIORITY))
    group.add_argument("--set-version")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--ignore-tags",
        action="store_true",
        help="Do not raise the version above existing release tags",
    )
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    current = cp.read_project_version(layout.cmake_file)
    published = [] if args.ignore_tags else cp.published_versions(
        cp.list_tags(cwd=layout.repository_root), layout.multi_language
    )
    new_version = compute_new_version(current, args.bump_type, args.set_version, published)
    print(f"Version: {current} -> {new_version}")
    if not args.dry_run:
        for path in apply_version(layout, new_version):
            print(f"  updated {path}")
    cp.set_output("old_version", current)
    cp.set_output("new_version", new_version)
    return 0


if __name__ == "__main__":
    sys.exit(main())
