"""Tests for scripts/preflight-credentials.sh.

The probes run against a local fake of the GitHub API, the NuGet gallery and a
Conan remote, so the rules -- report every failure, unknown is never a pass,
probe with a write -- are tested without touching real infrastructure.
"""

from __future__ import annotations

import json
import os
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "preflight-credentials.sh"
REPOSITORY = "owner/repo"


class FakeEndpoints:
    """A scriptable fake of the GitHub, NuGet and Conan endpoints."""

    def __init__(self) -> None:
        self.github_status = 422
        self.nuget_status = 200
        self.nuget_verify_status = 200
        self.nuget_verify_disconnect = False
        self.nuget_original_verify_status = 200
        self.nuget_original_verify_disconnect = False
        self.nuget_index_status = 200
        self.nuget_versions = ["1.0.0", "1.2.3"]
        self.nuget_key_body = json.dumps({"Key": "verification-secret"})
        self.nuget_index_body = None
        self.conan_status = 200
        self.requests: list[tuple[str, str, dict[str, str]]] = []
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), self._build_handler())
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    @property
    def url(self) -> str:
        host, port = self._server.server_address
        return f"http://{host}:{port}"

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()

    def _build_handler(self):
        fake = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args) -> None:
                pass

            def _respond(self, status: int, body: str = "") -> None:
                self.send_response(status)
                self.send_header("Content-Length", str(len(body.encode())))
                self.end_headers()
                if body:
                    self.wfile.write(body.encode())

            def _record(self, method: str) -> None:
                length = int(self.headers.get("Content-Length") or 0)
                if length:
                    self.rfile.read(length)
                fake.requests.append((method, self.path, dict(self.headers)))

            def do_GET(self) -> None:  # noqa: N802
                self._record("GET")
                if self.path == "/conan/v2/users/authenticate":
                    self._respond(fake.conan_status, "conan-jwt" if fake.conan_status == 200 else "")
                elif self.path.startswith("/api/v2/verifykey/"):
                    if self.headers.get("X-NuGet-ApiKey") == "oy2key":
                        if fake.nuget_original_verify_disconnect:
                            self.close_connection = True
                        else:
                            self._respond(fake.nuget_original_verify_status)
                    elif fake.nuget_verify_disconnect:
                        self.close_connection = True
                    else:
                        self._respond(fake.nuget_verify_status)
                elif self.path.startswith("/flatcontainer/"):
                    body = fake.nuget_index_body
                    if body is None:
                        body = json.dumps({"versions": fake.nuget_versions})
                    self._respond(fake.nuget_index_status, body)
                else:
                    self._respond(404)

            def do_POST(self) -> None:  # noqa: N802
                self._record("POST")
                if self.path == f"/repos/{REPOSITORY}/git/refs":
                    self._respond(fake.github_status, json.dumps({"message": "Object does not exist"}))
                elif self.path.startswith("/api/v2/package/create-verification-key/"):
                    body = fake.nuget_key_body if fake.nuget_status == 200 else ""
                    self._respond(fake.nuget_status, body)
                else:
                    self._respond(404)

        return Handler


@pytest.fixture()
def fake():
    endpoints = FakeEndpoints()
    yield endpoints
    endpoints.stop()


def run_script(env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    cleared = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith(("GITHUB_", "NUGET_", "CONAN_"))
    }
    merged = {**cleared, "PREFLIGHT_MODE": "release", "PREFLIGHT_CURL_TIMEOUT": "5", **env}
    return subprocess.run(
        ["bash", str(SCRIPT_PATH)], cwd=ROOT, env=merged, capture_output=True, text=True,
        timeout=30,
    )


def github_env(fake: FakeEndpoints) -> dict[str, str]:
    return {"GITHUB_API_URL": fake.url, "GITHUB_REPOSITORY": REPOSITORY, "GITHUB_TOKEN": "ghs_token"}


def nuget_env(fake: FakeEndpoints) -> dict[str, str]:
    return {
        "NUGET_GALLERY_URL": fake.url,
        "NUGET_FLAT_CONTAINER_URL": f"{fake.url}/flatcontainer",
        "NUGET_PUBLISH": "true",
        "NUGET_PACKAGE_ID": "Platform.Example.TemplateLibrary",
        "NUGET_API_KEY": "oy2key",
    }


