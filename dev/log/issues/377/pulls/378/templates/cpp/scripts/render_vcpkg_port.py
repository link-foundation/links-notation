#!/usr/bin/env python3
"""Render the vcpkg port of the current version from packaging/vcpkg/*.in.

Source modes:
  --source-dir DIR              use a local checkout (CI tests the port with
                                ``vcpkg install --overlay-ports`` before any
                                release exists)
  --archive-url URL --sha512 H  download the release's source archive (the
                                port attached to every GitHub release)
  --github-repo O/R --ref TAG --sha512 H
                                vcpkg_from_github (for vcpkg registries that
                                prefer GitHub's generated archives)

Usage: python3 scripts/render_vcpkg_port.py --out-dir dist/vcpkg/ports
       (--source-dir . | --archive-url URL --sha512 HEX | ...) [--version X.Y.Z]

Prints the directory of the rendered port (``<out-dir>/<port-name>``).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Dict

import cpp_project as cp

TEMPLATES = {"portfile.cmake.in": "portfile.cmake", "vcpkg.json.in": "vcpkg.json", "usage.in": "usage"}


def sha512_of(path: Path) -> str:
    digest = hashlib.sha512()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cmake_quote(value: str) -> str:
    return value.replace("\\", "/").replace('"', '\\"')


def source_step(args) -> str:
    if args.source_dir:
        path = cmake_quote(str(Path(args.source_dir).resolve()))
        return f'set(SOURCE_PATH "{path}")'
    if not args.sha512 or not re.fullmatch(r"[0-9a-fA-F]{128}", args.sha512):
        raise ValueError("--sha512 must be the 128-hex-digit SHA512 of the source archive")
    if args.archive_url:
        filename = args.archive_url.rsplit("/", 1)[-1]
        return (
            "vcpkg_download_distfile(\n"
            "    ARCHIVE\n"
            f'    URLS "{args.archive_url}"\n'
            f'    FILENAME "{filename}"\n'
            f"    SHA512 {args.sha512.lower()}\n"
            ")\n"
            'vcpkg_extract_source_archive(SOURCE_PATH ARCHIVE "${ARCHIVE}")'
        )
    if args.github_repo and args.ref:
        return (
            "vcpkg_from_github(\n"
            "    OUT_SOURCE_PATH SOURCE_PATH\n"
            f"    REPO {args.github_repo}\n"
            f"    REF {args.ref}\n"
            f"    SHA512 {args.sha512.lower()}\n"
            f"    HEAD_REF main\n"
            ")"
        )
    raise ValueError("pass --source-dir, --archive-url with --sha512, or --github-repo/--ref with --sha512")


def substitutions(layout: cp.CppLayout, version: str, step: str) -> Dict[str, str]:
    manifest = {}
    if layout.vcpkg_manifest.is_file():
        manifest = json.loads(layout.vcpkg_manifest.read_text(encoding="utf-8"))
    package = cp.read_project_name(layout.cmake_file)
    json_escape = lambda text: json.dumps(text)[1:-1]  # noqa: E731
    return {
        "PORT_NAME": manifest.get("name") or package.replace("_", "-").lower(),
        "CMAKE_PACKAGE": package,
        "OPTION_PREFIX": re.sub(r"[^A-Za-z0-9]", "_", package).upper(),
        "VERSION": version,
        "DESCRIPTION": json_escape(
            manifest.get("description") or cp.read_project_field(layout.cmake_file, "DESCRIPTION")
        ),
        "HOMEPAGE": json_escape(
            manifest.get("homepage") or cp.read_project_field(layout.cmake_file, "HOMEPAGE_URL")
        ),
        "LICENSE": json_escape(manifest.get("license") or "Unlicense"),
        "SOURCE_STEP": step,
    }


def render(template: str, values: Dict[str, str]) -> str:
    rendered = re.sub(r"@([A-Z_]+)@", lambda m: values.get(m.group(1), m.group(0)), template)
    leftover = re.findall(r"@[A-Z_]+@", rendered)
    if leftover:
        raise ValueError(f"unknown placeholders: {sorted(set(leftover))}")
    return rendered


def render_port(layout: cp.CppLayout, out_dir: Path, version: str, step: str) -> Path:
    values = substitutions(layout, version, step)
    port_dir = out_dir / values["PORT_NAME"]
    port_dir.mkdir(parents=True, exist_ok=True)
    template_dir = layout.packaging_dir("vcpkg")
    for source, target in TEMPLATES.items():
        text = render((template_dir / source).read_text(encoding="utf-8"), values)
        (port_dir / target).write_text(text, encoding="utf-8")
    json.loads((port_dir / "vcpkg.json").read_text(encoding="utf-8"))
    return port_dir


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--version")
    parser.add_argument("--source-dir")
    parser.add_argument("--archive-url")
    parser.add_argument("--archive", help="Local copy of --archive-url to hash instead of --sha512")
    parser.add_argument("--github-repo")
    parser.add_argument("--ref")
    parser.add_argument("--sha512")
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    version = cp.normalize_version(args.version or cp.read_project_version(layout.cmake_file))
    if args.archive and not args.sha512:
        args.sha512 = sha512_of(Path(args.archive))
    try:
        step = source_step(args)
        port_dir = render_port(layout, Path(args.out_dir), version, step)
    except ValueError as exc:
        cp.error(str(exc), title="vcpkg port rendering failed")
        return 1
    print(port_dir)
    cp.set_output("port_dir", port_dir.as_posix())
    return 0


if __name__ == "__main__":
    sys.exit(main())
