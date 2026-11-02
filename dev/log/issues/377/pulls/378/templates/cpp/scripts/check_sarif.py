#!/usr/bin/env python3
"""Fail on CodeQL findings or incomplete SARIF, independently of upload status.

All result levels (including note/none and suppressed results) are fatal.
Tool execution/configuration warnings and errors are fatal; informational
diagnostics are allowed. Every run needs an explicitly successful invocation.
Usage: python3 scripts/check_sarif.py REPORT.sarif|DIRECTORY [...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def validate(payload) -> list[str]:
    errors = []
    if not isinstance(payload, dict) or payload.get("version") != "2.1.0":
        return ["Expected a SARIF 2.1.0 object"]
    runs = payload.get("runs")
    if not isinstance(runs, list) or not runs:
        return ["Missing or empty SARIF runs"]
    for index, run in enumerate(runs):
        prefix = f"run {index + 1}"
        if not isinstance(run, dict):
            errors.append(f"{prefix}: invalid run")
            continue
        tool = run.get("tool")
        driver = tool.get("driver") if isinstance(tool, dict) else None
        if not isinstance(driver, dict) or driver.get("name") != "CodeQL":
            errors.append(f"{prefix}: missing CodeQL tool identity")
        invocations = run.get("invocations")
        if not isinstance(invocations, list) or not invocations:
            errors.append(f"{prefix}: missing or empty invocation list")
        else:
            for invocation in invocations:
                if not isinstance(invocation, dict):
                    errors.append(f"{prefix}: invalid invocation")
                    continue
                if invocation.get("executionSuccessful") is not True:
                    errors.append(f"{prefix}: execution not explicitly successful")
                if "exitCode" in invocation and (
                    type(invocation["exitCode"]) is not int or invocation["exitCode"] != 0
                ):
                    errors.append(f"{prefix}: unsuccessful exit code")
                for key in ("toolExecutionNotifications", "toolConfigurationNotifications"):
                    notifications = invocation.get(key, [])
                    if not isinstance(notifications, list):
                        errors.append(f"{prefix}: invalid {key}")
                        continue
                    for notification in notifications:
                        if not isinstance(notification, dict) or notification.get(
                            "level", "warning"
                        ) not in {"note", "none"}:
                            errors.append(f"{prefix}: failed tool diagnostic ({key})")
        results = run.get("results")
        if not isinstance(results, list):
            errors.append(f"{prefix}: missing or invalid results")
        else:
            for result in results:
                rule = result.get("ruleId", "unknown rule") if isinstance(result, dict) else "invalid result"
                errors.append(f"{prefix}: finding {rule}")
    return errors


def main(argv=None) -> int:
    paths = [Path(arg) for arg in (sys.argv[1:] if argv is None else argv)]
    reports = []
    errors = []
    for path in paths:
        if path.is_dir():
            found = sorted(path.rglob("*.sarif"))
            if not found:
                errors.append(f"{path}: no SARIF reports")
            reports.extend(found)
        else:
            reports.append(path)
    if not paths:
        errors.append("No SARIF report paths supplied")
    for report in reports:
        try:
            payload = json.loads(report.read_text(encoding="utf-8"))
            errors.extend(f"{report}: {error}" for error in validate(payload))
        except (OSError, ValueError) as error:
            errors.append(f"{report}: unreadable SARIF: {error}")
    for error in errors:
        print(f"::error::{error.replace(chr(10), '%0A').replace(chr(13), '%0D')}")
    if not errors:
        print(f"Validated {len(reports)} complete CodeQL report(s): no findings")
    return int(bool(errors))


if __name__ == "__main__":
    sys.exit(main())
