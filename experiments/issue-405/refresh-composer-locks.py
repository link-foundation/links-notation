#!/usr/bin/env python3
"""Resolve and audit each Composer manifest without executing project scripts."""

import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
failed = []
for s in subprocess.check_output(
    ["git", "ls-files", "*composer.json"], cwd=root, text=True
).splitlines():
    directory = (root / s).parent
    log = root / "ci-logs" / ("issue-405-composer-" + s.replace("/", "_") + ".log")
    with log.open("w") as f:
        r = subprocess.run(
            [
                "php",
                "/tmp/issue-405-composer.phar",
                "update",
                "--no-interaction",
                "--no-scripts",
                "--no-progress",
            ],
            cwd=directory,
            stdout=f,
            stderr=subprocess.STDOUT,
        )
    print(s, r.returncode, flush=True)
    if r.returncode:
        failed.append(s)
raise SystemExit(bool(failed))
