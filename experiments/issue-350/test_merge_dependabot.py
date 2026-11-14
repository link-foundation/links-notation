#!/usr/bin/env python3
"""Offline tests for scripts/ci/merge-dependabot.py (issues #350 and #410)."""

import contextlib
import importlib.util
import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "merge_dependabot", ROOT / "scripts/ci/merge-dependabot.py"
)
MERGE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MERGE)
# Pull requests #396 and #407, and the files they change as they were on main
# at 972d864, when #408 had already moved main past both (issue #410).
FIXTURES = ROOT / "experiments/issue-410/fixtures"

REQUIRED = {"JavaScript", "Rust"}
GREEN = {"JavaScript": "success", "Rust": "success", "latest-stable": "success"}
PATCH = """chore(deps): Bump the npm-minor-and-patch group

---
updated-dependencies:
- dependency-name: peggy
  dependency-version: 5.1.1
  update-type: version-update:semver-patch
  dependency-group: npm-minor-and-patch
...
"""
# The pre-commit update from pull request #362 has no update-type line.
PRE_COMMIT = """chore(deps): Bump https://github.com/igorshubovych/markdownlint-cli

Bumps [https://github.com/igorshubovych/markdownlint-cli](https://github.com/igorshubovych/markdownlint-cli) from v0.49.1 to 0.50.0.

---
updated-dependencies:
- dependency-name: https://github.com/igorshubovych/markdownlint-cli
  dependency-version: 0.50.0
  dependency-type: direct:production
...
"""


def pull(number, **changes):
    fields = dict(
        number=number,
        head=f"{number:040x}",
        branch=f"dependabot/npm_and_yarn/js/group-{number}",
        author=MERGE.DEPENDABOT,
        draft=False,
        commit_authors=[MERGE.DEPENDABOT],
        message=PATCH,
        checks=dict(GREEN),
    )
    fields.update(changes)
    return MERGE.Pull(**fields)


def actions(pulls, strict=True):
    return [(a, p.number, r) for a, p, r in MERGE.plan(pulls, REQUIRED, strict)]


class Eligibility(unittest.TestCase):
    def test_minor_and_patch_updates_by_dependabot_are_eligible(self):
        self.assertIsNone(MERGE.ineligible(pull(1)))
        minor = PATCH.replace("semver-patch", "semver-minor")
        self.assertIsNone(MERGE.ineligible(pull(1, message=minor)))

    def test_a_major_update_anywhere_in_a_group_needs_review(self):
        message = PATCH + "  update-type: version-update:semver-major\n"
        self.assertEqual(
            MERGE.ineligible(pull(1, message=message)),
            "needs review: version-update:semver-major",
        )

    def test_updates_without_update_type_use_the_version_change(self):
        self.assertEqual(
            MERGE.update_types(PRE_COMMIT), ["version-update:semver-minor"]
        )
        self.assertIsNone(MERGE.ineligible(pull(1, message=PRE_COMMIT)))
        major = PRE_COMMIT.replace("to 0.50.0.", "to 1.0.0.")
        self.assertIn("semver-major", MERGE.ineligible(pull(1, message=major)))
        odd = PRE_COMMIT.replace("to 0.50.0.", "to latest.")
        self.assertIn("unknown", MERGE.ineligible(pull(1, message=odd)))
        self.assertEqual(
            MERGE.ineligible(pull(1, message="Bump things")),
            "no version change in the commit message",
        )

    def test_pull_requests_not_wholly_by_dependabot_are_left_alone(self):
        self.assertEqual(
            MERGE.ineligible(pull(1, author="someone")), "not opened by Dependabot"
        )
        self.assertEqual(
            MERGE.ineligible(pull(1, branch="feature")), "not opened by Dependabot"
        )
        self.assertEqual(
            MERGE.ineligible(pull(1, commit_authors=[MERGE.DEPENDABOT, "someone"])),
            "has commits by someone",
        )
        self.assertEqual(MERGE.ineligible(pull(1, draft=True)), "draft")


class Checks(unittest.TestCase):
    def test_missing_running_and_failed_checks(self):
        self.assertEqual(MERGE.check_state(GREEN, REQUIRED)[0], "passed")
        self.assertEqual(
            MERGE.check_state({"JavaScript": "success"}, REQUIRED),
            ("pending", "waiting for: Rust"),
        )
        running = dict(GREEN, **{"latest-stable": None})
        self.assertEqual(MERGE.check_state(running, REQUIRED)[0], "pending")
        failed = dict(GREEN, **{"latest-stable": "failure"})
        self.assertEqual(
            MERGE.check_state(failed, REQUIRED), ("failed", "failed: latest-stable")
        )
        skipped = dict(GREEN, **{"latest-stable": "skipped"})
        self.assertEqual(MERGE.check_state(skipped, REQUIRED)[0], "passed")


