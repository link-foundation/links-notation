"""Check that the generated fidelity matrix includes actual test declarations."""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class TestComparisonExtraction(unittest.TestCase):
    def test_chunk_split_and_timeout_tests_are_counted(self):
        repository = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for path in (
                "scripts",
                "python/tests",
                "js/tests",
                "rust/links-notation/tests",
                "csharp/Link.Foundation.Links.Notation.Tests",
                "go",
                "java/src/test/java/io/github/linkfoundation/linksnotation",
                "php/tests",
            ):
                (root / path).mkdir(parents=True)
            shutil.copy2(
                repository / "scripts/create-test-case-comparison.mjs", root / "scripts"
            )
            for name in ("README.md", "README.ru.md"):
                (root / name).write_text(
                    "<!-- test-counts:start -->\n<!-- test-counts:end -->\n"
                )
            (root / "TEST_CASE_COMPARISON.md").write_text("")
            (root / "js/tests/ReferenceFidelity.test.js").write_text(
                "const lines = 'fixture'.split('phantom');\n"
                "test('reference literals at every chunk split', () => {});\n"
            )
            (
                root
                / "csharp/Link.Foundation.Links.Notation.Tests/ReferenceFidelityTests.cs"
            ).write_text(
                "[Fact(Timeout = 30000)]\n"
                "public static void ReferenceLiteralsAtEveryChunkSplit() {}\n"
            )
            subprocess.run(
                ["node", str(root / "scripts/create-test-case-comparison.mjs")],
                check=True,
                capture_output=True,
                text=True,
            )
            document = (root / "TEST_CASE_COMPARISON.md").read_text()
            self.assertNotIn("phantom", document)
            row = next(
                line
                for line in document.splitlines()
                if line.startswith("| reference literals")
            )
            self.assertIn("ReferenceFidelityTests.cs#L2", row)
            self.assertIn("| JavaScript | 1 |", (root / "README.md").read_text())
            self.assertIn("| C# | 1 |", (root / "README.md").read_text())


if __name__ == "__main__":
    unittest.main()
