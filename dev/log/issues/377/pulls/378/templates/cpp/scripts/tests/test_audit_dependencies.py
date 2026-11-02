"""Reject findings and incomplete ecosystem audit responses."""

import importlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest


def native():
    return importlib.import_module("audit_native_dependencies")


def python_audit():
    return importlib.import_module("check_python_audit")


def test_native_provider_requires_every_resolved_coordinate():
    refs = ["gtest/1.18.0", "benchmark/1.9.5"]
    clean = {"vulnerabilities": {"totalCount": 0, "edges": []}}
    assert native().validate_report({"data": {ref: clean for ref in refs}}, refs) == []
    assert native().validate_report({"data": {refs[0]: clean}}, refs)


@pytest.mark.parametrize("entry", [
    {}, {"error": {"details": "Package not found"}},
    {"vulnerabilities": {"totalCount": 1, "edges": [{"node": {"name": "CVE-test"}}]}},
    {"vulnerabilities": {"totalCount": 0, "edges": [{}]}},
    {"vulnerabilities": {"totalCount": 1, "edges": []}},
    {"vulnerabilities": {"totalCount": "0", "edges": []}},
])
def test_native_unknown_findings_and_malformed_responses_fail(entry):
    assert native().validate_report({"data": {"gtest/1": entry}}, ["gtest/1"])


@pytest.mark.parametrize("payload", [{}, [], {"conan_error": "Unauthorized"},
    {"data": {}}, {"data": [], "conan_error": "rate limited"}])
def test_missing_or_failed_provider_report_fails(payload):
    assert native().validate_report(payload, ["gtest/1"])


def test_native_graph_includes_host_and_build_transitives():
    graph = {"graph": {"nodes": {
        "0": {"ref": "my_package/1", "recipe": "Consumer"},
        "1": {"ref": "gtest/1.18.0#revision", "context": "host"},
        "2": {"ref": "cmake/4.0#revision", "context": "build"},
    }}}
    assert native().graph_references(graph) == ["cmake/4.0", "gtest/1.18.0"]


@pytest.mark.parametrize("payload", [{}, {"graph": None}, {"graph": {"nodes": []}},
    {"graph": {"nodes": {"0": None}}},
    {"graph": {"nodes": {"0": {}, "1": {"ref": None}}}},
    {"graph": {"nodes": {"0": {"info_invalid": "bad compiler"}}}},
])
def test_unresolved_or_malformed_native_graph_fails(payload):
    with pytest.raises(ValueError):
        native().graph_references(payload)


def test_vcpkg_plan_keeps_transitive_build_packages_and_port_versions():
    plan = """Computing installation plan...
The following packages will be built and installed:
    gtest[core]:x64-linux@1.18.0#2 -- /cache/port
  * vcpkg-cmake:x64-linux@2024-04-23
"""
    packages = native().vcpkg_coordinates(plan)
    assert packages == [("gtest", "1.18.0#2"), ("vcpkg-cmake", "2024-04-23")]
    with pytest.raises(ValueError):
        native().vcpkg_coordinates("unrecognized dependency plan")


def test_cmake_inventory_uses_current_versions_and_rejects_unmapped_fetches():
    text = """set(MY_PACKAGE_GTEST_VERSION 1.18.0)
set(MY_PACKAGE_BENCHMARK_VERSION 1.9.5)
FetchContent_Declare(googletest URL "...v${MY_PACKAGE_GTEST_VERSION}.tar.gz")
FetchContent_Declare(benchmark URL "...v${MY_PACKAGE_BENCHMARK_VERSION}.tar.gz")
"""
    assert native().cmake_references(text) == ["benchmark/1.9.5", "gtest/1.18.0"]
    with pytest.raises(ValueError):
        native().cmake_references(text + "\nFetchContent_Declare(new_library URL something)")


def test_cpm_consumer_tool_is_inventoried_with_integrity_pin(tmp_path):
    assert native().cmake_tools(tmp_path) == []
    path = tmp_path / "examples/consumers/cpm/CMakeLists.txt"
    path.parent.mkdir(parents=True)
    path.write_text("set(CPM_VERSION 0.42.0)\nset(CPM_SHA256 " + "a" * 64 + ")\n")
    assert native().cmake_tools(tmp_path) == [{
        "name": "CPM.cmake", "version": "0.42.0", "sha256": "a" * 64,
        "provider_reference": "cpm-cmake/0.42.0",
    }]
    path.write_text("set(CPM_VERSION floating)")
    with pytest.raises(ValueError):
        native().cmake_tools(tmp_path)


