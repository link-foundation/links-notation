#!/usr/bin/env python3
"""Inventory embedded Cargo tool pins, including archived workflow fixtures."""

import argparse
import json
import re
import subprocess

from inventory import BASE, OUT, ROOT

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--update", action="store_true")
args = parser.parse_args()
registry = json.loads((OUT / "cargo-tools-registry.json").read_text())
pattern = re.compile(
    r"(?P<name>cargo-[\w-]+|rust-script)(?:@| --version )(?P<version>\d+\.\d+\.\d+)"
    r"|RUST_SCRIPT_VERSION:-?(?P<rust_script>\d+\.\d+\.\d+)"
)
rows = []
for relative in subprocess.check_output(["git", "ls-files"], text=True).splitlines():
    path = ROOT / relative
    if path.suffix not in {".yml", ".yaml", ".rs", ".sh"}:
        continue
    source = path.read_text()
    if not pattern.search(source):
        continue
    original = subprocess.check_output(
        ["git", "show", BASE + ":" + relative], text=True
    )

    def update(match):
        name = match["name"] or "rust-script"
        version = match["version"] or match["rust_script"]
        return match[0].replace(version, registry[name]["latest"])

    if args.update:
        updated = pattern.sub(update, source)
        if updated != source:
            path.write_text(updated)
        source = updated
    before = list(pattern.finditer(original))
    after = list(pattern.finditer(source))
    assert len(before) == len(after), relative
    for old, new in zip(before, after):
        name = new["name"] or "rust-script"
        rows.append(
            dict(
                path=relative,
                line=source.count("\n", 0, new.start()) + 1,
                name=name,
                before=old["version"] or old["rust_script"],
                after=new["version"] or new["rust_script"],
                latest=registry[name]["latest"],
                source=registry[name]["url"],
            )
        )
(OUT / "tool-pins.json").write_text(json.dumps(rows, indent=2) + "\n")
table = [
    "# Embedded Cargo tools: before, after and latest stable",
    "",
    "Registry queried on 2026-11-14 UTC; raw metadata: `cargo-tools-registry.json`.",
    "These supplement manifest declarations: install-action inputs, shell installer",
    "defaults and synthetic workflow-checker test inputs. Test inputs do not install",
    "tools, but their illustrative versions are aligned as well.",
    "",
    "| Location | Tool | Before | After | Latest stable | Decision |",
    "| --- | --- | --- | --- | --- | --- |",
]
for row in rows:
    table.append(
        f"| `{row['path']}:{row['line']}` | {row['name']} | {row['before']} | "
        f"{row['after']} | {row['latest']} | Current crates.io stable release |"
    )
(OUT / "tool-pins.md").write_text("\n".join(table) + "\n")
assert rows and all(row["after"] == row["latest"] for row in rows), rows
print(f"Verified {len(rows)} embedded Cargo tool selections")
