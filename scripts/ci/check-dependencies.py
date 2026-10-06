#!/usr/bin/env python3
"""Require the latest stable direct dependencies in every active project.

Archived experiments, case studies and dev/log snapshots deliberately retain
historical versions. Platform runtimes and local project references are not
registry dependencies. Registry errors fail the check rather than hide updates.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tomllib
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
ACTIVE = (
    "js",
    "python",
    "rust",
    "csharp",
    "java",
    "php",
    "go",
    "benchmarks",
    "docs/website",
    "docs/comparison",
    "examples",
    "scripts/ci",
)
# Actions that download a separately released tool and pin it with an input.
# A stale input is as outdated as a stale action ref, but it is not part of
# the `uses:` line, so it is listed here explicitly.
TOOL_INPUTS = {"trufflesecurity/trufflehog": "version"}
STABLE = re.compile(r"^v?(\d+(?:\.\d+)*)(?:\.RELEASE)?$")


def version_key(value):
    match = STABLE.fullmatch(value)
    return tuple(map(int, match[1].split("."))) if match else ()


def newest(versions):
    stable = [v for v in versions if version_key(v)]
    if not stable:
        raise ValueError("registry returned no stable versions")
    return max(stable, key=version_key).removeprefix("v")


def get(url):
    headers = {
        "User-Agent": "links-notation-dependency-check",
        "Accept": "application/json",
    }
    if url.startswith("https://api.github.com/") and os.environ.get("GH_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def latest(ecosystem, name):
    encoded = urllib.parse.quote(name, safe="")
    if ecosystem == "npm":
        data = json.loads(get("https://registry.npmjs.org/" + encoded))
        return data["dist-tags"]["latest"]
    if ecosystem == "pypi-py39":
        data = json.loads(get("https://pypi.org/pypi/" + encoded + "/json"))
        versions = []
        for version, files in data["releases"].items():
            if (
                not version_key(version)
                or not files
                or all(f.get("yanked") for f in files)
            ):
                continue
            requirement = files[0].get("requires_python") or ""
            minimum = re.search(r">=\s*(3\.\d+)", requirement)
            if minimum and tuple(map(int, minimum[1].split("."))) > (3, 9):
                continue
            versions.append(version)
        return newest(versions)
    if ecosystem == "pypi":
        return json.loads(get("https://pypi.org/pypi/" + encoded + "/json"))["info"][
            "version"
        ]
    if ecosystem == "cargo":
        data = json.loads(get("https://crates.io/api/v1/crates/" + encoded))
        return newest(v["num"] for v in data["versions"] if not v["yanked"])
    if ecosystem == "nuget":
        data = json.loads(
            get(
                "https://api.nuget.org/v3-flatcontainer/" + name.lower() + "/index.json"
            )
        )
        return newest(data["versions"])
    if ecosystem == "composer":
        data = json.loads(get("https://repo.packagist.org/p2/" + name + ".json"))
        return newest(v["version"] for v in data["packages"][name])
    if ecosystem == "maven":
        group, artifact = name.split(":")
        path = group.replace(".", "/") + "/" + artifact
        data = ET.fromstring(
            get("https://repo.maven.apache.org/maven2/" + path + "/maven-metadata.xml")
        )
        return newest(v.text for v in data.findall("./versioning/versions/version"))
    if ecosystem in {"github", "github-input"}:
        # gh handles authentication and pagination without exposing credentials.
        result = subprocess.run(
            ["gh", "api", "repos/" + name + "/tags", "--paginate", "--jq", ".[].name"],
            check=True,
            capture_output=True,
            text=True,
        )
        tags = [tag for tag in result.stdout.splitlines() if version_key(tag)]
        if not tags:
            raise ValueError("registry returned no stable tags")
        return max(tags, key=version_key)
    if ecosystem == "go":
        escaped = "".join("!" + c.lower() if c.isupper() else c for c in name)
        return json.loads(get("https://proxy.golang.org/" + escaped + "/@latest"))[
            "Version"
        ].removeprefix("v")
    raise ValueError("unsupported ecosystem: " + ecosystem)


@dataclass(frozen=True)
class Dependency:
    path: Path
    ecosystem: str
    name: str
    declared: str
    literal: str

    @property
    def floor(self):
        match = re.match(
            r"^(?:\^|~=?|>=|==|=)?v?(\d+(?:\.\d+)*)(?=$|[^\d.])", self.declared
        )
        return match[1] if match else ""


def manifests(root=ROOT):
    found = []

    def add(path, ecosystem, name, declared, literal=None):
        if not isinstance(declared, str):
            raise ValueError(f"unpinned dependency: {path}: {name}")
        if declared.startswith(("file:", "workspace:", "path:", "git", "http")):
            return
        found.append(Dependency(path, ecosystem, name, declared, literal or declared))

    for folder in ACTIVE:
        directory = root / folder
        for path in directory.rglob("*"):
            if not path.is_file() or any(
                p
                in {
                    "node_modules",
                    "vendor",
                    "target",
                    "bin",
                    "obj",
                    ".venv",
                    "dist",
                    "generated",
                }
                for p in path.relative_to(directory).parts
            ):
                continue
            if path.name == "package.json":
                data = json.loads(path.read_text())
                for section in (
                    "dependencies",
                    "devDependencies",
                    "optionalDependencies",
                    "overrides",
                ):
                    for name, requirement in data.get(section, {}).items():
                        add(path, "npm", name, requirement)
            elif path.name in {"pyproject.toml", "Cargo.toml"}:
                data = tomllib.loads(path.read_text())
                if path.name == "pyproject.toml":
                    requirements = data.get("build-system", {}).get(
                        "requires", []
                    ) + data.get("project", {}).get("dependencies", [])
                    for items in (
                        data.get("project", {})
                        .get("optional-dependencies", {})
                        .values()
                    ):
                        requirements += items
                    for requirement in requirements:
                        match = re.fullmatch(
                            r"([\w.-]+)(?:\[[^]]+\])?([><=~!].*)", requirement
                        )
                        if not match:
                            raise ValueError(
                                f"unsupported dependency requirement: {path}: {requirement}"
                            )
                        if "python_version < '3.10'" in match[2]:
                            # setuptools 84 dropped Python 3.9. The compatibility
                            # floor is checked against the latest 3.9 release.
                            add(path, "pypi-py39", match[1], match[2])
                        else:
                            add(path, "pypi", match[1], match[2])
                else:
                    for section in (
                        "dependencies",
                        "dev-dependencies",
                        "build-dependencies",
                    ):
                        for name, requirement in data.get(section, {}).items():
                            if isinstance(requirement, dict):
                                if "path" in requirement:
                                    continue
                                add(
                                    path,
                                    "cargo",
                                    requirement.get("package", name),
                                    requirement.get("version"),
                                )
                            else:
                                add(path, "cargo", name, requirement)
            elif path.name == "requirements.txt":
                for line in path.read_text().splitlines():
                    requirement = line.partition("#")[0].strip()
                    if not requirement:
                        continue
                    match = re.fullmatch(
                        r"([\w.-]+)(?:\[[^]]+\])?([><=~!].*)", requirement
                    )
                    if not match:
                        raise ValueError(f"unpinned dependency: {path}: {requirement}")
                    if "python_version < '3.10'" in match[2]:
                        # setuptools 84 dropped Python 3.9. The compatibility
                        # floor is checked against the latest 3.9 release.
                        add(path, "pypi-py39", match[1], match[2])
                    else:
                        add(path, "pypi", match[1], match[2])
            elif path.suffix == ".csproj":
                for element in ET.fromstring(path.read_text()).iter("PackageReference"):
                    add(
                        path,
                        "nuget",
                        element.get("Include"),
                        element.get("Version") or element.findtext("Version"),
                    )
            elif path.name == "pom.xml":
                ns = {"m": "http://maven.apache.org/POM/4.0.0"}
                tree = ET.fromstring(path.read_text())
                properties = tree.find("m:properties", ns)
                props = (
                    {}
                    if properties is None
                    else {p.tag.split("}")[-1]: p.text for p in properties}
                )
                for kind in ("dependency", "plugin"):
                    for element in tree.findall(".//m:" + kind, ns):
                        name = (
                            element.findtext("m:groupId", namespaces=ns)
                            + ":"
                            + element.findtext("m:artifactId", namespaces=ns)
                        )
                        if name == "io.github.link-foundation:links-notation":
                            continue
                        requirement = element.findtext("m:version", namespaces=ns)
                        if requirement is None:
                            raise ValueError(f"unpinned dependency: {path}: {name}")
                        add(
                            path,
                            "maven",
                            name,
                            (
                                props.get(requirement[2:-1], requirement)
                                if requirement.startswith("${")
                                else requirement
                            ),
                        )
                for element in tree.findall(".//m:googleJavaFormat/m:version", ns):
                    add(
                        path,
                        "maven",
                        "com.google.googlejavaformat:google-java-format",
                        element.text,
                    )
            elif path.name == "composer.json":
                data = json.loads(path.read_text())
                local = {"link-foundation/links-notation"}
                for section in ("require", "require-dev"):
                    for name, requirement in data.get(section, {}).items():
                        if (
                            name != "php"
                            and not name.startswith("ext-")
                            and name not in local
                        ):
                            add(path, "composer", name, requirement)
            elif path.name == "go.mod":
                for match in re.finditer(
                    r"^\s*([\w./!~-]+)\s+(v\d+\.\d+\.\d+)\b", path.read_text(), re.M
                ):
                    if re.search(
                        r"replace\s+" + re.escape(match[1]) + r"\s*=>\s*\.",
                        path.read_text(),
                    ):
                        continue
                    add(path, "go", match[1], match[2])
    for path in (root / ".github/workflows").glob("*.yml"):
        for match in re.finditer(
            r"uses:\s*([\w.-]+/[\w./-]+)@([^\s#]+)", path.read_text()
        ):
            repo, reference = match.groups()
            if reference == "stable":
                # rust-toolchain's stable branch follows the current Rust compiler.
                continue
            add(
                path, "github", repo.split("/")[0] + "/" + repo.split("/")[1], reference
            )
        for step in re.split(r"\n\s*- ", path.read_text()):
            action = re.search(r"uses:\s*([\w.-]+/[\w.-]+)@", step)
            if action and action[1] in TOOL_INPUTS:
                pin = re.search(
                    r"^\s+" + TOOL_INPUTS[action[1]] + r":\s*['\"]?([^\s'\"#]+)",
                    step,
                    re.M,
                )
                if pin:
                    add(path, "github-input", action[1], pin[1])
        for match in re.finditer(
            r"npm install -g ([\w.-]+)@([^\s]+)", path.read_text()
        ):
            add(path, "npm", match[1], match[2])
        for match in re.finditer(
            r"docker://rhysd/actionlint:([^\s]+)", path.read_text()
        ):
            add(path, "github", "rhysd/actionlint", match[1])
    precommit = root / ".pre-commit-config.yaml"
    if precommit.exists():
        for match in re.finditer(
            r"repo:\s*https://github.com/([\w.-]+/[\w.-]+)\s+rev:\s*([^\s]+)",
            precommit.read_text(),
        ):
            add(precommit, "github", match[1], match[2])
    return list(dict.fromkeys(found))


def registry_literal(dependency, release):
    if dependency.ecosystem == "github-input" or (
        dependency.ecosystem == "github" and dependency.name == "rhysd/actionlint"
    ):
        # Docker image tags and tool inputs omit the release tag's leading v.
        return release.removeprefix("v")
    return release


def update(dependency, release):
    path = dependency.path
    source = path.read_text()
    original = dependency.literal
    replacement = re.sub(r"\d+(?:\.\d+)*", release, original, count=1)
    if not dependency.floor:
        replacement = release
    name = re.escape(dependency.name)
    if path.name in {"package.json", "composer.json"}:
        data = json.loads(source)
        for section in (
            "dependencies",
            "devDependencies",
            "optionalDependencies",
            "overrides",
            "require",
            "require-dev",
        ):
            if data.get(section, {}).get(dependency.name) == original:
                data[section][dependency.name] = replacement
        path.write_text(
            json.dumps(data, indent=4 if path.name == "composer.json" else 2) + "\n"
        )
        return
    if dependency.ecosystem == "github":
        replacement = registry_literal(dependency, release)
        if path.name == ".pre-commit-config.yaml":
            source = re.sub(
                r"(repo:\s*https://github.com/"
                + name
                + r"\s+rev:\s*)"
                + re.escape(original)
                + r"(?=\s|$)",
                lambda m: m[1] + replacement,
                source,
            )
        elif dependency.name == "rhysd/actionlint":
            source = source.replace(
                "docker://rhysd/actionlint:" + original,
                "docker://rhysd/actionlint:" + replacement,
            )
        else:
            source = re.sub(
                r"(" + name + r"(?:/[\w./-]+)?@)" + re.escape(original) + r"(?=\s|$)",
                lambda m: m[1] + replacement,
                source,
            )
    elif dependency.ecosystem == "github-input":
        source = re.sub(
            r"(uses:\s*"
            + name
            + r"@[^\n]*\n(?:[ \t]+(?!- )[^\n]*\n)*?[ \t]+"
            + TOOL_INPUTS[dependency.name]
            + r":\s*['\"]?)"
            + re.escape(original)
            + r"(?=['\"\s]|$)",
            lambda m: m[1] + registry_literal(dependency, release),
            source,
        )
    elif dependency.ecosystem == "npm":
        source = re.sub(
            r"(npm install -g " + name + r"@)" + re.escape(original) + r"(?=\s|$)",
            lambda m: m[1] + replacement,
            source,
        )
    elif dependency.ecosystem in {"pypi", "pypi-py39", "go"}:
        source = re.sub(
            r"(" + name + r"(?:\[[^]]+\])?)" + re.escape(original),
            lambda m: m[1] + replacement,
            source,
        )
    elif dependency.ecosystem == "cargo":
        source = re.sub(
            r"(^\s*" + name + r"\s*=.*?\")" + re.escape(original) + r"\"",
            lambda m: m[1] + replacement + '"',
            source,
            flags=re.M,
        )
    elif dependency.ecosystem == "nuget":
        source = re.sub(
            r"(<PackageReference\s+Include=\""
            + name
            + r"\"\s+Version=\")"
            + re.escape(original)
            + r"\"",
            lambda m: m[1] + replacement + '"',
            source,
        )
    elif dependency.ecosystem == "maven":
        group, artifact = dependency.name.split(":")
        if artifact == "google-java-format":
            source = re.sub(
                r"(<googleJavaFormat>\s*<version>)"
                + re.escape(original)
                + "</version>",
                lambda m: m[1] + replacement + "</version>",
                source,
            )
        else:
            pattern = (
                r"(<groupId>"
                + re.escape(group)
                + r"</groupId>\s*<artifactId>"
                + re.escape(artifact)
                + r"</artifactId>\s*<version>)([^<]+)</version>"
            )
            # Resolve properties before replacing the plugin/dependency block.
            prop_match = re.search(pattern, source)
            if prop_match and prop_match[2].startswith("${"):
                prop = prop_match[2][2:-1]
                source = re.sub(
                    r"(<" + re.escape(prop) + ">)[^<]+</" + re.escape(prop) + ">",
                    lambda m: m[1] + replacement + "</" + prop + ">",
                    source,
                )
            else:
                source = re.sub(
                    pattern, lambda m: m[1] + replacement + "</version>", source
                )
    path.write_text(source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--update",
        action="store_true",
        help="raise manifest version floors to current stable releases",
    )
    parser.add_argument(
        "--snapshot", type=Path, help="save registry responses for review"
    )
    args = parser.parse_args()
    dependencies = manifests()
    keys = sorted({(d.ecosystem, d.name) for d in dependencies})
    releases = {}

    def query(key):
        try:
            return key, latest(*key), None
        except Exception as error:
            return key, None, str(error)

    with ThreadPoolExecutor(max_workers=8) as executor:
        for key, release, error in executor.map(query, keys):
            if error:
                print(f"ERROR {key[0]} {key[1]}: {error}", file=sys.stderr)
            else:
                releases[key] = release
    if args.snapshot:
        args.snapshot.write_text(
            json.dumps({f"{e}:{n}": v for (e, n), v in releases.items()}, indent=2)
            + "\n"
        )
    failures = len(keys) - len(releases)
    for dependency in dependencies:
        release = releases.get((dependency.ecosystem, dependency.name))
        if release is None:
            continue
        if version_key(dependency.floor) != version_key(release) or (
            dependency.ecosystem == "github"
            and dependency.literal != registry_literal(dependency, release)
        ):
            print(
                f"OUTDATED {dependency.path.relative_to(ROOT)}: {dependency.name} {dependency.declared} -> {release}"
            )
            if args.update:
                update(dependency, release)
            else:
                failures += 1
    print(
        f"Checked {len(dependencies)} declarations, {len(keys)} published packages/actions."
    )
    if args.update:
        print("Regenerate lockfiles and run tests before committing the updates.")
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
