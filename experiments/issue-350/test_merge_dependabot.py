#!/usr/bin/env python3
"""Offline tests for scripts/ci/merge-dependabot.py (issue #350)."""

import contextlib
import importlib.util
import io
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
                [pull(1, behind=True, checks=broken), pull(2, behind=True, checks=stale)]
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
    def run_main(self, pulls, pat="", usable=True, argv=(), failures=None):
        github = mock.Mock()
        github.run.side_effect = failures
        github.repository = "owner/repo"
        github.rules.return_value = (REQUIRED, True)
        github.pulls.return_value = pulls
        github.checks.side_effect = lambda sha: dict(GREEN)
        github.behind.side_effect = lambda base, head: head == pulls[-1].head
        github.rebase_requested.return_value = False
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

    def test_merges_with_the_head_pinned_and_asks_dependabot_to_rebase(self):
        code, github, output = self.run_main([pull(1), pull(2)])
        self.assertEqual(code, 0)
        github.run.assert_any_call(
            "pr", "merge", "1", "--repo", "owner/repo",
            "--merge", "--match-head-commit", pull(1).head, token=None,
        )  # fmt: skip
        github.run.assert_any_call(
            "pr", "comment", "2", "--repo", "owner/repo", "--body", "@dependabot rebase"
        )
        self.assertIn("#1 merge", output)

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
        github.run.assert_called_once_with(
            "pr", "comment", "1", "--repo", "owner/repo", "--body", "@dependabot rebase"
        )

    def test_dry_run_changes_nothing(self):
        _, github, output = self.run_main([pull(1), pull(2)], argv=["--dry-run"])
        github.run.assert_not_called()
        self.assertIn("#2 rebase", output)

    def test_a_failed_action_fails_the_run_after_trying_the_rest(self):
        failures = [RuntimeError("gh pr merge: head changed"), ""]
        code, github, output = self.run_main([pull(1), pull(2)], failures=failures)
        self.assertEqual(code, 1)
        self.assertEqual(github.run.call_count, 2)
        self.assertIn("::error::#1 merge failed: gh pr merge: head changed", output)
        self.assertIn("#2 rebase", output)

if __name__ == "__main__":
    unittest.main()
