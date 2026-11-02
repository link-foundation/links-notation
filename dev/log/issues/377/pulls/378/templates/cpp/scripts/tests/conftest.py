"""Shared fixtures for the tests of the Python release scripts.

The scripts import each other as top-level modules (``import cpp_project``),
exactly as they do when a workflow runs ``python3 scripts/<name>.py``, so the
scripts directory is put on ``sys.path`` here.

``cpp_repo`` builds a throw-away git repository with a minimal C++ project in
either layout -- ``single`` (CMakeLists.txt at the root, tags ``v1.2.3``) or
``multi`` (the project under ``cpp/``, tags ``cpp_v1.2.3``) -- plus a bare
``origin`` remote, so the scripts run against real git without the network.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
TEMPLATE_ROOT = SCRIPTS_DIR.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import cpp_project as cp  # noqa: E402

CMAKE_TEMPLATE = """cmake_minimum_required(VERSION 3.21)
# project(commented_out VERSION 9.9.9) must be ignored
project(
    my_package
    VERSION {version}
    DESCRIPTION "Example library"
    HOMEPAGE_URL "https://example.com/my_package"
    LANGUAGES CXX
)
add_library(my_package INTERFACE)
"""

HEADER = "#pragma once\nnamespace my_package { inline int answer() { return 42; } }\n"


def git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


@dataclass
class Repo:
    path: Path
    remote: Path
    layout: "cp.CppLayout"

    @property
    def prefix(self) -> str:
        return self.layout.root_prefix

    def write(self, relative: str, text: str) -> Path:
        path = self.path / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def fragment(self, name: str, bump: str = "patch", body: str = "### Fixed\n- Something") -> Path:
        return self.write(f"{self.prefix}changelog.d/{name}.md", f"---\nbump: {bump}\n---\n\n{body}\n")

    def commit(self, message: str = "change") -> str:
        git(self.path, "add", "-A")
        git(self.path, "commit", "-q", "-m", message)
        return git(self.path, "rev-parse", "HEAD")

    def git(self, *args: str) -> str:
        return git(self.path, *args)


def _files(version: str) -> Dict[str, str]:
    return {
        "CMakeLists.txt": CMAKE_TEMPLATE.format(version=version),
        "vcpkg.json": json.dumps(
            {"name": "my-package", "version": version, "description": "Example library",
             "license": "Unlicense"},
            indent=2,
        ) + "\n",
        "include/my_package/my_package.hpp": HEADER,
        "changelog.d/README.md": "# Fragments\n",
        "README.md": "# my_package\n",
        "LICENSE": "Public domain\n",
    }


@pytest.fixture()
def git_env(monkeypatch, tmp_path_factory):
    """Isolate git from the user's configuration and CI variables."""
    home = tmp_path_factory.mktemp("home")
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("GIT_CONFIG_NOSYSTEM", "1")
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", str(home / ".gitconfig"))
    monkeypatch.setenv("GIT_AUTHOR_NAME", "Test")
    monkeypatch.setenv("GIT_AUTHOR_EMAIL", "test@example.com")
    monkeypatch.setenv("GIT_COMMITTER_NAME", "Test")
    monkeypatch.setenv("GIT_COMMITTER_EMAIL", "test@example.com")
    for name in list(os.environ):
        if name.startswith(("GITHUB_", "CPP_", "NUGET_", "RELEASE_", "HAS_")) or name == "SOURCE_DATE_EPOCH":
            monkeypatch.delenv(name, raising=False)
    (home / ".gitconfig").write_text("[init]\n\tdefaultBranch = main\n", encoding="utf-8")


@pytest.fixture()
def make_repo(tmp_path, git_env, monkeypatch):
    """Factory: ``make_repo(multi=False, version="0.1.0")`` -> Repo (cwd set to it)."""

    def factory(multi: bool = False, version: str = "0.1.0", name: Optional[str] = None) -> Repo:
        path = tmp_path / (name or ("multi" if multi else "single"))
        remote = tmp_path / f"{path.name}-origin.git"
        path.mkdir()
        prefix = "cpp/" if multi else ""
        for relative, text in _files(version).items():
            target = path / (relative if relative in ("LICENSE",) and multi else prefix + relative)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text, encoding="utf-8")
        # The real port and NuGet templates, where a C++ project keeps them.
        shutil.copytree(TEMPLATE_ROOT / "packaging", path / prefix / "packaging")
        if multi:
            (path / "rust").mkdir()
            (path / "rust" / "Cargo.toml").write_text("[package]\nname = \"x\"\n", encoding="utf-8")
        git(path, "init", "-q", "-b", "main")
        git(path, "add", "-A")
        git(path, "commit", "-q", "-m", "initial")
        git(tmp_path, "init", "-q", "--bare", "-b", "main", str(remote))
        git(path, "remote", "add", "origin", str(remote))
        git(path, "push", "-q", "origin", "main")
        git(path, "fetch", "-q", "origin")
        monkeypatch.chdir(path)
        return Repo(path=path, remote=remote, layout=cp.detect_layout(path))

    return factory


@pytest.fixture()
def github_output(tmp_path, git_env, monkeypatch):
    """Point GITHUB_OUTPUT at a file; return a reader of the parsed outputs."""
    output = tmp_path / "github_output"
    output.write_text("", encoding="utf-8")
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))

    def read() -> Dict[str, str]:
        values: Dict[str, str] = {}
        lines = iter(output.read_text(encoding="utf-8").splitlines())
        for line in lines:
            if "<<" in line and "=" not in line.split("<<", 1)[0]:
                key, delimiter = line.split("<<", 1)
                body = []
                for inner in lines:
                    if inner == delimiter:
                        break
                    body.append(inner)
                values[key] = "\n".join(body)
            elif "=" in line:
                key, value = line.split("=", 1)
                values[key] = value
        return values

    return read