def conan_env(fake: FakeEndpoints) -> dict[str, str]:
    return {
        "CONAN_REMOTE_URL": f"{fake.url}/conan",
        "CONAN_LOGIN_USERNAME": "user",
        "CONAN_PASSWORD": "password",
    }


def test_github_write_probe_passes_on_422(fake) -> None:
    result = run_script(github_env(fake))
    assert result.returncode == 0, result.stdout + result.stderr
    assert "PASS: GitHub accepted a contents:write request" in result.stdout
    assert "Release preflight: 1 verified, 0 failed, 0 unknown" in result.stdout
    method, path, headers = fake.requests[0]
    assert (method, path) == ("POST", f"/repos/{REPOSITORY}/git/refs")
    assert headers["Authorization"] == "Bearer ghs_token"


@pytest.mark.parametrize("status", [401, 403, 404])
def test_github_refusal_fails_the_release(fake, status: int) -> None:
    fake.github_status = status
    result = run_script(github_env(fake))
    assert result.returncode == 1
    assert f"FAIL: GitHub refused the contents:write probe for {REPOSITORY} ({status})" in result.stdout
    assert "refusing to release with 1 refused credential(s)" in result.stdout


def test_missing_github_token_is_a_failure() -> None:
    result = run_script({"GITHUB_REPOSITORY": REPOSITORY})
    assert result.returncode == 1
    assert "FAIL: GITHUB_TOKEN is not set" in result.stdout


def test_report_mode_reports_failures_without_blocking(fake) -> None:
    fake.github_status = 403
    result = run_script({**github_env(fake), "PREFLIGHT_MODE": "report"})
    assert result.returncode == 0
    assert "::warning::release-preflight:" in result.stdout
    assert "Report mode: the failures above are advisory" in result.stdout


def test_unreachable_github_is_unknown_and_never_a_release_pass() -> None:
    result = run_script(
        {"GITHUB_API_URL": "http://127.0.0.1:9", "GITHUB_REPOSITORY": REPOSITORY, "GITHUB_TOKEN": "t"}
    )
    assert result.returncode == 1
    assert "UNKNOWN: the GitHub API was unreachable" in result.stdout
    assert "verified nothing (1 unknown)" in result.stdout


def test_nuget_is_skipped_unless_enabled(fake) -> None:
    result = run_script({**github_env(fake), "NUGET_API_KEY": "key"})
    assert result.returncode == 0
    assert "SKIP: NUGET_PUBLISH is not true" in result.stdout
    assert not any("verification-key" in path for _, path, _ in fake.requests)


def test_nuget_verification_key_proves_push_scope(fake) -> None:
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "PASS: NuGet verified push scope for Platform.Example.TemplateLibrary" in result.stdout
    assert "verification-secret" not in result.stdout
    nuget_calls = [(p, h) for _, p, h in fake.requests if "verification-key" in p]
    assert nuget_calls[0][0].endswith("/Platform.Example.TemplateLibrary")
    assert nuget_calls[0][1]["X-NuGet-ApiKey"] == "oy2key"
    assert nuget_calls[0][1]["Content-Length"] == "0"
    verify_calls = [(p, h) for _, p, h in fake.requests if "/verifykey/" in p]
    assert len(verify_calls) == 2
    assert verify_calls[0][0] == "/api/v2/verifykey/Platform.Example.TemplateLibrary/1.2.3"
    assert verify_calls[0][1]["X-NuGet-ApiKey"] == "verification-secret"
    assert verify_calls[1][0] == verify_calls[0][0]
    assert verify_calls[1][1]["X-NuGet-ApiKey"] == "oy2key"
    index_calls = [(p, h) for _, p, h in fake.requests if "/flatcontainer/" in p]
    assert index_calls[0][0] == "/flatcontainer/platform.example.templatelibrary/index.json"
    assert "X-NuGet-ApiKey" not in index_calls[0][1]


@pytest.mark.parametrize("status", [401, 403])
def test_valid_key_with_wrong_package_glob_or_owner_fails(fake, status: int) -> None:
    # Creating a verification key succeeds even when this package is forbidden.
    fake.nuget_verify_status = status
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 1, result.stdout + result.stderr
    assert "FAIL: NuGet refused push scope" in result.stdout
    assert f"({status})" in result.stdout
    assert "PASS: NuGet" not in result.stdout


