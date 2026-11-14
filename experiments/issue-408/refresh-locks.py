#!/usr/bin/env python3
"""Refresh independent native locks serially, preserving each command's log."""

import argparse
import json
import os
import shlex
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG = ROOT / "ci-logs/issue-408"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "ecosystem", choices=["npm", "cargo", "python", "composer", "nuget", "go", "swift"]
)
args = parser.parse_args()
paths = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines()
commands = []
if args.ecosystem == "npm":
    commands = [
        (
            str(Path(p).parent),
            ["npm", "update", "--package-lock-only", "--ignore-scripts"],
        )
        for p in paths
        if Path(p).name == "package-lock.json"
    ]
    commands.append(("js", ["bun", "update", "--lockfile-only"]))
elif args.ecosystem == "cargo":
    for p in paths:
        if Path(p).name != "Cargo.toml":
            continue
        directory = (ROOT / p).parent
        if any(
            parent != directory
            and (parent / "Cargo.toml").exists()
            and "[workspace]" in (parent / "Cargo.toml").read_text()
            for parent in directory.parents
            if parent.is_relative_to(ROOT)
        ):
            continue
        commands.append((str(directory.relative_to(ROOT)), ["cargo", "update"]))
elif args.ecosystem == "python":
    uv = os.environ.get("ISSUE408_UV", "/tmp/issue408-tools/bin/uv")
    for p in paths:
        if Path(p).name == "uv.lock":
            directory = str(Path(p).parent)
            commands.append((directory, [uv, "lock", "--upgrade"]))
    for p in paths:
        if not Path(p).name.startswith("requirements") or not p.endswith(".lock"):
            continue
        # Preserve each original lock's supported Python floor and universal
        # platform markers. Resolving only the host loses backports/Windows.
        original = subprocess.check_output(
            ["git", "show", "e3dc638c395d9e0c15c3ad143a73299f634ed912:" + p], text=True
        )
        header = next(
            line[5:] for line in original.splitlines() if line.startswith("#    uv ")
        )
        command = shlex.split(header)
        command[0] = uv
        if command[1:3] == ["pip", "compile"]:
            command.append("--upgrade")
        commands.append((".", command))
elif args.ecosystem == "composer":
    commands = [
        (
            str(Path(p).parent),
            [
                "php",
                "/tmp/issue408-tools/composer.phar",
                "update",
                "--with-all-dependencies",
                "--no-interaction",
                "--no-scripts",
                "--no-progress",
            ],
        )
        for p in paths
        if Path(p).name == "composer.json"
    ]
elif args.ecosystem == "nuget":
    commands = [
        (
            ".",
            [
                "/tmp/issue408-tools/dotnet/dotnet",
                "restore",
                str(ROOT / p),
                "--use-lock-file",
                "--force-evaluate",
                "-m:1",
                "-nr:false",
            ],
        )
        for p in paths
        if p.endswith(".csproj")
    ]
elif args.ecosystem == "go":
    commands = [
        (str(Path(p).parent), ["go", "mod", "tidy"])
        for p in paths
        if Path(p).name == "go.mod"
    ]
else:
    commands = [
        (str(Path(p).parent), ["swift", "package", "update"])
        for p in paths
        if Path(p).name == "Package.swift"
    ]

results = []
for index, (directory, command) in enumerate(commands):
    log = LOG / f"refresh-{args.ecosystem}-{index:02d}.log"
    with log.open("w") as stream:
        result = subprocess.run(
            command, cwd=ROOT / directory, stdout=stream, stderr=subprocess.STDOUT
        )
    row = dict(
        directory=directory,
        command=command,
        exit=result.returncode,
        log=str(log.relative_to(ROOT)),
    )
    results.append(row)
    print(json.dumps(row), flush=True)
(LOG / f"refresh-{args.ecosystem}.json").write_text(
    json.dumps(results, indent=2) + "\n"
)
raise SystemExit(any(row["exit"] for row in results))
