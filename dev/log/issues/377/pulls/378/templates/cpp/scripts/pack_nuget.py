#!/usr/bin/env python3
"""Pack the headers as a native NuGet package (``<id>.<version>.nupkg``).

linksplatform ships its C++ template libraries to nuget.org as
``Platform.<Repo>.TemplateLibrary`` packages: headers under
``lib/native/include`` plus ``build/native/<id>.targets`` that adds them to
the include path of Visual Studio (MSBuild) C++ projects. This script builds
the same layout with the Python standard library only, so no ``nuget.exe``
(and no mono) is needed; ``dotnet nuget push`` uploads the result.

The archive is a valid OPC package ([Content_Types].xml, _rels/.rels and core
properties), with fixed timestamps so the same sources produce the same bytes.

Usage: python3 scripts/pack_nuget.py --out-dir dist [--id ID] [--version X.Y.Z]
       [--authors NAMES] [--release-notes TEXT] [--cpp-root DIR]

Environment defaults: NUGET_PACKAGE_ID, NUGET_AUTHORS, GITHUB_REPOSITORY,
GITHUB_REPOSITORY_OWNER, GITHUB_SHA, SOURCE_DATE_EPOCH.

Outputs: nupkg (path), id, version.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
import time
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple
from xml.sax.saxutils import escape

import cpp_project as cp

HEADER_SUFFIXES = {".h", ".hh", ".hpp", ".hxx", ".h++", ".ipp", ".inl", ".tpp"}
NUGET_ID_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$")


def render(template: str, values: Dict[str, str]) -> str:
    rendered = re.sub(r"@([A-Z_]+)@", lambda m: escape(values.get(m.group(1), m.group(0))), template)
    leftover = re.findall(r"@[A-Z_]+@", rendered)
    if leftover:
        raise ValueError(f"unknown placeholders: {sorted(set(leftover))}")
    return rendered


def collect_headers(include_dir: Path) -> List[Tuple[Path, str]]:
    if not include_dir.is_dir():
        raise ValueError(f"{include_dir} does not exist")
    headers = [
        (path, "lib/native/include/" + path.relative_to(include_dir).as_posix())
        for path in sorted(include_dir.rglob("*"))
        if path.is_file() and path.suffix.lower() in HEADER_SUFFIXES
    ]
    if not headers:
        raise ValueError(f"no headers found under {include_dir}")
    return headers


def content_types(extensions: List[str]) -> str:
    defaults = {
        "rels": "application/vnd.openxmlformats-package.relationships+xml",
        "psmdcp": "application/vnd.openxmlformats-package.core-properties+xml",
    }
    for extension in extensions:
        defaults.setdefault(extension, "application/octet")
    entries = "".join(
        f'<Default Extension="{escape(ext)}" ContentType="{escape(kind)}" />'
        for ext, kind in sorted(defaults.items())
    )
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        f"{entries}</Types>"
    )


def relationships(nuspec_name: str, psmdcp_name: str) -> str:
    def rel_id(target: str) -> str:
        return "R" + hashlib.sha256(target.encode()).hexdigest()[:16].upper()

    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'<Relationship Type="http://schemas.microsoft.com/packaging/2010/07/manifest" '
        f'Target="/{nuspec_name}" Id="{rel_id(nuspec_name)}" />'
        f'<Relationship Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" '
        f'Target="/{psmdcp_name}" Id="{rel_id(psmdcp_name)}" />'
        "</Relationships>"
    )


def core_properties(values: Dict[str, str]) -> str:
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">'
        f"<dc:creator>{escape(values['AUTHORS'])}</dc:creator>"
        f"<dc:description>{escape(values['DESCRIPTION'])}</dc:description>"
        f"<dc:identifier>{escape(values['ID'])}</dc:identifier>"
        f"<version>{escape(values['VERSION'])}</version>"
        f"<keywords>{escape(values['TAGS'])}</keywords>"
        "<lastModifiedBy>scripts/pack_nuget.py</lastModifiedBy>"
        "</coreProperties>"
    )


def pack(layout: cp.CppLayout, out_dir: Path, values: Dict[str, str]) -> Path:
    if not NUGET_ID_RE.match(values["ID"]):
        raise ValueError(f"invalid NuGet package id: {values['ID']!r}")
    cp.parse_semver(values["VERSION"])
    files: List[Tuple[str, bytes]] = []
    for path, target in collect_headers(layout.root / "include"):
        files.append((target, path.read_bytes()))
    template_dir = layout.packaging_dir("nuget")
    targets = render((template_dir / "package.targets.in").read_text(encoding="utf-8"), values)
    files.append((f"build/native/{values['ID']}.targets", targets.encode("utf-8")))
    for name in ("README.md", "LICENSE"):
        source = layout.root / name
        if not source.is_file():
            source = layout.repository_root / name
        if source.is_file():
            files.append((name, source.read_bytes()))

    nuspec_name = f"{values['ID']}.nuspec"
    nuspec = render((template_dir / "package.nuspec.in").read_text(encoding="utf-8"), values)
    if not any(target == "README.md" for target, _ in files):
        nuspec = nuspec.replace("    <readme>README.md</readme>\n", "")
    psmdcp_hash = hashlib.sha256(f"{values['ID']}{values['VERSION']}".encode()).hexdigest()[:32]
    psmdcp_name = f"package/services/metadata/core-properties/{psmdcp_hash}.psmdcp"
    extensions = sorted({Path(t).suffix.lstrip(".") or Path(t).name for t, _ in files} | {"nuspec"})

    parts = [
        ("_rels/.rels", relationships(nuspec_name, psmdcp_name).encode("utf-8")),
        (nuspec_name, nuspec.encode("utf-8")),
        *files,
        (psmdcp_name, core_properties(values).encode("utf-8")),
        ("[Content_Types].xml", content_types(extensions).encode("utf-8")),
    ]
    epoch = int(os.environ.get("SOURCE_DATE_EPOCH", "315532800"))
    timestamp = time.gmtime(max(epoch, 315532800))[:6]
    out_dir.mkdir(parents=True, exist_ok=True)
    output = out_dir / f"{values['ID']}.{values['VERSION']}.nupkg"
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in parts:
            info = zipfile.ZipInfo(name, date_time=timestamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    return output


def default_values(layout: cp.CppLayout, args) -> Dict[str, str]:
    package = cp.read_project_name(layout.cmake_file)
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    homepage = cp.read_project_field(layout.cmake_file, "HOMEPAGE_URL")
    repository_url = f"https://github.com/{repository}" if repository else homepage
    version = cp.normalize_version(args.version or cp.read_project_version(layout.cmake_file))
    package_id = args.id or os.environ.get("NUGET_PACKAGE_ID") or package
    return {
        "ID": package_id,
        "VERSION": version,
        "TITLE": args.title or package_id,
        "AUTHORS": args.authors or os.environ.get("NUGET_AUTHORS")
        or os.environ.get("GITHUB_REPOSITORY_OWNER") or package,
        "DESCRIPTION": cp.read_project_field(layout.cmake_file, "DESCRIPTION") or package,
        "RELEASE_NOTES": args.release_notes or f"See {repository_url}/releases",
        "PROJECT_URL": homepage or repository_url,
        "REPOSITORY_URL": repository_url,
        "COMMIT": os.environ.get("GITHUB_SHA") or cp.git("rev-parse", "HEAD", cwd=layout.repository_root),
        "LICENSE": args.license,
        "TAGS": args.tags,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--id")
    parser.add_argument("--version")
    parser.add_argument("--title")
    parser.add_argument("--authors")
    parser.add_argument("--release-notes")
    parser.add_argument("--license", default="Unlicense", help="SPDX license expression")
    parser.add_argument("--tags", default="C++ native header-only")
    args = parser.parse_args(argv)

    layout = cp.detect_layout(cpp_root=args.cpp_root)
    try:
        values = default_values(layout, args)
        output = pack(layout, Path(args.out_dir), values)
    except (ValueError, RuntimeError) as exc:
        cp.error(str(exc), title="NuGet packing failed")
        return 1
    print(f"Packed {output}")
    cp.set_output("nupkg", output.as_posix())
    cp.set_output("id", values["ID"])
    cp.set_output("version", values["VERSION"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
