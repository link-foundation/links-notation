"""Independently validate the field actionlint 1.7.12 does not understand."""

import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "check_workflow_concurrency.py"


@pytest.mark.parametrize("queue,cancel,valid", [
    ("max", "false", True), ("single", "true", True),
    ("max", "true", False), ("maximum", "false", False),
    ("'max'", "false", True), ("${{ inputs.queue }}", "false", False),
    ('"max\'', "false", False), ("max#not-a-comment", "false", False),
    ("max", "false#not-a-comment", False), ("max # comment", "false # comment", True),
])
def test_queue_value_and_cancel_policy(tmp_path, queue, cancel, valid):
    workflow = tmp_path / "workflow.yml"
    workflow.write_text(
        "jobs:\n  publish:\n    concurrency:\n      group: writers\n"
        f"      cancel-in-progress: {cancel}\n      queue: {queue}\n"
    )
    result = subprocess.run([sys.executable, str(SCRIPT), str(workflow)],
                            capture_output=True, text=True)
    assert (result.returncode == 0) == valid, result.stdout + result.stderr


@pytest.mark.parametrize("text", [
    "jobs:\n  publish:\n    queue: max\n",
    "concurrency:\n  group: writers\n  queue: max\n",
    "jobs:\n  publish:\n    env:\n      queue: max\n",
    "jobs:\n  publish:\n    concurrency:\n      cancel-in-progress: false\n"
    "      queue: max\n      queue: single\n",
])
def test_queue_must_be_unique_under_concurrency_with_explicit_false(tmp_path, text):
    workflow = tmp_path / "workflow.yml"
    workflow.write_text(text)
    result = subprocess.run([sys.executable, str(SCRIPT), str(workflow)],
                            capture_output=True, text=True)
    assert result.returncode != 0


def test_compatibility_rewrites_only_validated_queue_lines(tmp_path):
    workflow = tmp_path / "workflow.yml"
    text = "concurrency:\n  group: writers\n  cancel-in-progress: false\n  queue: max\n"
    # Unsupported forms remain intact for actionlint, never globally ignored.
    text += "jobs:\n  job:\n    concurrency: {group: x, queue: typo}\n    'queue': typo\n"
    workflow.write_text(text)
    result = subprocess.run([sys.executable, str(SCRIPT), "--actionlint-compat", str(workflow)],
                            capture_output=True, text=True)
    assert result.returncode == 0
    rewritten = workflow.read_text()
    assert len(rewritten.splitlines()) == len(text.splitlines())
    assert "  queue: max" not in rewritten
    assert rewritten.splitlines()[4:] == text.splitlines()[4:]


def test_compatibility_does_not_rewrite_any_file_when_validation_fails(tmp_path):
    good, bad = tmp_path / "good.yml", tmp_path / "bad.yml"
    text = "concurrency:\n  group: writers\n  cancel-in-progress: false\n  queue: max\n"
    good.write_text(text)
    bad.write_text(text.replace("max", "typo"))
    result = subprocess.run([sys.executable, str(SCRIPT), "--actionlint-compat", str(good), str(bad)],
                            capture_output=True, text=True)
    assert result.returncode != 0
    assert good.read_text() == text


def test_compatibility_preserves_malformed_unvalidated_key(tmp_path):
    workflow = tmp_path / "workflow.yml"
    text = "concurrency:\n  group: writers\n  cancel-in-progress: false\n  queue:max\n"
    workflow.write_text(text)
    subprocess.run([sys.executable, str(SCRIPT), "--actionlint-compat", str(workflow)], check=True)
    assert workflow.read_text() == text


@pytest.mark.parametrize("header", ["      - run: |", "      - run: >-", "        run: |2"])
def test_compatibility_preserves_yaml_inside_block_scalars(tmp_path, header):
    workflow = tmp_path / "workflow.yml"
    script = ("jobs:\n  example:\n    steps:\n" + header + "\n"
              "          cat <<'YAML'\n          concurrency:\n"
              "            cancel-in-progress: false\n            queue: max\n          YAML\n")
    suffix = "    concurrency:\n      cancel-in-progress: false\n      queue: max\n"
    workflow.write_text(script + suffix)
    subprocess.run([sys.executable, str(SCRIPT), "--actionlint-compat", str(workflow)], check=True)
    assert workflow.read_text() == script + suffix.replace(
        "queue: max", "# queue validated by check_workflow_concurrency.py")
