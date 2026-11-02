"""Tests for scripts/publish-release.sh with cmake, dotnet, conan and gh stubbed on PATH."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1]

STUB = """#!/bin/sh
echo "{name} $*" >> "{log}"
if [ "{name} $1" = "cmake --install" ]; then
  mkdir -p "$5/include" && echo installed > "$5/include/header.hpp"
fi
if [ "{name} $1 $2" = "gh release view" ]; then exit 1; fi
if [ -n "$FAIL_STUB" ] && [ "$FAIL_STUB" = "{name}" ]; then exit 3; fi
exit 0
"""


@pytest.fixture()
def publisher(make_repo, tmp_path):
    """Factory: ``publisher(multi=False)`` -> (repo, run); ``run(**env)`` runs the
    script and returns (completed process, list of logged stub calls)."""
    bin_dir, log = tmp_path / "bin", tmp_path / "calls.log"
    bin_dir.mkdir()
    for name in ("cmake", "dotnet", "conan", "gh"):
        stub = bin_dir / name
        stub.write_text(STUB.format(name=name, log=log))
        stub.chmod(0o755)

    def factory(multi: bool = False):
        repo = make_repo(multi=multi)
        scripts = repo.path / "scripts"
        scripts.mkdir()
        for script in [*SCRIPTS_DIR.glob("*.py"), SCRIPTS_DIR / "publish-release.sh"]:
            shutil.copy2(script, scripts / script.name)
        (repo.path / ".git" / "info" / "exclude").write_text("scripts/\ndist/\n")

        def run(**env: str):
            log.write_text("")
            full_env = {**os.environ, "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
                        "GITHUB_REPOSITORY": "owner/repo", "GH_TOKEN": "gh-token",
                        "RUNNER_TEMP": str(tmp_path), **env}
            result = subprocess.run(["bash", "scripts/publish-release.sh"], cwd=repo.path,
                                    env=full_env, capture_output=True, text=True)
            return result, log.read_text().splitlines()

        return repo, run

    return factory


def test_publishes_every_channel_with_the_github_release_last(publisher):
    repo, run = publisher()
    result, calls = run(NUGET_PUBLISH="true", NUGET_API_KEY="nuget-secret",
                        CONAN_REMOTE_URL="https://conan.example/api", CONAN_LOGIN_USERNAME="bot",
                        CONAN_PASSWORD="conan-secret")
    assert result.returncode == 0, result.stderr
    tools = [call.split()[0] for call in calls]
    # cmake (install tree), then NuGet, then Conan, then the GitHub release.
    assert tools == ["cmake", "cmake", "dotnet", "conan", "conan", "conan", "conan", "conan", "gh", "gh"]
    push = calls[2]
    assert push.startswith("dotnet nuget push dist/my_package.0.1.0.nupkg")
    assert "--api-key nuget-secret --skip-duplicate" in push
    assert calls[3:8] == [
        "conan profile detect --force",
        "conan create . -s compiler.cppstd=20 --build=missing",
        "conan remote add release https://conan.example/api --force",
        "conan remote auth release --force --strict",
        "conan upload my_package/0.1.0 --remote release --confirm",
    ]
    head = repo.git("rev-parse", "HEAD")
    assert calls[-1].startswith(f"gh release create v0.1.0 --repo owner/repo --title my_package 0.1.0")
    assert f"--target={head}" in calls[-1] and "dist/my-package-0.1.0.tar.gz" in calls[-1]
    # Secrets never reach the log; the NuGet key is masked in the echo.
    assert "nuget-secret" not in result.stdout and "conan-secret" not in result.stdout
    assert "--api-key *** --skip-duplicate" in result.stdout


def test_publishes_the_tagged_sources_when_main_moved_on(publisher):
    repo, run = publisher()
    tagged = repo.git("rev-parse", "HEAD")
    repo.git("tag", "v0.1.0")
    repo.write("include/my_package/extra.hpp", "#pragma once\n")
    repo.commit("after the release")
    result, calls = run()
    assert result.returncode == 0, result.stderr
    assert "Checking out v0.1.0" in result.stdout
    assert repo.git("rev-parse", "HEAD") == tagged
    assert any(f"--target={tagged}" in call for call in calls if call.startswith("gh release create"))


def test_disabled_channels_are_skipped(publisher):
    _, run = publisher()
    result, calls = run(NUGET_PUBLISH="true", NUGET_PUBLISHED="true")
    assert result.returncode == 0, result.stderr
    assert "NuGet: 0.1.0 is already published" in result.stdout
    assert "Conan: upload disabled" in result.stdout
    assert not any(call.startswith(("dotnet", "conan")) for call in calls)
    assert any(call.startswith("gh release create") for call in calls)


def test_dry_run_builds_the_assets_but_publishes_nothing(publisher):
    repo, run = publisher(multi=True)
    result, calls = run(RELEASE_DRY_RUN="true", NUGET_PUBLISH="true",
                        CONAN_REMOTE_URL="https://conan.example/api")
    assert result.returncode == 0, result.stderr
    assert [call.split()[0] for call in calls] == ["cmake", "cmake"]
    assert "+ conan create cpp -s compiler.cppstd=20 --build=missing" in result.stdout
    assert "+ dotnet nuget push dist/my_package.0.1.0.nupkg" in result.stdout
    assert sorted(path.name for path in (repo.path / "dist").iterdir()) == [
        "SHA256SUMS",
        "my-package-0.1.0-install.tar.gz",
        "my-package-0.1.0.tar.gz",
        "my-package-0.1.0.zip",
        "my-package-vcpkg-port-0.1.0.tar.gz",
        "my_package.0.1.0.nupkg",
    ]


def test_missing_nuget_key_fails_before_the_github_release(publisher):
    _, run = publisher()
    result, calls = run(NUGET_PUBLISH="true")
    assert result.returncode == 1
    assert "NUGET_API_KEY is empty" in result.stdout
    assert not any(call.startswith("gh") for call in calls)


def test_failed_upload_leaves_the_release_incomplete(publisher):
    _, run = publisher()
    result, calls = run(CONAN_REMOTE_URL="https://conan.example/api", FAIL_STUB="conan")
    assert result.returncode != 0
    assert not any(call.startswith("gh") for call in calls)


def test_uploads_the_conan_reference_of_the_recipe(publisher):
    # linksplatform: CMake project Platform.Numbers, Conan package platform.numbers.
    repo, run = publisher()
    repo.write("conanfile.py", 'class Recipe(ConanFile):\n    name = "platform.numbers"\n')
    repo.commit("conan recipe")
    result, calls = run(CONAN_REMOTE_URL="https://conan.example/api")
    assert result.returncode == 0, result.stderr
    assert "conan upload platform.numbers/0.1.0 --remote release --confirm" in calls
