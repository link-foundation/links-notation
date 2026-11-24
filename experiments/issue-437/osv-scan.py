#!/usr/bin/env python3
"""Query OSV for every package in the committed Cargo, Go and NuGet locks (issue #437)."""
import json, re, subprocess, sys, tomllib, urllib.request
from pathlib import Path

ROOT = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
files = subprocess.check_output(["git", "ls-files", "*Cargo.lock", "*go.sum", "*packages.lock.json"], cwd=ROOT, text=True).split()
queries = set()
for f in files:
    p = ROOT / f
    if f.endswith("Cargo.lock"):
        for pkg in tomllib.loads(p.read_text()).get("package", []):
            if "source" in pkg:
                queries.add(("crates.io", pkg["name"], pkg["version"]))
    elif f.endswith("go.sum"):
        for line in p.read_text().splitlines():
            m = re.match(r"(\S+) v([^/\s]+?)(/go\.mod)? ", line)
            if m and not m.group(3):
                queries.add(("Go", m.group(1), m.group(2).removesuffix("+incompatible")))
    else:
        for deps in json.loads(p.read_text(encoding="utf-8-sig")).get("dependencies", {}).values():
            for name, d in deps.items():
                if d.get("type") != "Project" and "resolved" in d:
                    queries.add(("NuGet", name, d["resolved"]))
qs = sorted(queries)
hits = 0
for i in range(0, len(qs), 500):
    batch = [{"package": {"ecosystem": e, "name": n}, "version": v} for e, n, v in qs[i:i + 500]]
    req = urllib.request.Request("https://api.osv.dev/v1/querybatch", json.dumps({"queries": batch}).encode(), {"content-type": "application/json"})
    for q, r in zip(qs[i:i + 500], json.load(urllib.request.urlopen(req))["results"]):
        if r.get("vulns"):
            hits += 1
            print("VULN", *q, [v["id"] for v in r["vulns"]])
print(f"{len(qs)} packages from {len(files)} locks, {hits} with advisories")
sys.exit(1 if hits else 0)
