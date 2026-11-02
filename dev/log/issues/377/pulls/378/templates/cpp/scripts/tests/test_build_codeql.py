"""The manual CodeQL build must cover all translation units in both layouts."""

import importlib
import sys
from pathlib import Path

import pytest


@pytest.mark.parametrize("multi", [False, True])
def test_manual_build_uses_cpp_root_and_includes_consumers_and_conan_test(make_repo, monkeypatch, multi):
    build = importlib.import_module("build_codeql")
    repo = make_repo(multi=multi)
    root = (repo.path / "cpp" if multi else repo.path).resolve()
    calls = []
    monkeypatch.setattr(build.cp, "run", lambda command, **kwargs: calls.append((command, kwargs)))
    assert build.main([]) == 0
    assert calls[0][0] == ["cmake", "--workflow", "--preset", "release"]
    assert all(call[1]["cwd"] == root and call[1]["capture"] is False for call in calls)
    assert calls[1][0] == [sys.executable, str(Path(build.__file__).with_name("check_consumers.py")),
                           "--cpp-root", str(root)]
    assert calls[2][0] == ["c++", "-std=c++20", "-I", str(root / "include"),
                           str(root / "test_package/test_package.cpp"), "-o",
                           str(root / "build/codeql-test-package")]
    assert calls[3][0] == [str(root / "build/codeql-test-package")]


def test_failed_manual_build_does_not_continue_with_partial_extraction(make_repo, monkeypatch, capsys):
    build = importlib.import_module("build_codeql")
    make_repo()
    calls = []

    def fail(command, **kwargs):
        calls.append(command)
        raise RuntimeError("compiler failed")

    monkeypatch.setattr(build.cp, "run", fail)
    assert build.main([]) == 1
    assert len(calls) == 1
    assert "compiler failed" in capsys.readouterr().err


@pytest.mark.parametrize("multi", [False, True])
def test_prepare_builds_only_external_dependencies_before_tracing(make_repo, monkeypatch, tmp_path, multi):
    build = importlib.import_module("build_codeql")
    repo = make_repo(multi=multi)
    root = (repo.path / "cpp" if multi else repo.path).resolve()
    external = tmp_path / "external"
    calls = []
    monkeypatch.setattr(build.cp, "run", lambda command, **kwargs: calls.append((command, kwargs)))
    assert build.main(["--prepare-dependencies", "--dependency-dir", str(external)]) == 0
    assert calls[0][0] == ["cmake", "--preset", "release",
                           f"-DFETCHCONTENT_BASE_DIR={external}",
                           "-DCMAKE_DISABLE_FIND_PACKAGE_GTest=ON",
                           "-DCMAKE_DISABLE_FIND_PACKAGE_benchmark=ON"]
    assert calls[1][0] == ["cmake", "--build", "--preset", "release", "--target",
                           "gtest_main", "benchmark_main"]
    assert len(calls) == 2
    assert all(call[1]["cwd"] == root for call in calls)


def test_prepare_rejects_dependencies_inside_repository(make_repo, capsys):
    build = importlib.import_module("build_codeql")
    repo = make_repo()
    with pytest.raises(SystemExit) as exc:
        build.main(["--prepare-dependencies", "--dependency-dir", str(repo.path / "build/deps")])
    assert exc.value.code == 2
    assert "outside the repository" in capsys.readouterr().err
