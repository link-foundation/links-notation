"""Tests for collect_changelog.py, create_changelog_fragment.py and
check_changelog_fragment.py."""

from __future__ import annotations

import pytest

import check_changelog_fragment
import collect_changelog
import cpp_project as cp
import create_changelog_fragment

EXISTING = collect_changelog.DEFAULT_HEADER + "\n## [0.1.0] - 2026-01-01\n\n### Added\n- First\n"


def test_insert_entry_goes_above_the_latest_release() -> None:
    entry = collect_changelog.render_entry("0.2.0", "2026-02-02", ["### Fixed\n- B"], "Summary")
    assert entry == "## [0.2.0] - 2026-02-02\n\nSummary\n\n### Fixed\n- B\n"
    result = collect_changelog.insert_entry(EXISTING, entry)
    assert result.index("## [0.2.0]") < result.index("## [0.1.0]")
    assert result.startswith("# Changelog")


def test_insert_entry_into_empty_changelog_adds_header() -> None:
    result = collect_changelog.insert_entry("", "## [1.0.0] - d\n")
    assert result.startswith(collect_changelog.DEFAULT_HEADER.rstrip("\n"))
    assert result.endswith("## [1.0.0] - d\n")


def test_collect_moves_fragments_into_changelog(make_repo, github_output) -> None:
    repo = make_repo(multi=True)
    repo.fragment("20260101_a", "minor", "### Added\n- Feature A")
    repo.fragment("20260102_b", "patch", "### Fixed\n- Bug B")
    assert collect_changelog.main(["--version", "cpp_v0.2.0", "--date", "2026-03-03"]) == 0
    changelog = repo.layout.changelog_file.read_text()
    assert "## [0.2.0] - 2026-03-03" in changelog
    assert changelog.index("Feature A") < changelog.index("Bug B")
    assert cp.list_fragment_paths(repo.layout.changelog_dir) == []
    assert (repo.layout.changelog_dir / "README.md").is_file()
    assert github_output() == {"collected": "true", "fragment_count": "2"}


def test_collect_refuses_duplicate_version(make_repo) -> None:
    repo = make_repo()
    repo.layout.changelog_file.write_text(EXISTING)
    repo.fragment("x")
    assert collect_changelog.main(["--version", "0.1.0"]) == 1
    assert repo.layout.changelog_file.read_text() == EXISTING
    assert len(cp.list_fragment_paths(repo.layout.changelog_dir)) == 1


def test_collect_without_fragments_is_a_no_op(make_repo) -> None:
    repo = make_repo()
    assert collect_changelog.collect(repo.layout, "0.2.0") == 0
    assert not repo.layout.changelog_file.exists()


@pytest.mark.parametrize(
    ("text", "slug"),
    [("Add the Foo() API!", "add_the_foo_api"), ("", "change"), ("x" * 80, "x" * 48)],
)
def test_slugify(text: str, slug: str) -> None:
    assert create_changelog_fragment.slugify(text) == slug


def test_render_fragment_round_trips(tmp_path) -> None:
    text = create_changelog_fragment.render_fragment("minor", "First\n- Second\n\n", "Added")
    assert text == "---\nbump: minor\n---\n\n### Added\n- First\n- Second\n"
    path = tmp_path / "f.md"
    path.write_text(text)
    fragment = cp.parse_fragment(path)
    assert fragment.bump == "minor"
    assert "- Second" in fragment.body
    assert "Manual patch release" in create_changelog_fragment.render_fragment("patch", "", "Fixed")


def test_create_fragment_cli(make_repo, github_output) -> None:
    repo = make_repo(multi=True)
    assert create_changelog_fragment.main(["--bump-type", "major", "--description", "Drop C++17"]) == 0
    created = github_output()["fragment"]
    assert created.startswith("cpp/changelog.d/") and created.endswith("_drop_c_17.md")
    fragment = cp.parse_fragment(repo.path / created)
    assert fragment.bump == "major"
    assert fragment.body.startswith("### Changed")


def test_evaluate_counts_only_code_and_fragments_of_this_root() -> None:
    files = [
        "cpp/include/x.hpp", "cpp/changelog.d/1_fix.md", "cpp/changelog.d/README.md",
        "rust/src/lib.rs", "changelog.d/1_other.md", "README.md",
    ]
    code, fragments = check_changelog_fragment.evaluate(files, "cpp/")
    assert code == ["cpp/include/x.hpp"]
    assert fragments == ["cpp/changelog.d/1_fix.md"]


def _branch_with(repo, files: dict) -> None:
    repo.git("checkout", "-q", "-b", "feature")
    for path, text in files.items():
        repo.write(path, text)
    repo.commit("feature")


def test_check_requires_fragment_for_code_changes(make_repo, monkeypatch, capsys) -> None:
    repo = make_repo()
    _branch_with(repo, {"include/my_package/extra.hpp": "#pragma once\n"})
    assert check_changelog_fragment.main() == 1
    assert "Missing changelog fragment" in capsys.readouterr().err


def test_check_ignores_leftover_fragments_on_main(make_repo) -> None:
    repo = make_repo()
    repo.fragment("left_over")
    repo.commit("unreleased fragment already on main")
    repo.git("push", "-q", "origin", "main")
    _branch_with(repo, {"include/my_package/extra.hpp": "#pragma once\n"})
    assert check_changelog_fragment.main() == 1


def test_check_passes_with_fragment_and_for_docs_only(make_repo) -> None:
    repo = make_repo()
    _branch_with(repo, {"include/my_package/extra.hpp": "#pragma once\n"})
    repo.fragment("20260101_extra", "minor", "### Added\n- extra.hpp")
    repo.commit("fragment")
    assert check_changelog_fragment.main() == 0

    other = make_repo(name="docs-only")
    _branch_with(other, {"docs/guide.md": "# Guide\n"})
    assert check_changelog_fragment.main() == 0


def test_check_rejects_invalid_or_empty_fragments(make_repo, capsys) -> None:
    repo = make_repo()
    _branch_with(repo, {"include/my_package/extra.hpp": "#pragma once\n"})
    repo.write("changelog.d/empty.md", "---\nbump: minor\n---\n")
    repo.commit("empty fragment")
    assert check_changelog_fragment.main() == 1
    assert "Empty changelog fragment" in capsys.readouterr().err
    repo.write("changelog.d/empty.md", "---\nbump: giant\n---\n\n- x\n")
    repo.commit("invalid fragment")
    assert check_changelog_fragment.main() == 1
    assert "Invalid changelog fragment" in capsys.readouterr().err


def test_check_skips_automated_branches(make_repo, monkeypatch) -> None:
    repo = make_repo()
    _branch_with(repo, {"include/my_package/extra.hpp": "#pragma once\n"})
    monkeypatch.setenv("GITHUB_HEAD_REF", "changelog-manual-release-123")
    assert check_changelog_fragment.main() == 0
