#!/usr/bin/env python3
"""Offline tests for scripts/ci/rerun-unacquired.py (issue #377)."""

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "rerun_unacquired", ROOT / "scripts/ci/rerun-unacquired.py"
)
RERUN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RERUN)

# The job and annotations of run 41477660740 on main, trimmed.
IOS = {"id": 125389842236, "name": "kotlin / ios", "conclusion": "cancelled", "steps": []}
IOS_ANNOTATIONS = [
    "The job was not acquired by Runner of type hosted even after multiple attempts",
    "Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times.",
]
FAILED = {"id": 2, "name": "rust / test", "conclusion": "failure", "steps": [{"name": "test"}]}
CANCELLED_BY_USER = {"id": 3, "name": "swift / test", "conclusion": "cancelled", "steps": []}


class Unacquired(unittest.TestCase):
    def test_the_job_from_the_issue_is_found(self):
        self.assertEqual(
            RERUN.unacquired([IOS, FAILED], {IOS["id"]: IOS_ANNOTATIONS}), ["kotlin / ios"]
        )

    def test_a_failed_test_is_not_a_runner_problem(self):
        self.assertEqual(RERUN.unacquired([FAILED], {FAILED["id"]: IOS_ANNOTATIONS}), [])

    def test_a_cancellation_without_the_annotation_is_left_alone(self):
        self.assertEqual(RERUN.unacquired([CANCELLED_BY_USER], {3: ["The operation was canceled."]}), [])

    def test_a_job_that_ran_steps_is_left_alone(self):
        ran = dict(IOS, steps=[{"name": "Set up job"}])
        self.assertEqual(RERUN.unacquired([ran], {IOS["id"]: IOS_ANNOTATIONS}), [])


class Decide(unittest.TestCase):
    def test_reruns_until_the_attempts_are_used_up(self):
        self.assertEqual(RERUN.decide(["kotlin / ios"], 1), "rerun")
        self.assertEqual(RERUN.decide(["kotlin / ios"], 2), "rerun")
        self.assertEqual(RERUN.decide(["kotlin / ios"], 3), "give-up")

    def test_nothing_to_do_without_unacquired_jobs(self):
        self.assertEqual(RERUN.decide([], 1), "nothing")


if __name__ == "__main__":
    unittest.main()
