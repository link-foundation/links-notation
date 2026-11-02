"""Tests for render_vcpkg_port.py, pack_nuget.py and package_release.py.

The end-to-end checks (vcpkg really installs the rendered port, dotnet really
restores the .nupkg) live in experiments/ and in the packaging CI jobs; these
tests pin the file layouts, validation and reproducibility.
"""

from __future__ import annotations

import hashlib
import json
import tarfile
import zipfile
from pathlib import Path
from types import SimpleNamespace
from xml.etree import ElementTree

import pytest

import pack_nuget
import package_release
import render_vcpkg_port as rvp

SHA = "a" * 128


def step_args(**kwargs) -> SimpleNamespace:
    values = {"source_dir": None, "archive_url": None, "sha512": None, "github_repo": None, "ref": None}
    values.update(kwargs)
    return SimpleNamespace(**values)


def test_source_steps(tmp_path) -> None:
    assert rvp.source_step(step_args(source_dir=str(tmp_path))) == f'set(SOURCE_PATH "{tmp_path.resolve().as_posix()}")'
    archive = rvp.source_step(step_args(archive_url="https://h/x/pkg-1.0.0.tar.gz", sha512=SHA.upper()))
    assert 'URLS "https://h/x/pkg-1.0.0.tar.gz"' in archive
    assert 'FILENAME "pkg-1.0.0.tar.gz"' in archive
    assert f"SHA512 {SHA}" in archive
    github = rvp.source_step(step_args(github_repo="o/r", ref="v1.0.0", sha512=SHA))
    assert "vcpkg_from_github(" in github and "REF v1.0.0" in github
    with pytest.raises(ValueError, match="128-hex-digit"):
        rvp.source_step(step_args(archive_url="u", sha512="abc"))
    with pytest.raises(ValueError, match="pass --source-dir"):
        rvp.source_step(step_args(sha512=SHA))


def test_render_port(make_repo, tmp_path) -> None:
    repo = make_repo(multi=True)
    step = rvp.source_step(step_args(source_dir=str(repo.layout.root)))
    port = rvp.render_port(repo.layout, tmp_path / "ports", "0.1.0", step)
    assert port.name == "my-package"
    assert sorted(p.name for p in port.iterdir()) == ["portfile.cmake", "usage", "vcpkg.json"]
    manifest = json.loads((port / "vcpkg.json").read_text())
    assert manifest["name"] == "my-package"
    assert manifest["version"] == "0.1.0"
    portfile = (port / "portfile.cmake").read_text()
    assert "@" not in portfile.replace("${", "")  # no unrendered placeholder
    assert "MY_PACKAGE_BUILD_TESTS=OFF" in portfile
    assert "my_package::my_package" in (port / "usage").read_text()


def test_render_rejects_unknown_placeholders() -> None:
    with pytest.raises(ValueError, match="@NOPE@"):
        rvp.render("@NOPE@", {})
    assert rvp.cmake_quote('C:\\a "b"') == 'C:/a \\"b\\"'


def test_render_cli_hashes_local_archive(make_repo, tmp_path, github_output) -> None:
    make_repo()
    archive = tmp_path / "a.tar.gz"
    archive.write_bytes(b"data")
    out = tmp_path / "ports"
    assert rvp.main(["--out-dir", str(out), "--archive-url", "https://h/a.tar.gz", "--archive", str(archive)]) == 0
    assert hashlib.sha512(b"data").hexdigest() in (out / "my-package" / "portfile.cmake").read_text()
    assert github_output()["port_dir"].endswith("/my-package")
    assert rvp.main(["--out-dir", str(out), "--archive-url", "https://h/a.tar.gz"]) == 1


