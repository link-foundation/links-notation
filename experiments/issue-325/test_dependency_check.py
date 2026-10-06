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

    def test_python39_build_floor_ignores_incompatible_and_yanked_releases(self):
        releases = {
            "81.0.0": [{"requires_python": ">=3.9"}],
            "82.0.1": [{"requires_python": ">=3.9"}],
            "83.0.0": [{"requires_python": ">=3.9", "yanked": True}],
            "84.0.0": [{"requires_python": ">=3.10"}],
        }
        with patch.object(
            CHECK, "get", return_value=json.dumps({"releases": releases}).encode()
        ):
            self.assertEqual(CHECK.latest("pypi-py39", "setuptools"), "82.0.1")


if __name__ == "__main__":
    unittest.main()
