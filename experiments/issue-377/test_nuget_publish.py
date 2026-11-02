#!/usr/bin/env python3
"""Offline tests for the "Publish NuGet package" step of publish-csharp.yml.

The step runs only on main, after a version bump, so its credential handling
is exercised here with a stand-in `dotnet` (issue #377). Run 41424977881
failed with NuGet.org's 403 "The specified API key has expired", reported
only as a generic step failure.
"""

import os
import re
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/publish-csharp.yml"

# The line dotnet printed in run 41424977881.
EXPIRED = (
    "error: Response status code does not indicate success: 403 (The specified API key "
    "has expired. Please create a new API key at https://www.nuget.org/account/apikeys.)."
)
SECRET = "oy2-not-a-real-key-0123456789"
LOGIN_KEY = "short-lived-login-key-9876543210"


def publish_script():
    """The run block of the "Publish NuGet package" step, dedented."""
    text = WORKFLOW.read_text()
    start = text.index("      - name: Publish NuGet package\n")
    end = text.index("      - name: Verify the package is really on NuGet.org")
    block = text[start:end]
    body = block[block.index("        run: |\n") + len("        run: |\n") :]
    return "\n".join(line[10:] for line in body.splitlines()) + "\n"


class PublishStep(unittest.TestCase):
    def run_step(self, dotnet_output="", dotnet_status=0, **env):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            fake = tmp / "bin" / "dotnet"
            fake.parent.mkdir()
            # The stand-in records the key it was given, to check which one won.
            fake.write_text(
                "#!/bin/bash\n"
                'while [ $# -gt 0 ]; do [ "$1" = --api-key ] && printf %s "$2" > "$KEY_SEEN"; shift; done\n'
                f"printf '%s\\n' {dotnet_output!r}\n"
                f"exit {dotnet_status}\n"
            )
            fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
            output = tmp / "github_output"
            output.touch()
            full_env = {
                "PATH": f"{fake.parent}:{os.environ['PATH']}",
                "GITHUB_OUTPUT": str(output),
                "RUNNER_TEMP": str(tmp),
                "KEY_SEEN": str(tmp / "key_seen"),
                "PACKAGE_ID": "Link.Foundation.Links.Notation",
                "SHOULD_PUBLISH": "true",
                "PACKAGE_VERSION": "0.30.0",
                "NUGET_LOGIN_KEY": "",
                "NUGET_API_KEY": "",
                "NUGET_TOKEN": "",
                **env,
            }
            result = subprocess.run(
                ["bash", "-c", publish_script()],
                cwd=tmp,
                env=full_env,
                capture_output=True,
                text=True,
                check=False,
            )
            seen = (tmp / "key_seen").read_text() if (tmp / "key_seen").exists() else None
            return result, output.read_text(), seen

    def test_an_expired_key_names_the_remedy(self):
        result, output, _ = self.run_step(EXPIRED, 1, NUGET_API_KEY=SECRET)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("published=failed", output)
        error = re.search(r"::error::NuGet.org rejected the key from the NUGET_API_KEY secret.*", result.stdout)
        self.assertIsNotNone(error, result.stdout)
        self.assertIn("https://www.nuget.org/account/apikeys", error.group(0))
        self.assertIn("NUGET_USER", error.group(0))

    def test_the_key_is_never_printed_except_to_mask_it(self):
        result, _, _ = self.run_step(EXPIRED, 1, NUGET_API_KEY=SECRET)
        lines = (result.stdout + result.stderr).splitlines()
        self.assertEqual([line for line in lines if SECRET in line], [f"::add-mask::{SECRET}"])

    def test_another_push_failure_is_not_blamed_on_the_key(self):
        result, _, _ = self.run_step("error: 409 (Conflict)", 1, NUGET_API_KEY=SECRET)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("rejected the key", result.stdout)
        self.assertIn("::error::dotnet nuget push failed with exit code 1", result.stdout)

    def test_no_credential_fails_visibly(self):
        result, output, seen = self.run_step()
        self.assertEqual(result.returncode, 1)
        self.assertIn("published=failed", output)
        self.assertIn("::error::No NuGet credential", result.stdout)
        self.assertIsNone(seen)

    def test_trusted_publishing_is_preferred_to_the_secret(self):
        result, output, seen = self.run_step(NUGET_LOGIN_KEY=LOGIN_KEY, NUGET_API_KEY=SECRET)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("published=true", output)
        self.assertEqual(seen, LOGIN_KEY)
        self.assertIn("from the trusted publishing", result.stdout)

    def test_the_historical_secret_name_still_works(self):
        result, _, seen = self.run_step(NUGET_TOKEN=SECRET)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(seen, SECRET)

    def test_a_published_version_is_skipped(self):
        result, output, seen = self.run_step(SHOULD_PUBLISH="false")
        self.assertEqual(result.returncode, 0)
        self.assertIn("published=skipped", output)
        self.assertIsNone(seen)


if __name__ == "__main__":
    unittest.main()
