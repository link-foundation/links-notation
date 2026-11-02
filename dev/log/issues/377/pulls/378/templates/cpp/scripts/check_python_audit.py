#!/usr/bin/env python3
"""Reject Python vulnerability findings, skipped packages and incomplete reports."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def validate(payload) -> list[str]:
    if not isinstance(payload, dict):
        return ["Expected a pip-audit JSON object"]
    dependencies = payload.get("dependencies")
    if not isinstance(dependencies, list) or not dependencies:
        return ["Missing or empty resolved Python dependency tree"]
    errors = []
    for package in dependencies:
        if not isinstance(package, dict):
            errors.append("Invalid dependency record")
            continue
        name = package.get("name", "unknown")
        if package.get("skip_reason") or not package.get("name") or not package.get("version"):
            errors.append(f"{name}: incomplete audit: {package.get('skip_reason', 'missing coordinates')}")
        vulnerabilities = package.get("vulns")
        if not isinstance(vulnerabilities, list):
            errors.append(f"{name}: missing vulnerability verdict")
        elif vulnerabilities:
            errors.append(f"{name}: {len(vulnerabilities)} vulnerability finding(s)")
    return errors


def main(argv=None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("::error::Supply exactly one pip-audit JSON report")
        return 1
    try:
        errors = validate(json.loads(Path(args[0]).read_text(encoding="utf-8")))
    except (OSError, ValueError) as error:
        errors = [f"Missing or unreadable pip-audit report: {error}"]
    for error in errors:
        print(f"::error::{error}")
    if not errors:
        print("Full Python dependency audit: no findings or coverage gaps")
    return int(bool(errors))


if __name__ == "__main__":
    sys.exit(main())
