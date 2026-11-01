#!/usr/bin/env python3
"""Require .github/dependabot.yml to cover every committed manifest.

A manifest added without a Dependabot entry is never updated, and nothing
says so (issue #348). Each committed manifest outside dev/log maps to a
package ecosystem; its directory, or the workspace or solution directory
that owns it, must be listed for that ecosystem. Deliberate exclusions are
named in EXCLUDED with their reason.

With GITHUB_REPOSITORY set (always, in Actions), it also requires every
label the config applies to exist: Dependabot skips a missing label with
only a comment on the pull request (issue #350).
"""

import os
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ".github/dependabot.yml"
# dev/log holds snapshots of other repositories' templates, kept as evidence.
SNAPSHOTS = ("dev/log/",)
EXCLUDED = {
    # Compiles every .cs file under experiments/ against a removed API and
    # has not built for many releases; see
    # experiments/issue-348/check-csharp-experiments.sh.
    ("nuget", "/experiments"): "historical, unbuildable debug_test.csproj",
}


def ecosystems(path):
    """Ecosystems that read the committed file at `path`."""
    name = PurePosixPath(path).name
    if name == "package.json":
        return ["npm"]
    if name == "bun.lock":
        return ["bun"]
    if name == "Cargo.toml":
        return ["cargo"]
    if name == "pyproject.toml" or re.fullmatch(r"requirements[\w.-]*\.txt", name):
        return ["pip"]
    if name.endswith(".csproj"):
        return ["nuget"]
    if name == "global.json":
        return ["dotnet-sdk"]
    if name == "pom.xml":
        return ["maven"]
    if name == "composer.json":
        return ["composer"]
    if name == "go.mod":
        return ["gomod"]
    if name == ".pre-commit-config.yaml":
        return ["pre-commit"]
    if re.search(r"dockerfile|containerfile", name, re.IGNORECASE):
        return ["docker"]
    if path.startswith(".github/workflows/") and name.endswith((".yml", ".yaml")):
        return ["github-actions"]
    return []


def configured(text):
    """Map each package ecosystem to the directories dependabot.yml lists."""
    entries, current, in_list = {}, None, False
    for line in text.splitlines():
        stripped = line.split("#", 1)[0].rstrip()
        if not stripped.strip():
            continue
        match = re.match(r"\s*-\s*package-ecosystem:\s*[\"']?([\w-]+)", stripped)
        if match:
            current, in_list = match[1], False
            entries.setdefault(current, set())
            continue
        match = re.match(r"\s*directory:\s*[\"']?([^\"']+)", stripped)
        if match and current:
            entries[current].add(match[1].rstrip("/") or "/")
            in_list = False
            continue
        match = re.match(r"\s*directories:\s*(.*)$", stripped)
        if match and current:
            inline = re.findall(r"[\"']([^\"']+)[\"']", match[1])
            entries[current].update(d.rstrip("/") or "/" for d in inline)
            in_list = not inline
            continue
        match = re.match(r"\s*-\s*[\"']?(/[^\"']*)[\"']?\s*$", stripped)
        if match and current and in_list:
            entries[current].add(match[1].rstrip("/") or "/")
            continue
        in_list = False
    return entries


def labels(text):
    """Every label the `labels:` keys in dependabot.yml apply."""
    found, in_list = set(), False
    for line in text.splitlines():
        stripped = line.split("#", 1)[0].rstrip()
        match = re.match(r"\s*labels:\s*(.*)$", stripped)
        if match:
            inline = re.findall(r"[\"']?([^\"',\[\]]+?)[\"']?\s*(?:,|\])", match[1])
            found.update(label.strip() for label in inline if label.strip())
            in_list = not match[1].strip()
            continue
        match = re.match(r"\s*-\s*[\"']?([^\"']+?)[\"']?\s*$", stripped)
        if match and in_list:
            found.add(match[1])
            continue
        in_list = False
    return found


def missing_labels(text, existing):
    return [
        f"label {label!r} does not exist; create it with "
        f"`gh label create {label}` or remove it"
        for label in sorted(labels(text) - set(existing))
    ]


def owners(path, files):
    """Directories whose Dependabot entry would update the file at `path`."""
    parent = PurePosixPath(path).parent
    directory = "/" + parent.as_posix() if parent.as_posix() != "." else "/"
    if path.startswith(".github/workflows/"):
        return ["/"]
    candidates = [directory]
    for ancestor in parent.parents:
        prefix = "" if ancestor.as_posix() == "." else ancestor.as_posix() + "/"
        owner = "/" + ancestor.as_posix() if prefix else "/"
        # A Cargo workspace root updates its members; a solution updates the
        # projects it contains.
        if (
            PurePosixPath(path).name == "Cargo.toml"
            and prefix + "Cargo.toml" in files
            and "[workspace]" in (ROOT / (prefix + "Cargo.toml")).read_text()
        ) or (
            path.endswith(".csproj")
            and any(re.fullmatch(re.escape(prefix) + r"[^/]+\.slnx?", f) for f in files)
        ):
            candidates.append(owner)
    return candidates


def problems(files, text):
    entries = configured(text)
    missing = []
    for path in sorted(files):
        if path.startswith(SNAPSHOTS):
            continue
        for ecosystem in ecosystems(path):
            candidates = owners(path, files)
            listed = entries.get(ecosystem, set())
            if listed.intersection(candidates):
                continue
            if any((ecosystem, c) in EXCLUDED for c in candidates):
                continue
            missing.append(f"{path}: no {ecosystem} entry for {candidates[0]}")
    for (ecosystem, directory), reason in EXCLUDED.items():
        if directory in entries.get(ecosystem, set()):
            missing.append(
                f"{directory} is listed for {ecosystem} but excluded: {reason}"
            )
    return missing


def main():
    files = set(
        subprocess.run(
            ["git", "ls-files"], cwd=ROOT, check=True, capture_output=True, text=True
        ).stdout.splitlines()
    )
    text = (ROOT / CONFIG).read_text()
    missing = problems(files, text)
    repository = os.environ.get("GITHUB_REPOSITORY")
    if repository:
        existing = subprocess.run(
            ["gh", "api", f"repos/{repository}/labels", "--paginate", "--jq", ".[].name"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.splitlines()
        missing += missing_labels(text, existing)
    else:
        print("GITHUB_REPOSITORY is not set; the labels were not checked.")
    for line in missing:
        print(f"::error file={CONFIG}::{line}")
    if not missing:
        print(f"{CONFIG} covers every committed manifest outside dev/log.")
        if repository:
            print(f"Every label it applies exists in {repository}.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
