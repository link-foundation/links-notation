#!/usr/bin/env python3
"""Refresh immutable Actions pins without turning them into mutable tags."""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dev/log/issues/405/pulls/406/research"
BASE = "7902557fc0bd8a50d5d2c7beba06beb48b559d63"
releases = json.loads((OUT / "registry-all.json").read_text())
pins = {}
uses = re.compile(r"(uses:\s*([\w.-]+/[\w./-]+)@)([^\s#]+)([^\n]*)")


def api(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))


for name in subprocess.check_output(
    ["git", "ls-files"], cwd=ROOT, text=True
).splitlines():
    if Path(name).suffix not in {".yml", ".yaml"}:
        continue
    old = subprocess.run(
        ["git", "show", f"{BASE}:{name}"], capture_output=True, text=True, cwd=ROOT
    ).stdout
    immutable = {
        m[2] for m in uses.finditer(old) if re.fullmatch(r"[a-f0-9]{40}", m[3])
    }
    if not immutable:
        continue

    def replace(match):
        if match[2] not in immutable:
            return match[0]
        repo = "/".join(match[2].split("/")[:2])
        tag = releases["github:" + repo]
        if repo not in pins:
            obj = api(f"repos/{repo}/git/ref/tags/{tag}")["object"]
            while obj["type"] == "tag":
                obj = api(f"repos/{repo}/git/tags/{obj['sha']}")["object"]
            if obj["type"] != "commit":
                raise ValueError(f"{repo}@{tag} is not a commit")
            pins[repo] = {"tag": tag, "sha": obj["sha"]}
        return match[1] + pins[repo]["sha"] + " # " + tag

    path = ROOT / name
    path.write_text(uses.sub(replace, path.read_text()))
    print(name, flush=True)

(OUT / "registry-action-shas.json").write_text(json.dumps(pins, indent=2) + "\n")
