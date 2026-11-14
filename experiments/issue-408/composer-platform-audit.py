#!/usr/bin/env python3
"""Finite native reproduction: Composer audit with platform-only requirements."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("composer", help="Path to a Composer PHAR")
args = parser.parse_args()
composer = str(Path(args.composer).resolve())
with tempfile.TemporaryDirectory(prefix="issue408-composer-") as directory:
    manifest = {"name": "example/platform-audit", "require": {"php": ">=8.4"}}
    Path(directory, "composer.json").write_text(json.dumps(manifest))
    subprocess.run(
        ["php", composer, "update", "--no-install", "--no-interaction"],
        cwd=directory,
        check=True,
    )
    result = subprocess.run(
        ["php", composer, "audit", "--locked"],
        cwd=directory,
        capture_output=True,
        text=True,
    )
    print(
        json.dumps(
            {
                "exit": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
            },
            indent=2,
        )
    )
    assert result.returncode == 1 and 'pass "--locked"' in result.stderr, result
