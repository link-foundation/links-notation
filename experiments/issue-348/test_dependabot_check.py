"""Offline regressions for the Dependabot coverage CI gate (issue #348)."""

import contextlib
import importlib.util
import io
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

SPEC = importlib.util.spec_from_file_location(
    "dependabot",
    Path(__file__).resolve().parents[2] / "scripts/ci/check-dependabot.py",
)
CHECK = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = CHECK
SPEC.loader.exec_module(CHECK)

CONFIG = """
version: 2
updates:
  - package-ecosystem: "npm"
    directories:
      - "/js"  # comment
      - "/docs/website/"
  - package-ecosystem: 'gomod'
    directories: ["/go", "/benchmarks/go"]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: "weekly"
"""


class DependabotCheckTests(unittest.TestCase):
    def test_list_inline_and_single_directories_are_read(self):
        self.assertEqual(
            CHECK.configured(CONFIG),
            {
                "npm": {"/js", "/docs/website"},
                "gomod": {"/go", "/benchmarks/go"},
                "github-actions": {"/"},
            },
        )

    def test_listed_manifests_pass(self):
        files = {
            "js/package.json",
            "docs/website/package.json",
            "go/go.mod",
            "benchmarks/go/go.mod",
            ".github/workflows/js.yml",
            "README.md",
        }
        self.assertEqual(CHECK.problems(files, CONFIG), [])

    def test_unlisted_manifest_is_reported(self):
        missing = CHECK.problems({"go/go.mod", "examples/go/go.mod"}, CONFIG)
        self.assertEqual(
            missing, ["examples/go/go.mod: no gomod entry for /examples/go"]
        )

    def test_second_lockfile_needs_its_own_ecosystem(self):
        missing = CHECK.problems({"js/package.json", "js/bun.lock"}, CONFIG)
        self.assertEqual(missing, ["js/bun.lock: no bun entry for /js"])

    def test_snapshots_under_dev_log_are_ignored(self):
        files = {"dev/log/issues/1/template/package.json"}
        self.assertEqual(CHECK.problems(files, CONFIG), [])

    def test_solution_directory_covers_its_projects(self):
        config = '  - package-ecosystem: "nuget"\n    directory: "/csharp"\n'
        files = {
            "csharp/Demo.sln",
            "csharp/Demo/Demo.csproj",
            "csharp/Demo.Tests/T.csproj",
        }
        self.assertEqual(CHECK.problems(files, config), [])
        self.assertEqual(
            CHECK.problems({"other/Demo/Demo.csproj"}, config),
            ["other/Demo/Demo.csproj: no nuget entry for /other/Demo"],
        )

    def test_excluded_directory_must_stay_unlisted(self):
        files = {"experiments/debug_test.csproj"}
        self.assertEqual(CHECK.problems(files, ""), [])
        config = '  - package-ecosystem: "nuget"\n    directory: "/experiments"\n'
        self.assertEqual(len(CHECK.problems(files, config)), 1)

    def test_manifest_names_map_to_ecosystems(self):
        for path, expected in (
            ("python/pyproject.toml", ["pip"]),
            ("scripts/ci/requirements-dev.txt", ["pip"]),
            ("csharp/global.json", ["dotnet-sdk"]),
            (".gitpod.Dockerfile", ["docker"]),
            ("java/pom.xml", ["maven"]),
            ("php/composer.json", ["composer"]),
            (".pre-commit-config.yaml", ["pre-commit"]),
            ("rust/Cargo.lock", []),
            ("docs/requirements.md", []),
        ):
            with self.subTest(path=path):
                self.assertEqual(CHECK.ecosystems(path), expected)

    def test_labels_in_both_list_styles_are_read(self):
        text = (
            'updates:\n  - package-ecosystem: "npm"\n'
            '    labels: ["dependencies", "javascript"]\n'
            "  - package-ecosystem: maven\n    labels:\n      - java\n"
            "      - 'help wanted'  # quoted\n    schedule:\n      interval: daily\n"
        )
        self.assertEqual(
            CHECK.labels(text), {"dependencies", "javascript", "java", "help wanted"}
        )

    def test_a_label_the_repository_lacks_is_reported(self):
        # Issue #350: Dependabot only comments "The following labels could
        # not be found: `csharp`" on each pull request.
        text = '    labels: ["dependencies", "csharp"]\n'
        self.assertEqual(
            CHECK.missing_labels(text, ["dependencies"]),
            [
                "label 'csharp' does not exist; create it with "
                "`gh label create csharp` or remove it"
            ],
        )
        self.assertEqual(CHECK.missing_labels(text, ["dependencies", "csharp"]), [])

    def test_repository_config_covers_every_manifest(self):
        # Offline: the labels are checked against the live repository by the
        # workflow step that runs the script itself.
        environment = {k: v for k, v in os.environ.items() if k != "GITHUB_REPOSITORY"}
        with (
            mock.patch.dict(os.environ, environment, clear=True),
            contextlib.redirect_stdout(io.StringIO()),
        ):
            self.assertEqual(CHECK.main(), 0)


if __name__ == "__main__":
    unittest.main()
