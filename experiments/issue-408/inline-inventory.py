#!/usr/bin/env python3
"""Record workflow-installed tools and browser images omitted by manifest adapters."""

import json
import re
import subprocess

from inventory import BASE, OUT, ROOT

registry = json.loads((OUT / "registry-all.json").read_text())
registry.update(json.loads((OUT / "inline-tools-registry.json").read_text()))
extra = json.loads((OUT / "extra-inline-registry.json").read_text())
image = json.loads((OUT / "playwright-image.json").read_text())
latest = {
    "npm": (extra["npm"]["data"]["version"], extra["npm"]["url"]),
    "docfx": (extra["docfx"]["data"]["versions"][-1], extra["docfx"]["url"]),
    "staticcheck": (
        "2026.2.2",
        "https://github.com/dominikh/go-tools/releases/tag/2026.2.2",
    ),
    "Playwright image": ("1.65.1-noble", image["url"]),
}
for ecosystem, names in (
    ("pypi", ("pip", "build", "twine", "scriv", "pypi-attestations")),
    ("npm", ("browser-commander", "playwright")),
):
    for name in names:
        info = registry[f"{ecosystem}:{name}"]
        latest[name] = (
            (info["latest"], info["url"])
            if isinstance(info, dict)
            else (info, f"https://pypi.org/pypi/{name}/json")
        )


def selections(text):
    result = []
    for number, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith(("#", "//", "*", "echo", "console.")):
            continue
        if "pip install" in line:
            for match in re.finditer(
                r'(?<![\w/-])(pip|build|twine|scriv|pypi-attestations)(?:\[toml\])?(?:[\'"])?(?:==([\d.]+))?(?=[\s\'";]|$)',
                line,
            ):
                # Ignore the executable's name in `python -m pip install`.
                if line[match.end() :].lstrip().startswith("install"):
                    continue
                result.append((number, match[1], match[2] or "latest (unbounded)"))
        for name, pattern in (
            ("npm", r"npm@([\d.]+)"),
            ("browser-commander", r"browser-commander@([\d.]+)"),
            ("playwright", r"playwright@([\d.]+)"),
            ("staticcheck", r"staticcheck@(latest|[\d.]+)"),
            (
                "docfx",
                r"dotnet tool (?:install|update)[^\n]*\bdocfx(?: --version ([\d.]+))?",
            ),
            (
                "Playwright image",
                r"mcr\.microsoft\.com/playwright(?::v([\d.]+-noble)|@sha256:[\da-f]+ # v([\d.]+-noble))",
            ),
        ):
            for match in re.finditer(pattern, line):
                result.append(
                    (
                        number,
                        name,
                        next((s for s in match.groups() if s), "latest (unbounded)"),
                    )
                )
    return result


rows = []
for relative in subprocess.check_output(["git", "ls-files"], text=True).splitlines():
    if not (
        relative.endswith((".yml", ".yaml")) or relative.endswith("/setup-npm.mjs")
    ):
        continue
    path = ROOT / relative
    original = subprocess.check_output(
        ["git", "show", BASE + ":" + relative], text=True
    )
    before = selections(original)
    for line, name, after in selections(path.read_text()):
        candidates = [value for _, dependency, value in before if dependency == name]
        previous = candidates[0] if candidates else "new explicit pin"
        version, source = latest[name]
        assert after == version, (relative, line, name, after, version)
        rows.append(
            dict(
                path=relative,
                line=line,
                name=name,
                before=previous,
                after=after,
                latest=version,
                source=source,
            )
        )

(OUT / "inline-tools.json").write_text(json.dumps(rows, indent=2) + "\n")
table = [
    "# Workflow-installed tools and browser images",
    "",
    "Fresh registry metadata collected 2026-11-14 UTC. These selections supplement",
    "the manifest, Cargo tool and runtime tables. Before values come from the initial",
    "issue SHA; repeated alternatives in one installer share its original selection.",
    "The two workflow-only snapshots lack package manifests; their browser installs",
    "use exact current releases. Both complete JS snapshots instead use native npm",
    "locks for browser tooling. Image digest evidence is in `playwright-image.json`.",
    "",
    "| Location | Dependency | Before | After | Registry current | Source |",
    "| --- | --- | --- | --- | --- | --- |",
]
for row in rows:
    table.append(
        f"| `{row['path']}:{row['line']}` | {row['name']} | {row['before']} | {row['after']} | {row['latest']} | [Registry]({row['source']}) |"
    )
(OUT / "inline-tools.md").write_text("\n".join(table) + "\n")
print(f"Verified {len(rows)} inline tool/image selections")
