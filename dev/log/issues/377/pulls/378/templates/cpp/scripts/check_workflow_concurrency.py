#!/usr/bin/env python3
"""Validate literal concurrency.queue fields pending actionlint support.

Only `single` and `max` are accepted; `max` requires explicit false
cancellation. Other workflow syntax remains actionlint's responsibility.
This follows the repository's text-based workflow policy tests and needs
only the Python standard library. --actionlint-compat comments out only
validated block-style queue lines in the disposable CI checkout. All other
syntax goes unchanged to actionlint; inline/quoted/aliased queue forms remain
unsupported until actionlint understands them. Remove this compatibility
step once the pinned actionlint understands queue.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def validate(text: str, validated_lines: list[int] | None = None) -> list[str]:
    errors = []
    parents = []
    lines = text.splitlines()
    scalar_indent = None
    for number, line in enumerate(lines):
        indent = len(line) - len(line.lstrip(" "))
        if scalar_indent is not None:
            if not line.strip() or indent > scalar_indent:
                continue
            scalar_indent = None
        scalar = re.match(
            r"^( *)(- )?[\w-]+:[ \t]+[|>](?:[1-9][+-]?|[+-][1-9]?)?(?:[ \t]+#.*)?[ \t]*$",
            line,
        )
        if scalar:
            # Embedded YAML in run/env strings is script data, never workflow
            # configuration. A sequence marker occupies two indentation columns.
            scalar_indent = len(scalar[1]) + (2 if scalar[2] else 0)
            continue
        match = re.match(r"^( *)([\w-]+):(?:[ \t]+(.*)|[ \t]*)$", line)
        if not match:
            continue
        indent = len(match[1])
        while parents and parents[-1][0] >= indent:
            parents.pop()
        if match[2] == "queue":
            literal = re.fullmatch(
                r'''(single|max|'single'|'max'|"single"|"max")(?:[ \t]+#.*)?[ \t]*''',
                match[3] or "",
            )
            if not parents or parents[-1][1] != "concurrency":
                errors.append(f"line {number + 1}: queue must be under concurrency")
            elif literal is None:
                errors.append(f"line {number + 1}: queue must be literal single or max")
            else:
                value = literal[1].strip("\"'")
                if validated_lines is not None:
                    validated_lines.append(number)
                parent_line = parents[-1][2]
                end = number + 1
                while end < len(lines):
                    candidate = lines[end]
                    if candidate.strip() and not candidate.lstrip().startswith("#"):
                        if len(candidate) - len(candidate.lstrip()) < indent:
                            break
                    end += 1
                block = "\n".join(lines[parent_line + 1:end])
                if len(re.findall(rf"^ {{{indent}}}queue:", block, re.M)) != 1:
                    errors.append(f"line {number + 1}: duplicate queue field")
                if value == "max" and not re.search(
                    rf"^ {{{indent}}}cancel-in-progress: false(?:[ \t]+#.*)?[ \t]*$", block, re.M
                ):
                    errors.append(f"line {number + 1}: queue max requires cancel-in-progress: false")
        parents.append((indent, match[2], number))
    return errors


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--actionlint-compat", action="store_true")
    parser.add_argument("paths", nargs="*", type=Path)
    args = parser.parse_args(argv)
    paths = args.paths
    if not paths:
        paths = sorted(Path(".github/workflows").glob("*.y*ml"))
    if not paths:
        print("::error::No workflow files found")
        return 1
    failed = False
    validated = {}
    for path in paths:
        text = path.read_text(encoding="utf-8")
        queue_lines = []
        validated[path] = (text, queue_lines)
        for error in validate(text, queue_lines):
            print(f"::error::{path}: {error}")
            failed = True
    if not failed and args.actionlint_compat:
        for path, (text, queue_lines) in validated.items():
            lines = text.splitlines(keepends=True)
            for number in queue_lines:
                line = lines[number]
                indent = len(line) - len(line.lstrip())
                ending = "\n" if line.endswith("\n") else ""
                lines[number] = " " * indent + "# queue validated by check_workflow_concurrency.py" + ending
            path.write_text("".join(lines), encoding="utf-8")
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
