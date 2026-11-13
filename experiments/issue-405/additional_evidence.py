#!/usr/bin/env python3
"""Record runtime pins and native Maven/Gradle graphs with registry comparisons."""

import importlib.util
import json
import re
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dev/log/issues/405/pulls/406/research"
BASE = "7902557fc0bd8a50d5d2c7beba06beb48b559d63"
SPEC = importlib.util.spec_from_file_location(
    "dependency_check", ROOT / "scripts/ci/check-dependencies.py"
)
CHECK = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = CHECK
SPEC.loader.exec_module(CHECK)


def graph_rows():
    rows = []

    def visit(node, path, parent):
        name = node["groupId"] + ":" + node["artifactId"]
        if parent and not name.startswith("io.github.link-foundation:"):
            rows.append(
                dict(path=path, name=name, after=node["version"], parent=parent)
            )
        for child in node.get("children", []):
            visit(child, path, name + "@" + node["version"])

    for path in ("maven-java-graph.json", "maven-benchmarks-graph.json"):
        visit(json.loads((OUT / path).read_text()), path, None)
    for row in json.loads((OUT / "gradle-resolved.json").read_text()):
        rows.append(dict(row, path="gradle-resolved.json"))
    return rows


def resolved_evidence():
    rows = graph_rows()
    cache_path = OUT / "registry-jvm-transitive.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}

    def query(name):
        return name, CHECK.latest("maven", name)

    missing = sorted({r["name"] for r in rows} - set(cache))
    with ThreadPoolExecutor(max_workers=4) as executor:
        for name, version in executor.map(query, missing):
            cache[name] = version
    cache_path.write_text(json.dumps(cache, indent=2, sort_keys=True) + "\n")
    lines = [
        "# Native JVM dependency graphs",
        "",
        "Collected 2026-11-13 UTC from Maven dependency:tree and Gradle's native "
        "ResolutionResult. These artifacts had no committed before lock; direct "
        "before requirements are in dependency-tables.md. Gradle's formatter "
        "configuration is a private upstream tool runtime, not application API. "
        "Registry evidence is registry-jvm-transitive.json.",
        "",
        "| Native graph | Artifact | Selected | Latest stable | Parent / decision |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in sorted(rows, key=lambda r: (r["path"], r["name"], r["after"])):
        row["latest"] = cache[row["name"]]
        decision = "Current registry release"
        if row["after"] != row["latest"]:
            decision = (
                "ktlint 1.8.0 embedded compiler API; replacing these modules with "
                "2.4.21 reproduces 'Extensions storage is not registered'. "
                "Upstream ktlint/ktlint#3403 confirms incompatibility; "
                "ci-logs/issue405-ktlint-upgrade-trace.log records the experiment"
            )
        lines.append(
            f"| {row['path']} | {row['name']} | {row['after']} | {row['latest']} "
            f"| {row['parent']}; {decision} |"
        )
    (OUT / "jvm-transitives.md").write_text("\n".join(lines) + "\n")
    (OUT / "jvm-transitives.json").write_text(json.dumps(rows, indent=2) + "\n")
    maven = [r for r in rows if r["path"].startswith("maven-")]
    (OUT / "maven-transitives.json").write_text(json.dumps(maven, indent=2) + "\n")
    # OSV batch is advisory evidence for the exact resolved Maven coordinates.
    coordinates = sorted({(r["name"], r["after"]) for r in rows})
    request = urllib.request.Request(
        "https://api.osv.dev/v1/querybatch",
        data=json.dumps(
            {
                "queries": [
                    {"package": {"ecosystem": "Maven", "name": n}, "version": v}
                    for n, v in coordinates
                ]
            }
        ).encode(),
        headers={"Content-Type": "application/json"},
    )
    response = json.load(urllib.request.urlopen(request))
    evidence = [
        dict(name=name, version=version, **result)
        for (name, version), result in zip(coordinates, response["results"])
    ]
    (OUT / "jvm-osv-audit.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print("JVM:", len(rows), "edges,", len(coordinates), "exact artifacts")
    if any(row.get("vulns") for row in evidence):
        raise ValueError("OSV reports JVM advisories; review jvm-osv-audit.json")


def runtime_evidence():
    versions = {
        "node-version": "26.13.1",
        "python-version": "3.15.0",
        "php-version": "8.5.12",
        "go-version": "1.27.4",
        "java-version": "27.0.1",
        "JAVA_VERSION": "27.0.1",
        "PHP_VERSION": "8.5.12",
        "dotnet-version": "11.0.100",
        "bun-version": "1.4.4",
        "ZIZMOR_VERSION": "1.32.0",
    }
    pattern = re.compile(r"^\s*(" + "|".join(versions) + r"):\s*([^\n#]+)", re.M)
    rows = []
    paths = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True)
    for relative in paths.splitlines():
        path = ROOT / relative
        if path.suffix not in {".yml", ".yaml"} or "research/" in relative:
            continue
        source = path.read_text()
        found = list(pattern.finditer(source))
        if not found:
            continue
        old = subprocess.run(
            ["git", "show", BASE + ":" + relative],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        before = {}
        for match in pattern.finditer(old):
            before.setdefault(match[1], set()).add(match[2].strip())
        for match in found:
            key, value = match[1], match[2].strip()
            if "${{" in value:
                continue
            reason = "Current registry runtime default"
            if value.startswith("["):
                reason = "Current compiler plus deliberately retained consumer compatibility test lanes"
            rows.append(
                dict(
                    path=relative,
                    tool=key,
                    before=sorted(before.get(key, [])),
                    after=value,
                    latest=versions[key],
                    reason=reason,
                )
            )
    lines = [
        "# Toolchains, installed defaults and supported consumer floors",
        "",
        "Registry snapshots are toolchain-*.json/toml.gz, registry-all.json and "
        "docker-*.json in this folder. Every workflow default below is compared "
        "with the initial issue SHA. Matrix floor lanes are intentional coverage, "
        "not a claim that the old compiler is the current default.",
        "",
        "| Path | Tool | Before | After | Registry latest | Decision |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| `{row['path']}` | {row['tool']} | {', '.join(row['before'])} "
            f"| {row['after']} | {row['latest']} | {row['reason']} |"
        )
    lines += [
        "",
        "## Other toolchains and explicit exceptions",
        "",
        "| Tool / location | Current selection | Latest observed | Decision |",
        "| --- | --- | --- | --- |",
        "| Rust compiler | stable (1.100.0 observed); templates MSRV 1.100 | 1.100.0 | Current stable "
        "channel; active MSRV 1.87 is a separate CI-tested consumer promise; 1.86.0 is the deliberate "
        "negative floor-rejection probe |",
        "| Rust edition | 2024 | 2024 | All workspace and template crates aligned |",
        "| .NET global.json / executables | 11.0.100 / net11.0 | 11.0.100 | All SDK pins aligned; "
        "published active library keeps net10 consumer API surface |",
        "| Swift CI container | 6.4.2-noble, digest "
        "23d9b28ad97fb1cf1999edc3a0cb265ee915ed42299a9344e7173d5a6d2b05f4 | 6.4.2 | Verified official "
        "registry digest; Swift tools 5.9 is tested consumer floor |",
        "| Maven wrapper | 3.10.0 / wrapper 3.3.4 | 3.10.0 / 3.3.4 | Current distribution and checksums;"
        " Maven 3.6.3 is the explicit floor-test job |",
        "| Gradle wrapper | 9.9.1 | 9.9.1 | Native wrapper scripts/JAR/checksum regenerated |",
        "| Go module directives | active/probes 1.26; templates 1.27.4 | 1.27.4 | Compiler selection is "
        "current; active/probe directive expresses supported language floor |",
        "| Java bytecode | release 21 | JDK 27.0.1 | Current JDK builds supported Java 21 API; CI tests 21/25/27 |",
        "| Python package floors | active >=3.11; templates >=3.13 | 3.15.0 | Active floor test "
        "retained; Sphinx 9 requires newer template floor |",
        "| PHP package floor | >=8.4 | 8.5.12 | PHPUnit 13 requires 8.4; CI tests minimum plus current |",
        "| CMake | tool requirement 4.4.4; consumer floor 3.16 | 4.4.4 | Separate native consumer-floor "
        "CI job retained |",
        "| Conan template | >=2.34.0 | 2.34.0 | Honest tool floor; no older major upper bound |",
        "| Yarn Classic provisioned by KGP | 1.22.22 | Classic 1.22.22 (Berry 4 is separate API) | KGP "
        "owns Classic invocation and lock schema; substituting Berry is unsupported |",
        "| Gitpod Dockerfiles (both) | "
        "2026-02-12-23-06-03@sha256:253772ffe6d042a39b7802e3101ace08b6b21914e8116d9bf6d9f84332b78e11 | "
        "same | Registry's latest dated workspace-dotnet image; keep immutable digest |",
        "| vcpkg baseline | 414b5330a184ea5fbc6ca29f7960b189f6b0392f | same | Current registry baseline,"
        " benchmark port lag reported upstream #55056 |",
        "| pre-commit mirrors-eslint | v10.14.0 + eslint@10.15.0 | mirror v10.14.0 / npm 10.15.0 | "
        "Mirror publication lag, checked missing v10.15 tag; actual lint executable is current |",
        "| Hosted OS images | ubuntu-26.04 / windows-2025 / macos-26 | supported hosted labels | "
        "Explicit image policy retained instead of moving -latest aliases |",
        "| rust-script installer | 0.36.0 | 0.36.0 | Current crates.io release, research/rust-script-latest.json |",
        "",
        "Local installed patches differ from CI defaults where the container "
        "preinstalls an older patch (Node 26.13.0, Swift 6.4.1, PHP 8.5.11, "
        "JDK 25). Local pass results do not claim execution on the newer CI patch.",
        "",
    ]
    (OUT / "toolchains.md").write_text("\n".join(lines))
    (OUT / "runtime-inventory.json").write_text(json.dumps(rows, indent=2) + "\n")
    print("Runtime pins:", len(rows))


if __name__ == "__main__":
    runtime_evidence()
    resolved_evidence()
