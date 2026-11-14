#!/usr/bin/env python3
"""Registry-backed inventory of every tracked manifest, including snapshots.

Reuse the repository's registry adapters. Package managers remain responsible
for resolving lockfiles; this script records declarations rather than inventing
a dependency graph. Run from the repository root.
"""

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
import tomllib
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "dev/log/issues/405/pulls/406/research"
SPEC = importlib.util.spec_from_file_location(
    "dependency_check", ROOT / "scripts/ci/check-dependencies.py"
)
CHECK = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = CHECK
SPEC.loader.exec_module(CHECK)


def inventory():
    dependencies = CHECK.manifests()
    tracked = (
        subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
        .decode()
        .split("\0")
    )
    manifests = {
        "package.json",
        "Cargo.toml",
        "pyproject.toml",
        "pom.xml",
        "go.mod",
        "composer.json",
        "maven-wrapper.properties",
        "gradle-wrapper.properties",
        "build.gradle.kts",
        "settings.gradle.kts",
        "CMakeLists.txt",
    }
    for relative in filter(None, tracked):
        path = ROOT / relative
        source = None
        if path.name == "package.json":
            data = json.loads(path.read_text())

            def npm_entries(items):
                for name, requirement in items.items():
                    if isinstance(requirement, dict):
                        yield from npm_entries(requirement)
                    elif name != "." and not requirement.startswith(
                        ("file:", "workspace:", "$")
                    ):
                        yield CHECK.Dependency(
                            path, "npm", name, requirement, requirement
                        )

            for section in (
                "dependencies",
                "devDependencies",
                "optionalDependencies",
                "overrides",
            ):
                dependencies.extend(npm_entries(data.get(section, {})))
            continue
        if (
            path.name in manifests
            or path.suffix == ".csproj"
            or (path.name.startswith("requirements") and path.suffix == ".txt")
        ):
            source = path.read_text()
            # The active checker deliberately rejects unpinned packages.
            # Preserve them in this audit as an explicit zero floor.
            if path.name == "pyproject.toml":
                data = tomllib.loads(source)
                requirements = list(data.get("build-system", {}).get("requires", []))
                requirements += data.get("project", {}).get("dependencies", [])
                for items in (
                    data.get("project", {}).get("optional-dependencies", {}).values()
                ):
                    requirements += items
                for requirement in requirements:
                    if requirement.startswith("links-notation["):
                        continue
                    if re.fullmatch(r"[\w.-]+(?:\[[^]]+\])?", requirement):
                        source = source.replace(
                            '"' + requirement + '"', '"' + requirement + '>=0"'
                        )
            with tempfile.TemporaryDirectory() as temporary:
                base = Path(temporary)
                project = base / "project"
                project.mkdir()
                filename = (
                    "requirements.txt"
                    if path.name.startswith("requirements")
                    else path.name
                )
                (project / filename).write_text(source)
                previous = CHECK.ACTIVE
                CHECK.ACTIVE = ("project",)
                try:
                    for dependency in CHECK.manifests(base):
                        dependencies.append(
                            CHECK.Dependency(
                                path,
                                dependency.ecosystem,
                                dependency.name,
                                dependency.declared,
                                dependency.literal,
                            )
                        )
                finally:
                    CHECK.ACTIVE = previous
        if path.suffix in {".yaml", ".yml"}:
            source = path.read_text()
            for match in re.finditer(r"uses:\s*([\w.-]+/[\w./-]+)@([^\s#]+)", source):
                repo, reference = match.groups()
                if reference == "stable":
                    continue
                dependencies.append(
                    CHECK.Dependency(
                        path,
                        "github",
                        "/".join(repo.split("/")[:2]),
                        reference,
                        reference,
                    )
                )
            for match in re.finditer(
                r"repo:\s*https://github.com/([\w.-]+/[\w.-]+)\s+rev:\s*([^\s]+)",
                source,
            ):
                dependencies.append(
                    CHECK.Dependency(path, "github", match[1], match[2], match[2])
                )
        # Central NuGet props used by the historical templates.
        if path.name == "Directory.Build.props":
            import xml.etree.ElementTree as ET

            for item in ET.fromstring(path.read_text()).iter("PackageReference"):
                name = item.get("Include") or item.get("Update")
                version = item.get("Version") or item.findtext("Version")
                dependencies.append(
                    CHECK.Dependency(path, "nuget", name, version, version)
                )
    return list(dict.fromkeys(dependencies))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resolve", action="store_true")
    parser.add_argument("--update", action="store_true")
    args = parser.parse_args()
    dependencies = inventory()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    rows = [{**asdict(d), "path": str(d.path.relative_to(ROOT))} for d in dependencies]
    (EVIDENCE / "declarations.json").write_text(json.dumps(rows, indent=2) + "\n")
    snapshot = EVIDENCE / "registry-all.json"
    releases = json.loads(snapshot.read_text()) if snapshot.exists() else {}
    errors = {}
    if args.resolve:
        keys = sorted({(d.ecosystem, d.name) for d in dependencies})

        def query(key):
            label = ":".join(key)
            try:
                return label, CHECK.latest(*key), None
            except Exception as error:
                return label, None, str(error)

        # Registry requests are lightweight; do not run package builds in parallel.
        with ThreadPoolExecutor(max_workers=4) as executor:
            for label, release, error in executor.map(query, keys):
                if error:
                    errors[label] = error
                else:
                    releases[label] = release
        snapshot.write_text(json.dumps(releases, indent=2, sort_keys=True) + "\n")
        (EVIDENCE / "registry-errors.json").write_text(
            json.dumps(errors, indent=2) + "\n"
        )
    before = json.loads((EVIDENCE / "declarations-before.json").read_text())
    baseline = {}
    for row in before:
        baseline.setdefault((row["path"], row["ecosystem"], row["name"]), set()).add(
            row["declared"]
        )
    tables = {}
    pins = json.loads((EVIDENCE / "registry-action-shas.json").read_text())
    for dependency in dependencies:
        release = releases.get(f"{dependency.ecosystem}:{dependency.name}")
        path = str(dependency.path.relative_to(ROOT))
        old = ", ".join(
            sorted(
                baseline.get((path, dependency.ecosystem, dependency.name), {"added"})
            )
        )
        reason = "Current stable floor/ref"
        if dependency.name == "links-notation":
            reason = (
                "Historical before-version in issue-316 performance comparison; "
                "changing it would invalidate the comparison"
            )
        elif release is None:
            reason = "UNRESOLVED: verification required"
        elif dependency.ecosystem == "github" and dependency.name in pins:
            pin = pins[dependency.name]
            if dependency.declared == pin["sha"]:
                reason = f"Immutable commit for {pin['tag']}; original SHA pin policy preserved"
        elif (
            dependency.name == "taiki-e/install-action"
            and dependency.declared == "cargo-llvm-cov"
        ):
            reason = "Documented tool-selecting branch API; action release is listed separately"
        tables.setdefault(dependency.ecosystem, []).append(
            f"| `{path}` | {dependency.name} | `{old}` | `{dependency.declared}` | "
            f"`{release or 'UNRESOLVED'}` | {reason} |"
        )
        if (
            args.update
            and release
            and CHECK.version_key(dependency.floor) != CHECK.version_key(release)
        ):
            print(
                f"UPDATE {path}: {dependency.name} {dependency.declared} -> {release}"
            )
            if dependency.name == "links-notation":
                # The only external Rust reference is the intentionally fixed
                # before-version in a performance comparison, not a tool.
                print("RETAIN: historical comparison or local self-reference")
            elif dependency.name == "dtolnay/rust-toolchain":
                source = dependency.path.read_text().replace(
                    "dtolnay/rust-toolchain@" + dependency.declared,
                    "dtolnay/rust-toolchain@stable",
                )
                dependency.path.write_text(source)
            elif (
                dependency.name == "taiki-e/install-action"
                and dependency.declared == "cargo-llvm-cov"
            ):
                # This is the action's tool-selecting branch API, not a version.
                print("RETAIN: tool-selecting branch; reviewed separately")
            elif (
                dependency.ecosystem == "npm" and dependency.path.name == "package.json"
            ):
                data = json.loads(dependency.path.read_text())

                def replace_npm(items):
                    for name, requirement in items.items():
                        if isinstance(requirement, dict):
                            replace_npm(requirement)
                        elif (
                            name == dependency.name
                            and requirement == dependency.declared
                        ):
                            items[name] = re.sub(
                                r"\d+(?:\.\d+)*", release, requirement, count=1
                            )

                for section in (
                    "dependencies",
                    "devDependencies",
                    "optionalDependencies",
                    "overrides",
                ):
                    replace_npm(data.get(section, {}))
                dependency.path.write_text(json.dumps(data, indent=2) + "\n")
            elif dependency.declared == ">=0":
                source = dependency.path.read_text()
                source = source.replace(
                    '"' + dependency.name + '"',
                    '"' + dependency.name + ">=" + release + '"',
                )
                dependency.path.write_text(source)
            elif dependency.ecosystem == "pypi":
                # An obsolete upper bound must not exclude the raised floor.
                replacement = (
                    "==" if dependency.declared.startswith("==") else ">="
                ) + release
                source = re.sub(
                    r"("
                    + re.escape(dependency.name)
                    + r"(?:\[[^]]+\])?)"
                    + re.escape(dependency.declared),
                    lambda match: match[1] + replacement,
                    dependency.path.read_text(),
                )
                dependency.path.write_text(source)
            elif dependency.path.name == "Directory.Build.props":
                source = dependency.path.read_text().replace(
                    'Version="' + dependency.declared + '"', 'Version="' + release + '"'
                )
                dependency.path.write_text(source)
            elif CHECK.update(dependency, release) is False:
                errors[f"update:{path}:{dependency.name}"] = "manual update required"
    result = [
        "# Dependency declarations: before, after and latest stable",
        "",
        "Registry queries performed on 2026-11-13 UTC. Raw results: `registry-all.json`. "
        "Before values are immutable initial-SHA evidence from `declarations-before.json`; "
        "local/self references are not external dependencies.",
        "",
    ]
    for ecosystem, lines in sorted(tables.items()):
        result += [
            f"## {ecosystem}",
            "",
            "| Manifest | Dependency | Before | After | Latest stable | Decision |",
            "| --- | --- | --- | --- | --- | --- |",
            *sorted(set(lines)),
            "",
        ]
    (EVIDENCE / "dependency-tables.md").write_text("\n".join(result))
    print(
        f"Inventoried {len(dependencies)} declarations, {len(releases)} registry results."
    )
    for key, error in errors.items():
        print(f"ERROR {key}: {error}")
    return bool(errors)


if __name__ == "__main__":
    sys.exit(main())
