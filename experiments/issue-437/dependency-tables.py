#!/usr/bin/env python3
"""Render every active direct dependency as `pinned | latest` per ecosystem (issue #437).

Usage: python3 experiments/issue-437/dependency-tables.py SNAPSHOT.json > tables.md
SNAPSHOT.json is the registry answer saved by
`python scripts/ci/check-dependencies.py --snapshot SNAPSHOT.json`.
"""
import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("deps", ROOT / "scripts/ci/check-dependencies.py")
deps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deps)

snapshot = json.loads(Path(sys.argv[1]).read_text())
rows = defaultdict(list)
for d in deps.manifests():
    latest = snapshot.get(f"{d.ecosystem}:{d.name}", "")
    rows[d.ecosystem].append((d.path.relative_to(ROOT).as_posix(), d.name, d.declared, latest))
print("# Direct dependencies: pinned vs. latest registry release\n")
print("Generated from `scripts/ci/check-dependencies.py` declarations and its registry snapshot.\n")
for eco in sorted(rows):
    print(f"## {eco}\n\n| Manifest | Dependency | Pinned | Latest |\n| --- | --- | --- | --- |")
    for path, name, declared, latest in sorted(rows[eco]):
        print(f"| `{path}` | `{name}` | {declared} | {latest} |")
    print()
