#!/usr/bin/env python3
"""Run the C++ linters exactly as CI does: clang-format, clang-tidy, cppcheck.

* ``format``   -- ``clang-format --dry-run --Werror`` on every tracked C/C++
  source of the C++ root (``.clang-format``);
* ``tidy``     -- ``clang-tidy`` (``.clang-tidy``) on every project translation
  unit of the compile database, so headers are checked through their users
  (``HeaderFilterRegex``) with the real include paths and flags;
* ``cppcheck`` -- ``cppcheck`` with warnings as errors; suppressions live next
  to the code (``// cppcheck-suppress <id> ; <reason>``).

Every linter runs even when an earlier one fails, and the exit code is 1 if
any of them reported a problem, so one CI run shows all findings.

Usage: python3 scripts/lint_cpp.py [format] [tidy] [cppcheck]
       [--build-dir build/lint] [--cpp-root DIR]

The ``tidy`` check needs a configured build with a compile database, e.g.
``cmake --preset lint`` (benchmarks enabled, so every source is covered).

Environment: CLANG_FORMAT, CLANG_TIDY, CPPCHECK override the tool binaries.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Callable, Dict, List, Sequence

import cpp_project as cp

SOURCE_SUFFIXES = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx", ".ipp", ".inl", ".tpp"}
CPPCHECK_ARGS = [
    "--quiet",
    "--enable=warning,style,performance,portability",
    "--std=c++20",
    "--language=c++",
    "--library=googletest",
    "--inline-suppr",
    "--error-exitcode=1",
    "--suppress=missingIncludeSystem",
]


def tracked_sources(layout: cp.CppLayout) -> List[Path]:
    """C/C++ files that git tracks (or would track) under the C++ root."""
    output = cp.git(
        "ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ".", cwd=layout.root
    )
    files = [layout.root / name for name in output.split("\0") if name]
    return sorted(path for path in files if path.suffix.lower() in SOURCE_SUFFIXES and path.is_file())


def project_units(layout: cp.CppLayout, build_dir: Path) -> List[Path]:
    """Translation units of the compile database that belong to the project."""
    database = build_dir / "compile_commands.json"
    if not database.is_file():
        raise FileNotFoundError(
            f"{database} not found: configure first, e.g. `cmake --preset lint`"
        )
    root = layout.root.resolve()
    build = build_dir.resolve()
    units = set()
    for entry in json.loads(database.read_text(encoding="utf-8")):
        path = Path(entry["file"])
        if not path.is_absolute():
            path = Path(entry["directory"]) / path
        path = path.resolve()
        if path.is_relative_to(root) and not path.is_relative_to(build):
            units.add(path)
    return sorted(units)


def tool(variable: str, default: str) -> str:
    name = os.environ.get(variable) or default
    if shutil.which(name) is None:
        raise FileNotFoundError(f"{name} is not installed (set {variable} to its path)")
    return name


def run(command: Sequence[str], cwd: Path) -> int:
    print("+ " + " ".join(str(part) for part in command), flush=True)
    return subprocess.run([str(part) for part in command], cwd=cwd, check=False).returncode


def check_format(layout: cp.CppLayout, args) -> int:
    files = tracked_sources(layout)
    if not files:
        print("No C/C++ sources to format-check")
        return 0
    return run([tool("CLANG_FORMAT", "clang-format"), "--dry-run", "--Werror", *files], layout.root)


def check_tidy(layout: cp.CppLayout, args) -> int:
    units = project_units(layout, Path(args.build_dir))
    if not units:
        print(f"No project sources in {args.build_dir}/compile_commands.json")
        return 1
    return run([tool("CLANG_TIDY", "clang-tidy"), "-p", args.build_dir, "--quiet", *units], layout.root)


def check_cppcheck(layout: cp.CppLayout, args) -> int:
    files = [path for path in tracked_sources(layout) if path.suffix.lower() not in {".h", ".hh", ".hpp", ".hxx"}]
    include = layout.root / "include"
    command = [tool("CPPCHECK", "cppcheck"), *CPPCHECK_ARGS, f"-I{include}", *files]
    return run(command, layout.root)


CHECKS: Dict[str, Callable[[cp.CppLayout, argparse.Namespace], int]] = {
    "format": check_format,
    "tidy": check_tidy,
    "cppcheck": check_cppcheck,
}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("checks", nargs="*", metavar="CHECK",
                        help=f"one or more of {', '.join(CHECKS)} (default: all)")
    parser.add_argument("--build-dir", default="build/lint", help="build tree with compile_commands.json")
    args = parser.parse_args(argv)
    unknown = sorted(set(args.checks) - set(CHECKS))
    if unknown:
        parser.error(f"unknown check(s): {', '.join(unknown)}; choose from {', '.join(CHECKS)}")

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    if not Path(args.build_dir).is_absolute():
        args.build_dir = str(layout.root / args.build_dir)
    failed = []
    for name in args.checks or list(CHECKS):
        try:
            status = CHECKS[name](layout, args)
        except (FileNotFoundError, RuntimeError) as exc:
            cp.error(str(exc), title=f"C++ lint ({name})")
            status = 1
        if status != 0:
            failed.append(name)
    if failed:
        cp.error(f"failed checks: {', '.join(failed)}", title="C++ lint")
        return 1
    print("C++ lint passed: " + ", ".join(args.checks or CHECKS))
    return 0


if __name__ == "__main__":
    sys.exit(main())
