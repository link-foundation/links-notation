#!/usr/bin/env python3
"""Print the C++ project version and export release metadata to GITHUB_OUTPUT.

Usage: python3 scripts/get_version.py [--cpp-root DIR] [--print FIELD]

``--print version`` writes only that value to stdout (and nothing to
GITHUB_OUTPUT), for shell use: ``VERSION=$(python3 scripts/get_version.py
--print version)``.

Outputs: version, tag, tag_prefix, title, package_name, port_name, conan_name,
cpp_root, multi_language.
"""

from __future__ import annotations

import argparse
import sys

import cpp_project as cp


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--print", dest="field", metavar="FIELD", help="print one output value and exit")
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    name = cp.read_project_name(layout.cmake_file)
    version = cp.read_project_version(layout.cmake_file)
    port_name = cp.read_vcpkg_name(layout.vcpkg_manifest) or name.replace("_", "-").lower()

    outputs = {
        "version": version,
        "tag": cp.build_release_tag(version, layout.multi_language),
        "tag_prefix": cp.get_tag_prefix(layout.multi_language),
        "title": cp.build_release_title(version, name, layout.multi_language),
        "package_name": name,
        "port_name": port_name,
        "conan_name": cp.read_conan_name(layout.conanfile) or name,
        "cpp_root": layout.relative(layout.root) or ".",
        "multi_language": str(layout.multi_language).lower(),
    }
    if args.field:
        if args.field not in outputs:
            parser.error(f"unknown field {args.field!r}; choose from {', '.join(outputs)}")
        print(outputs[args.field])
        return 0
    for key, value in outputs.items():
        cp.set_output(key, value)
    return 0


if __name__ == "__main__":
    sys.exit(main())
