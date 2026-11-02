#!/usr/bin/env python3
"""Decide whether the push to main needs a release.

* Pending changelog fragments -> release with a version bump.
* No fragments -> check the release artifacts of the *current* version. When
  one is missing (e.g. a previous run failed after tagging, or NuGet was down)
  the release is re-run for the same version without a bump, so a partial
  release heals itself on the next push instead of being silently skipped.

Artifacts checked: the GitHub release for the version tag and, when
``NUGET_PUBLISH=true``, the NuGet package version on the NuGet feed. Lookups
that fail for any reason other than "not found" abort the job rather than
guessing.

Usage: python3 scripts/check_release_needed.py [--cpp-root DIR]

Environment: HAS_FRAGMENTS, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_API_URL,
NUGET_PUBLISH, NUGET_PACKAGE_ID, NUGET_FLAT_CONTAINER_URL.

Outputs: should_release, skip_bump, version, github_release_published,
nuget_required, nuget_published.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, Dict, Optional

import cpp_project as cp

Fetcher = Callable[[str, Dict[str, str]], Optional[bytes]]


def http_get(url: str, headers: Dict[str, str]) -> Optional[bytes]:
    """GET ``url``; return the body, ``None`` on 404, raise on anything else."""
    request = urllib.request.Request(url, headers={"User-Agent": "cpp-release-check", **headers})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310
            return response.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise


def github_release_exists(repository: str, tag: str, fetch: Fetcher = http_get) -> bool:
    api = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = f"{api}/repos/{repository}/releases/tags/{urllib.parse.quote(tag, safe='')}"
    return fetch(url, headers) is not None


def nuget_version_exists(package_id: str, version: str, fetch: Fetcher = http_get) -> bool:
    base = os.environ.get(
        "NUGET_FLAT_CONTAINER_URL", "https://api.nuget.org/v3-flatcontainer"
    ).rstrip("/")
    body = fetch(f"{base}/{package_id.lower()}/index.json", {})
    if body is None:
        return False
    versions = json.loads(body.decode("utf-8")).get("versions", [])
    return version.lower() in (v.lower() for v in versions)


def decide(has_fragments: bool, release_complete: Optional[bool]) -> Dict[str, bool]:
    if has_fragments:
        return {"should_release": True, "skip_bump": False}
    if release_complete:
        return {"should_release": False, "skip_bump": False}
    return {"should_release": True, "skip_bump": True}


def main(argv=None, fetch: Fetcher = http_get) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    version = cp.read_project_version(layout.cmake_file)
    has_fragments = os.environ.get("HAS_FRAGMENTS", "").lower() == "true"
    cp.set_output("version", version)

    if has_fragments:
        print("Pending changelog fragments found: a new version will be released.")
        for key, value in decide(True, None).items():
            cp.set_output(key, value)
        return 0

    repository = os.environ.get("GITHUB_REPOSITORY", "")
    if not repository:
        cp.error("GITHUB_REPOSITORY is required to check the GitHub release")
        return 2
    tag = cp.build_release_tag(version, layout.multi_language)
    nuget_required = os.environ.get("NUGET_PUBLISH", "").lower() == "true"
    try:
        github_published = github_release_exists(repository, tag, fetch)
        nuget_published = False
        if nuget_required:
            package_id = os.environ.get("NUGET_PACKAGE_ID", "")
            if not package_id:
                cp.error("NUGET_PUBLISH=true needs NUGET_PACKAGE_ID")
                return 2
            nuget_published = nuget_version_exists(package_id, version, fetch)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        cp.error(f"Could not check the published artifacts of {version}: {exc}")
        return 1

    complete = github_published and (not nuget_required or nuget_published)
    print(
        f"Version {version} ({tag}): GitHub release "
        f"{'exists' if github_published else 'missing'}"
        + (f", NuGet {'published' if nuget_published else 'missing'}" if nuget_required else "")
    )
    if complete:
        print("No fragments and every artifact of the current version exists: nothing to release.")
    else:
        print("No fragments but an artifact is missing: re-running the release without a bump.")
    for key, value in decide(False, complete).items():
        cp.set_output(key, value)
    cp.set_output("github_release_published", github_published)
    cp.set_output("nuget_required", nuget_required)
    cp.set_output("nuget_published", nuget_published)
    return 0


if __name__ == "__main__":
    sys.exit(main())
