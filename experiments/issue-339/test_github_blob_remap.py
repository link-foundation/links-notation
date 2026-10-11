"""Exercise the production GitHub file remap with a local raw-content server.

Requires the same Lychee binary as the links workflow. External requests are
never needed: only the remap's destination host is replaced by the mock server.
"""

import argparse
import http.server
import json
import re
import subprocess
import tempfile
import threading
import tomllib
import unittest
from pathlib import Path

CONFIG = Path(__file__).resolve().parents[2] / "lychee.toml"
LYCHEE = "lychee"


class ContentHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.server.paths.append(self.path)
        status = 404 if self.path.endswith("/missing.md") else 200
        self.send_response(status)
        self.end_headers()
        self.wfile.write(b"content\n")

    def log_message(self, *args):
        pass


class GitHubBlobRemapTest(unittest.TestCase):
    def setUp(self):
        self.config = CONFIG.read_text()
        remaps = tomllib.loads(self.config).get("remap", [])
        self.assertEqual(len(remaps), 1, "GitHub file links need a content remap")
        self.pattern, self.destination = remaps[0].split(" ", 1)

    def check_links(self, urls):
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), ContentHandler)
        server.paths = []
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                base = f"http://127.0.0.1:{server.server_port}"
                # Keep the production regex and Rust capture substitutions.
                # Isolate only the external raw-content host for this test.
                root.joinpath("lychee.toml").write_text(
                    self.config.replace("https://raw.githubusercontent.com", base)
                )
                root.joinpath("links.txt").write_text("\n".join(urls) + "\n")
                result = subprocess.run(
                    [LYCHEE, "--no-progress", "--format", "json", "links.txt"],
                    cwd=root,
                    text=True,
                    capture_output=True,
                    check=False,
                )
                print(result.stdout, result.stderr)
                return result.returncode, json.loads(result.stdout), server.paths
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_preserves_owner_repository_ref_and_file(self):
        code, report, paths = self.check_links(
            [
                "https://github.com/owner/repo/blob/main/docs/file.md",
                "https://github.com/another/project/blob/a1b2c3/src/file.php",
            ]
        )
        self.assertEqual(code, 0)
        self.assertEqual(report["successful"], 2)
        self.assertCountEqual(
            paths,
            ["/owner/repo/main/docs/file.md", "/another/project/a1b2c3/src/file.php"],
        )

    def test_missing_file_still_fails(self):
        code, report, paths = self.check_links(
            ["https://github.com/owner/repo/blob/main/missing.md"]
        )
        self.assertEqual(code, 2)
        self.assertEqual(report["errors"], 1)
        self.assertEqual(paths, ["/owner/repo/main/missing.md"])

    def test_remap_only_matches_github_blob_urls(self):
        for url in (
            "https://github.com/owner/repo/tree/main/docs",
            "https://github.com/owner/repo/issues/339",
            "https://github.com/owner/repo/releases/tag/v1.0.0",
            "https://example.com/owner/repo/blob/main/docs/file.md",
            "https://github.com.evil.example/owner/repo/blob/main/file.md",
        ):
            self.assertIsNone(re.search(self.pattern, url), url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lychee", default="lychee")
    arguments = parser.parse_args()
    LYCHEE = arguments.lychee
    unittest.main(argv=[__file__], verbosity=2)
