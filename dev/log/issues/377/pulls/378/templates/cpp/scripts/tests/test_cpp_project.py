"""Tests for scripts/cpp_project.py: layout detection, CMake/vcpkg metadata,
versions and tags, and changelog fragments."""

from __future__ import annotations

import pytest

import cpp_project as cp


def test_single_language_layout(make_repo) -> None:
    repo = make_repo()
    layout = cp.detect_layout(repo.path)
    assert layout.root == repo.path
    assert not layout.multi_language
    assert layout.root_prefix == ""
    assert layout.relative(layout.changelog_file) == "CHANGELOG.md"


def test_multi_language_layout(make_repo) -> None:
    repo = make_repo(multi=True)
    layout = cp.detect_layout(repo.path)
    assert layout.root == repo.path / "cpp"
    assert layout.multi_language
    assert layout.root_prefix == "cpp/"
    assert layout.relative(layout.changelog_dir) == "cpp/changelog.d"


def test_cpp_root_override(make_repo, monkeypatch) -> None:
    repo = make_repo(multi=True)
    monkeypatch.setenv("CPP_ROOT", "cpp")
    assert cp.detect_layout(repo.path).root == repo.path / "cpp"
    monkeypatch.setenv("CPP_ROOT", "missing")
    with pytest.raises(FileNotFoundError, match="CPP_ROOT='missing'"):
        cp.detect_layout(repo.path)


def test_packaging_templates_of_the_cpp_project_come_first(make_repo) -> None:
    repo = make_repo(multi=True)
    layout = cp.detect_layout(repo.path)
    assert layout.packaging_dir("vcpkg") == repo.path / "cpp" / "packaging" / "vcpkg"
    # A multi-language repository may keep packaging/ next to scripts/.
    (repo.path / "cpp" / "packaging").rename(repo.path / "packaging")
    assert layout.packaging_dir("nuget") == repo.path / "packaging" / "nuget"


def test_missing_project_is_reported(tmp_path) -> None:
    with pytest.raises(FileNotFoundError, match="set CPP_ROOT"):
        cp.detect_layout(tmp_path, cpp_root="")


def test_project_metadata_ignores_comments(make_repo) -> None:
    repo = make_repo(version="1.2.3")
    cmake = repo.layout.cmake_file
    assert cp.read_project_name(cmake) == "my_package"
    assert cp.read_project_version(cmake) == "1.2.3"
    assert cp.read_project_field(cmake, "DESCRIPTION") == "Example library"
    assert cp.read_project_field(cmake, "HOMEPAGE_URL") == "https://example.com/my_package"
    assert cp.read_project_field(cmake, "MISSING") == ""


def test_write_project_version_only_touches_project(make_repo) -> None:
    repo = make_repo()
    cmake = repo.layout.cmake_file
    before = cmake.read_text()
    assert cp.write_project_version(cmake, "0.2.0")
    after = cmake.read_text()
    assert "VERSION 0.2.0" in after
    assert "cmake_minimum_required(VERSION 3.21)" in after
    assert "project(commented_out VERSION 9.9.9)" in after
    assert after.replace("0.2.0", "0.1.0", 1) == before
    assert not cp.write_project_version(cmake, "0.2.0")
    with pytest.raises(ValueError):
        cp.write_project_version(cmake, "banana")


def test_vcpkg_manifest_version_keeps_formatting(make_repo) -> None:
    repo = make_repo()
    manifest = repo.layout.vcpkg_manifest
    assert cp.read_vcpkg_name(manifest) == "my-package"
    before = manifest.read_text()
    assert cp.write_vcpkg_version(manifest, "3.0.0")
    assert manifest.read_text() == before.replace('"0.1.0"', '"3.0.0"')
    assert not cp.write_vcpkg_version(manifest, "3.0.0")
    assert not cp.write_vcpkg_version(repo.path / "absent.json", "1.0.0")
    assert cp.read_vcpkg_name(repo.path / "absent.json") is None