class Plan(unittest.TestCase):
    def test_strict_rules_merge_one_and_update_one(self):
        self.assertEqual(
            actions([pull(3), pull(1), pull(2)]),
            [
                ("merge", 1, "all checks passed"),
                ("rebase", 2, "behind the base branch"),
                ("skip", 3, "behind; updated after the next merge"),
            ],
        )

    def test_without_strict_rules_every_green_pull_request_merges(self):
        self.assertEqual(
            [a for a, _, _ in actions([pull(1), pull(2, behind=True)], strict=False)],
            ["merge", "merge"],
        )

    def test_a_behind_pull_request_is_updated_unless_a_required_check_failed(self):
        stale = dict(GREEN, **{"latest-stable": "failure"})
        broken = dict(GREEN, Rust="failure")
        self.assertEqual(
            actions(
                [
                    pull(1, behind=True, checks=broken),
                    pull(2, behind=True, checks=stale),
                ]
            ),
            [
                ("rebase", 2, "behind the base branch"),
                ("skip", 1, "behind; failed: Rust"),
            ],
        )

    def test_a_requested_update_is_not_requested_again(self):
        self.assertEqual(
            actions([pull(1, behind=True, rebase_requested=True)]),
            [("skip", 1, "behind; update already requested")],
        )

    def test_the_merge_comes_before_the_update_it_outdates(self):
        # Updating #1 first would be wasted: merging #2 leaves it behind again.
        self.assertEqual(
            [(a, n) for a, n, _ in actions([pull(1, behind=True), pull(2)])],
            [("merge", 2), ("rebase", 1)],
        )

    def test_failing_and_pending_pull_requests_are_skipped(self):
        failing = dict(GREEN, **{"latest-stable": "failure"})
        self.assertEqual(
            actions([pull(1, checks=failing), pull(2, checks={"Rust": "success"})]),
            [
                ("skip", 1, "failed: latest-stable"),
                ("skip", 2, "waiting for: JavaScript"),
            ],
        )