@pytest.mark.parametrize("status", [401, 403])
def test_temporary_key_cannot_prove_original_package_glob(fake, status: int) -> None:
    # CredentialBuilder replaces the original glob with the requested ID.
    # Its temporary key can verify successfully while the push key is refused.
    fake.nuget_verify_status = 200
    fake.nuget_original_verify_status = status
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 1, result.stdout + result.stderr
    assert "FAIL: NuGet refused push scope" in result.stdout
    assert f"({status})" in result.stdout
    assert "PASS: NuGet" not in result.stdout
    keys = [headers["X-NuGet-ApiKey"] for _, path, headers in fake.requests
            if "/verifykey/" in path]
    assert keys == ["verification-secret", "oy2key"]


@pytest.mark.parametrize("status", [404, 429, 500])
def test_original_key_verification_uncertainty_never_proves_scope(fake, status: int) -> None:
    fake.nuget_original_verify_status = status
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UNKNOWN: NuGet" in result.stdout
    assert "PASS: NuGet" not in result.stdout
    assert "Release preflight: 1 verified, 0 failed, 1 unknown" in result.stdout


def test_unreachable_original_key_verification_is_unknown(fake) -> None:
    fake.nuget_original_verify_disconnect = True
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UNKNOWN: NuGet" in result.stdout
    assert "PASS: NuGet" not in result.stdout


@pytest.mark.parametrize("status", [404, 429, 500])
def test_package_verification_uncertainty_never_proves_scope(fake, status: int) -> None:
    fake.nuget_verify_status = status
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UNKNOWN: NuGet" in result.stdout
    assert "PASS: NuGet" not in result.stdout
    assert "Release preflight: 1 verified, 0 failed, 1 unknown" in result.stdout


def test_unreachable_package_verification_is_unknown(fake) -> None:
    fake.nuget_verify_disconnect = True
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UNKNOWN: NuGet package verification answered 000" in result.stdout
    assert "PASS: NuGet" not in result.stdout


def test_unreachable_version_index_is_unknown(fake) -> None:
    result = run_script({**github_env(fake), **nuget_env(fake),
                         "NUGET_FLAT_CONTAINER_URL": "http://127.0.0.1:9"})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UNKNOWN: NuGet version lookup answered 000" in result.stdout
    assert "PASS: NuGet" not in result.stdout


def test_refused_package_scope_is_advisory_on_pull_requests(fake) -> None:
    fake.nuget_verify_status = 403
    result = run_script({**github_env(fake), **nuget_env(fake), "PREFLIGHT_MODE": "report"})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "FAIL: NuGet refused push scope" in result.stdout
    assert "::warning::release-preflight:" in result.stdout


def test_version_url_is_encoded_and_keys_stay_private(fake) -> None:
    fake.nuget_versions = ["1.2.3-preview+metadata"]
    fake.nuget_key_body = json.dumps({"Key": 'one-time-"quoted-key'})
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    call = next(call for call in fake.requests if "/verifykey/" in call[1])
    assert call[1].endswith("/1.2.3-preview%2Bmetadata")
    assert call[2]["X-NuGet-ApiKey"] == 'one-time-"quoted-key'
    assert 'quoted-key' not in result.stdout + result.stderr


@pytest.mark.parametrize("status,versions", [(404, []), (200, []), (429, []), (500, [])])
def test_missing_or_unavailable_published_version_is_unknown(fake, status, versions) -> None:
    fake.nuget_index_status = status
    fake.nuget_versions = versions
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UNKNOWN: NuGet" in result.stdout
    assert "PASS: NuGet" not in result.stdout
    assert not any("/verifykey/" in path for _, path, _ in fake.requests)


@pytest.mark.parametrize("body", ["not JSON", "{}", '{"Key": ""}', '{"Key": null}'])
def test_missing_or_malformed_verification_key_is_unknown(fake, body: str) -> None:
    fake.nuget_key_body = body
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert "UNKNOWN: NuGet" in result.stdout
    assert "PASS: NuGet" not in result.stdout
    assert not any("/verifykey/" in path for _, path, _ in fake.requests)


