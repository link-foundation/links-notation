"""Tests for scripts/check-dependency-review-support.sh.

The probe runs against a local fake of the dependency graph comparison API, so
a repository without the dependency graph (403) skips the review while every
other answer still lets the action run and report the real error.
"""

from __future__ import annotations

import os
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "check-dependency-review-support.sh"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "security.yml"
REPOSITORY = "owner/repo"
COMPARE_PATH = f"/repos/{REPOSITORY}/dependency-graph/compare/base-sha...head-sha"


class FakeGitHub:
    """A fake GitHub API answering the comparison with a chosen status."""

    def __init__(self, status: int) -> None:
        self.status = status
        self.requests: list[tuple[str, dict[str, str]]] = []
        fake = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args) -> None:
                pass

            def do_GET(self) -> None:  # noqa: N802
                fake.requests.append((self.path, dict(self.headers)))
                self.send_response(fake.status)
                self.send_header("Content-Length", "0")
                self.end_headers()

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    @property
    def url(self) -> str:
        host, port = self._server.server_address
        return f"http://{host}:{port}"

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()


def run_probe(api_url: str, tmp_path: Path, **overrides: str) -> tuple[subprocess.CompletedProcess, str]:
    """Run the probe and return the process and what it wrote to GITHUB_OUTPUT."""
    output = tmp_path / "github_output"
    env = {
        **os.environ,
        "GITHUB_API_URL": api_url,
        "GITHUB_TOKEN": "token",
        "GITHUB_REPOSITORY": REPOSITORY,
        "BASE_SHA": "base-sha",
        "HEAD_SHA": "head-sha",
        "GITHUB_OUTPUT": str(output),
        "DEPENDENCY_REVIEW_CURL_TIMEOUT": "5",
        **overrides,
    }
    completed = subprocess.run(
        ["bash", str(SCRIPT_PATH)], env=env, capture_output=True, text=True, check=False
    )
    return completed, output.read_text(encoding="utf-8") if output.exists() else ""


@pytest.mark.parametrize(
    ("status", "supported"),
    [(200, "true"), (403, "false"), (404, "true"), (500, "true")],
)
def test_only_a_refused_comparison_skips_the_review(
    tmp_path: Path, status: int, supported: str
) -> None:
    """403 means the graph is off; any other answer lets the action decide."""
    fake = FakeGitHub(status)
    try:
        completed, output = run_probe(fake.url, tmp_path)
    finally:
        fake.stop()

    assert completed.returncode == 0, completed.stderr
    assert output == f"supported={supported}\n"
    assert [path for path, _ in fake.requests] == [COMPARE_PATH]
    assert fake.requests[0][1]["Authorization"] == "Bearer token"
    warned = "::warning title=Dependency review skipped::" in completed.stdout
    assert warned == (supported == "false")


def test_an_unreachable_api_does_not_skip_the_review(tmp_path: Path) -> None:
    """No answer has not proven the graph is off."""
    fake = FakeGitHub(200)
    url = fake.url
    fake.stop()

    completed, output = run_probe(url, tmp_path)

    assert completed.returncode == 0, completed.stderr
    assert output == "supported=true\n"


@pytest.mark.parametrize("missing", ["GITHUB_TOKEN", "GITHUB_REPOSITORY", "BASE_SHA", "HEAD_SHA"])
def test_missing_inputs_are_a_usage_error(tmp_path: Path, missing: str) -> None:
    """Without an input the probe cannot ask the right question."""
    completed, output = run_probe("http://127.0.0.1:9", tmp_path, **{missing: ""})

    assert completed.returncode == 2
    assert missing in completed.stderr
    assert output == ""


def test_the_review_step_is_gated_on_the_probe() -> None:
    """The workflow runs the probe and skips the action when it says so."""
    workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    assert "run: bash scripts/check-dependency-review-support.sh" in workflow
    assert "if: steps.graph.outputs.supported == 'true'" in workflow
