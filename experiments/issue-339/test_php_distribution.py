"""Install the PHP package from a minimal tagged monorepo without registries.

Exercises Composer's actual VCS discovery, version inference and autoloader.
The fixture contains only PHP sources and descriptors, in a temporary Git repo.
"""

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# Use the tested PHP interpreter, including when a system Composer launcher
# hardcodes a different PHP version. Keep diagnostics out of JSON stdout.
COMPOSER = ["php", "-d", "display_errors=stderr", shutil.which("composer")]


def run(command, directory):
    result = subprocess.run(
        command, cwd=directory, text=True, capture_output=True, check=False, timeout=60
    )
    print("$", " ".join(command), "\n", result.stdout, result.stderr, flush=True)
    return result


class PHPDistributionTest(unittest.TestCase):
    def test_tagged_monorepo_installs_and_loads_the_parser(self):
        version = json.loads(ROOT.joinpath("php/composer.json").read_text())["version"]
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            repository = base / "repository"
            repository.mkdir()
            shutil.copytree(ROOT / "php/src", repository / "php/src")
            shutil.copy(ROOT / "php/composer.json", repository / "php/composer.json")
            if ROOT.joinpath("composer.json").exists():
                shutil.copy(ROOT / "composer.json", repository / "composer.json")
            commands = [
                ["git", "init", "--quiet", "--initial-branch=main"],
                ["git", "add", "."],
                [
                    "git",
                    "-c",
                    "user.name=Distribution test",
                    "-c",
                    "user.email=distribution-test@example.invalid",
                    "commit",
                    "--quiet",
                    "-m",
                    "fixture",
                ],
                ["git", "tag", version],
            ]
            for command in commands:
                self.assertEqual(run(command, repository).returncode, 0)

            consumer = base / "consumer"
            consumer.mkdir()
            consumer.joinpath("composer.json").write_text(
                json.dumps(
                    {
                        "require": {"link-foundation/links-notation": version},
                        "repositories": [
                            {"type": "vcs", "url": str(repository)},
                            {"packagist.org": False},
                        ],
                        "config": {"allow-plugins": False},
                    }
                )
            )
            installed = run(
                [
                    *COMPOSER,
                    "install",
                    "--no-dev",
                    "--no-plugins",
                    "--no-scripts",
                    "--no-interaction",
                    "--no-progress",
                ],
                consumer,
            )
            self.assertEqual(
                installed.returncode,
                0,
                "Composer must discover the root package at its version tag",
            )
            package = json.loads(
                run(
                    [
                        *COMPOSER,
                        "show",
                        "link-foundation/links-notation",
                        "--format=json",
                    ],
                    consumer,
                ).stdout
            )
            self.assertEqual(package["versions"], [version])
            loaded = run(
                [
                    "php",
                    "-r",
                    'require "vendor/autoload.php"; '
                    '$links = (new LinkFoundation\\LinksNotation\\Parser())->parse("alpha"); '
                    "echo LinkFoundation\\LinksNotation\\Formatter::formatLinks($links);",
                ],
                consumer,
            )
            self.assertEqual(loaded.returncode, 0)
            self.assertEqual(loaded.stdout, "(alpha)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
