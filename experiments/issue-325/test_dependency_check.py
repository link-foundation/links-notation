"""Offline regressions for the latest-dependency CI gate."""

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "dependencies",
    Path(__file__).resolve().parents[2] / "scripts/ci/check-dependencies.py",
)
CHECK = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = CHECK
SPEC.loader.exec_module(CHECK)


class DependencyCheckTests(unittest.TestCase):
    def test_unpinned_manifest_requirements_are_rejected(self):
        for folder, filename, source in (
            ("python", "requirements.txt", "demo\n"),
            (
                "csharp",
                "Demo.csproj",
                '<Project><PackageReference Include="Demo" /></Project>',
            ),
        ):
            with (
                self.subTest(filename=filename),
                tempfile.TemporaryDirectory() as temporary,
            ):
                root = Path(temporary)
                (root / folder).mkdir()
                (root / folder / filename).write_text(source)
                with self.assertRaisesRegex(ValueError, "unpinned dependency"):
                    CHECK.manifests(root)

    def test_unversioned_dependencies_and_excluding_constraints_cannot_bypass_gate(
        self,
    ):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "js").mkdir()
            (root / "js/package.json").write_text(
                json.dumps({"dependencies": {"demo": "*"}})
            )
            self.assertEqual([d.name for d in CHECK.manifests(root)], ["demo"])
        for requirement in ("*", ">2.0.0", "<2.0.0", "!=2.0.0"):
            dependency = CHECK.Dependency(
                CHECK.ROOT / "js/package.json", "npm", "demo", requirement, requirement
            )
            self.assertEqual(dependency.floor, "")
        for requirement in ("^2.0.0", ">=2.0.0", "==2.0.0", "2.0.0"):
            dependency = CHECK.Dependency(
                CHECK.ROOT / "js/package.json", "npm", "demo", requirement, requirement
            )
            self.assertEqual(dependency.floor, "2.0.0")

    def test_self_referencing_extra_is_not_a_registry_pin(self):
        # Issue #348: `dev = ["links-notation[test,lint]"]` reuses the pinned
        # extras instead of repeating them; it has no version of its own.
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "python").mkdir()
            (root / "python/pyproject.toml").write_text(
                '[project]\nname = "demo"\n'
                "[project.optional-dependencies]\n"
                'test = ["pytest>=9.1.1"]\n'
                'dev = ["demo[test]"]\n'
            )
            self.assertEqual(
                [(d.name, d.declared) for d in CHECK.manifests(root)],
                [("pytest", ">=9.1.1")],
            )
            (root / "python/pyproject.toml").write_text(
                '[project]\nname = "demo"\n'
                '[project.optional-dependencies]\ndev = ["other[test]"]\n'
            )
            with self.assertRaisesRegex(ValueError, "unsupported dependency"):
                CHECK.manifests(root)

    def test_github_preserves_real_tag_spelling(self):
        with patch.object(
            CHECK.subprocess,
            "run",
            return_value=SimpleNamespace(stdout="v2\n2.37.2\n2.40.0-beta\n"),
        ):
            self.assertEqual(CHECK.latest("github", "shivammathur/setup-php"), "2.37.2")
        with tempfile.TemporaryDirectory() as temporary:
            workflow = Path(temporary) / "php.yml"
            workflow.write_text("- uses: shivammathur/setup-php@v2.37.2\n")
            CHECK.update(
                CHECK.Dependency(
                    workflow, "github", "shivammathur/setup-php", "v2.37.2", "v2.37.2"
                ),
                "2.37.2",
            )
            self.assertEqual(
                workflow.read_text(), "- uses: shivammathur/setup-php@2.37.2\n"
            )

    def test_action_tool_input_is_checked_and_updated(self):
        # Issue #330: trufflehog's scanner pin (`version:`) went stale while
        # only the action ref was compared against the latest release.
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / ".github/workflows").mkdir(parents=True)
            workflow = root / ".github/workflows/security.yml"
            workflow.write_text(
                "steps:\n"
                "  - name: Scan\n"
                "    uses: trufflesecurity/trufflehog@v3.99.0\n"
                "    with:\n"
                "      path: ./\n"
                "      # pins the scanner\n"
                "      version: 3.97.1\n"
                "  - uses: actions/setup-node@v7.0.0\n"
                "    with:\n"
                "      version: 1.0.0\n"
            )
            pins = [
                (d.ecosystem, d.name, d.literal)
                for d in CHECK.manifests(root)
                if d.ecosystem == "github-input"
            ]
            self.assertEqual(
                pins, [("github-input", "trufflesecurity/trufflehog", "3.97.1")]
            )
            dependency = CHECK.Dependency(
                workflow,
                "github-input",
                "trufflesecurity/trufflehog",
                "3.97.1",
                "3.97.1",
            )
            CHECK.update(dependency, "v3.99.0")
            text = workflow.read_text()
            self.assertIn("      version: 3.99.0\n", text)
            self.assertIn("trufflehog@v3.99.0\n", text)
            self.assertIn("      version: 1.0.0\n", text)

    def test_pre_commit_hook_dependencies_are_pinned_checked_and_updated(self):
        # Issue #348: the eslint hook installed an unpinned `eslint`, so each
        # machine ran whatever release was newest when its hook was built.
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            config = root / ".pre-commit-config.yaml"
            config.write_text(
                "repos:\n"
                "  - repo: https://github.com/pre-commit/mirrors-eslint\n"
                "    rev: v10.12.0\n"
                "    hooks:\n"
                "      - id: eslint\n"
                "        additional_dependencies:\n"
                "          - eslint@10.12.0\n"
                "          - '@eslint/js@10.0.1'\n"
                "        args: ['--fix']\n"
            )
            pins = [
                (d.ecosystem, d.name, d.literal)
                for d in CHECK.manifests(root)
                if d.path == config
            ]
            self.assertEqual(
                pins,
                [
                    ("github", "pre-commit/mirrors-eslint", "v10.12.0"),
                    ("npm", "eslint", "10.12.0"),
                    ("npm", "@eslint/js", "10.0.1"),
                ],
            )
            CHECK.update(
                CHECK.Dependency(config, "npm", "eslint", "10.12.0", "10.12.0"),
                "10.13.0",
            )
            text = config.read_text()
            self.assertIn("          - eslint@10.13.0\n", text)
            self.assertIn("    rev: v10.12.0\n", text)
            self.assertIn("'@eslint/js@10.0.1'", text)

            config.write_text(text.replace("eslint@10.13.0", "eslint"))
            with self.assertRaisesRegex(ValueError, "unpinned dependency"):
                CHECK.manifests(root)

    def test_stable_versions_ignore_prereleases_and_sort_numerically(self):
        self.assertEqual(
            CHECK.newest(["v1.9.0", "v1.10.0", "2.0.0-rc1", "stable"]), "1.10.0"
        )
        with self.assertRaises(ValueError):
            CHECK.newest(["2.0.0-beta.1"])

    def test_active_manifests_exclude_archives_local_dependencies_and_build_output(
        self,
    ):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for folder in (
                "js",
                "js/node_modules/demo",
                "dev/log/snapshot",
                "experiments/old",
            ):
                directory = root / folder
                directory.mkdir(parents=True)
                (directory / "package.json").write_text(
                    json.dumps(
                        {"dependencies": {"demo": "^1.0.0", "local": "file:../source"}}
                    )
                )
            records = CHECK.manifests(root)
            self.assertEqual(
                [(d.name, d.declared) for d in records], [("demo", "^1.0.0")]
            )

    def test_update_changes_only_the_named_dependency(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cargo = root / "Cargo.toml"
            cargo.write_text('[dependencies]\nquote = "1.0"\nproc-macro2 = "1.0"\n')
            CHECK.update(
                CHECK.Dependency(cargo, "cargo", "quote", "1.0", "1.0"), "1.0.47"
            )
            self.assertIn('quote = "1.0.47"', cargo.read_text())
            self.assertIn('proc-macro2 = "1.0"', cargo.read_text())
            cs = root / "Example.csproj"
            cs.write_text(
                '<PackageReference Include="A" Version="1.0.0" /><PackageReference Include="B" Version="1.0.0" />'
            )
            CHECK.update(CHECK.Dependency(cs, "nuget", "A", "1.0.0", "1.0.0"), "2.0.0")
            self.assertIn('Include="B" Version="1.0.0"', cs.read_text())

    def test_cmake_fetchcontent_archive_pin_is_checked_and_rehashed(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cmake = root / "cpp/tests/CMakeLists.txt"
            cmake.parent.mkdir(parents=True)
            cmake.write_text(
                "FetchContent_Declare(googletest\n"
                "  URL https://github.com/google/googletest/releases/download/v1.17.0/googletest-1.17.0.tar.gz\n"
                "  URL_HASH SHA256=" + "0" * 64 + ")\n"
            )
            # A configured build tree holds the fetched project's own CMakeLists.
            fetched = root / "cpp/build/_deps/demo-src/CMakeLists.txt"
            fetched.parent.mkdir(parents=True)
            fetched.write_text(
                "URL https://github.com/demo/demo/releases/download/v0.1/demo.tar.gz\n"
            )
            records = CHECK.manifests(root)
            self.assertEqual(
                [(d.ecosystem, d.name, d.literal) for d in records],
                [("github", "google/googletest", "v1.17.0")],
            )
            with patch.object(CHECK, "get", return_value=b"archive") as get:
                CHECK.update(records[0], "v1.18.0")
            get.assert_called_once_with(
                "https://github.com/google/googletest/releases/download/v1.18.0/googletest-1.18.0.tar.gz",
                accept="*/*",
            )
            text = cmake.read_text()
            self.assertIn("download/v1.18.0/googletest-1.18.0.tar.gz", text)
            self.assertIn(
                "URL_HASH SHA256=" + CHECK.hashlib.sha256(b"archive").hexdigest() + ")",
                text,
            )

    def test_maven_property_is_resolved_without_changing_other_versions(self):
        with tempfile.TemporaryDirectory() as temporary:
            pom = Path(temporary) / "pom.xml"
            pom.write_text(
                "<project><properties><junit.version>6.0.0</junit.version></properties><dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId><version>${junit.version}</version></dependency></project>"
            )
            CHECK.update(
                CHECK.Dependency(
                    pom, "maven", "org.junit.jupiter:junit-jupiter", "6.0.0", "6.0.0"
                ),
                "6.1.3",
            )
            self.assertIn("<junit.version>6.1.3</junit.version>", pom.read_text())
            self.assertIn("${junit.version}", pom.read_text())

    def test_registry_response_and_network_errors_are_visible(self):
        with patch.object(
            CHECK, "get", return_value=b'{"dist-tags":{"latest":"2.0.0"}}'
        ):
            self.assertEqual(CHECK.latest("npm", "example"), "2.0.0")
        with patch.object(CHECK, "get", side_effect=OSError("registry unavailable")):
            with self.assertRaisesRegex(OSError, "registry unavailable"):
                CHECK.latest("npm", "example")

    def test_gate_fails_for_stale_dependencies_and_registry_errors(self):
        dependency = CHECK.Dependency(
            CHECK.ROOT / "js/package.json", "npm", "demo", "^1.0.0", "^1.0.0"
        )
        with (
            patch.object(CHECK, "manifests", return_value=[dependency]),
            patch.object(sys, "argv", ["check"]),
        ):
            with (
                patch.object(CHECK, "latest", return_value="2.0.0"),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                self.assertTrue(CHECK.main())
            with (
                patch.object(CHECK, "latest", return_value="1.0.0"),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                self.assertFalse(CHECK.main())
            with (
                patch.object(
                    CHECK, "latest", side_effect=OSError("registry unavailable")
                ),
                contextlib.redirect_stdout(io.StringIO()),
                contextlib.redirect_stderr(io.StringIO()) as errors,
            ):
                self.assertTrue(CHECK.main())
                self.assertIn("registry unavailable", errors.getvalue())


if __name__ == "__main__":
    unittest.main()
