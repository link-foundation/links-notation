"""Tests for scripts/lint_cpp.py with stub linters on PATH."""

from __future__ import annotations

import json
import os
import stat
from pathlib import Path

import pytest

import lint_cpp


@pytest.fixture()
def stub_tools(tmp_path, monkeypatch):
    """Install clang-format/clang-tidy/cppcheck stubs; FAIL_<TOOL>=1 makes one fail."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log = tmp_path / "calls.log"
    for name in ("clang-format", "clang-tidy", "cppcheck"):
        variable = "FAIL_" + name.replace("-", "_").upper()
        script = bin_dir / name
        script.write_text(
            "#!/usr/bin/env bash\n"
            f'printf "%s\\n" "{name} $*" >> "{log}"\n'
            f'[ "${{{variable}:-}}" = 1 ] && exit 1\n'
            "exit 0\n",
            encoding="utf-8",
        )
        script.chmod(script.stat().st_mode | stat.S_IEXEC)
    monkeypatch.setenv("PATH", f"{bin_dir}:{os.environ['PATH']}")
    for variable in ("CLANG_FORMAT", "CLANG_TIDY", "CPPCHECK"):
        monkeypatch.delenv(variable, raising=False)

    def calls() -> list[str]:
        return log.read_text(encoding="utf-8").splitlines() if log.exists() else []

    return calls


def write_database(repo, build: str = "build/lint", extra: tuple[str, ...] = ()) -> Path:
    root = repo.path / repo.prefix
    build_dir = root / build
    build_dir.mkdir(parents=True, exist_ok=True)
    entries = [
        {"directory": str(build_dir), "file": str(root / "tests" / "t.cpp")},
        {"directory": str(build_dir), "file": "../../examples/e.cpp"},
        {"directory": str(build_dir), "file": str(build_dir / "_deps" / "gtest" / "gtest-all.cc")},
        {"directory": str(build_dir), "file": "/usr/src/outside.cpp"},
        *({"directory": str(build_dir), "file": name} for name in extra),
    ]
    (build_dir / "compile_commands.json").write_text(json.dumps(entries), encoding="utf-8")
    return build_dir


def add_sources(repo) -> None:
    repo.write(f"{repo.prefix}tests/t.cpp", "int main() {}\n")
    repo.write(f"{repo.prefix}examples/e.cpp", "int main() {}\n")
    repo.write(f"{repo.prefix}notes.txt", "not C++\n")
    repo.write(f"{repo.prefix}build/lint/generated.cpp", "// ignored build output\n")
    repo.write(".gitignore", "build/\n" if not repo.layout.multi_language else "cpp/build/\n")


@pytest.mark.parametrize("multi", [False, True])
def test_tracked_sources_skip_ignored_and_non_cpp_files(make_repo, multi: bool) -> None:
    repo = make_repo(multi=multi)
    add_sources(repo)
    names = [p.relative_to(repo.layout.root).as_posix() for p in lint_cpp.tracked_sources(repo.layout)]
    assert names == ["examples/e.cpp", "include/my_package/my_package.hpp", "tests/t.cpp"]


def test_project_units_keep_only_project_sources(make_repo) -> None:
    repo = make_repo()
    build_dir = write_database(repo)
    units = [p.relative_to(repo.path).as_posix() for p in lint_cpp.project_units(repo.layout, build_dir)]
    assert units == ["examples/e.cpp", "tests/t.cpp"]


def test_project_units_require_a_compile_database(make_repo, tmp_path) -> None:
    repo = make_repo()
    with pytest.raises(FileNotFoundError, match="cmake --preset lint"):
        lint_cpp.project_units(repo.layout, tmp_path / "missing")


def test_all_checks_run_and_pass(make_repo, stub_tools, capsys) -> None:
    repo = make_repo()
    add_sources(repo)
    write_database(repo)
    assert lint_cpp.main([]) == 0
    tools = [call.split()[0] for call in stub_tools()]
    assert tools == ["clang-format", "clang-tidy", "cppcheck"]
    format_call, tidy_call, cppcheck_call = stub_tools()
    assert "--dry-run --Werror" in format_call and "my_package.hpp" in format_call
    assert tidy_call.startswith(f"clang-tidy -p {repo.path}/build/lint --quiet")
    assert "my_package.hpp" not in cppcheck_call and "--inline-suppr" in cppcheck_call
    assert "C++ lint passed: format, tidy, cppcheck" in capsys.readouterr().out


def test_a_failing_check_does_not_hide_later_ones(make_repo, stub_tools, monkeypatch, capsys) -> None:
    repo = make_repo()
    add_sources(repo)
    write_database(repo)
    monkeypatch.setenv("FAIL_CLANG_FORMAT", "1")
    assert lint_cpp.main([]) == 1
    assert [call.split()[0] for call in stub_tools()] == ["clang-format", "clang-tidy", "cppcheck"]
    assert "failed checks: format" in capsys.readouterr().err


def test_missing_compile_database_fails_only_tidy(make_repo, stub_tools, capsys) -> None:
    repo = make_repo()
    add_sources(repo)
    assert lint_cpp.main(["tidy", "cppcheck"]) == 1
    assert [call.split()[0] for call in stub_tools()] == ["cppcheck"]
    assert "failed checks: tidy" in capsys.readouterr().err


def test_missing_tool_is_reported(make_repo, monkeypatch, capsys) -> None:
    make_repo()
    monkeypatch.setenv("CLANG_FORMAT", "definitely-not-clang-format")
    assert lint_cpp.main(["format"]) == 1
    assert "definitely-not-clang-format is not installed" in capsys.readouterr().err


def test_unknown_check_is_a_usage_error(make_repo) -> None:
    make_repo()
    with pytest.raises(SystemExit) as exc:
        lint_cpp.main(["format", "iwyu"])
    assert exc.value.code == 2
