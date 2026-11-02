#!/usr/bin/env python3
"""Audit resolved Conan, CMake developer and vcpkg dependency coordinates.

Requires pinned Conan and a bootstrapped vcpkg (VCPKG_INSTALLATION_ROOT or
PATH). Conan resolves both build and host transitive dependencies. vcpkg's
dry-run resolves every manifest feature without compiling. ConanCenter's
supported audit provider receives every resolved package/version, including
native build tools. Unknown packages are coverage errors, never clean scans.

CONAN_AUDIT_PROVIDER_TOKEN_CONANCENTER authenticates the provider. When absent,
PRs report incomplete coverage with a warning; main/schedules/dispatch fail
with setup instructions. Findings and all other errors fail on every event.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import cpp_project as cp


def cmake_references(text: str) -> list[str]:
    text = re.sub(r"#[^\n]*", "", text)
    mapping = {"googletest": ("GTEST", "gtest"), "benchmark": ("BENCHMARK", "benchmark")}
    refs = set()
    for name in re.findall(r"FetchContent_Declare\(\s*([\w-]+)", text, re.I):
        if name not in mapping:
            raise ValueError(f"Unmapped CMake dependency {name}: add its provider coordinate")
        suffix, package = mapping[name]
        version = re.search(rf"set\(\w+_{suffix}_VERSION\s+([\w.+-]+)\)", text)
        if not version:
            raise ValueError(f"Missing pinned CMake version for {name}")
        refs.add(f"{package}/{version[1]}")
    if not refs:
        raise ValueError("No CMake developer dependencies found; inventory format may have changed")
    return sorted(refs)


def cmake_tools(root: Path) -> list[dict[str, str]]:
    path = root / "examples/consumers/cpm/CMakeLists.txt"
    if not path.exists():
        return []  # Consumers are optional in projects derived from this template.
    text = re.sub(r"#[^\n]*", "", path.read_text())
    version = re.search(r"set\(CPM_VERSION\s+(\d+\.\d+\.\d+)\)", text)
    digest = re.search(r"set\(CPM_SHA256\s+([0-9a-f]{64})\)", text)
    if not version or not digest:
        raise ValueError("CPM consumer must declare a pinned version and SHA256")
    return [{"name": "CPM.cmake", "version": version[1], "sha256": digest[1],
             "provider_reference": f"cpm-cmake/{version[1]}"}]


def graph_references(payload) -> list[str]:
    graph = payload.get("graph") if isinstance(payload, dict) else None
    nodes = graph.get("nodes") if isinstance(graph, dict) else None
    if not isinstance(nodes, dict) or "0" not in nodes:
        raise ValueError("Missing resolved Conan graph")
    refs = set()
    for key, node in nodes.items():
        if not isinstance(node, dict):
            raise ValueError(f"Invalid Conan node {key}")
        if node.get("error") or node.get("info_invalid"):
            raise ValueError(f"Invalid Conan node {key}: {node.get('info_invalid') or node.get('error')}")
        if key == "0":
            continue  # local consumer, not a third-party dependency
        ref = node.get("ref")
        if not isinstance(ref, str) or "/" not in ref:
            raise ValueError(f"Unresolved Conan node {key}")
        refs.add(ref.split("#", 1)[0])
    return sorted(refs)


def vcpkg_coordinates(plan: str) -> list[tuple[str, str]]:
    packages = re.findall(
        r"^\s*(?:\* )?([a-z0-9-]+)(?:\[[^\]]+\])?:[\w-]+@([^\s]+)", plan, re.M
    )
    if not packages:
        raise ValueError("No resolved vcpkg coordinates: missing or unrecognized dry-run plan")
    return sorted(set(packages))


def validate_report(payload, refs: list[str]) -> list[str]:
    if not isinstance(payload, dict):
        return ["Invalid native provider response"]
    if payload.get("conan_error"):
        return [f"Native provider failed: {payload['conan_error']}"]
    data = payload.get("data")
    if not isinstance(data, dict):
        return ["Missing native provider verdicts"]
    errors = []
    for ref in refs:
        verdict = data.get(ref)
        if not isinstance(verdict, dict) or verdict.get("error"):
            errors.append(f"{ref}: unknown/unscanned package: {verdict}")
            continue
        vulns = verdict.get("vulnerabilities")
        if not isinstance(vulns, dict):
            errors.append(f"{ref}: missing vulnerability verdict")
        elif (type(vulns.get("totalCount")) is not int
              or not isinstance(vulns.get("edges"), list)
              or vulns["totalCount"] != len(vulns["edges"])):
            errors.append(f"{ref}: incomplete vulnerability response")
        elif vulns["totalCount"]:
            errors.append(f"{ref}: {vulns['totalCount']} vulnerability finding(s)")
    return errors


def run(command: list[str], output: Path, *, cwd: Path, json_output=False):
    # Keep raw coordinates and resolver diagnostics even when a command fails.
    with output.open("w", encoding="utf-8") as stdout, output.with_suffix(".log").open(
        "w", encoding="utf-8"
    ) as stderr:
        result = subprocess.run(command, cwd=cwd, stdout=stdout, stderr=stderr, check=False)
    if result.returncode:
        raise ValueError(f"{command[0:3]} failed ({result.returncode}); see {output} and {output.with_suffix('.log')}")
    text = output.read_text(encoding="utf-8")
    return json.loads(text) if json_output else text


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    cp.add_cpp_root_argument(parser)
    parser.add_argument("--out-dir", default="security-reports/native")
    args = parser.parse_args(argv)
    out = Path(args.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    status = {"status": "incomplete", "references": [], "errors": []}
    try:
        layout = cp.detect_layout(cpp_root=args.cpp_root)
        root = layout.root.resolve()
        developer_refs = cmake_references((root / "cmake/Dependencies.cmake").read_text())
        refs = set()
        for label, inputs in (("project", [str(root)]), ("developer", [
            f"--requires={ref}" for ref in developer_refs
        ])):
            graph = run(["conan", "graph", "info", *inputs, "-s", "compiler.cppstd=20",
                         "--format=json"], out / f"{label}-graph.json", cwd=root, json_output=True)
            resolved = graph_references(graph)
            if label == "developer" and not set(developer_refs).issubset(resolved):
                raise ValueError("Conan graph omitted requested CMake dependencies")
            refs.update(resolved)
            status["references"] = sorted(refs)
        manifest = json.loads(layout.vcpkg_manifest.read_text())
        vcpkg_root = os.environ.get("VCPKG_INSTALLATION_ROOT", "")
        vcpkg = str(Path(vcpkg_root) / "vcpkg") if vcpkg_root else shutil.which("vcpkg")
        if not vcpkg:
            raise ValueError("Set VCPKG_INSTALLATION_ROOT to a bootstrapped vcpkg checkout")
        plan = run([vcpkg, "install", "--dry-run", "--triplet=x64-linux",
                    f"--x-install-root={out / 'vcpkg-installed'}",
                    *(f"--x-feature={feature}" for feature in manifest.get("features", {}))],
                   out / "vcpkg-plan.txt", cwd=root)
        coordinates = vcpkg_coordinates(plan)
        (out / "vcpkg-coordinates.json").write_text(json.dumps(coordinates, indent=2) + "\n")
        # Provider package names agree for this template's gtest and benchmark.
        # Other ports (including build helpers) are sent too: an unsupported
        # coordinate must be reported unknown by the provider, never omitted.
        refs.update(f"{name}/{version.split('#', 1)[0]}" for name, version in coordinates)
        tools = cmake_tools(root)
        (out / "cmake-tools.json").write_text(json.dumps(tools, indent=2) + "\n")
        refs.update(tool["provider_reference"] for tool in tools)
        refs = sorted(refs)
        status["references"] = refs
        sbom = {"bomFormat": "CycloneDX", "specVersion": "1.5", "version": 1,
                "components": [{"type": "library", "name": ref.split('/')[0],
                                "purl": "pkg:conan/" + ref.replace('/', '@', 1)} for ref in refs]}
        sbom_path = out / "resolved.cdx.json"
        sbom_path.write_text(json.dumps(sbom, indent=2) + "\n")
        if not os.environ.get("CONAN_AUDIT_PROVIDER_TOKEN_CONANCENTER"):
            message = ("Native audit INCOMPLETE: configure repository secret "
                       "CONAN_AUDIT_PROVIDER_TOKEN_CONANCENTER after registering at "
                       "https://audit.conan.io/register. Resolved coordinates are retained; "
                       "no clean vulnerability verdict is available.")
            status["errors"] = [message]
            is_pr = os.environ.get("GITHUB_EVENT_NAME") == "pull_request"
            print(f"::{'warning' if is_pr else 'error'}::{message}")
            return 0 if is_pr else 1
        report = run(["conan", "audit", "list", "--sbom", str(sbom_path), "--format=json"],
                     out / "provider.json", cwd=root, json_output=True)
        status["errors"] = validate_report(report, refs)
        if not status["errors"]:
            status["status"] = "clean"
        for error in status["errors"]:
            print(f"::error::{error}")
        return int(bool(status["errors"]))
    except (OSError, ValueError, KeyError, TypeError) as error:
        status["errors"] = [str(error)]
        print(f"::error::Native audit INCOMPLETE: {error}")
        return 1
    finally:
        (out / "status.json").write_text(json.dumps(status, indent=2) + "\n")
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with Path(summary).open("a", encoding="utf-8") as stream:
                stream.write(f"\nNative dependency audit: **{status['status']}**.\n")
                for error in status["errors"]:
                    stream.write(f"\n- {error}\n")


if __name__ == "__main__":
    sys.exit(main())
