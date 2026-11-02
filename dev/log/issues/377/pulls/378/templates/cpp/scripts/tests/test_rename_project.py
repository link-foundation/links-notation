"""Tests for scripts/rename_project.py against a copy of this very template."""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
TEMPLATE_ROOT = SCRIPTS_DIR.parent
PLACEHOLDER_RE = re.compile(r"my_package|MY_PACKAGE|MyPackage|my-package")


def git(cwd: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True,
                          text=True).stdout.strip()


@pytest.fixture()
def template_copy(tmp_path):
    """The tracked files of this repository in a fresh git repository."""
    root = tmp_path / "project"
    for relative in git(TEMPLATE_ROOT, "ls-files").splitlines():
        source = TEMPLATE_ROOT / relative
        if source.is_file():
            (root / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, root / relative)
    # The script under test may not be committed yet while it is developed.
    shutil.copy2(SCRIPTS_DIR / "rename_project.py", root / "scripts" / "rename_project.py")
    git(root, "init", "-q")
    git(root, "add", "-A")
    return root


def rename(root: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "scripts/rename_project.py", *args], cwd=root,
                          capture_output=True, text=True)


def leftovers(root: Path):
    for relative in git(root, "ls-files").splitlines():
        if relative.startswith(("docs/case-studies/", "scripts/tests/", "changelog.d/")) \
                or relative.endswith(("CHANGELOG.md", "rename_project.py")):
            continue
        path = root / relative
        if PLACEHOLDER_RE.search(relative):
            yield relative
        elif path.is_file() and PLACEHOLDER_RE.search(path.read_text(encoding="utf-8", errors="ignore")):
            yield relative


def test_renames_every_spelling_and_path(template_copy):
    result = rename(template_copy, "widget_lib", "--repository", "Acme/widgets")
    assert result.returncode == 0, result.stderr
    git(template_copy, "add", "-A")
    assert list(leftovers(template_copy)) == []
    assert (template_copy / "include/widget_lib/widget_lib.hpp").is_file()
    assert not (template_copy / "include/my_package").exists()
    assert "WIDGET_LIB_BUILD_TESTS" in (template_copy / "CMakeLists.txt").read_text()
    assert "class WidgetLibConan" in (template_copy / "conanfile.py").read_text()
    assert '"name": "widget-lib"' in (template_copy / "vcpkg.json").read_text()
    assert "https://github.com/Acme/widgets" in (template_copy / "CMakeLists.txt").read_text()
    assert r"https://acme\.github\.io/widgets" in (template_copy / ".lycheeignore").read_text()
    for field, expected in (("package_name", "widget_lib"), ("port_name", "widget-lib")):
        printed = subprocess.run([sys.executable, "scripts/get_version.py", "--print", field],
                                 cwd=template_copy, capture_output=True, text=True, check=True)
        assert printed.stdout.strip() == expected


@pytest.mark.skipif(shutil.which("cmake") is None, reason="needs cmake")
def test_renamed_project_builds(template_copy, tmp_path):
    assert rename(template_copy, "widget_lib", "--repository", "acme/widgets").returncode == 0
    build = tmp_path / "build"
    # Tests off: they would download GoogleTest. The example still compiles
    # the renamed header, namespace and target.
    subprocess.run(["cmake", "-S", str(template_copy), "-B", str(build),
                    "-DWIDGET_LIB_BUILD_TESTS=OFF", "-DWIDGET_LIB_BUILD_EXAMPLES=ON"],
                   check=True, capture_output=True)
    subprocess.run(["cmake", "--build", str(build)], check=True, capture_output=True)


def test_dry_run_changes_nothing(template_copy):
    result = rename(template_copy, "widget_lib", "--repository", "acme/widgets", "--dry-run")
    assert result.returncode == 0, result.stderr
    assert "rename include/my_package/ -> widget_lib/" in result.stdout
    # Worktree against the index: nothing edited, deleted or added.
    assert git(template_copy, "diff", "--name-status") == ""
    assert git(template_copy, "ls-files", "--others", "--exclude-standard") == ""


@pytest.mark.parametrize("name", ["WidgetLib", "widget-lib", "1widget", "widget__lib"])
def test_rejects_names_that_are_not_snake_case(template_copy, name):
    result = rename(template_copy, name, "--repository", "acme/widgets")
    assert result.returncode == 2
    assert "snake_case" in result.stderr
