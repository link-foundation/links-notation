"""Tests for detect_code_changes.py, check_version_modification.py and
check_file_size.py."""

from __future__ import annotations

import pytest

import check_file_size
import check_version_modification
import cpp_project as cp
import detect_code_changes as dcc


@pytest.mark.parametrize(
    ("path", "is_code"),
    [
        ("include/my_package/my_package.hpp", True),
        ("CMakeLists.txt", True),
        ("cmake/ProjectOptions.cmake", True),
        ("packaging/nuget/package.nuspec.in", True),
        (".clang-format", True),
        ("examples/consumers/fetchcontent/main.cpp", True),
        ("scripts/cpp_project.py", True),
        (".github/workflows/release.yml", True),
        ("README.md", False),
        ("docs/index.html", False),
        ("changelog.d/20260101_x.md", False),
        ("experiments/try.py", False),
        ("LICENSE", True),
        ("assets/logo.png", False),
    ],
)
def test_single_language_code_files(path: str, is_code: bool) -> None:
    assert dcc.is_code_file(path) is is_code


def test_multi_language_only_counts_cpp_and_shared_files() -> None:
    assert dcc.is_code_file("cpp/include/x.hpp", "cpp/")
    assert dcc.is_code_file("scripts/get_version.py", "cpp/")
    assert dcc.is_code_file(".github/workflows/cpp.yml", "cpp/")
    assert not dcc.is_code_file("rust/src/lib.rs", "cpp/")
    assert not dcc.is_code_file("js/package.json", "cpp/")
    assert not dcc.is_code_file("cpp/docs/extra.cpp", "cpp/")
    assert not dcc.is_code_file("cpp/changelog.d/x.md", "cpp/")


def test_classify() -> None:
    assert dcc.classify(["rust/src/lib.rs", "README.md"], "cpp/") == {
        "any-code-changed": False, "cpp-changed": False, "docs-changed": True,
    }
    assert dcc.classify(["cpp/include/x.hpp"], "cpp/") == {
        "any-code-changed": True, "cpp-changed": True, "docs-changed": True,
    }
    # Pipeline-only changes run CI but are not C++ changes.
    assert dcc.classify(["scripts/get_version.py"], "cpp/") == {
        "any-code-changed": True, "cpp-changed": False, "docs-changed": False,
    }
    assert dcc.classify(["Doxyfile"]) == {
        "any-code-changed": True, "cpp-changed": True, "docs-changed": True,
    }


def test_main_diffs_pull_request_range(make_repo, monkeypatch, github_output) -> None:
    repo = make_repo(multi=True)
    base = repo.git("rev-parse", "HEAD")
    repo.write("rust/src/lib.rs", "fn main() {}\n")
    head = repo.commit("rust only")
    monkeypatch.setenv("GITHUB_EVENT_NAME", "pull_request")
    monkeypatch.setenv("GITHUB_BASE_SHA", base)
    monkeypatch.setenv("GITHUB_HEAD_SHA", head)
    assert dcc.main() == 0
    outputs = github_output()
    assert outputs["any-code-changed"] == "false"
    assert outputs["cpp-root"] == "cpp"
    assert outputs["multi-language"] == "true"


def test_main_push_uses_before_sha_then_parent(make_repo, monkeypatch, github_output) -> None:
    repo = make_repo()
    before = repo.git("rev-parse", "HEAD")
    repo.write("include/my_package/extra.hpp", "#pragma once\n")
    repo.commit("code")
    repo.write("README.md", "# changed\n")
    repo.commit("docs")
    monkeypatch.setenv("GITHUB_EVENT_NAME", "push")
    monkeypatch.setenv("GITHUB_EVENT_BEFORE", before)
    assert dcc.main() == 0
    assert github_output()["cpp-changed"] == "true"
    monkeypatch.setenv("GITHUB_EVENT_BEFORE", dcc.ZERO_SHA)
    assert dcc.main() == 0
    assert github_output()["cpp-changed"] == "false"  # HEAD^..HEAD is docs only


