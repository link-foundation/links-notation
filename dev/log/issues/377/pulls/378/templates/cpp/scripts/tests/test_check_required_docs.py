"""Tests for scripts/check-required-docs.sh (issue #72).

Shared with link-foundation/python-ai-driven-development-pipeline-template;
"issue #N" references point to that repository.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "check-required-docs.sh"


def run_script(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["bash", str(SCRIPT_PATH), *args],
        cwd=cwd,
        capture_output=True,
        text=True,
    )


def test_real_repository_passes() -> None:
    """The template itself must satisfy its own documentation contract."""
    result = run_script(cwd=ROOT)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "All required documentation is present" in result.stdout


def test_list_prints_the_requirement_table() -> None:
    """--list prints `path<TAB>section` rows built from the same table."""
    result = run_script("--list", cwd=ROOT)
    assert result.returncode == 0
    assert "README.md\tFeatures" in result.stdout
    assert "CONTRIBUTING.md\tChangelog Management" in result.stdout
    assert "CHANGELOG.md\n" in result.stdout


def test_missing_section_fails_with_annotation(tmp_path: Path) -> None:
    (tmp_path / "README.md").write_text("## Features\n")
    result = run_script(cwd=tmp_path)
    assert result.returncode == 1
    assert "missing required section '## Quick Start'" in result.stdout
    assert "::error title=Documentation validation failed::" in result.stdout


def test_missing_file_fails_without_requiring_sections(tmp_path: Path) -> None:
    result = run_script(cwd=tmp_path)
    assert result.returncode == 1
    assert "README.md: file is missing" in result.stdout
    assert "CHANGELOG.md: file is missing" in result.stdout


def test_unknown_argument_is_a_usage_error(tmp_path: Path) -> None:
    result = run_script("--wat", cwd=tmp_path)
    assert result.returncode == 2
    assert "usage:" in result.stderr


def write_complete_docs(root: Path, changelog: str) -> None:
    (root / "README.md").write_text(
        "".join(f"## {s}\n" for s in ("Features", "Quick Start", "Configuration", "Contributing", "License"))
    )
    (root / "CONTRIBUTING.md").write_text(
        "".join(f"## {s}\n" for s in ("Development Setup", "Pull Request Process", "Changelog Management"))
    )
    path = root / changelog
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("# Changelog\n")


def test_multi_language_layout_requires_cpp_changelog(tmp_path: Path) -> None:
    """With the C++ project under cpp/, the changelog lives next to it."""
    (tmp_path / "cpp").mkdir()
    (tmp_path / "cpp" / "CMakeLists.txt").write_text("project(x VERSION 1.0.0)\n")
    write_complete_docs(tmp_path, "CHANGELOG.md")
    result = run_script(cwd=tmp_path)
    assert result.returncode == 1
    assert "cpp/CHANGELOG.md: file is missing" in result.stdout

    write_complete_docs(tmp_path, "cpp/CHANGELOG.md")
    assert run_script(cwd=tmp_path).returncode == 0


def test_single_language_layout_uses_root_changelog(tmp_path: Path) -> None:
    (tmp_path / "CMakeLists.txt").write_text("project(x VERSION 1.0.0)\n")
    write_complete_docs(tmp_path, "CHANGELOG.md")
    assert run_script(cwd=tmp_path).returncode == 0