class Main(unittest.TestCase):
    def run_main(
        self,
        pulls,
        pat="",
        usable=True,
        argv=(),
        failures=None,
        request=None,
        superseded=(),
    ):
        superseded = dict(superseded)
        github = mock.Mock()
        github.run.side_effect = failures
        github.repository = "owner/repo"
        github.rules.return_value = (REQUIRED, True)
        github.pulls.return_value = pulls
        github.checks.side_effect = lambda sha: dict(GREEN)
        github.behind.side_effect = lambda base, head: head == pulls[-1].head
        github.update_request.return_value = request
        github.supersession.side_effect = lambda p, base: superseded.get(
            p.number, (False, "no version change to compare")
        )
        github.files.return_value = ["js/package.json", "js/bun.lock"]
        environment = {
            "GITHUB_REPOSITORY": "owner/repo",
            "GITHUB_TOKEN": "actions-token",
            "DEPENDABOT_AUTO_MERGE_TOKEN": pat,
        }
        with (
            mock.patch.object(MERGE, "GitHub", return_value=github),
            mock.patch.object(MERGE, "usable", return_value=usable),
            mock.patch.dict(os.environ, environment),
            mock.patch.object(sys, "argv", ["merge-dependabot.py", *argv]),
            contextlib.redirect_stdout(io.StringIO()) as output,
        ):
            code = MERGE.main()
        return code, github, output.getvalue()

    def test_merges_with_the_head_pinned_and_names_the_behind_one(self):
        code, github, output = self.run_main([pull(1), pull(2)])
        self.assertEqual(code, 0)
        github.run.assert_any_call(
            "pr", "merge", "1", "--repo", "owner/repo",
            "--merge", "--match-head-commit", pull(1).head, token=None,
        )  # fmt: skip
        self.assertIn("#1 merge", output)
        self.assertIn("#2 skip: " + MERGE.BEHIND_NO_TOKEN, output)
        self.assertIn("::warning::#2 is behind main", output)

    def test_github_token_never_asks_dependabot_to_rebase(self):
        # Issue #410: Dependabot rejects the comment from github-actions[bot]
        # ("only users with push access"), and it was posted again after
        # every merge: five times on #396.
        for request in (None, "rejected"):
            _, github, output = self.run_main(
                [pull(1, behind=True), pull(2), pull(3)], request=request
            )
            commands = [c.args[:2] for c in github.run.call_args_list]
            self.assertNotIn(("pr", "comment"), commands)
            self.assertNotIn("@dependabot", str(github.run.call_args_list))
            self.assertRegex(output, r"::warning::(#\d+, )*#3 (is|are) behind main")
            self.assertIn("DEPENDABOT_AUTO_MERGE_TOKEN", output)
        self.assertIn("rejected before on #3", output)

    def test_a_maintainers_pending_request_is_waited_for(self):
        _, github, output = self.run_main([pull(1)], request="requested")
        self.assertIn("#1 skip: behind; update already requested", output)
        self.assertNotIn("::warning::", output)
        github.run.assert_not_called()

    def test_a_superseded_pull_request_is_closed_with_the_versions(self):
        reason = "the base branch already has `x@v2` for `x@v1` in a.yml"
        code, github, output = self.run_main(
            [pull(1), pull(2)], superseded={2: (True, reason)}
        )
        self.assertEqual(code, 0)
        self.assertIn("#2 close: " + reason, output)
        close = next(
            c for c in github.run.call_args_list if c.args[:2] == ("pr", "close")
        )
        self.assertEqual(close.args[2:5], ("2", "--repo", "owner/repo"))
        self.assertIn(reason, close.args[6])
        self.assertIn("`main` already has", close.args[6])
        # Its checks were not even read.
        self.assertNotIn(
            pull(2).head, [c.args[0] for c in github.checks.call_args_list]
        )

    def test_a_failed_comparison_keeps_the_pull_request_open(self):
        github_error = RuntimeError("gh api: HTTP 502")
        _, github, output = self.run_main([pull(1)])
        github.supersession.side_effect = github_error
        with (
            mock.patch.object(MERGE, "GitHub", return_value=github),
            mock.patch.object(MERGE, "usable", return_value=True),
            mock.patch.dict(
                os.environ,
                {"GITHUB_REPOSITORY": "owner/repo", "GITHUB_TOKEN": "t"},
            ),
            mock.patch.object(sys, "argv", ["merge-dependabot.py"]),
            contextlib.redirect_stdout(io.StringIO()) as printed,
        ):
            MERGE.main()
        self.assertIn("::warning::#1: could not compare with main", printed.getvalue())
        self.assertNotIn("close", printed.getvalue())

    def test_a_working_token_updates_the_branch_itself(self):
        _, github, _ = self.run_main([pull(1), pull(2)], pat="pat")
        github.run.assert_any_call(
            "pr", "merge", "1", "--repo", "owner/repo",
            "--merge", "--match-head-commit", pull(1).head, token="pat",
        )  # fmt: skip
        github.run.assert_any_call(
            "pr", "update-branch", "2", "--repo", "owner/repo", "--rebase", token="pat"
        )

    def test_an_unusable_token_is_reported_and_not_used(self):
        _, github, output = self.run_main([pull(1)], pat="s3cr3t", usable=False)
        self.assertIn("::warning::DEPENDABOT_AUTO_MERGE_TOKEN cannot push", output)
        self.assertNotIn("s3cr3t", output)
        self.assertNotIn("s3cr3t", str(github.run.call_args_list))
        github.run.assert_not_called()
        self.assertIn("::warning::#1 is behind main", output)

    def test_dry_run_changes_nothing(self):
        _, github, output = self.run_main(
            [pull(1), pull(2), pull(3)],
            argv=["--dry-run"],
            pat="pat",
            superseded={3: (True, "superseded")},
        )
        github.run.assert_not_called()
        self.assertIn("#2 rebase", output)
        self.assertIn("#3 close", output)

    def test_a_failed_action_fails_the_run_after_trying_the_rest(self):
        failures = [RuntimeError("gh pr merge: head changed"), ""]
        code, github, output = self.run_main(
            [pull(1), pull(2)], failures=failures, pat="pat"
        )
        self.assertEqual(code, 1)
        self.assertEqual(github.run.call_count, 2)
        self.assertIn("::error::#1 merge failed: gh pr merge: head changed", output)
        self.assertIn("#2 rebase", output)

    def test_a_github_token_merge_dispatches_the_push_workflows(self):
        _, github, output = self.run_main([pull(1), pull(2)])
        github.run.assert_any_call(
            "workflow", "run", "js.yml", "--repo", "owner/repo", "--ref", "main"
        )
        dispatched = [
            c.args[2] for c in github.run.call_args_list if c.args[0] == "workflow"
        ]
        self.assertEqual(dispatched, ["js.yml", "dependencies.yml", "bom-check.yml"])
        self.assertIn("::notice::GITHUB_TOKEN merges start no push workflows", output)

    def test_a_token_merge_or_no_merge_dispatches_nothing(self):
        # pull(1) is behind (see run_main), so it is not merged.
        _, github, _ = self.run_main([pull(1)])
        self.assertNotIn("workflow", [c.args[0] for c in github.run.call_args_list])
        _, github, _ = self.run_main([pull(2), pull(1)], pat="pat")
        self.assertNotIn("workflow", [c.args[0] for c in github.run.call_args_list])
        _, github, _ = self.run_main([pull(1)], argv=["--dry-run"])
        github.run.assert_not_called()

    def test_a_failed_dispatch_fails_the_run_and_names_the_command(self):
        # merge #1, then dispatch: js.yml is refused.
        failures = ["", RuntimeError("gh workflow run: HTTP 403"), "", ""]
        code, _, output = self.run_main([pull(1), pull(2)], failures=failures)
        self.assertEqual(code, 1)
        self.assertIn("`gh workflow run js.yml --ref main`", output)


