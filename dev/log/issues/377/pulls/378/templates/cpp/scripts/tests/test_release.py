"""Tests for check_release_needed.py, version_and_commit.py and
create_github_release.py."""

from __future__ import annotations

import json
import os
import subprocess
from types import SimpleNamespace

import pytest

import check_release_needed as crn
import cpp_project as cp
import create_github_release as cgr
import version_and_commit as vac


class FakeFetch:
    """Records requests; answers from a {url-substring: body-or-None} map."""

    def __init__(self, answers):
        self.answers = answers
        self.calls = []

    def __call__(self, url, headers):
        self.calls.append((url, headers))
        for fragment, answer in self.answers.items():
            if fragment in url:
                if isinstance(answer, Exception):
                    raise answer
                return answer
        return None


def test_decide() -> None:
    assert crn.decide(True, None) == {"should_release": True, "skip_bump": False}
    assert crn.decide(False, True) == {"should_release": False, "skip_bump": False}
    assert crn.decide(False, False) == {"should_release": True, "skip_bump": True}


def test_release_lookup_urls(git_env, monkeypatch) -> None:
    monkeypatch.setenv("GITHUB_TOKEN", "tok")
    fetch = FakeFetch({"/releases/tags/cpp_v1.0.0": b"{}"})
    assert crn.github_release_exists("o/r", "cpp_v1.0.0", fetch)
    assert fetch.calls[0][1]["Authorization"] == "Bearer tok"
    fetch = FakeFetch({"platform.example/index.json": json.dumps({"versions": ["1.0.0-rc", "1.0.0"]}).encode()})
    assert crn.nuget_version_exists("Platform.Example", "1.0.0", fetch)
    assert not crn.nuget_version_exists("Platform.Example", "2.0.0", fetch)
    assert not crn.nuget_version_exists("Missing", "1.0.0", FakeFetch({}))


def test_fragments_always_release(make_repo, monkeypatch, github_output) -> None:
    make_repo()
    monkeypatch.setenv("HAS_FRAGMENTS", "true")
    fetch = FakeFetch({})
    assert crn.main([], fetch) == 0
    assert github_output()["should_release"] == "true"
    assert github_output()["skip_bump"] == "false"
    assert fetch.calls == []


def test_complete_release_is_not_repeated(make_repo, monkeypatch, github_output) -> None:
    make_repo(multi=True)
    monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")
    fetch = FakeFetch({"/releases/tags/cpp_v0.1.0": b"{}"})
    assert crn.main([], fetch) == 0
    assert github_output()["should_release"] == "false"


def test_missing_nuget_package_resumes_without_bump(make_repo, monkeypatch, github_output) -> None:
    make_repo()
    monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")
    monkeypatch.setenv("NUGET_PUBLISH", "true")
    monkeypatch.setenv("NUGET_PACKAGE_ID", "Platform.Example")
    fetch = FakeFetch({"/releases/tags/v0.1.0": b"{}", "index.json": b'{"versions": ["0.0.9"]}'})
    assert crn.main([], fetch) == 0
    outputs = github_output()
    assert (outputs["should_release"], outputs["skip_bump"]) == ("true", "true")
    assert outputs["nuget_published"] == "false"


def test_release_check_errors(make_repo, monkeypatch) -> None:
    make_repo()
    assert crn.main([], FakeFetch({})) == 2  # no GITHUB_REPOSITORY
    monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")
    assert crn.main([], FakeFetch({"releases": OSError("offline")})) == 1
    monkeypatch.setenv("NUGET_PUBLISH", "true")
    assert crn.main([], FakeFetch({})) == 2  # no NUGET_PACKAGE_ID


# --- version_and_commit ------------------------------------------------------


@pytest.mark.parametrize(
    ("output", "kind"),
    [
        ("remote: error: GH013: Repository rule violations found\n ! [remote rejected]", vac.PushFailure.REPOSITORY_RULES),
        ("remote: error: GH006: Protected branch update failed", vac.PushFailure.REPOSITORY_RULES),
        (" ! [rejected] HEAD -> main (fetch first)", vac.PushFailure.LOST_RACE),
        ("Updates were rejected because the tip of your current branch is behind", vac.PushFailure.LOST_RACE),
        ("fatal: could not read Username", vac.PushFailure.OTHER),
    ],
)
def test_classify_push_failure(output: str, kind) -> None:
    assert vac.classify_push_failure(output) is kind


class FakeRunner:
    def __init__(self, push_results, rebase_code=0):
        self.push_results = list(push_results)
        self.rebase_code = rebase_code
        self.commands = []

    def __call__(self, args, cwd=None, check=True):
        self.commands.append(args[1])
        if args[1] == "push":
            code, stderr = self.push_results.pop(0)
            return SimpleNamespace(returncode=code, stdout="", stderr=stderr)
        if args[1] == "pull":
            return SimpleNamespace(returncode=self.rebase_code, stdout="", stderr="conflict")
        return SimpleNamespace(returncode=0, stdout="", stderr="")


