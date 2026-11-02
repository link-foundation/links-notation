#!/usr/bin/env python3
"""Bump the version, collect the changelog, commit, push, then tag.

Order matters and mirrors the Rust template:

1. rebase onto the remote branch *while the tree is still clean*, so a
   concurrent merge to main never turns into a conflict in our own edits;
2. bump the version above every already-published tag and update manifests;
3. collect changelog.d/ fragments into CHANGELOG.md and verify the result;
4. commit ``chore: release <tag>`` and push, retrying only a genuinely lost
   non-fast-forward race (a repository-rule refusal fails immediately with an
   explanation instead of being retried as a "conflict");
5. only after the branch push succeeded create and push the annotated tag, so
   a failed push never leaves a tag pointing at an unreachable commit.

Usage: python3 scripts/version_and_commit.py --bump-type patch
       [--description TEXT] [--branch main] [--remote origin] [--cpp-root DIR]

Outputs: version_committed, already_released, new_version, tag.
"""

from __future__ import annotations

import argparse
import os
import sys
from enum import Enum, auto
from typing import Callable, List, Optional

import bump_version
import collect_changelog
import cpp_project as cp

BOT_NAME = "github-actions[bot]"
BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com"

REPOSITORY_RULE_PATTERNS = (
    "gh006",
    "gh013",
    "repository rule violations",
    "changes must be made through a pull request",
    "protected branch",
    "push declined",
)
NON_FAST_FORWARD_PATTERNS = (
    "[rejected]",
    "non-fast-forward",
    "fetch first",
    "updates were rejected",
)


class PushFailure(Enum):
    REPOSITORY_RULES = auto()
    LOST_RACE = auto()
    OTHER = auto()


def classify_push_failure(output: str) -> PushFailure:
    haystack = output.lower()
    # Rules first: a ruleset rejection also contains the word "rejected".
    if any(pattern in haystack for pattern in REPOSITORY_RULE_PATTERNS):
        return PushFailure.REPOSITORY_RULES
    if any(pattern in haystack for pattern in NON_FAST_FORWARD_PATTERNS):
        return PushFailure.LOST_RACE
    return PushFailure.OTHER


class ReleaseError(RuntimeError):
    """A failure that must stop the release with an actionable message."""


def push_with_retry(
    remote: str,
    branch: str,
    cwd,
    max_attempts: int = 3,
    runner: Callable = cp.run,
) -> None:
    for attempt in range(1, max_attempts + 1):
        result = runner(["git", "push", remote, f"HEAD:refs/heads/{branch}"], cwd=cwd, check=False)
        if result.returncode == 0:
            return
        output = f"{result.stdout or ''}{result.stderr or ''}".strip()
        failure = classify_push_failure(output)
        if failure is PushFailure.REPOSITORY_RULES:
            raise ReleaseError(
                f"The push to '{branch}' was declined by a repository rule "
                "(GH006/GH013: protected branch or ruleset). Retrying cannot change "
                "repository policy: allow the release bot to bypass the rule, or use "
                "release_mode=changelog-pr.\n--- git output ---\n" + output
            )
        if failure is PushFailure.OTHER:
            raise ReleaseError(f"git push failed: {output}")
        if attempt == max_attempts:
            raise ReleaseError(f"git push still non-fast-forward after {max_attempts} attempts: {output}")
        print(f"Push lost a race with another commit (attempt {attempt}/{max_attempts}); rebasing...")
        rebase = runner(["git", "pull", "--rebase", remote, branch], cwd=cwd, check=False)
        if rebase.returncode != 0:
            runner(["git", "rebase", "--abort"], cwd=cwd, check=False)
            raise ReleaseError(f"git pull --rebase failed: {(rebase.stdout or '') + (rebase.stderr or '')}")


def sync_with_remote(layout: cp.CppLayout, remote: str, branch: str) -> None:
    cwd = layout.repository_root
    if cp.git("status", "--porcelain", cwd=cwd):
        raise ReleaseError("the working tree must be clean before a release")
    cp.git("fetch", "--tags", "--force", remote, branch, cwd=cwd)
    behind = int(cp.git("rev-list", "--count", f"HEAD..{remote}/{branch}", cwd=cwd) or "0")
    if behind:
        print(f"{remote}/{branch} is {behind} commit(s) ahead; rebasing before editing")
        cp.git("rebase", f"{remote}/{branch}", cwd=cwd)


def release(
    layout: cp.CppLayout,
    bump_type: str,
    description: str = "",
    remote: str = "origin",
    branch: str = "main",
    date: Optional[str] = None,
    push: bool = True,
) -> dict:
    cwd = layout.repository_root
    sync_with_remote(layout, remote, branch)

    current = cp.read_project_version(layout.cmake_file)
    published = cp.published_versions(cp.list_tags(cwd=cwd), layout.multi_language)
    new_version = bump_version.compute_new_version(current, bump_type, None, published)
    tag = cp.build_release_tag(new_version, layout.multi_language)
    print(f"Releasing {current} -> {new_version} ({tag})")

    changed: List[str] = bump_version.apply_version(layout, new_version)
    collect_changelog.collect(layout, new_version, date=date, description=description)

    changelog = layout.changelog_file.read_text(encoding="utf-8") if layout.changelog_file.is_file() else ""
    leftovers = cp.list_fragment_paths(layout.changelog_dir)
    if leftovers:
        raise ReleaseError(f"fragments were not collected: {[layout.relative(p) for p in leftovers]}")
    if f"## [{new_version}]" not in changelog:
        # A release without fragments or description still gets an entry so
        # the changelog never skips a published version.
        collect_changelog.collect(layout, new_version, date=date, description="Maintenance release.")

    paths = changed + [layout.relative(layout.changelog_file)]
    cp.git("add", "--", *paths, cwd=cwd)
    cp.git("add", "-A", "--", layout.relative(layout.changelog_dir), cwd=cwd)
    if cp.run(["git", "diff", "--cached", "--quiet"], cwd=cwd, check=False).returncode == 0:
        print("Nothing to commit: the release was already committed")
        return {"version_committed": False, "already_released": True, "new_version": current, "tag": tag}

    message = f"chore: release {tag}"
    if description.strip():
        message += f"\n\n{description.strip()}"
    cp.git("-c", f"user.name={BOT_NAME}", "-c", f"user.email={BOT_EMAIL}", "commit", "-m", message, cwd=cwd)

    if push:
        push_with_retry(remote, branch, cwd)
    title = cp.build_release_title(new_version, cp.read_project_name(layout.cmake_file), layout.multi_language)
    cp.git(
        "-c", f"user.name={BOT_NAME}", "-c", f"user.email={BOT_EMAIL}",
        "tag", "-a", tag, "-m", title, cwd=cwd,
    )
    if push:
        cp.git("push", remote, f"refs/tags/{tag}", cwd=cwd)
    return {"version_committed": True, "already_released": False, "new_version": new_version, "tag": tag}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--bump-type", required=True, choices=sorted(cp.BUMP_PRIORITY))
    parser.add_argument("--description", default="")
    parser.add_argument("--branch", default=os.environ.get("GITHUB_REF_NAME") or "main")
    parser.add_argument("--remote", default="origin")
    parser.add_argument("--date")
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    try:
        outputs = release(layout, args.bump_type, args.description, args.remote, args.branch, args.date)
    except (ReleaseError, RuntimeError, ValueError) as exc:
        cp.error(str(exc), title="Release failed")
        return 1
    for key, value in outputs.items():
        cp.set_output(key, value)
    return 0


if __name__ == "__main__":
    sys.exit(main())