def push_paths(text):
    """The `on.push.paths` of a workflow, or None when push has no filter.

    Returns False when the workflow has no push trigger. A plain reader,
    since the runner's Python has no YAML module.
    """
    lines = text.splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("on:"))
    section, paths, found = None, None, False
    for line in lines[start + 1 :]:
        if line and not line.startswith(" "):
            break
        stripped = line.strip()
        if line.startswith("  ") and not line.startswith("   ") and stripped:
            section = stripped.rstrip(":")
            found = found or section == "push"
        elif section == "push" and stripped == "paths:":
            paths = []
        elif section == "push" and paths is not None and stripped.startswith("- "):
            paths.append(stripped[2:].strip("'\""))
    return paths if found else False


def fixture_changes(number):
    return json.loads((FIXTURES / f"pr-{number}-files.json").read_text())


def base_contents(changes):
    """The files `changes` touches, as main had them at 972d864."""
    base = FIXTURES / "base-972d864"
    return {c["filename"]: (base / f"{c['filename']}.txt").read_text() for c in changes}


def change(path, patch):
    return {"filename": path, "status": "modified", "patch": patch}


class Supersession(unittest.TestCase):
    """Issue #410: close pull requests main has already moved past."""

    def test_the_actions_group_396_is_superseded(self):
        changes = fixture_changes(396)
        done, why = MERGE.superseded(changes, base_contents(changes))
        self.assertTrue(done, why)
        self.assertIn("github/codeql-action/init@", why)
        self.assertIn("trufflesecurity/trufflehog@", why)

    def test_the_major_dotnet_sdk_update_407_is_superseded(self):
        changes = fixture_changes(407)
        done, why = MERGE.superseded(changes, base_contents(changes))
        self.assertTrue(done, why)
        self.assertIn('`"version": "11.0.100"', why)
        self.assertIn("csharp/global.json", why)

    def test_an_older_base_is_not_superseded(self):
        changes = fixture_changes(407)
        contents = {"csharp/global.json": '{\n  "sdk": {\n    "version": "10.0.402",\n'}
        done, why = MERGE.superseded(changes, contents)
        self.assertFalse(done)
        self.assertIn("10.0.402", why)

    def test_one_older_pin_of_the_same_action_keeps_it_open(self):
        patch = "@@ -1 +1 @@\n-    - uses: a/b@v1.0.0\n+    - uses: a/b@v1.1.0"
        contents = {"x.yml": "  - uses: a/b@v1.2.0\n  - uses: a/b@v1.0.0\n"}
        done, why = MERGE.superseded([change("x.yml", patch)], contents)
        self.assertFalse(done)
        self.assertIn("a/b@v1.0.0", why)

    def test_versions_compare_numerically_and_padded(self):
        self.assertTrue(MERGE.at_least([(10, 0)], [(9, 9, 9)]))
        self.assertTrue(MERGE.at_least([(6,)], [(6, 0, 0)]))
        self.assertFalse(MERGE.at_least([(6,)], [(6, 0, 1)]))
        # Digests are not versions: a pinned SHA is compared as text.
        self.assertEqual(MERGE.shape("uses: a/b@" + "0a" * 20 + " # v1.2")[1], [(1, 2)])

    def test_what_cannot_be_compared_stays_open(self):
        patch = "@@ -1 +1 @@\n-x: 1.0\n+x: 2.0"
        cases = {
            "missing line": ([change("a.yml", patch)], {"a.yml": "y: 3.0\n"}),
            "missing file": ([change("a.yml", patch)], {"a.yml": None}),
            "no patch": ([{"filename": "a.bin", "status": "modified"}], {}),
            "lockfile only": ([change("js/package-lock.json", patch)], {}),
            "no version": (
                [change("a.yml", "@@ -1 +1 @@\n-x: a\n+x: b")],
                {"a.yml": "x: b\n"},
            ),
        }
        for name, (changes, contents) in cases.items():
            with self.subTest(name):
                self.assertFalse(MERGE.superseded(changes, contents)[0])

    def test_a_superseded_major_update_is_closed_but_a_foreign_one_is_not(self):
        major = pull(407, message=(FIXTURES / "pr-407.message").read_text())
        major.superseded = "the base branch already has 11.0.100"
        foreign = pull(5, commit_authors=[MERGE.DEPENDABOT, "someone"])
        foreign.superseded = "the base branch already has it"
        result = actions([major, foreign])
        self.assertIn(("close", 407, major.superseded), result)
        self.assertNotIn("close", [a for a, n, r in result if n == 5])
        self.assertTrue(MERGE.ineligible(major))


