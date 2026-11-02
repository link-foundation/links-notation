"""Tests for get_version.py, get_bump_type.py and bump_version.py."""

from __future__ import annotations

import pytest

import bump_version
import cpp_project as cp
import get_bump_type
import get_version


def test_compute_new_version_stays_above_published_tags() -> None:
    assert bump_version.compute_new_version("0.1.0", "patch") == "0.1.1"
    # A tag newer than the manifest (e.g. after a revert) is never re-used.
    assert bump_version.compute_new_version("0.1.0", "patch", published=["0.4.0"]) == "0.4.1"
    assert bump_version.compute_new_version("0.1.0", "minor", published=["0.1.0"]) == "0.2.0"
    assert bump_version.compute_new_version("0.1.0", None, "7.0.0") == "7.0.0"
    with pytest.raises(ValueError):
        bump_version.compute_new_version("0.1.0")
    with pytest.raises(ValueError):
        bump_version.compute_new_version("0.1.0", None, "7.0")


def test_get_version_outputs(make_repo, github_output) -> None:
    make_repo(multi=True, version="2.3.4")
    assert get_version.main([]) == 0
    outputs = github_output()
    assert outputs["version"] == "2.3.4"
    assert outputs["tag"] == "cpp_v2.3.4"
    assert outputs["title"] == "[C++] 2.3.4"
    assert outputs["port_name"] == "my-package"
    assert outputs["cpp_root"] == "cpp"
    assert outputs["multi_language"] == "true"


def test_get_version_prints_a_single_field(make_repo, github_output, capsys) -> None:
    make_repo(version="1.0.2")
    assert get_version.main(["--print", "version"]) == 0
    assert capsys.readouterr().out == "1.0.2\n"
    assert github_output() == {}
    assert get_version.main(["--print", "tag"]) == 0
    assert capsys.readouterr().out == "v1.0.2\n"
    with pytest.raises(SystemExit):
        get_version.main(["--print", "nope"])


def test_get_bump_type_takes_highest(make_repo, github_output) -> None:
    repo = make_repo()
    assert get_bump_type.main([]) == 0
    assert github_output() == {"bump_type": "patch", "fragment_count": "0", "has_fragments": "false"}
    repo.fragment("one", "patch")
    repo.fragment("two", "major")
    assert get_bump_type.main([]) == 0
    assert github_output()["bump_type"] == "major"
    assert github_output()["has_fragments"] == "true"


def test_get_bump_type_rejects_invalid_fragment(make_repo, capsys) -> None:
    repo = make_repo()
    repo.fragment("bad", "enormous")
    assert get_bump_type.main([]) == 1
    assert "Invalid changelog fragment" in capsys.readouterr().err


def test_bump_version_updates_both_manifests(make_repo, github_output) -> None:
    repo = make_repo(multi=True)
    repo.git("tag", "cpp_0.5.0")  # a historical linksplatform tag
    assert bump_version.main(["--bump-type", "minor"]) == 0
    assert cp.read_project_version(repo.layout.cmake_file) == "0.6.0"
    assert '"version": "0.6.0"' in repo.layout.vcpkg_manifest.read_text()
    assert sorted(repo.git("diff", "--name-only").splitlines()) == ["cpp/CMakeLists.txt", "cpp/vcpkg.json"]


def test_bump_version_dry_run_and_ignore_tags(make_repo) -> None:
    repo = make_repo()
    repo.git("tag", "v3.0.0")
    assert bump_version.main(["--bump-type", "patch", "--dry-run"]) == 0
    assert cp.read_project_version(repo.layout.cmake_file) == "0.1.0"
    assert bump_version.main(["--bump-type", "patch", "--ignore-tags"]) == 0
    assert cp.read_project_version(repo.layout.cmake_file) == "0.1.1"
