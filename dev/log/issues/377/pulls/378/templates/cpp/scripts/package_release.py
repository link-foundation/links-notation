#!/usr/bin/env python3
"""Build every release asset of the C++ project into one directory.

Assets (``<base>`` is ``<port-name>-<version>`` unless RELEASE_ARCHIVE_BASENAME
or --basename overrides it, e.g. linksplatform's ``platform.<repo>_<version>``):

* ``<base>.tar.gz`` / ``<base>.zip`` -- reproducible ``git archive`` of the C++
  root (``HEAD:cpp`` in multi-language repositories), the "repository as the
  distribution" asset that FetchContent, CPM and vcpkg download;
* ``<base>-install.tar.gz`` -- the ``cmake --install`` tree (headers, CMake
  package config, license) for consumers that just unpack it;
* ``<port>-vcpkg-port-<version>.tar.gz`` -- a vcpkg overlay port whose source
  is the ``<base>.tar.gz`` release asset, pinned by its SHA512;
* ``<id>.<version>.nupkg`` -- the native NuGet package (``--nuget``);
* ``SHA256SUMS`` -- checksums of all of the above.

Usage: python3 scripts/package_release.py --out-dir dist [--version X.Y.Z]
       [--ref HEAD] [--repository owner/repo] [--basename NAME] [--nuget]
       [--skip-install-tree] [--cpp-root DIR]

Outputs: out_dir, source_archive, source_sha512, port_archive, nupkg, assets.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import os
import re
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path
from types import SimpleNamespace
from typing import List, Optional

import cpp_project as cp
import pack_nuget
import render_vcpkg_port


def archive_basename(layout: cp.CppLayout, version: str, override: Optional[str] = None) -> str:
    template = override or os.environ.get("RELEASE_ARCHIVE_BASENAME", "")
    if template:
        # "{version}" lets one workflow variable serve every release.
        name = template.replace("{version}", version)
        if name == template and version not in name:
            name = f"{template}{version}"
        return name
    port = cp.read_vcpkg_name(layout.vcpkg_manifest) or cp.read_project_name(layout.cmake_file)
    return f"{port.replace('_', '-').lower()}-{version}"


def tree_ish(layout: cp.CppLayout, ref: str) -> str:
    prefix = layout.root_prefix.rstrip("/")
    return f"{ref}:{prefix}" if prefix else ref


def git_archive(layout: cp.CppLayout, ref: str, basename: str, fmt: str, out_dir: Path) -> Path:
    cwd = layout.repository_root
    # A tree (HEAD:cpp) carries no timestamp, so pin the commit time for
    # byte-identical archives on re-runs: the vcpkg port hashes this file.
    commit_time = cp.git("log", "-1", "--format=%ct", ref, cwd=cwd)
    output = out_dir / f"{basename}.{fmt}"
    cp.git(
        "archive", f"--format={fmt}", f"--prefix={basename}/", f"--mtime=@{commit_time}",
        f"--output={output}", tree_ish(layout, ref), cwd=cwd,
    )
    return output


def install_tree(layout: cp.CppLayout, basename: str, out_dir: Path, option_prefix: str) -> Path:
    with tempfile.TemporaryDirectory() as temp:
        build, stage = Path(temp) / "build", Path(temp) / "stage" / basename
        cp.run([
            "cmake", "-S", str(layout.root), "-B", str(build), "-DCMAKE_BUILD_TYPE=Release",
            f"-D{option_prefix}_BUILD_TESTS=OFF", f"-D{option_prefix}_BUILD_EXAMPLES=OFF",
            f"-D{option_prefix}_BUILD_BENCHMARKS=OFF", f"-D{option_prefix}_BUILD_DOCS=OFF",
            f"-D{option_prefix}_INSTALL=ON",
        ])
        cp.run(["cmake", "--install", str(build), "--prefix", str(stage)])
        output = out_dir / f"{basename}-install.tar.gz"
        reproducible_tar(stage, basename, output)
    return output


def reproducible_tar(source: Path, arcname: str, output: Path) -> None:
    def normalize(info: tarfile.TarInfo) -> tarfile.TarInfo:
        info.uid = info.gid = 0
        info.uname = info.gname = ""
        info.mtime = 0
        return info

    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT) as tar:
        for path in sorted(source.rglob("*")):
            relative = path.relative_to(source).as_posix()
            tar.add(path, arcname=f"{arcname}/{relative}", recursive=False, filter=normalize)
    with output.open("wb") as raw, gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as gz:
        gz.write(buffer.getvalue())


def vcpkg_port(layout: cp.CppLayout, version: str, url: str, source: Path, out_dir: Path) -> Path:
    sha512 = render_vcpkg_port.sha512_of(source)
    step = render_vcpkg_port.source_step(
        SimpleNamespace(source_dir=None, archive_url=url, sha512=sha512, github_repo=None, ref=None)
    )
    with tempfile.TemporaryDirectory() as temp:
        port_dir = render_vcpkg_port.render_port(layout, Path(temp), version, step)
        output = out_dir / f"{port_dir.name}-vcpkg-port-{version}.tar.gz"
        reproducible_tar(port_dir, port_dir.name, output)
    return output


def write_checksums(assets: List[Path], out_dir: Path) -> Path:
    lines = []
    for asset in sorted(assets, key=lambda p: p.name):
        lines.append(f"{hashlib.sha256(asset.read_bytes()).hexdigest()}  {asset.name}\n")
    output = out_dir / "SHA256SUMS"
    output.write_text("".join(lines), encoding="utf-8")
    return output


def release_asset_url(repository: str, tag: str, filename: str) -> str:
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
    return f"{server}/{repository}/releases/download/{tag}/{filename}"


def package(layout: cp.CppLayout, args) -> dict:
    version = cp.normalize_version(args.version or cp.read_project_version(layout.cmake_file))
    tag = args.tag or cp.build_release_tag(version, layout.multi_language)
    basename = archive_basename(layout, version, args.basename)
    if not re.fullmatch(r"[A-Za-z0-9._+-]+", basename):
        raise ValueError(f"invalid archive basename: {basename!r}")
    out_dir = Path(args.out_dir)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    source = git_archive(layout, args.ref, basename, "tar.gz", out_dir)
    assets = [source, git_archive(layout, args.ref, basename, "zip", out_dir)]
    option_prefix = render_vcpkg_port.substitutions(layout, version, "")["OPTION_PREFIX"]
    if not args.skip_install_tree:
        assets.append(install_tree(layout, basename, out_dir, option_prefix))
    url = release_asset_url(args.repository, tag, source.name)
    port = vcpkg_port(layout, version, url, source, out_dir)
    assets.append(port)
    nupkg = None
    if args.nuget:
        values = pack_nuget.default_values(layout, pack_nuget_args(args, version))
        nupkg = pack_nuget.pack(layout, out_dir, values)
        assets.append(nupkg)
    assets.append(write_checksums(assets, out_dir))
    return {
        "out_dir": out_dir.as_posix(),
        "tag": tag,
        "source_archive": source.as_posix(),
        "source_sha512": render_vcpkg_port.sha512_of(source),
        "port_archive": port.as_posix(),
        "nupkg": nupkg.as_posix() if nupkg else "",
        "assets": "\n".join(asset.as_posix() for asset in assets),
    }


def pack_nuget_args(args, version: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=None, version=version, title=None, authors=None, release_notes=None,
        license=args.license, tags="C++ native header-only",
    )


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--version")
    parser.add_argument("--tag")
    parser.add_argument("--ref", default="HEAD")
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY", "owner/repo"))
    parser.add_argument("--basename")
    parser.add_argument("--license", default="Unlicense")
    parser.add_argument("--nuget", action="store_true", help="Also pack the native NuGet package")
    parser.add_argument("--skip-install-tree", action="store_true")
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    try:
        outputs = package(layout, args)
    except (ValueError, RuntimeError) as exc:
        cp.error(str(exc), title="Release packaging failed")
        return 1
    print("Release assets:\n" + outputs["assets"])
    for key, value in outputs.items():
        cp.set_output(key, value)
    return 0


if __name__ == "__main__":
    sys.exit(main())