def test_conan_name_comes_from_the_recipe(make_repo) -> None:
    repo = make_repo()
    assert cp.read_conan_name(repo.layout.conanfile) is None
    repo.write("conanfile.py", 'class Recipe(ConanFile):\n    # name = "commented"\n'
                               '    name = "platform.numbers"\n    def layout(self):\n        name = "local"\n')
    assert cp.read_conan_name(repo.layout.conanfile) == "platform.numbers"


@pytest.mark.parametrize(
    ("version", "bump", "expected"),
    [("1.2.3", "patch", "1.2.4"), ("1.2.3", "minor", "1.3.0"), ("1.2.3", "major", "2.0.0")],
)
def test_bump_semver(version: str, bump: str, expected: str) -> None:
    assert cp.bump_semver(version, bump) == expected


def test_bump_semver_rejects_bad_input() -> None:
    with pytest.raises(ValueError):
        cp.bump_semver("1.2", "patch")
    with pytest.raises(ValueError):
        cp.bump_semver("1.2.3", "huge")


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("v1.2.3", "1.2.3"), ("cpp_v1.2.3", "1.2.3"), ("cpp-v1.2.3", "1.2.3"), ("cpp_1.2.3", "1.2.3"),
     ("1.2.3", "1.2.3"), ("", "")],
)
def test_normalize_version(raw: str, expected: str) -> None:
    assert cp.normalize_version(raw) == expected


def test_tags_and_titles(git_env, monkeypatch) -> None:
    assert cp.build_release_tag("1.0.0", False) == "v1.0.0"
    assert cp.build_release_tag("v1.0.0", True) == "cpp_v1.0.0"
    assert cp.build_release_title("1.0.0", "my_package", False) == "my_package 1.0.0"
    assert cp.build_release_title("1.0.0", "my_package", True) == "[C++] 1.0.0"
    monkeypatch.setenv("CPP_TAG_PREFIX", "cpp_")
    assert cp.build_release_tag("1.0.0", True) == "cpp_1.0.0"


def test_published_versions_per_layout(git_env) -> None:
    tags = ["v0.1.0", "v0.3.0", "cpp_v0.2.0", "cpp_0.9.0", "rust_v5.0.0", "v-not-semver", "nightly"]
    assert cp.published_versions(tags, False) == ["0.1.0", "0.3.0"]
    # linksplatform's historical cpp_<version> tags count in multi-language mode.
    assert cp.published_versions(tags, True) == ["0.2.0", "0.9.0"]
    assert cp.max_version(["0.10.0", "0.9.0"]) == "0.10.0"
    assert cp.max_version([]) is None


def test_fragments(make_repo) -> None:
    repo = make_repo()
    repo.fragment("a", "minor", "### Added\n- A")
    repo.fragment("b", "patch", "### Fixed\n- B")
    repo.write("changelog.d/c.md", "### Changed\n- no front matter\n")
    fragments = cp.read_fragments(repo.layout.changelog_dir)
    assert [f.path.name for f in fragments] == ["a.md", "b.md", "c.md"]
    assert [f.bump for f in fragments] == ["minor", "patch", "patch"]
    assert fragments[0].body == "### Added\n- A"
    assert cp.highest_bump(fragments) == "minor"
    assert cp.highest_bump([]) == "patch"


def test_invalid_fragment_bump(make_repo) -> None:
    repo = make_repo()
    path = repo.fragment("bad", "huge")
    with pytest.raises(ValueError, match="bump must be"):
        cp.parse_fragment(path)


def test_set_output_writes_multiline_values(github_output) -> None:
    cp.set_output("flag", True)
    cp.set_output("assets", "a\nb")
    assert github_output() == {"flag": "true", "assets": "a\nb"}


def test_run_raises_with_details(tmp_path) -> None:
    with pytest.raises(RuntimeError, match="exited with"):
        cp.run(["git", "rev-parse", "--verify", "no-such-ref"], cwd=tmp_path)
    assert cp.run(["git", "--version"]).returncode == 0
