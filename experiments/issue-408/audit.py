#!/usr/bin/env python3
"""Audit every tracked native dependency graph serially without building it."""

import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG = ROOT / "ci-logs/issue-408"
TOOLS = Path("/tmp/issue408-tools")
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "ecosystem", choices=["npm", "cargo", "python", "composer", "nuget"]
)
args = parser.parse_args()
paths = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines()
commands = []
for relative in paths:
    path = Path(relative)
    if args.ecosystem == "npm" and path.name == "package-lock.json":
        commands.append(
            (
                str(path.parent),
                ["npm", "audit", "--package-lock-only", "--audit-level=low", "--json"],
            )
        )
    elif args.ecosystem == "cargo" and path.name == "Cargo.lock":
        commands.append(
            (".", [str(TOOLS / "cargo-audit"), "audit", "--file", relative, "--json"])
        )
    elif (
        args.ecosystem == "python"
        and path.name.startswith("requirements")
        and path.suffix == ".lock"
    ):
        commands.append(
            (
                ".",
                [
                    str(TOOLS / "bin/pip-audit"),
                    "--disable-pip",
                    "--no-deps",
                    "-r",
                    relative,
                    "--format=json",
                ],
            )
        )
    elif args.ecosystem == "composer" and path.name == "composer.lock":
        lock = json.loads((ROOT / path).read_text())
        if not lock.get("packages") and not lock.get("packages-dev"):
            # Composer audit exits 1 for an empty graph, including --locked.
            # Validate that graph explicitly; do not count that exit as a pass.
            commands.append(
                (
                    str(path.parent),
                    ["php", str(TOOLS / "composer.phar"), "validate", "--strict"],
                )
            )
        else:
            commands.append(
                (
                    str(path.parent),
                    [
                        "php",
                        str(TOOLS / "composer.phar"),
                        "audit",
                        "--locked",
                        "--format=json",
                    ],
                )
            )
    elif args.ecosystem == "nuget" and path.suffix == ".csproj":
        commands.append(
            (
                ".",
                [
                    str(TOOLS / "dotnet/dotnet"),
                    "package",
                    "list",
                    "--project",
                    relative,
                    "--vulnerable",
                    "--include-transitive",
                    "--format",
                    "json",
                    "--no-restore",
                ],
            )
        )

results = []
for index, (directory, command) in enumerate(commands):
    log = LOG / f"audit-{args.ecosystem}-{index:02d}.log"
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
    # NuGet's report command does not fail on findings. Inspect the report.
    if args.ecosystem == "nuget" and not row["exit"]:
        report = json.loads(log.read_text())
        row["vulnerabilities"] = sum(
            len(package.get("vulnerabilities", []))
            for project in report.get("projects", [])
            for framework in project.get("frameworks", [])
            for key in ["topLevelPackages", "transitivePackages"]
            for package in framework.get(key, [])
        )
    results.append(row)
    print(json.dumps(row), flush=True)
(LOG / f"audit-{args.ecosystem}.json").write_text(json.dumps(results, indent=2) + "\n")
raise SystemExit(any(row["exit"] or row.get("vulnerabilities") for row in results))
