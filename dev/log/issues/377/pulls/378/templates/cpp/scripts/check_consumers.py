#!/usr/bin/env python3
"""Build and run every consumer example against the local checkout.

Each directory of ``examples/consumers`` is one way a downstream project can
take this library; CI proves all of them on every operating system:

* ``add_subdirectory`` -- vendored copy or git submodule (``<NAME>_DIR``);
* ``fetch_content``    -- FetchContent, redirected to the checkout with
  ``FETCHCONTENT_SOURCE_DIR_<NAME>``;
* ``cpm``              -- CPM.cmake, redirected with ``CPM_<name>_SOURCE``;
* ``find_package``     -- the ``cmake --install`` tree (the same files the
  release archive, Conan and vcpkg install), via ``CMAKE_PREFIX_PATH``;
* ``pkg_config``       -- the installed ``.pc`` file, without CMake (skipped
  on Windows and where pkg-config is missing).

The library is installed once into ``<build-dir>/prefix`` with the ``install``
preset. Every consumer is configured, built and tested even when an earlier
one fails, so one run reports every broken channel.

Usage: python3 scripts/check_consumers.py [CONSUMER ...]
       [--build-dir build/consumers] [--config Release] [--cpp-root DIR]
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Sequence

import cpp_project as cp

CONSUMERS = ("add_subdirectory", "fetch_content", "cpm", "find_package", "pkg_config")
NEEDS_INSTALL = {"find_package", "pkg_config"}


def run(command: Sequence[str], cwd: Optional[Path] = None, env: Optional[Dict[str, str]] = None) -> int:
    print("+ " + " ".join(str(part) for part in command), flush=True)
    return subprocess.run([str(part) for part in command], cwd=cwd, env=env, check=False).returncode


def cache_arguments(consumer: str, package: str, root: Path, prefix: Path) -> List[str]:
    """The -D options that point a consumer at this checkout or install tree."""
    source = root.as_posix()
    return {
        "add_subdirectory": [f"-D{package.upper()}_DIR={source}"],
        "fetch_content": [f"-DFETCHCONTENT_SOURCE_DIR_{package.upper()}={source}"],
        "cpm": [f"-DCPM_{package}_SOURCE={source}"],
        "find_package": [f"-DCMAKE_PREFIX_PATH={prefix.as_posix()}"],
    }[consumer]


def install(root: Path, prefix: Path, config: str) -> int:
    build = root / "build" / "install"
    for command in (
        ["cmake", "--preset", "install"],
        ["cmake", "--build", "--preset", "install"],
        ["cmake", "--install", build, "--prefix", prefix, "--config", config],
    ):
        status = run(command, cwd=root)
        if status != 0:
            return status
    return 0


def check_cmake_consumer(consumer: str, package: str, root: Path, build_dir: Path, config: str) -> int:
    source = root / "examples" / "consumers" / consumer
    binary = build_dir / consumer
    configure = [
        "cmake", "-S", source, "-B", binary, f"-DCMAKE_BUILD_TYPE={config}",
        *cache_arguments(consumer, package, root, build_dir / "prefix"),
    ]
    for command in (
        configure,
        ["cmake", "--build", binary, "--config", config],
        ["ctest", "--test-dir", binary, "-C", config, "--output-on-failure", "--no-tests=error"],
    ):
        status = run(command, cwd=root)
        if status != 0:
            return status
    return 0


def check_pkg_config(root: Path, build_dir: Path) -> Optional[int]:
    """Returns None when the consumer cannot run on this machine."""
    if os.name == "nt" or shutil.which("pkg-config") is None or shutil.which("bash") is None:
        return None
    prefix = build_dir / "prefix"
    env = dict(os.environ)
    env["PKG_CONFIG_PATH"] = os.pathsep.join(
        str(path) for path in (prefix / "share" / "pkgconfig", prefix / "lib" / "pkgconfig")
    )
    script = root / "examples" / "consumers" / "pkg_config" / "build.sh"
    return run(["bash", script, build_dir / "pkg_config"], cwd=root, env=env)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("consumers", nargs="*", metavar="CONSUMER",
                        help=f"one or more of {', '.join(CONSUMERS)} (default: all)")
    parser.add_argument("--build-dir", default="build/consumers",
                        help="build tree of the consumers, relative to the C++ root")
    parser.add_argument("--config", default="Release", help="build configuration")
    args = parser.parse_args(argv)
    unknown = sorted(set(args.consumers) - set(CONSUMERS))
    if unknown:
        parser.error(f"unknown consumer(s): {', '.join(unknown)}; choose from {', '.join(CONSUMERS)}")

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    root = layout.root.resolve()
    package = cp.read_project_name(layout.cmake_file)
    build_dir = Path(args.build_dir)
    if not build_dir.is_absolute():
        build_dir = root / build_dir
    selected = args.consumers or list(CONSUMERS)

    if NEEDS_INSTALL & set(selected):
        if install(root, build_dir / "prefix", args.config) != 0:
            cp.error("cmake --install of the library failed", title="Consumer examples")
            return 1

    failed, skipped = [], []
    for consumer in selected:
        if consumer == "pkg_config":
            status = check_pkg_config(root, build_dir)
        else:
            status = check_cmake_consumer(consumer, package, root, build_dir, args.config)
        if status is None:
            skipped.append(consumer)
            cp.notice(f"Skipping the {consumer} consumer: pkg-config and bash are needed (not on Windows)")
        elif status != 0:
            failed.append(consumer)
            cp.error(f"the {consumer} consumer failed to build or run", title="Consumer examples")
    if failed:
        return 1
    passed = [name for name in selected if name not in skipped]
    print("Consumer examples passed: " + ", ".join(passed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