def nuget_values(**overrides) -> dict:
    values = {
        "ID": "Platform.Example.TemplateLibrary", "VERSION": "1.2.3", "TITLE": "Example",
        "AUTHORS": "linksplatform", "DESCRIPTION": "A <library> & more", "RELEASE_NOTES": "notes",
        "PROJECT_URL": "https://p", "REPOSITORY_URL": "https://r", "COMMIT": "c" * 40,
        "LICENSE": "Unlicense", "TAGS": "C++ native",
    }
    values.update(overrides)
    return values


def test_nuget_package_layout(make_repo, tmp_path) -> None:
    repo = make_repo(multi=True)
    nupkg = pack_nuget.pack(repo.layout, tmp_path, nuget_values())
    assert nupkg.name == "Platform.Example.TemplateLibrary.1.2.3.nupkg"
    with zipfile.ZipFile(nupkg) as archive:
        names = archive.namelist()
        nuspec = archive.read("Platform.Example.TemplateLibrary.nuspec").decode()
        targets = archive.read("build/native/Platform.Example.TemplateLibrary.targets").decode()
        types = archive.read("[Content_Types].xml").decode()
    assert "lib/native/include/my_package/my_package.hpp" in names
    assert {"_rels/.rels", "README.md", "LICENSE", "[Content_Types].xml"} <= set(names)
    assert any(name.endswith(".psmdcp") for name in names)
    root = ElementTree.fromstring(nuspec)  # well-formed despite "<library> & more"
    ns = {"n": root.tag.split("}")[0].strip("{")}
    assert root.find("n:metadata/n:id", ns).text == "Platform.Example.TemplateLibrary"
    assert root.find("n:metadata/n:description", ns).text == "A <library> & more"
    # This native header package has no NuGet dependency tree to restore/audit.
    # Adding dependencies requires extending the full-tree security audit too.
    assert root.findall(".//n:dependency", ns) == []
    assert "lib\\native\\include" in targets or "lib/native/include" in targets
    ElementTree.fromstring(targets)
    for extension in ("hpp", "targets", "nuspec", "md"):
        assert f'Extension="{extension}"' in types


def test_nuget_package_is_reproducible(make_repo, tmp_path, monkeypatch) -> None:
    repo = make_repo()
    first = pack_nuget.pack(repo.layout, tmp_path / "a", nuget_values()).read_bytes()
    second = pack_nuget.pack(repo.layout, tmp_path / "b", nuget_values()).read_bytes()
    assert first == second
    monkeypatch.setenv("SOURCE_DATE_EPOCH", "1700000000")
    assert pack_nuget.pack(repo.layout, tmp_path / "c", nuget_values()).read_bytes() != first


def test_nuget_validation_and_readme_optional(make_repo, tmp_path) -> None:
    repo = make_repo()
    with pytest.raises(ValueError, match="invalid NuGet package id"):
        pack_nuget.pack(repo.layout, tmp_path, nuget_values(ID="bad id"))
    with pytest.raises(ValueError):
        pack_nuget.pack(repo.layout, tmp_path, nuget_values(VERSION="1.0"))
    (repo.path / "README.md").unlink()
    nupkg = pack_nuget.pack(repo.layout, tmp_path, nuget_values())
    with zipfile.ZipFile(nupkg) as archive:
        assert "<readme>" not in archive.read("Platform.Example.TemplateLibrary.nuspec").decode()


def test_nuget_cli_defaults(make_repo, tmp_path, monkeypatch, github_output) -> None:
    make_repo()
    monkeypatch.setenv("GITHUB_REPOSITORY", "linksplatform/Example")
    monkeypatch.setenv("GITHUB_REPOSITORY_OWNER", "linksplatform")
    monkeypatch.setenv("NUGET_PACKAGE_ID", "Platform.Example.TemplateLibrary")
    assert pack_nuget.main(["--out-dir", str(tmp_path / "out")]) == 0
    outputs = github_output()
    assert outputs["id"] == "Platform.Example.TemplateLibrary"
    assert outputs["version"] == "0.1.0"
    with zipfile.ZipFile(outputs["nupkg"]) as archive:
        nuspec = archive.read("Platform.Example.TemplateLibrary.nuspec").decode()
    assert "https://github.com/linksplatform/Example" in nuspec
    assert "<authors>linksplatform</authors>" in nuspec