def test_python_audit_requires_nonempty_complete_dependencies():
    assert python_audit().validate({"dependencies": [
        {"name": "pytest", "version": "9.1.1", "vulns": []}
    ]}) == []
    for payload in [{}, {"dependencies": []}, {"dependencies": [{}]},
        {"dependencies": [{"name": "private", "skip_reason": "not on PyPI"}]},
        {"dependencies": [{"name": "bad", "version": "1", "vulns": [{"id": "CVE-test"}]}]},
    ]:
        assert python_audit().validate(payload)


def test_failure_verdict_propagates_to_terminal_security_gate(tmp_path):
    gate = Path(__file__).resolve().parents[1] / "check-pipeline-status.sh"
    for job in ["codeql", "native-audit", "python-audit"]:
        result = subprocess.run(["bash", str(gate)], capture_output=True, text=True,
            env={**os.environ, "NEEDS_JSON": json.dumps({job: {"result": "failure"}})})
        assert result.returncode == 1
        assert job in result.stdout


@pytest.mark.parametrize("multi", [False, True])
@pytest.mark.parametrize("event,token,verdict,expected,status", [
    ("pull_request", "", "clean", 0, "incomplete"),
    ("push", "", "clean", 1, "incomplete"),
    ("schedule", "", "clean", 1, "incomplete"),
    ("workflow_dispatch", "", "clean", 1, "incomplete"),
    ("pull_request", "test-token", "clean", 0, "clean"),
    ("pull_request", "test-token", "finding", 1, "incomplete"),
    ("pull_request", "test-token", "unknown", 1, "incomplete"),
    ("pull_request", "test-token", "unauthorized", 1, "incomplete"),
])
def test_native_audit_event_and_coverage_policy(
    make_repo, tmp_path, monkeypatch, multi, event, token, verdict, expected, status
):
    repo = make_repo(multi=multi)
    repo.write(repo.prefix + "cmake/Dependencies.cmake", """set(MY_PACKAGE_GTEST_VERSION 1.18.0)
FetchContent_Declare(googletest URL pinned)
""")
    repo.write(repo.prefix + "examples/consumers/cpm/CMakeLists.txt",
               "set(CPM_VERSION 0.42.0)\nset(CPM_SHA256 " + "a" * 64 + ")\n")
    monkeypatch.setenv("GITHUB_EVENT_NAME", event)
    monkeypatch.setenv("CONAN_AUDIT_PROVIDER_TOKEN_CONANCENTER", token)
    monkeypatch.setenv("VCPKG_INSTALLATION_ROOT", str(tmp_path / "vcpkg"))
    calls = []

    def resolver(command, output, **kwargs):
        calls.append(command)
        if command[1:3] == ["graph", "info"]:
            assert "compiler.cppstd=20" in command
            payload = {"graph": {"nodes": {"0": {}, "1": {"ref": "gtest/1.18.0#rev"}}}}
        elif command[1] == "install":
            return "  gtest:x64-linux@1.18.0#2\n  * vcpkg-cmake:x64-linux@2024-04-23\n"
        else:
            assert command[1:3] == ["audit", "list"]
            if verdict == "unauthorized":
                raise ValueError("Provider authorization refused (401)")
            clean = {"vulnerabilities": {"totalCount": 0, "edges": []}}
            payload = {"data": {"gtest/1.18.0": clean, "vcpkg-cmake/2024-04-23": clean,
                                "cpm-cmake/0.42.0": clean}}
            if verdict == "unknown":
                del payload["data"]["vcpkg-cmake/2024-04-23"]
            if verdict == "finding":
                payload["data"]["gtest/1.18.0"] = {
                    "vulnerabilities": {"totalCount": 1, "edges": [{"node": {"name": "CVE-test"}}]}}
        output.write_text(json.dumps(payload))
        return payload

    monkeypatch.setattr(native(), "run", resolver)
    out = tmp_path / "reports"
    assert native().main(["--out-dir", str(out)]) == expected
    report = json.loads((out / "status.json").read_text())
    assert report["status"] == status
    assert report["references"] == ["cpm-cmake/0.42.0", "gtest/1.18.0", "vcpkg-cmake/2024-04-23"]
    assert json.loads((out / "cmake-tools.json").read_text())[0]["version"] == "0.42.0"
    assert json.loads((out / "vcpkg-coordinates.json").read_text())[0][1] == "1.18.0#2"
    assert len(calls) == (4 if token else 3)
    if not token:
        assert "no clean vulnerability verdict" in report["errors"][0]
