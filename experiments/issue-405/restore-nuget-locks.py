#!/usr/bin/env python3
"""Resolve every independent .NET project with native NuGet lockfiles."""

import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
failed = []
env = dict(
    os.environ,
    PATH="/tmp/issue-405-dotnet:" + os.environ["PATH"],
    DOTNET_CLI_TELEMETRY_OPTOUT="1",
    MSBUILDDISABLENODEREUSE="1",
)
for s in subprocess.check_output(
    ["git", "ls-files", "*.csproj"], cwd=root, text=True
).splitlines():
    logfile = root / "ci-logs" / ("issue-405-nuget-" + s.replace("/", "_") + ".log")
    with logfile.open("w") as f:
        r = subprocess.run(
            [
                "/tmp/issue-405-dotnet/dotnet",
                "restore",
                str(root / s),
                "--use-lock-file",
                "--force-evaluate",
                "-m:1",
                "-nr:false",
            ],
            stdout=f,
            stderr=subprocess.STDOUT,
            env=env,
        )
    print(s, r.returncode, flush=True)
    if r.returncode:
        failed.append(s)
raise SystemExit(bool(failed))
