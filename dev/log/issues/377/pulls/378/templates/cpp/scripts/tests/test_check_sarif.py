"""A successful analysis is not a clean security verdict."""

import copy
import json
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "check_sarif.py"
CLEAN = {"version": "2.1.0", "runs": [{
    "tool": {"driver": {"name": "CodeQL"}},
    "invocations": [{"executionSuccessful": True}], "results": [],
}]}


def check(tmp_path, payload):
    report = tmp_path / "report.sarif"
    report.write_text(json.dumps(payload))
    return subprocess.run([sys.executable, str(SCRIPT), str(report)],
                          text=True, capture_output=True)


def test_complete_clean_scan_passes(tmp_path):
    assert check(tmp_path, CLEAN).returncode == 0


@pytest.mark.parametrize("level", ["error", "warning", "note", "none", None])
def test_analysis_success_with_a_finding_fails(tmp_path, level):
    payload = copy.deepcopy(CLEAN)
    finding = {"ruleId": "example/finding", "message": {"text": "reproducing finding"}}
    if level:
        finding["level"] = level
    payload["runs"][0]["results"] = [finding]
    result = check(tmp_path, payload)
    assert result.returncode == 1
    assert "example/finding" in result.stdout


@pytest.mark.parametrize("invocations", [None, [], [{}], [{"executionSuccessful": False}],
    [{"executionSuccessful": "true"}], [{"executionSuccessful": None}],
    [{"executionSuccessful": True, "exitCode": 1}],
    [{"executionSuccessful": True}, {"executionSuccessful": False}],
])
def test_incomplete_or_failed_invocations_fail(tmp_path, invocations):
    payload = copy.deepcopy(CLEAN)
    if invocations is None:
        del payload["runs"][0]["invocations"]
    else:
        payload["runs"][0]["invocations"] = invocations
    assert check(tmp_path, payload).returncode == 1


@pytest.mark.parametrize("field", ["toolExecutionNotifications", "toolConfigurationNotifications"])
@pytest.mark.parametrize("level", ["error", "warning", None])
def test_failed_tool_diagnostic_is_fatal(tmp_path, field, level):
    payload = copy.deepcopy(CLEAN)
    diagnostic = {"message": {"text": "incomplete scan"}}
    if level:
        diagnostic["level"] = level
    payload["runs"][0]["invocations"][0][field] = [diagnostic]
    assert check(tmp_path, payload).returncode == 1


@pytest.mark.parametrize("payload", [{}, [], {"version": "2.1.0", "runs": []},
    {"version": "2.1.0", "runs": [None]},
    {"version": "2.1.0", "runs": [{"invocations": [{"executionSuccessful": True}]}]},
])
def test_malformed_or_empty_report_is_fatal(tmp_path, payload):
    assert check(tmp_path, payload).returncode == 1


def test_missing_report_and_empty_directory_fail(tmp_path):
    for path in [tmp_path, tmp_path / "missing.sarif"]:
        result = subprocess.run([sys.executable, str(SCRIPT), str(path)],
                                capture_output=True, text=True)
        assert result.returncode == 1


def test_every_report_and_every_run_is_checked(tmp_path):
    (tmp_path / "clean.sarif").write_text(json.dumps(CLEAN))
    payload = copy.deepcopy(CLEAN)
    payload["runs"].append({**copy.deepcopy(CLEAN["runs"][0]), "results": [
        {"ruleId": "bad", "level": "warning", "message": {"text": "bad"}}
    ]})
    (tmp_path / "finding.sarif").write_text(json.dumps(payload))
    result = subprocess.run([sys.executable, str(SCRIPT), str(tmp_path)],
                            capture_output=True, text=True)
    assert result.returncode == 1
