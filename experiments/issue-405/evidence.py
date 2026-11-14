#!/usr/bin/env python3
"""Render dependency evidence from native locks and recorded registry responses."""

import json
import re
import tomllib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dev/log/issues/405/pulls/406"
RESEARCH = OUT / "research"


def read(name):
    return json.loads((RESEARCH / name).read_text())


def npm_parents(path, name, version):
    packages = json.loads(path.read_text())["packages"]
    parents = set()
    for location, package in packages.items():
        requirements = {}
        for section in ("dependencies", "devDependencies", "optionalDependencies"):
            requirements.update(package.get(section, {}))
        if name not in requirements:
            continue
        directory = Path(location or ".")
        for base in (directory, *directory.parents):
            resolved = packages.get(str(base / "node_modules" / name))
            if resolved:
                if resolved.get("version") == version:
                    parent = location.rsplit("node_modules/", 1)[-1] or "project"
                    parents.add(f"{parent} requires {name}{requirements[name]}")
                break
    return sorted(parents)


def nuget_parents(path, name, version):
    data = json.loads(path.read_text())
    return sorted(
        {
            f"{parent} requires {name}{requirement}"
            for packages in data["dependencies"].values()
            for parent, info in packages.items()
            for dependency, requirement in info.get("dependencies", {}).items()
            if dependency.casefold() == name.casefold()
        }
    )


def cargo_parents(path, name, version):
    packages = tomllib.loads(path.read_text())["package"]
    counts = defaultdict(int)
    for package in packages:
        counts[package["name"]] += 1
    return sorted(
        {
            f"{package['name']}@{package['version']} selects {dependency}"
            for package in packages
            for dependency in package.get("dependencies", [])
            if dependency == f"{name} {version}"
            or dependency == name
            and counts[name] == 1
        }
    )


def yarn_parents(path, name, version):
    # Yarn Classic records the exact requested selectors beside each version.
    import re

    return [
        "Yarn selectors: " + selectors.replace('"', "")
        for selectors, selected in re.findall(
            r'^([^\n#][^\n]*):\n  version "([^\"]+)"', path.read_text(), re.M
        )
        if selected == version and name + "@" in selectors
    ]


def reason(row):
    if row["after"] == row["latest"]:
        return "Current registry release"
    ecosystem, name = row["ecosystem"], row["name"]
    path = ROOT / row["path"]
    if ecosystem == "composer" and name == "link-foundation/links-notation":
        return "Local path dependency on this PR's 0.31.4 source; registry still serves the previous release"
    if ecosystem == "cargo" and name == "links-notation":
        return "Issue-316 immutable before-version performance baseline; upgrading invalidates the comparison"
    if ecosystem == "pypi" and name in {"click", "markdown-it-py"}:
        return "Scriv 1.8.1 exact runtime requirement; native resolution rejects latest. Upstream nedbat/scriv#208"
    if ecosystem == "nuget":
        parents = nuget_parents(path, name, row["after"])
    elif ecosystem == "npm":
        parents = (
            yarn_parents(path, name, row["after"])
            if path.name == "yarn.lock"
            else bun_parents(path, name)
            if path.name == "bun.lock"
            else npm_parents(path, name, row["after"])
        )
        if name.startswith("@emnapi/") and "beta" in row["after"]:
            return (
                "; ".join(parents)
                + "; upstream selects a newer prerelease; stable dist-tag is older, not an upgrade"
            )
    elif ecosystem == "cargo":
        parents = cargo_parents(path, name, row["after"])
    else:
        parents = []
    if not parents:
        raise ValueError(f"Missing retained-version explanation: {row}")
    return (
        "; ".join(parents)
        + "; latest is outside the parent-supported API range; native resolver retained this version"
    )


def bun_parents(path, name):
    parents = set()
    for match in re.finditer(r'^\s*"[^"\n]+": (\[.*\]),?$', path.read_text(), re.M):
        package = json.loads(match[1])
        if len(package) < 3 or not isinstance(package[2], dict):
            continue
        for field in ("dependencies", "optionalDependencies", "peerDependencies"):
            requirement = package[2].get(field, {}).get(name)
            if requirement:
                parents.add(f"{package[0]} requires {name}{requirement}")
    return sorted(parents)


def main():
    tables = defaultdict(list)
    retained = []
    for row in read("locked-dependencies.json"):
        decision = reason(row)
        if row["after"] != row["latest"]:
            retained.append({**row, "reason": decision})
        before = ", ".join(row["before"]) or "new lock"
        tables[row["ecosystem"]].append(
            f"| `{row['path']}` | {row['name']} | {before} | {row['after']} | {row['latest']} | {decision} |"
        )
    for ecosystem, rows in sorted(tables.items()):
        lines = [
            f"# {ecosystem}: native locked dependency evidence",
            "",
            "Registry snapshots: 2026-11-13 UTC, `registry-transitive.json`. "
            "Before is the initial issue SHA; newly tracked locks say `new lock`. "
            "Every entry is generated by its native package manager. "
            "Parent API bounds are upstream constraints, not local overrides. "
            "See `../analysis.md` for migrations, upstream reports and audit results.",
            "",
            "| Lock | Dependency | Before | After | Latest stable | Decision |",
            "| --- | --- | --- | --- | --- | --- |",
            *rows,
            "",
        ]
        (RESEARCH / f"locked-{ecosystem}.md").write_text("\n".join(lines))
    (RESEARCH / "retained-lock-review.json").write_text(
        json.dumps(retained, indent=2) + "\n"
    )
    print(
        f"Rendered {sum(map(len, tables.values()))} lock entries; {len(retained)} individual retained-version reasons"
    )
    for ecosystem, rows in tables.items():
        print(ecosystem, len(rows))


if __name__ == "__main__":
    main()