def package_args(out_dir: Path, **overrides) -> SimpleNamespace:
    values = {"out_dir": str(out_dir), "version": None, "tag": None, "ref": "HEAD", "repository": "o/r",
              "basename": None, "license": "Unlicense", "nuget": False, "skip_install_tree": True}
    values.update(overrides)
    return SimpleNamespace(**values)


def test_archive_basename(make_repo, monkeypatch) -> None:
    repo = make_repo()
    assert package_release.archive_basename(repo.layout, "1.0.0") == "my-package-1.0.0"
    assert package_release.archive_basename(repo.layout, "1.0.0", "platform.data_{version}") == "platform.data_1.0.0"
    monkeypatch.setenv("RELEASE_ARCHIVE_BASENAME", "platform.data_")
    assert package_release.archive_basename(repo.layout, "1.0.0") == "platform.data_1.0.0"


def test_package_multi_language_release(make_repo, tmp_path, monkeypatch) -> None:
    repo = make_repo(multi=True)
    monkeypatch.setenv("GITHUB_SERVER_URL", "https://example.test")
    outputs = package_release.package(repo.layout, package_args(tmp_path / "dist", nuget=True))
    dist = Path(outputs["out_dir"])
    names = sorted(p.name for p in dist.iterdir())
    assert names == [
        "SHA256SUMS", "my-package-0.1.0.tar.gz", "my-package-0.1.0.zip",
        "my-package-vcpkg-port-0.1.0.tar.gz", "my_package.0.1.0.nupkg",
    ]
    assert outputs["tag"] == "cpp_v0.1.0"
    with tarfile.open(dist / "my-package-0.1.0.tar.gz") as tar:
        members = tar.getnames()
    # Only the C++ root (HEAD:cpp) is distributed, under a versioned prefix.
    assert "my-package-0.1.0/CMakeLists.txt" in members
    assert not any("rust" in name for name in members)
    with tarfile.open(dist / "my-package-vcpkg-port-0.1.0.tar.gz") as tar:
        portfile = tar.extractfile("my-package/portfile.cmake").read().decode()
    assert "https://example.test/o/r/releases/download/cpp_v0.1.0/my-package-0.1.0.tar.gz" in portfile
    assert outputs["source_sha512"] in portfile
    sums = (dist / "SHA256SUMS").read_text().splitlines()
    assert len(sums) == 4 and all("  " in line for line in sums)


def test_package_is_reproducible_and_honours_basename(make_repo, tmp_path) -> None:
    repo = make_repo()
    args = package_args(tmp_path / "one", basename="platform.example_{version}")
    first = package_release.package(repo.layout, args)
    second = package_release.package(repo.layout, package_args(tmp_path / "two", basename="platform.example_{version}"))
    assert Path(first["source_archive"]).name == "platform.example_0.1.0.tar.gz"
    assert Path(first["source_archive"]).read_bytes() == Path(second["source_archive"]).read_bytes()
    assert Path(first["port_archive"]).read_bytes() == Path(second["port_archive"]).read_bytes()
    with pytest.raises(ValueError, match="invalid archive basename"):
        package_release.package(repo.layout, package_args(tmp_path / "bad", basename="a/b"))


def test_reproducible_tar_normalizes_metadata(tmp_path) -> None:
    source = tmp_path / "src"
    (source / "sub").mkdir(parents=True)
    (source / "sub" / "file.txt").write_text("x")
    output = tmp_path / "out.tar.gz"
    package_release.reproducible_tar(source, "pkg", output)
    with tarfile.open(output) as tar:
        infos = tar.getmembers()
    assert [i.name for i in infos] == ["pkg/sub", "pkg/sub/file.txt"]
    assert all(i.mtime == 0 and i.uid == 0 and i.uname == "" for i in infos)
