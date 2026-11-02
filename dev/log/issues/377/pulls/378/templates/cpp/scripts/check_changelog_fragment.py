#!/usr/bin/env python3
"""Require a changelog fragment in pull requests that change code.

The check looks at the files *added or modified by this pull request*
(``origin/<base>...HEAD``), not at the directory contents, so leftover
fragments of other unreleased pull requests cannot satisfy it. Every added
fragment is also parsed, so an invalid ``bump:`` fails here rather than at
release time.

Environment: GITHUB_BASE_REF (default main), GITHUB_HEAD_REF, CPP_ROOT.
"""

from __future__ import annotations

import os
import sys
from typing import List, Tuple

import cpp_project as cp
import detect_code_changes

AUTOMATED_BRANCH_PREFIXES = (
    "changelog-manual-release-",
    "changeset-release/",
    "release/",
    "automated-release/",
)


def fetch_base(base_ref: str) -> None:
    refspec = f"refs/heads/{base_ref}:refs/remotes/origin/{base_ref}"
    args = ["fetch", "origin"]
    if cp.git("rev-parse", "--is-shallow-repository") == "true":
        args.append("--unshallow")
    cp.git(*args, refspec)


def changed_files(base_ref: str) -> List[str]:
    comparison = f"origin/{base_ref}...HEAD"
    try:
        output = cp.git("diff", "--name-only", "--diff-filter=ACMR", comparison)
    except RuntimeError as first_error:
        print(f"Initial diff failed ({first_error}); fetching origin/{base_ref} and retrying")
        fetch_base(base_ref)
        output = cp.git("diff", "--name-only", "--diff-filter=ACMR", comparison)
    return [line for line in output.splitlines() if line]


def is_fragment(path: str, changelog_prefix: str) -> bool:
    return (
        path.startswith(changelog_prefix)
        and path.endswith(".md")
        and not path.lower().endswith("readme.md")
    )


def evaluate(files: List[str], cpp_prefix: str) -> Tuple[List[str], List[str]]:
    code = [f for f in files if detect_code_changes.is_code_file(f, cpp_prefix)]
    fragments = [f for f in files if is_fragment(f, f"{cpp_prefix}changelog.d/")]
    return code, fragments


def main() -> int:
    head_ref = os.environ.get("GITHUB_HEAD_REF", "")
    if head_ref.startswith(AUTOMATED_BRANCH_PREFIXES):
        print(f"Skipping the changelog check for automated branch {head_ref}")
        return 0
    layout = cp.detect_layout()
    base_ref = os.environ.get("GITHUB_BASE_REF") or "main"
    try:
        files = changed_files(base_ref)
    except RuntimeError as exc:
        cp.error(f"Could not determine the pull request's changed files: {exc}")
        return 1

    code, fragments = evaluate(files, layout.root_prefix)
    print(f"Code files changed: {len(code)}")
    for path in code:
        print(f"  {path}")
    print(f"Changelog fragments added: {len(fragments)}")
    for path in fragments:
        print(f"  {path}")

    for path in fragments:
        try:
            fragment = cp.parse_fragment(layout.repository_root / path)
        except ValueError as exc:
            cp.error(str(exc), title="Invalid changelog fragment")
            return 1
        if not fragment.body:
            cp.error(f"{path} has no content below its front matter", title="Empty changelog fragment")
            return 1

    if code and not fragments:
        cp.error(
            f"This pull request changes code but adds no changelog fragment. Add one with "
            f"`python3 scripts/create_changelog_fragment.py --bump-type patch --description \"...\"` "
            f"or create {layout.root_prefix}changelog.d/YYYYMMDD_HHMMSS_description.md "
            f"(see {layout.root_prefix}changelog.d/README.md).",
            title="Missing changelog fragment",
        )
        return 1
    print("Changelog check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
