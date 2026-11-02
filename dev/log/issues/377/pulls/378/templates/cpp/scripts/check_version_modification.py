#!/usr/bin/env python3
"""Reject pull requests that edit the release version by hand.

The version in ``project(... VERSION X.Y.Z)`` (and its mirror in vcpkg.json)
is owned by the release pipeline, which derives it from changelog fragments.
Automated release branches are exempt.

Environment: GITHUB_BASE_REF (default main), GITHUB_HEAD_REF, CPP_ROOT.
"""

from __future__ import annotations

import os
import sys
from typing import List, Optional

import check_changelog_fragment
import cpp_project as cp


def version_at(ref: str, path: str, reader) -> Optional[str]:
    result = cp.run(["git", "show", f"{ref}:{path}"], check=False)
    if result.returncode != 0:
        return None  # the file is new in this pull request
    return reader(result.stdout)


def _cmake_version(text: str) -> Optional[str]:
    return cp.project_version_from_text(text)


def _vcpkg_version(text: str) -> Optional[str]:
    import json

    data = json.loads(text)
    for key in ("version", "version-semver", "version-string"):
        if key in data:
            return str(data[key])
    return None


def find_modifications(base: str, layout: cp.CppLayout) -> List[str]:
    problems = []
    for path, reader in (
        (layout.relative(layout.cmake_file), _cmake_version),
        (layout.relative(layout.vcpkg_manifest), _vcpkg_version),
    ):
        before = version_at(base, path, reader)
        after = version_at("HEAD", path, reader)
        if before is not None and after is not None and before != after:
            problems.append(f"{path}: {before} -> {after}")
    return problems


def main() -> int:
    head_ref = os.environ.get("GITHUB_HEAD_REF", "")
    if head_ref.startswith(check_changelog_fragment.AUTOMATED_BRANCH_PREFIXES):
        print(f"Skipping the version check for automated branch {head_ref}")
        return 0
    layout = cp.detect_layout()
    base_ref = os.environ.get("GITHUB_BASE_REF") or "main"
    try:
        base = cp.git("merge-base", f"origin/{base_ref}", "HEAD")
    except RuntimeError:
        check_changelog_fragment.fetch_base(base_ref)
        base = cp.git("merge-base", f"origin/{base_ref}", "HEAD")
    problems = find_modifications(base, layout)
    if problems:
        for problem in problems:
            print(f"  {problem}")
        cp.error(
            "The version is managed by the release pipeline. Revert the manual version "
            "change and add a changelog fragment with the right `bump:` instead.",
            title="Manual version change",
        )
        return 1
    print("No manual version change detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
