#!/usr/bin/env python3
"""Build all C++ entry points under CodeQL's manual compiler tracing on Linux.

The release preset supplies C++20, real dependency headers, tests, examples
and benchmarks. The existing consumer checker covers each distribution path;
Conan's standalone package test is compiled and run separately. Before CodeQL
initialization, --prepare-dependencies builds only third-party libraries in an
external directory. Their headers remain available as SYSTEM includes while
the traced build compiles every project translation unit.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cpp_project as cp


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--prepare-dependencies", action="store_true")
    parser.add_argument("--dependency-dir", type=Path,
                        help="FetchContent directory outside the repository (preparation only)")
    args = parser.parse_args(argv)
    layout = cp.detect_layout(cpp_root=args.cpp_root)
    root = layout.root.resolve()
    package_test = root / "build" / "codeql-test-package"
    commands = [
        ["cmake", "--workflow", "--preset", "release"],
        [sys.executable, str(Path(__file__).with_name("check_consumers.py")),
         "--cpp-root", str(root)],
        ["c++", "-std=c++20", "-I", str(root / "include"),
         str(root / "test_package" / "test_package.cpp"), "-o", str(package_test)],
        [str(package_test)],
    ]
    if args.prepare_dependencies:
        if args.dependency_dir is None:
            parser.error("--prepare-dependencies requires --dependency-dir")
        external = args.dependency_dir.resolve()
        if external.is_relative_to(layout.repository_root.resolve()):
            parser.error("--dependency-dir must be outside the repository")
        commands = [
            ["cmake", "--preset", "release", f"-DFETCHCONTENT_BASE_DIR={external}",
             "-DCMAKE_DISABLE_FIND_PACKAGE_GTest=ON",
             "-DCMAKE_DISABLE_FIND_PACKAGE_benchmark=ON"],
            ["cmake", "--build", "--preset", "release", "--target",
             "gtest_main", "benchmark_main"],
        ]
    try:
        for command in commands:
            print("+ " + " ".join(command), flush=True)
            cp.run(command, cwd=root, capture=False)
    except (OSError, RuntimeError) as exc:
        cp.error(str(exc), title="CodeQL build")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
