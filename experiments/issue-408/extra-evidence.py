#!/usr/bin/env python3
"""Reuse native graph rendering with this issue's freshly collected metadata."""

import argparse
import json
from inventory import BASE, OUT, load

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("kind", choices=["runtime", "jvm"])
args = parser.parse_args()
module = load("additional_evidence")
module.OUT = OUT
module.BASE = BASE
if args.kind == "runtime":
    module.runtime_evidence({"python-version": "3.15.2"})
    path = OUT / "toolchains.md"
    path.write_text(
        path.read_text()
        .replace("templates >=3.13 | 3.15.0 |", "templates >=3.13 | 3.15.2 |")
        .replace(
            "414b5330a184ea5fbc6ca29f7960b189f6b0392f",
            json.loads((OUT / "vcpkg-latest-baseline.json").read_text())["sha"],
        )
        .replace("research/rust-script-latest.json", "registry-all.json")
    )
else:
    module.resolved_evidence()
    path = OUT / "jvm-transitives.md"
    path.write_text(path.read_text().replace("2026-11-13 UTC", "2026-11-14 UTC"))
