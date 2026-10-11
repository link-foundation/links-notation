"""Reproduce missing gates and silently skipped Java releases on the old tree."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class WorkflowContract(unittest.TestCase):
    maxDiff = 1000

    def test_language_workflows_are_reusable_only(self):
        for language in ("javascript", "rust", "python", "java", "go", "csharp", "php"):
            with self.subTest(language=language):
                text = (ROOT / f".github/workflows/{language}.yml").read_text()
                trigger = text.split("on:", 1)[1].split("permissions:", 1)[0]
                self.assertIn("workflow_call:", trigger)
                self.assertNotRegex(
                    trigger, r"\n  (push|pull_request|workflow_dispatch):"
                )

    def test_js_checks_have_no_change_filter(self):
        text = (ROOT / ".github/workflows/javascript.yml").read_text()
        self.assertNotIn("findChangedJsFiles", text)
        self.assertNotIn("isJsFilesChanged", text)

    def test_missing_java_credentials_fail(self):
        text = (ROOT / ".github/workflows/java.yml").read_text()
        self.assertNotRegex(text, r"published=failed[^\n]*\n\s+exit 0")
        self.assertNotIn("::warning::Skipping Maven Central", text)

    def test_release_audit_enforces_main(self):
        text = (ROOT / "scripts/release-audit.mjs").read_text()
        self.assertNotRegex(text, r"process\.exit\(0\);\s*$")


if __name__ == "__main__":
    unittest.main()
