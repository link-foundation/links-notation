"""Tests for scripts/check_consumers.py with the build commands recorded, not run."""

from __future__ import annotations

from pathlib import Path

import pytest

import check_consumers


@pytest.fixture()
def recorded(monkeypatch):
    """Replace check_consumers.run; FAILING holds substrings that make a command fail."""
    calls: list[list[str]] = []
    failing: list[str] = []

    def fake_run(command, cwd=None, env=None):
        line = " ".join(str(part) for part in command)
        calls.append([str(part) for part in command])
        if env is not None:
            calls[-1].append("PKG_CONFIG_PATH=" + env["PKG_CONFIG_PATH"])
        return 1 if any(text in line for text in failing) else 0

    monkeypatch.setattr(check_consumers, "run", fake_run)
    monkeypatch.setattr(check_consumers.shutil, "which", lambda name: "/usr/bin/" + name)
    return calls, failing


def joined(calls) -> list[str]:
    return [" ".join(call) for call in calls]


def test_cache_arguments_point_each_channel_at_the_checkout():
    root, prefix = Path("/src/lib"), Path("/build/prefix")
    assert check_consumers.cache_arguments("add_subdirectory", "my_package", root, prefix) == [
        "-DMY_PACKAGE_DIR=/src/lib"
    ]
    assert check_consumers.cache_arguments("fetch_content", "my_package", root, prefix) == [
        "-DFETCHCONTENT_SOURCE_DIR_MY_PACKAGE=/src/lib"
    ]
    # CPM keys the override on the package name exactly as CPMAddPackage spells it.
    assert check_consumers.cache_arguments("cpm", "my_package", root, prefix) == [
        "-DCPM_my_package_SOURCE=/src/lib"
    ]
    assert check_consumers.cache_arguments("find_package", "my_package", root, prefix) == [
        "-DCMAKE_PREFIX_PATH=/build/prefix"
    ]


def test_every_consumer_directory_is_checked():
    consumers = Path(__file__).resolve().parents[2] / "examples" / "consumers"
    directories = {path.name for path in consumers.iterdir() if path.is_dir()}
    assert directories == set(check_consumers.CONSUMERS)


def test_source_consumers_skip_the_install(make_repo, recorded):
    repo = make_repo()
    calls, _ = recorded
    assert check_consumers.main(["add_subdirectory", "cpm"]) == 0
    lines = joined(calls)
    assert not any("--preset install" in line for line in lines)
    assert any("-DMY_PACKAGE_DIR=" + repo.path.resolve().as_posix() in line for line in lines)
    assert any("-DCPM_my_package_SOURCE=" in line for line in lines)
    assert sum(line.startswith("ctest ") for line in lines) == 2


def test_installed_consumers_install_once_into_the_build_dir(make_repo, recorded):
    repo = make_repo()
    calls, _ = recorded
    assert check_consumers.main(["find_package", "pkg_config"]) == 0
    lines = joined(calls)
    prefix = repo.path.resolve() / "build" / "consumers" / "prefix"
    assert lines[:3] == [
        "cmake --preset install",
        "cmake --build --preset install",
        f"cmake --install {repo.path.resolve() / 'build' / 'install'} --prefix {prefix} --config Release",
    ]
    assert any(f"-DCMAKE_PREFIX_PATH={prefix.as_posix()}" in line for line in lines)
    pkg = [line for line in lines if line.startswith("bash ")]
    assert len(pkg) == 1 and str(prefix / "share" / "pkgconfig") in pkg[0]


def test_multi_language_layout_uses_the_cpp_directory(make_repo, recorded):
    repo = make_repo(multi=True)
    calls, _ = recorded
    assert check_consumers.main(["fetch_content"]) == 0
    root = (repo.path / "cpp").resolve()
    assert any(f"-DFETCHCONTENT_SOURCE_DIR_MY_PACKAGE={root.as_posix()}" in line for line in joined(calls))
    assert any(str(root / "build" / "consumers" / "fetch_content") in line for line in joined(calls))


def test_a_failing_consumer_does_not_hide_the_others(make_repo, recorded, capsys):
    make_repo()
    calls, failing = recorded
    failing.append("consumers/fetch_content")
    assert check_consumers.main(["add_subdirectory", "fetch_content", "cpm"]) == 1
    lines = joined(calls)
    assert any("consumers/cpm" in line for line in lines)
    assert "::error title=Consumer examples::the fetch_content consumer failed" in capsys.readouterr().err


def test_install_failure_stops_before_the_consumers(make_repo, recorded):
    make_repo()
    calls, failing = recorded
    failing.append("--build --preset install")
    assert check_consumers.main(["find_package"]) == 1
    assert not any(line.startswith("ctest") for line in joined(calls))


def test_pkg_config_is_skipped_without_pkg_config(make_repo, recorded, monkeypatch, capsys):
    make_repo()
    calls, _ = recorded
    monkeypatch.setattr(check_consumers.shutil, "which", lambda name: None)
    assert check_consumers.main(["pkg_config"]) == 0
    assert not any(line.startswith("bash ") for line in joined(calls))
    assert "Skipping the pkg_config consumer" in capsys.readouterr().out


def test_unknown_consumer_is_rejected(make_repo, recorded):
    make_repo()
    with pytest.raises(SystemExit) as raised:
        check_consumers.main(["conan"])
    assert raised.value.code == 2