class UpdateRequest(unittest.TestCase):
    """Issue #410: a rejected `@dependabot rebase` is not a pending update."""

    SINCE = "2026-11-13T22:47:03Z"  # #396's head commit

    def comment(self, login, at, body):
        return {"user": {"login": login}, "created_at": at, "body": body}

    def test_the_requests_github_token_posted_on_396_were_rejected(self):
        comments = json.loads((FIXTURES / "pr-396-comments.json").read_text())
        self.assertEqual(MERGE.update_request(comments, self.SINCE), "rejected")
        # Before #410, the newest one alone made the script wait forever.
        self.assertTrue(
            any(
                c["user"]["login"] == MERGE.ACTIONS_BOT and c["created_at"] > self.SINCE
                for c in comments
            )
        )

    def test_a_maintainers_request_waits_until_dependabot_rejects_it(self):
        ask = self.comment("maintainer", "2026-11-14T01:00:00Z", "@dependabot rebase")
        no = self.comment(
            MERGE.DEPENDABOT,
            "2026-11-14T01:00:05Z",
            "Sorry, only users with push access can use that command.",
        )
        self.assertEqual(MERGE.update_request([ask], self.SINCE), "requested")
        self.assertEqual(MERGE.update_request([no, ask], self.SINCE), "rejected")

    def test_requests_older_than_the_head_commit_are_answered(self):
        old = self.comment("maintainer", "2026-11-13T00:00:00Z", "@dependabot rebase")
        self.assertIsNone(MERGE.update_request([old], self.SINCE))

    def test_a_rejected_request_is_not_waited_for(self):
        first, behind = pull(2), pull(3, rebase_rejected=True)
        self.assertEqual(
            MERGE.plan([first, behind], REQUIRED, True, update=False)[1],
            ("skip", behind, MERGE.BEHIND_NO_TOKEN),
        )


class Dispatch(unittest.TestCase):
    def test_the_table_lists_every_push_workflow_with_its_paths(self):
        found = {}
        for path in sorted((ROOT / ".github/workflows").glob("*.yml")):
            paths = push_paths(path.read_text())
            if paths is not False:
                found[path.name] = paths
                self.assertIn("workflow_dispatch:", path.read_text(), path.name)
        self.assertEqual(found, MERGE.PUSH_WORKFLOWS)

    def test_paths_filters_match_like_github(self):
        self.assertTrue(MERGE.matches("docs/website/package.json", "docs/**"))
        self.assertTrue(MERGE.matches("js/README.md", "**.md"))
        self.assertTrue(MERGE.matches("README.md", "**.md"))
        self.assertFalse(MERGE.matches("docs/a/b.json", "docs/*"))
        self.assertFalse(MERGE.matches("lychee.toml.bak", "lychee.toml"))

    def test_only_the_workflows_whose_paths_changed_are_dispatched(self):
        always = ["js.yml", "dependencies.yml", "bom-check.yml"]
        self.assertEqual(MERGE.dispatches(["rust/Cargo.lock"]), always)
        self.assertEqual(
            MERGE.dispatches([".github/workflows/js.yml", "docs/website/package.json"]),
            always + ["workflows.yml", "pages.yml"],
        )


if __name__ == "__main__":
    unittest.main()
