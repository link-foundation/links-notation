#!/usr/bin/env python3
"""Rename the template's placeholder package and repository in one step.

Run once after "Use this template". Every spelling of the placeholder is
replaced in the tracked files, and files and directories named after it are
renamed:

* ``my_package``  -> NAME          (CMake project, targets, namespace, Conan)
* ``MY_PACKAGE``  -> NAME upper    (CMake options, include guards)
* ``MyPackage``   -> NAME in CamelCase (Conan recipe classes)
* ``my-package``  -> NAME with dashes  (vcpkg port, release asset names)
* ``link-foundation/cpp-ai-driven-development-pipeline-template`` -> the
  repository (``--repository``, or the ``origin`` remote when omitted), and
  the matching GitHub Pages host.

Release history (``CHANGELOG.md``, ``changelog.d/``), the case studies and the
script tests (which build their own fixture repositories) are left alone.

Usage: python3 scripts/rename_project.py NAME [--repository OWNER/REPO]
       [--dry-run]

NAME is a C++ identifier in snake_case, e.g. ``links_notation``.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

PLACEHOLDER = "my_package"
TEMPLATE_REPOSITORY = "link-foundation/cpp-ai-driven-development-pipeline-template"
NAME_RE = re.compile(r"^[a-z][a-z0-9]*(_[a-z0-9]+)*$")
REPOSITORY_RE = re.compile(r"^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$")
EXCLUDED_PREFIXES = ("docs/case-studies/", "scripts/tests/", "changelog.d/")
EXCLUDED_NAMES = ("CHANGELOG.md", "rename_project.py", ".gitkeep")


def spellings(name: str) -> Dict[str, str]:
    """Map every placeholder spelling to the spelling of ``name``."""
    camel = "".join(part.capitalize() for part in name.split("_"))
    return {
        PLACEHOLDER: name,
        PLACEHOLDER.upper(): name.upper(),
        "MyPackage": camel,
        PLACEHOLDER.replace("_", "-"): name.replace("_", "-"),
    }


def repository_spellings(repository: str) -> Dict[str, str]:
    """Map the template repository (and its Pages host) to ``repository``."""
    old_owner, old_repo = TEMPLATE_REPOSITORY.split("/")
    owner, repo = repository.split("/")
    return {
        TEMPLATE_REPOSITORY: repository,
        # .lycheeignore holds regular expressions, hence the escaped form.
        f"{old_owner}\\.github\\.io/{old_repo}": f"{re.escape(owner.lower() + '.github.io')}/{re.escape(repo)}",
        f"{old_owner}.github.io/{old_repo}": f"{owner.lower()}.github.io/{repo}",
        # A heading or a sentence that names the repository without its owner.
        old_repo: repo,
    }


def origin_repository(root: Path) -> Optional[str]:
    """``owner/repo`` of the ``origin`` remote, when it is on GitHub."""
    result = subprocess.run(["git", "remote", "get-url", "origin"], cwd=root,
                            capture_output=True, text=True, check=False)
    match = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:\.git)?/?$", result.stdout.strip())
    return match.group(1) if match else None


def tracked_files(root: Path) -> List[Path]:
    output = subprocess.run(["git", "ls-files", "-z"], cwd=root, capture_output=True,
                            text=True, check=True).stdout
    files = []
    for relative in filter(None, output.split("\0")):
        if relative.startswith(EXCLUDED_PREFIXES) or Path(relative).name in EXCLUDED_NAMES:
            continue
        if (root / relative).is_file():
            files.append(Path(relative))
    return files


def replace_all(text: str, replacements: Dict[str, str]) -> str:
    # Longest first, so the repository URL is replaced before its bare name.
    for old in sorted(replacements, key=len, reverse=True):
        text = text.replace(old, replacements[old])
    return text


def rename(root: Path, name: str, repository: Optional[str], dry_run: bool = False) -> List[str]:
    """Apply the rename under ``root``; return a description of every change."""
    replacements = spellings(name)
    if repository and repository != TEMPLATE_REPOSITORY:
        replacements.update(repository_spellings(repository))
    changes = []
    files = tracked_files(root)
    for relative in files:
        path = root / relative
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        updated = replace_all(text, replacements)
        if updated != text:
            changes.append(f"edit   {relative.as_posix()}")
            if not dry_run:
                path.write_bytes(updated.encode("utf-8"))
    # Rename files first, then directories deepest first, so no path is
    # invalidated by the rename of one of its parents.
    renamed_dirs = set()
    for relative in files:
        new_name = replace_all(relative.name, spellings(name))
        if new_name != relative.name:
            changes.append(f"rename {relative.as_posix()} -> {new_name}")
            if not dry_run:
                (root / relative).rename(root / relative.parent / new_name)
        for parent in relative.parents:
            if parent.name and replace_all(parent.name, spellings(name)) != parent.name:
                renamed_dirs.add(parent)
    for directory in sorted(renamed_dirs, key=lambda p: len(p.parts), reverse=True):
        new_name = replace_all(directory.name, spellings(name))
        changes.append(f"rename {directory.as_posix()}/ -> {new_name}/")
        if not dry_run:
            (root / directory).rename(root / directory.parent / new_name)
    return changes


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("name", help="new package name in snake_case, e.g. links_notation")
    parser.add_argument("--repository", help="OWNER/REPO (default: the origin remote)")
    parser.add_argument("--dry-run", action="store_true", help="list the changes only")
    args = parser.parse_args(argv)

    if not NAME_RE.match(args.name):
        parser.error(f"{args.name!r} is not a snake_case identifier such as links_notation")
    root = Path(__file__).resolve().parent.parent
    repository = args.repository or origin_repository(root)
    if repository and not REPOSITORY_RE.match(repository):
        parser.error(f"{repository!r} is not OWNER/REPO")
    if repository is None:
        print("No --repository and no GitHub origin remote: repository URLs are left unchanged")

    changes = rename(root, args.name, repository, dry_run=args.dry_run)
    for change in changes:
        print(change)
    verb = "Would apply" if args.dry_run else "Applied"
    print(f"{verb} {len(changes)} change(s). Review with `git status` and `git diff`, then commit.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
