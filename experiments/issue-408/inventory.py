#!/usr/bin/env python3
"""Fresh issue-408 evidence using the reviewed issue-405 inventory adapters."""

import argparse
import importlib.util
import json
import sys
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dev/log/issues/408/pulls/409/research"
BASE = "e3dc638c395d9e0c15c3ad143a73299f634ed912"


def load(name):
    spec = importlib.util.spec_from_file_location(
        "issue408_" + name, ROOT / "experiments/issue-405" / (name + ".py")
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["declarations", "locks", "tables"])
    parser.add_argument("--resolve", action="store_true")
    parser.add_argument("--update", action="store_true")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.kind == "declarations":
        module = load("inventory")
        module.EVIDENCE = OUT
        baseline = OUT / "declarations-before.json"
        if not baseline.exists():
            rows = [
                {**asdict(d), "path": str(d.path.relative_to(ROOT))}
                for d in module.inventory()
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
        module = load("evidence")
        module.OUT = OUT.parent
        module.RESEARCH = OUT
    sys.argv = [sys.argv[0]]
    if args.resolve:
        sys.argv.append("--resolve")
    if args.update:
        sys.argv.append("--update")
    result = module.main()
    # The reused renderers embed their original observation date. Replace only
    # that presentation text; registry responses are freshly collected here.
    for path in OUT.glob("*.md"):
        text = path.read_text()
        path.write_text(text.replace("2026-11-13 UTC", "2026-11-14 UTC"))
    if args.kind == "tables":
        for name in ["locked-composer.md", "retained-lock-review.json"]:
            path = OUT / name
            path.write_text(
                path.read_text().replace("this PR's 0.31.4", "this PR's 0.31.5")
            )
    return result


if __name__ == "__main__":
    sys.exit(main())
