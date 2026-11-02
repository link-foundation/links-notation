#!/usr/bin/env python3
"""Create (or complete) the GitHub release of the current C++ version.

* Release notes are the ``## [X.Y.Z]`` entry of CHANGELOG.md plus a short
  "Install" section, capped below GitHub's body limit with a link to the full
  changelog at the tag.
* Assets (source/headers archives, checksums, rendered vcpkg port, .nupkg)
  are uploaded from ``--assets-dir``.
* Idempotent: when the release already exists (a re-run after a partial
  failure) its notes are refreshed and assets re-uploaded with ``--clobber``
  instead of failing.

Usage: python3 scripts/create_github_release.py --repository owner/repo
       [--version X.Y.Z] [--target SHA] [--assets-dir dist] [--prerelease]
       [--dry-run] [--cpp-root DIR]

Environment: GH_TOKEN (or GITHUB_TOKEN) for the gh CLI.
"""

from __future__ import annotations

import argparse
import os
import re
import secrets
import sys
from pathlib import Path
from typing import List, Optional

import cpp_project as cp

MAX_RELEASE_NOTES_BYTES = 60_000


def print_untrusted(text: str) -> None:
    """Print repository-controlled text without runner command parsing."""
    if not os.environ.get("GITHUB_ACTIONS"):
        print(text)
        return
    token = secrets.token_hex(16)
    print(f"::stop-commands::{token}")
    print(text)
    print(f"::{token}::")


def extract_changelog_entry(changelog: str, version: str) -> Optional[str]:
    pattern = rf"^## \[?{re.escape(version)}\]?(?:\s[^\n]*)?$"
    match = re.search(pattern, changelog, re.MULTILINE)
    if not match:
        return None
    rest = changelog[match.end():]
    following = re.search(r"^## ", rest, re.MULTILINE)
    entry = (rest[: following.start()] if following else rest).strip()
    return entry or None


def truncate_to_bytes(text: str, max_bytes: int) -> str:
    return text.encode("utf-8")[:max_bytes].decode("utf-8", errors="ignore")


def cap_release_notes(notes: str, changelog_url: str, max_bytes: int = MAX_RELEASE_NOTES_BYTES) -> str:
    if len(notes.encode("utf-8")) <= max_bytes:
        return notes
    notice = (
        "\n\n---\n\nRelease notes were truncated because the changelog entry is too "
        f"large for GitHub Releases. See the full changelog: {changelog_url}"
    )
    budget = max_bytes - len(notice.encode("utf-8"))
    if budget <= 0:
        return truncate_to_bytes(notice.lstrip(), max_bytes)
    return truncate_to_bytes(notes.rstrip(), budget).rstrip() + notice


def install_section(repository: str, tag: str, version: str, package: str, port: str) -> str:
    return f"""### Install

CMake `FetchContent`:

```cmake
FetchContent_Declare({package} GIT_REPOSITORY https://github.com/{repository}.git GIT_TAG {tag})
FetchContent_MakeAvailable({package})
target_link_libraries(app PRIVATE {package}::{package})
```

vcpkg overlay port (attached as `{port}-vcpkg-port-{version}.tar.gz`), Conan
(`conan create . --version {version}`) and the other channels are described
in [docs/distribution.md](https://github.com/{repository}/blob/{tag}/docs/distribution.md)."""


def build_notes(layout: cp.CppLayout, repository: str, version: str) -> str:
    tag = cp.build_release_tag(version, layout.multi_language)
    changelog = layout.changelog_file.read_text(encoding="utf-8") if layout.changelog_file.is_file() else ""
    entry = extract_changelog_entry(changelog, version) or f"Release {version}."
    package = cp.read_project_name(layout.cmake_file)
    port = cp.read_vcpkg_name(layout.vcpkg_manifest) or package.replace("_", "-")
    notes = f"{entry}\n\n{install_section(repository, tag, version, package, port)}"
    changelog_url = f"https://github.com/{repository}/blob/{tag}/{layout.relative(layout.changelog_file)}"
    return cap_release_notes(notes, changelog_url)


def list_assets(assets_dir: Optional[str]) -> List[str]:
    if not assets_dir or not Path(assets_dir).is_dir():
        return []
    return sorted(str(p) for p in Path(assets_dir).iterdir() if p.is_file())


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--version")
    parser.add_argument("--target", help="Commit the tag is created at when it does not exist")
    parser.add_argument("--assets-dir")
    parser.add_argument("--prerelease", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    if not args.repository:
        cp.error("--repository (or GITHUB_REPOSITORY) is required")
        return 2

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    version = cp.normalize_version(args.version or cp.read_project_version(layout.cmake_file))
    tag = cp.build_release_tag(version, layout.multi_language)
    title = cp.build_release_title(version, cp.read_project_name(layout.cmake_file), layout.multi_language)
    notes = build_notes(layout, args.repository, version)
    assets = list_assets(args.assets_dir)

    print(f"Release {title} ({tag}) in {args.repository} with {len(assets)} asset(s)")
    print_untrusted(notes)
    cp.set_output("tag", tag)
    cp.set_output("title", title)
    if args.dry_run:
        return 0

    exists = cp.run(["gh", "release", "view", tag, "--repo", args.repository], check=False).returncode == 0
    notes_file = Path(os.environ.get("RUNNER_TEMP", ".")) / f"release-notes-{tag}.md"
    notes_file.write_text(notes, encoding="utf-8")
    try:
        if exists:
            print(f"Release {tag} already exists; refreshing notes and assets")
            cp.run(["gh", "release", "edit", tag, "--repo", args.repository, "--title", title,
                    "--notes-file", str(notes_file)])
            if assets:
                cp.run(["gh", "release", "upload", tag, "--repo", args.repository, "--clobber", *assets])
        else:
            cmd = ["gh", "release", "create", tag, "--repo", args.repository, "--title", title,
                   "--notes-file", str(notes_file), "--verify-tag" if not args.target else f"--target={args.target}"]
            if args.prerelease:
                cmd.append("--prerelease")
            cp.run(cmd + assets)
    except RuntimeError as exc:
        cp.error(str(exc), title="GitHub release failed")
        return 1
    finally:
        notes_file.unlink(missing_ok=True)
    print(f"GitHub release {tag} is complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