def test_main_fails_without_pull_request_base(make_repo, monkeypatch) -> None:
    make_repo()
    monkeypatch.setenv("GITHUB_EVENT_NAME", "pull_request")
    assert dcc.main() == 1


def test_version_modification_is_detected(make_repo, capsys) -> None:
    repo = make_repo(multi=True)
    repo.git("checkout", "-q", "-b", "feature")
    base = repo.git("rev-parse", "HEAD")
    assert check_version_modification.find_modifications(base, repo.layout) == []
    cp.write_project_version(repo.layout.cmake_file, "9.0.0")
    cp.write_vcpkg_version(repo.layout.vcpkg_manifest, "9.0.0")
    repo.commit("manual bump")
    assert check_version_modification.find_modifications(base, repo.layout) == [
        "cpp/CMakeLists.txt: 0.1.0 -> 9.0.0",
        "cpp/vcpkg.json: 0.1.0 -> 9.0.0",
    ]
    assert check_version_modification.main() == 1
    assert "Manual version change" in capsys.readouterr().err


def test_version_modification_passes_for_other_edits(make_repo, monkeypatch) -> None:
    repo = make_repo()
    repo.git("checkout", "-q", "-b", "feature")
    repo.write("CMakeLists.txt", repo.layout.cmake_file.read_text() + "# a comment\n")
    repo.commit("edit")
    assert check_version_modification.main() == 0
    cp.write_project_version(repo.layout.cmake_file, "0.2.0")
    repo.commit("bump")
    monkeypatch.setenv("GITHUB_HEAD_REF", "changelog-manual-release-1")
    assert check_version_modification.main() == 0


def test_version_readers() -> None:
    assert check_version_modification._cmake_version("project(x\n  VERSION 1.2.3)") == "1.2.3"
    assert check_version_modification._cmake_version("project(x)") is None
    assert check_version_modification._cmake_version("no project here") is None
    # A commented-out project() must not hide the real version.
    commented = "# project(old VERSION 9.9.9)\nproject(x VERSION 1.0.0)"
    assert check_version_modification._cmake_version(commented) == "1.0.0"
    assert check_version_modification._vcpkg_version('{"version-semver": "1.0.0"}') == "1.0.0"
    assert check_version_modification._vcpkg_version("{}") is None


def test_file_size_limits(tmp_path) -> None:
    (tmp_path / "big.hpp").write_text("x\n" * 1001)
    (tmp_path / "near.cpp").write_text("x\n" * 950)
    (tmp_path / "ok.md").write_text("x\n" * 2000)
    (tmp_path / "CMakeLists.txt").write_text("x\n" * 1200)
    (tmp_path / "image.svg").write_text("x\n" * 5000)
    data = tmp_path / "docs" / "case-studies" / "issue-1" / "data"
    data.mkdir(parents=True)
    (data / "raw.md").write_text("x\n" * 9000)
    files = ["big.hpp", "near.cpp", "ok.md", "CMakeLists.txt", "image.svg",
             "docs/case-studies/issue-1/data/raw.md", "deleted.cpp"]
    warnings, violations = check_file_size.check(tmp_path, files)
    assert warnings == [("near.cpp", 950, 1000)]
    assert violations == [("big.hpp", 1001, 1000), ("CMakeLists.txt", 1200, 1000)]


def test_file_size_main_uses_tracked_files(make_repo, capsys) -> None:
    repo = make_repo()
    assert check_file_size.main(["--root", str(repo.path)]) == 0
    repo.write("include/my_package/huge.hpp", "//\n" * 1001)
    assert check_file_size.main(["--root", str(repo.path)]) == 0  # untracked
    repo.commit("huge")
    assert check_file_size.main(["--root", str(repo.path)]) == 1
    assert "huge.hpp has 1001 lines" in capsys.readouterr().out