def test_push_retries_only_lost_races() -> None:
    runner = FakeRunner([(1, "! [rejected] (fetch first)"), (0, "")])
    vac.push_with_retry("origin", "main", ".", runner=runner)
    assert runner.commands == ["push", "pull", "push"]


def test_push_rule_violation_is_not_retried() -> None:
    runner = FakeRunner([(1, "GH013: Repository rule violations found")])
    with pytest.raises(vac.ReleaseError, match="release_mode=changelog-pr"):
        vac.push_with_retry("origin", "main", ".", runner=runner)
    assert runner.commands == ["push"]


def test_push_gives_up_after_max_attempts_and_on_rebase_conflict() -> None:
    runner = FakeRunner([(1, "non-fast-forward")] * 2)
    with pytest.raises(vac.ReleaseError, match="after 2 attempts"):
        vac.push_with_retry("origin", "main", ".", max_attempts=2, runner=runner)
    runner = FakeRunner([(1, "non-fast-forward")], rebase_code=1)
    with pytest.raises(vac.ReleaseError, match="pull --rebase failed"):
        vac.push_with_retry("origin", "main", ".", runner=runner)
    assert runner.commands[-1] == "rebase"


def _remote_tags(repo) -> list:
    return sorted(cp.list_tags(cwd=repo.path, remote="origin"))


def test_release_bumps_collects_commits_pushes_and_tags(make_repo) -> None:
    repo = make_repo(multi=True)
    repo.fragment("20260101_a", "minor", "### Added\n- Feature")
    repo.commit("feature")
    repo.git("push", "-q", "origin", "main")
    result = vac.release(repo.layout, "minor", date="2026-04-04")
    assert result == {"version_committed": True, "already_released": False,
                      "new_version": "0.2.0", "tag": "cpp_v0.2.0"}
    assert repo.git("log", "-1", "--format=%s", "origin/main") == "chore: release cpp_v0.2.0"
    assert _remote_tags(repo) == ["cpp_v0.2.0"]
    assert repo.git("tag", "-l", "--format=%(contents:subject)", "cpp_v0.2.0") == "[C++] 0.2.0"
    changelog = repo.layout.changelog_file.read_text()
    assert "## [0.2.0] - 2026-04-04" in changelog and "- Feature" in changelog
    assert repo.git("status", "--porcelain") == ""
    tagged = repo.git("rev-list", "-n1", "cpp_v0.2.0")
    assert tagged == repo.git("rev-parse", "origin/main")


def test_release_without_fragments_still_documents_the_version(make_repo) -> None:
    repo = make_repo()
    result = vac.release(repo.layout, "patch", date="2026-04-04")
    assert result["tag"] == "v0.1.1"
    assert "Maintenance release." in repo.layout.changelog_file.read_text()


def test_release_rebases_onto_a_concurrent_merge_first(make_repo, tmp_path) -> None:
    repo = make_repo()
    other = tmp_path / "other"
    subprocess.run(["git", "clone", "-q", str(repo.remote), str(other)], check=True)
    (other / "src.txt").write_text("concurrent\n")
    subprocess.run(["git", "add", "-A"], cwd=other, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "concurrent"], cwd=other, check=True)
    subprocess.run(["git", "push", "-q", "origin", "main"], cwd=other, check=True)
    result = vac.release(repo.layout, "patch", date="2026-04-04")
    assert result["version_committed"]
    assert repo.git("log", "--format=%s", "-2", "origin/main").splitlines() == [
        "chore: release v0.1.1", "concurrent",
    ]


def test_release_requires_clean_tree_and_skips_existing_tags(make_repo) -> None:
    repo = make_repo()
    repo.write("dirty.txt", "x")
    with pytest.raises(vac.ReleaseError, match="clean"):
        vac.release(repo.layout, "patch")
    (repo.path / "dirty.txt").unlink()
    repo.git("tag", "v0.5.0")
    repo.git("push", "-q", "origin", "v0.5.0")
    assert vac.release(repo.layout, "patch", date="d")["new_version"] == "0.5.1"


def test_release_main_reports_failures(make_repo, capsys) -> None:
    repo = make_repo()
    repo.write("dirty.txt", "x")
    assert vac.main(["--bump-type", "patch"]) == 1
    assert "Release failed" in capsys.readouterr().err


# --- create_github_release ---------------------------------------------------

CHANGELOG = """# Changelog

## [0.2.0] - 2026-04-04

### Added
- Feature

## [0.1.0] - 2026-01-01

- First
"""


