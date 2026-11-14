#!/usr/bin/env python3
"""Apply fresh Action releases while preserving each existing SHA-pin policy."""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dev/log/issues/408/pulls/409/research"
releases = json.loads((OUT / "registry-all.json").read_text())
pins = {}
BASE = "e3dc638c395d9e0c15c3ad143a73299f634ed912"
changes = []
pattern = re.compile(r"(uses:\s*([\w.-]+/[\w./-]+)@)([^\s#]+)([^\n]*)")


def api(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))


for relative in subprocess.check_output(["git", "ls-files"], text=True).splitlines():
    path = ROOT / relative
    if path.suffix not in {".yml", ".yaml"}:
        continue

    def replace(match):
        repo = "/".join(match[2].split("/")[:2])
        before = match[3]
        if before == "stable" or (
            repo == "taiki-e/install-action" and before == "cargo-llvm-cov"
        ):
            return match[0]
        tag = releases["github:" + repo]
        if re.fullmatch(r"[a-f0-9]{40}", before):
            if repo not in pins:
                obj = api(f"repos/{repo}/git/ref/tags/{tag}")["object"]
                while obj["type"] == "tag":
                    obj = api(f"repos/{repo}/git/tags/{obj['sha']}")["object"]
                if obj["type"] != "commit":
                    raise ValueError(f"{repo}@{tag} is not a commit")
                pins[repo] = {"tag": tag, "sha": obj["sha"]}
            after = pins[repo]["sha"]
            suffix = " # " + tag
        else:
            after, suffix = tag, match[4]
        if before == after:
            return match[0]
        return match[1] + after + suffix

    source = path.read_text()
    updated = pattern.sub(replace, source)
    # setup-java 6.3 changed the default; preserve existing PR annotations.
    lines = updated.splitlines(keepends=True)
    for index in range(len(lines) - 1, -1, -1):
        if "uses: actions/setup-java@" not in lines[index]:
            continue
        end = next(
            (
                j
                for j in range(index + 1, len(lines))
                if re.match(r"\s*- (?:name|uses):", lines[j])
            ),
            len(lines),
        )
        if any("problem-matcher:" in line for line in lines[index:end]):
            continue
        with_index = next(
            j for j in range(index + 1, end) if lines[j].strip() == "with:"
        )
        indent = re.match(r"\s*", lines[with_index])[0]
        lines.insert(with_index + 1, indent + "  problem-matcher: true\n")
    updated = "".join(lines)
    if source != updated:
        path.write_text(updated)
    original = subprocess.check_output(
        ["git", "show", BASE + ":" + relative], text=True
    )
    for old, new in zip(pattern.finditer(original), pattern.finditer(updated)):
        if old[3] != new[3]:
            repo = "/".join(new[2].split("/")[:2])
            changes.append(
                dict(
                    path=relative,
                    name=repo,
                    before=old[3],
                    after=new[3],
                    tag=releases["github:" + repo],
                )
            )

(OUT / "registry-action-shas.json").write_text(json.dumps(pins, indent=2) + "\n")
(OUT / "action-changes.json").write_text(json.dumps(changes, indent=2) + "\n")
print(
    f"Updated {len(changes)} Action references; verified {len(pins)} immutable release commits"
)