@pytest.mark.parametrize("body", ["not JSON", "{}", '{"versions": "1.2.3"}',
                                 '{"versions": [null]}'])
def test_malformed_version_index_is_unknown(fake, body: str) -> None:
    fake.nuget_index_body = body
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert "UNKNOWN: NuGet" in result.stdout
    assert "PASS: NuGet" not in result.stdout


def test_trusted_publishing_takes_priority_and_defers_exchange(fake) -> None:
    fake.nuget_status = 403  # The obsolete secret must not block OIDC mode.
    result = run_script({**github_env(fake), **nuget_env(fake), "NUGET_USER": "publisher"})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "MODE: NuGet trusted publishing" in result.stdout
    assert "UNKNOWN:" in result.stdout and "release job" in result.stdout
    assert "PASS: NuGet" not in result.stdout
    assert not any("/api/v2/" in path for _, path, _ in fake.requests)


def test_trusted_publishing_does_not_require_a_secret(fake) -> None:
    result = run_script({**github_env(fake), **nuget_env(fake), "NUGET_USER": "publisher",
                         "NUGET_API_KEY": ""})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "MODE: NuGet trusted publishing" in result.stdout
    assert "FAIL: NuGet" not in result.stdout


def test_api_key_mode_is_reported(fake) -> None:
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert "MODE: NuGet API key" in result.stdout


def test_verbose_diagnostics_and_summary_do_not_leak_keys(fake, tmp_path: Path) -> None:
    summary = tmp_path / "summary.md"
    result = run_script({**github_env(fake), **nuget_env(fake), "PREFLIGHT_VERBOSE": "true",
                         "GITHUB_STEP_SUMMARY": str(summary)})
    combined = result.stdout + result.stderr + summary.read_text()
    assert "HTTP" in result.stderr
    for key in ("oy2key", "verification-secret", "ghs_token"):
        assert key not in combined


@pytest.mark.parametrize("status", [401, 403])
def test_nuget_refusal_fails_the_release(fake, status: int) -> None:
    fake.nuget_status = status
    result = run_script({**github_env(fake), **nuget_env(fake)})
    assert result.returncode == 1
    assert f"FAIL: NuGet refused the API key for Platform.Example.TemplateLibrary ({status})" in result.stdout


def test_nuget_enabled_without_key_or_id_fails(fake) -> None:
    result = run_script({**github_env(fake), **nuget_env(fake), "NUGET_API_KEY": ""})
    assert "FAIL: NUGET_PUBLISH is true but NUGET_API_KEY is missing" in result.stdout
    result = run_script({**github_env(fake), **nuget_env(fake), "NUGET_PACKAGE_ID": ""})
    assert "FAIL: NUGET_PUBLISH is true but NUGET_PACKAGE_ID is empty" in result.stdout


def test_conan_login_is_unknown_not_a_pass(fake) -> None:
    result = run_script({**github_env(fake), **conan_env(fake)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "UNKNOWN: the Conan remote accepted the login for user" in result.stdout
    assert "Release preflight: 1 verified, 0 failed, 1 unknown" in result.stdout


def test_conan_login_alone_does_not_pass_a_release(fake) -> None:
    result = run_script({**github_env(fake), "GITHUB_TOKEN": "", **conan_env(fake)})
    assert result.returncode == 1


def test_every_failure_is_reported_not_just_the_first(fake) -> None:
    fake.github_status = 403
    fake.nuget_status = 401
    fake.conan_status = 401
    result = run_script({**github_env(fake), **nuget_env(fake), **conan_env(fake)})
    assert result.returncode == 1
    assert "FAIL: GitHub refused" in result.stdout
    assert "FAIL: NuGet refused" in result.stdout
    assert "FAIL: the Conan remote refused the login" in result.stdout
    assert "refusing to release with 3 refused credential(s)" in result.stdout


def test_step_summary_receives_the_verdict(fake, tmp_path: Path) -> None:
    summary = tmp_path / "summary.md"
    result = run_script({**github_env(fake), "GITHUB_STEP_SUMMARY": str(summary)})
    assert result.returncode == 0
    written = summary.read_text()
    assert "### Release preflight (release mode)" in written
    assert "Verdict: **passed**" in written
    assert "| verified | 1 |" in written
