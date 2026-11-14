#!/usr/bin/env python3
"""Refresh each independent Cargo workspace without compiling it."""

import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
paths = subprocess.check_output(
    ["git", "ls-files", "*Cargo.toml"], cwd=root, text=True
).splitlines()
failed = []
for s in paths:
    p = root / s
    if any(
        a != p.parent
        and (a / "Cargo.toml").exists()
        and "[workspace]" in (a / "Cargo.toml").read_text()
        for a in p.parent.parents
        if a.is_relative_to(root)
    ):
        continue
    logfile = (
        root / "ci-logs" / ("issue-405-cargo-lock-" + s.replace("/", "_") + ".log")
    )
    with logfile.open("w") as f:
        r = subprocess.run(
            ["cargo", "update", "--manifest-path", str(p)],
            stdout=f,
            stderr=subprocess.STDOUT,
        )
    print(s, r.returncode, flush=True)
    if r.returncode:
        failed.append(s)
raise SystemExit(bool(failed))
