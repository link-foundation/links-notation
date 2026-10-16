#!/usr/bin/env python3
"""Inventory every declared dependency in the repository for issue #348.

Reuses the registry resolver of scripts/ci/check-dependencies.py, but scans the
whole tree (archived experiments, case studies and dev/log snapshots included)
so the tables show every pin, not only the ones the freshness gate enforces.

Usage: python3 experiments/issue-348/inventory.py OUTPUT_DIR
Writes OUTPUT_DIR/direct.json and OUTPUT_DIR/direct.md.
"""

import importlib.util
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "dependencies", ROOT / "scripts/ci/check-dependencies.py"
)
CHECK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECK)


def scope(path):
    relative = path.relative_to(ROOT).as_posix()
    if relative.startswith("dev/log/"):
        return "snapshot"
    if relative.startswith(("experiments/", "docs/case-studies/")):
        return "archived"
    return "active"


NAMES = {
    "package.json",
    "pyproject.toml",
    "Cargo.toml",
    "requirements.txt",
    "pom.xml",
    "composer.json",
    "go.mod",
    "CMakeLists.txt",
    "maven-wrapper.properties",
}
SKIP = {
    ".git",
    "node_modules",
    "vendor",
    "target",
    "bin",
    "obj",
    ".venv",
    "dist",
    "_deps",
}


def collect():
    """Scan one manifest at a time so a malformed snapshot cannot hide the rest."""
    import shutil
    import tempfile

    found, problems = [], []
    files = [
        p
        for p in ROOT.rglob("*")
        if p.is_file()
        and not SKIP.intersection(p.relative_to(ROOT).parts)
        and (p.name in NAMES or p.suffix == ".csproj")
    ]
    for path in sorted(files):
        relative = path.relative_to(ROOT)
        with tempfile.TemporaryDirectory() as temporary:
            copy = Path(temporary) / "scan" / path.name
            copy.parent.mkdir()
            shutil.copy(path, copy)
            CHECK.ACTIVE = ("scan",)
            try:
                for d in CHECK.manifests(Path(temporary)):
                    found.append(
                        CHECK.Dependency(
                            path, d.ecosystem, d.name, d.declared, d.literal
                        )
                    )
            except Exception as error:
                problems.append(f"{relative}: {error}")
    CHECK.ACTIVE = ()
    found += CHECK.manifests(ROOT)  # workflows and the root pre-commit config
    # Composite actions and nested pre-commit configs are not scanned by the gate.
    import re

    for path in sorted(ROOT.rglob("action.y*ml")) + sorted(
        ROOT.rglob(".pre-commit-config.yaml")
    ):
        if (
            SKIP.intersection(path.relative_to(ROOT).parts)
            or path == ROOT / ".pre-commit-config.yaml"
        ):
            continue
        text = path.read_text()
        for match in re.finditer(r"uses:\s*([\w.-]+/[\w./-]+)@([^\s#]+)", text):
            repo = "/".join(match[1].split("/")[:2])
            found.append(CHECK.Dependency(path, "github", repo, match[2], match[2]))
        for match in re.finditer(
            r"repo:\s*https://github.com/([\w.-]+/[\w.-]+)\s+rev:\s*([^\s]+)", text
        ):
            found.append(CHECK.Dependency(path, "github", match[1], match[2], match[2]))
    return list(dict.fromkeys(found)), problems


def main():
    output = Path(sys.argv[1])
    output.mkdir(parents=True, exist_ok=True)
    found, problems = collect()
    keys = sorted({(d.ecosystem, d.name) for d in found})

    def query(key):
        try:
            return key, CHECK.latest(*key), None
        except Exception as error:  # recorded, never hidden
            return key, None, str(error)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = {
            key: (release, error) for key, release, error in pool.map(query, keys)
        }

    rows = []
    for d in found:
        release, error = results[(d.ecosystem, d.name)]
        current = release is not None and (
            CHECK.version_key(d.floor) == CHECK.version_key(release)
            and not (
                d.ecosystem == "github"
                and d.literal != CHECK.registry_literal(d, release)
            )
        )
        rows.append(
            {
                "scope": scope(d.path),
                "path": d.path.relative_to(ROOT).as_posix(),
                "ecosystem": d.ecosystem,
                "name": d.name,
                "declared": d.declared,
                "latest": release,
                "error": error,
                "current": current,
            }
        )
    rows.sort(key=lambda r: (r["ecosystem"], r["scope"], r["path"], r["name"]))
    (output / "direct.json").write_text(json.dumps(rows, indent=2) + "\n")
    lines = []
    for ecosystem in sorted({r["ecosystem"] for r in rows}):
        lines += [
            f"## {ecosystem}",
            "",
            "| Scope | Manifest | Dependency | Declared | Latest | Current |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for r in rows:
            if r["ecosystem"] == ecosystem:
                latest = r["latest"] or f"error: {r['error']}"
                mark = "yes" if r["current"] else "**no**"
                lines.append(
                    f"| {r['scope']} | `{r['path']}` | `{r['name']}` | `{r['declared']}` | `{latest}` | {mark} |"
                )
        lines.append("")
    (output / "direct.md").write_text("\n".join(lines))
    stale = [r for r in rows if not r["current"]]
    for problem in problems:
        print("UNPARSED", problem)
    (output / "unparsed.txt").write_text("\n".join(problems) + "\n")
    print(f"{len(rows)} declarations, {len(keys)} packages, {len(stale)} not current")
    for r in stale:
        print(
            f"{r['scope']:8} {r['path']}: {r['name']} {r['declared']} -> {r['latest'] or r['error']}"
        )


if __name__ == "__main__":
    main()