def test_extract_changelog_entry() -> None:
    assert cgr.extract_changelog_entry(CHANGELOG, "0.2.0") == "### Added\n- Feature"
    assert cgr.extract_changelog_entry(CHANGELOG, "0.1.0") == "- First"
    assert cgr.extract_changelog_entry(CHANGELOG, "0.3.0") is None
    assert cgr.extract_changelog_entry("## 1.0.0\n\nPlain", "1.0.0") == "Plain"


def test_cap_release_notes_keeps_utf8_valid() -> None:
    assert cgr.cap_release_notes("short", "url") == "short"
    capped = cgr.cap_release_notes("ü" * 1000, "https://x/CHANGELOG.md", max_bytes=500)
    assert len(capped.encode("utf-8")) <= 500
    assert capped.endswith("See the full changelog: https://x/CHANGELOG.md")
    tiny = cgr.cap_release_notes("x" * 100, "u", max_bytes=10)
    assert len(tiny.encode("utf-8")) <= 10


def test_build_notes_for_multi_language(make_repo) -> None:
    repo = make_repo(multi=True)
    repo.layout.changelog_file.write_text(CHANGELOG)
    notes = cgr.build_notes(repo.layout, "o/r", "0.2.0")
    assert notes.startswith("### Added\n- Feature")
    assert "GIT_TAG cpp_v0.2.0" in notes
    assert "my-package-vcpkg-port-0.2.0.tar.gz" in notes
    assert "https://github.com/o/r/blob/cpp_v0.2.0/docs/distribution.md" in notes
    assert cgr.build_notes(repo.layout, "o/r", "9.9.9").startswith("Release 9.9.9.")


def test_dry_run_prints_plan(make_repo, github_output, capsys, tmp_path) -> None:
    make_repo()
    assets = tmp_path / "dist"
    assets.mkdir()
    (assets / "a.tar.gz").write_text("a")
    assert cgr.main(["--repository", "o/r", "--assets-dir", str(assets), "--dry-run"]) == 0
    assert "Release my_package 0.1.0 (v0.1.0) in o/r with 1 asset(s)" in capsys.readouterr().out
    assert github_output() == {"tag": "v0.1.0", "title": "my_package 0.1.0"}
    assert cgr.list_assets(None) == []
    assert cgr.main([]) == 2


def test_print_untrusted_stops_workflow_commands(monkeypatch, capsys) -> None:
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    cgr.print_untrusted("::set-output name=x::y")
    lines = capsys.readouterr().out.splitlines()
    assert lines[0].startswith("::stop-commands::")
    token = lines[0].split("::")[2]
    assert lines[1] == "::set-output name=x::y"
    assert lines[2] == f"::{token}::"


@pytest.fixture()
def fake_gh(tmp_path, monkeypatch):
    """A ``gh`` stub on PATH that logs its arguments; ``release view`` exits
    with the code in $FAKE_GH_VIEW (1 = release missing)."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log = tmp_path / "gh.log"
    script = bin_dir / "gh"
    script.write_text(
        "#!/bin/sh\n"
        f'echo "$*" >> "{log}"\n'
        'if [ "$1 $2" = "release view" ]; then exit "${FAKE_GH_VIEW:-1}"; fi\n'
        "exit 0\n"
    )
    script.chmod(0o755)
    monkeypatch.setenv("PATH", f"{bin_dir}:{os.environ['PATH']}")
    monkeypatch.setenv("RUNNER_TEMP", str(tmp_path))
    return lambda: log.read_text().splitlines()


def test_creates_release_at_verified_tag(make_repo, fake_gh, tmp_path) -> None:
    make_repo(multi=True)
    assets = tmp_path / "dist"
    assets.mkdir()
    (assets / "SHA256SUMS").write_text("x")
    assert cgr.main(["--repository", "o/r", "--assets-dir", str(assets)]) == 0
    view, create = fake_gh()
    assert view == "release view cpp_v0.1.0 --repo o/r"
    assert create.startswith("release create cpp_v0.1.0 --repo o/r --title [C++] 0.1.0 --notes-file ")
    assert "--verify-tag" in create and create.endswith("SHA256SUMS")
    assert list(tmp_path.glob("release-notes-*")) == []


def test_rerun_refreshes_existing_release(make_repo, fake_gh, monkeypatch, tmp_path) -> None:
    make_repo()
    monkeypatch.setenv("FAKE_GH_VIEW", "0")
    assets = tmp_path / "dist"
    assets.mkdir()
    (assets / "a.zip").write_text("x")
    assert cgr.main(["--repository", "o/r", "--assets-dir", str(assets), "--target", "abc"]) == 0
    calls = fake_gh()
    assert calls[1].startswith("release edit v0.1.0 --repo o/r --title my_package 0.1.0")
    assert calls[2].startswith("release upload v0.1.0 --repo o/r --clobber ")
