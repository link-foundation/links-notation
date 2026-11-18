#!/usr/bin/env python3
"""Collect current declarations and lock resolutions for issue 421."""

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dev/log/issues/421/pulls/423/research"
BASE = "ece88a9e51f77a858eacad0434616dce2e140f33"


def load(name):
    spec = importlib.util.spec_from_file_location(
        "issue421_" + name, ROOT / "experiments/issue-405" / (name + ".py")
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["declarations", "locks", "tables"])
    parser.add_argument("--resolve", action="store_true")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.kind == "declarations":
        module = load("inventory")
        module.EVIDENCE = OUT
        baseline = OUT / "declarations-before.json"
        if not baseline.exists():
            rows = [
                {**asdict(item), "path": str(item.path.relative_to(ROOT))}
                for item in module.inventory()
            ]
            baseline.write_text(json.dumps(rows, indent=2) + "\n")
        pins = OUT / "registry-action-shas.json"
        if not pins.exists():
            pins.write_text("{}\n")
    elif args.kind == "locks":
        module = load("lock_inventory")
        module.OUT = OUT
        module.BASE = BASE
    else:
        return render_tables()
    sys.argv = [sys.argv[0], *(["--resolve"] if args.resolve else [])]
    result = module.main()
    if args.kind == "declarations":
        table = OUT / "dependency-tables.md"
        if args.resolve:
            resolve_action_pins()
            sys.argv = [sys.argv[0]]
            result |= module.main()
        table.write_text(table.read_text().replace("2026-11-13", "2026-11-18"))
    return result


def resolve_action_pins():
    declarations = json.loads((OUT / "declarations.json").read_text())
    registry = json.loads((OUT / "registry-all.json").read_text())
    repositories = {
        row["name"]
        for row in declarations
        if row["ecosystem"] == "github"
        and re.fullmatch(r"[a-f0-9]{40}", row["declared"])
    }

    def fetch(name):
        tag = registry["github:" + name]
        sha = subprocess.check_output(
            ["gh", "api", f"repos/{name}/commits/{tag}", "--jq", ".sha"], text=True
        ).strip()
        return name, {"tag": tag, "sha": sha}

    with ThreadPoolExecutor(max_workers=4) as executor:
        pins = dict(executor.map(fetch, sorted(repositories)))
    (OUT / "registry-action-shas.json").write_text(json.dumps(pins, indent=2) + "\n")


def render_tables():
    module = load("evidence")
    module.RESEARCH = OUT
    original_reason = module.reason

    def reason(row):
        name = row["name"]
        if row["latest"] is None:
            return "Unresolved registry lookup"
        if row["after"] == row["latest"]:
            return "Current registry release"
        if row["ecosystem"] == "pypi":
            source = (ROOT / row["path"]).read_text()
            if row["path"].endswith(".lock") and "requirements" in row["path"]:
                marker = f"{name}=={row['after']}"
                for block in source.splitlines():
                    if block.startswith(marker):
                        requirement = block.rstrip(chr(92)).strip()
                        return f"Native universal Python lock selects {requirement}"
        if row["ecosystem"] == "composer" and name == "link-foundation/links-notation":
            return "Benchmark uses the local 0.31.7 checkout through a Composer path repository"
        if row["ecosystem"] == "go" and row["path"].endswith("go.sum"):
            return "Go checksum retained by module tidy; see go.mod for selected module versions"
        try:
            return original_reason(row)
        except ValueError:
            return "Unresolved parent constraint; see native resolver and registry evidence"

    module.reason = reason
    module.main()
    for table in OUT.glob("locked-*.md"):
        table.write_text(
            table.read_text()
            .replace("2026-11-13", "2026-11-18")
            .replace(
                "See `../analysis.md` for migrations, upstream reports and audit results.",
                "See `../README.md` for migrations and verification.",
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
