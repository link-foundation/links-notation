#!/usr/bin/env python3
"""Require the latest stable direct dependencies in every active project.

Archived experiments, case studies and dev/log snapshots deliberately retain
historical versions. Platform runtimes and local project references are not
registry dependencies. Registry errors fail the check rather than hide updates.

With --changed-since REV (pull requests), only the declarations that differ
from REV can fail; the rest are listed as NOTE lines. A pull request that bumps
one package would otherwise fail for every other package that is behind,
including the ones other open Dependabot pull requests update (issue #350).

With --warn-only (push, schedule and dispatch on main), every outdated
declaration is a ::warning:: annotation instead of a failure. A newer upstream
release is a fact about the world, not about the commit; failing main for it
kept main red with no change to the repository (issue #377, CI/CD best
practice 17). Registry errors and an --update that rewrites nothing still fail.
"""

import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tarfile
import tempfile
import tomllib
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ACTIVE = (
    "js",
    "python",
    "rust",
    "csharp",
    "java",
    "php",
    "go",
    "cpp",
    "kotlin",
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
# The Maven Wrapper's two pins, under the coordinates Maven Central lists.
MAVEN_DISTRIBUTION = "org.apache.maven:apache-maven"
MAVEN_WRAPPER = "org.apache.maven.wrapper:maven-wrapper"
# The Gradle ./gradlew runs, and the repositories kotlin/settings.gradle.kts
# resolves plugins from. A plugin's marker artifact is published to one of
# them (Kotlin and vanniktech to Central, AGP to Google, ktlint to the Portal).
GRADLE_DISTRIBUTION = "gradle"
GRADLE_PLUGIN_REPOSITORIES = (
    "https://repo.maven.apache.org/maven2/",
    "https://dl.google.com/dl/android/maven2/",
    "https://plugins.gradle.org/m2/",
)
STABLE = re.compile(r"^v?(\d+(?:\.\d+)*)(?:\.RELEASE)?$")


def version_key(value):
    match = STABLE.fullmatch(value)
    return tuple(map(int, match[1].split("."))) if match else ()


def newest(versions):
    stable = [v for v in versions if version_key(v)]
    if not stable:
        raise ValueError("registry returned no stable versions")
    return max(stable, key=version_key).removeprefix("v")


def get(url, accept="application/json"):
    headers = {
        "User-Agent": "links-notation-dependency-check",
        "Accept": accept,
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
    if ecosystem == "gradle-plugin":
        versions, errors = [], []
        path = name.replace(".", "/") + "/" + name + ".gradle.plugin"
        for repository in GRADLE_PLUGIN_REPOSITORIES:
            try:
                data = ET.fromstring(get(repository + path + "/maven-metadata.xml"))
            except urllib.error.HTTPError as error:
                if error.code != 404:
                    raise
                # The error owns the response body; an unclosed one is a
                # ResourceWarning in every run (issue #377).
                error.close()
                errors.append(f"{repository}: 404")
                continue
            versions += [v.text for v in data.findall("./versioning/versions/version")]
        if not versions:
            raise ValueError("no plugin marker in " + ", ".join(errors))
        return newest(versions)
    if ecosystem == "gradle":
        return json.loads(get("https://services.gradle.org/versions/current"))[
            "version"
        ]
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
                    "_deps",
                    # Gradle's output and caches (Kotlin/JS writes package.json
                    # files under build/js).
                    "build",
                    ".gradle",
                    ".kotlin",
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
                    project = data.get("project", {}).get("name")
                    for requirement in requirements:
                        if re.fullmatch(
                            re.escape(project or "") + r"\[[^]]+\]", requirement
                        ):
                            # An extra that combines this project's other extras.
                            continue
                        match = re.fullmatch(
                            r"([\w.-]+)(?:\[[^]]+\])?([><=~!].*)", requirement
                        )
                        if not match:
                            raise ValueError(
                                f"unsupported dependency requirement: {path}: {requirement}"
                            )
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
            elif path.name == "maven-wrapper.properties":
                # ./mvnw downloads this Maven, so it is the build's toolchain.
                for key, _, value in (
                    line.partition("=") for line in path.read_text().splitlines()
                ):
                    if key == "wrapperVersion":
                        add(path, "maven", MAVEN_WRAPPER, value.strip())
                    elif key == "distributionUrl":
                        match = re.search(
                            r"/org/apache/maven/apache-maven/([^/]+)/", value
                        )
                        if not match:
                            raise ValueError(f"unsupported distributionUrl: {path}")
                        add(path, "maven", MAVEN_DISTRIBUTION, match[1])
            elif path.name in {"build.gradle.kts", "settings.gradle.kts"}:
                text = path.read_text()
                # plugins { kotlin("multiplatform") version "2.4.21" } is the
                # plugin org.jetbrains.kotlin.multiplatform.
                for match in re.finditer(
                    r'\b(kotlin|id)\("([\w.-]+)"\)\s+version\s+"([^"]+)"', text
                ):
                    plugin = match[2]
                    if match[1] == "kotlin":
                        plugin = "org.jetbrains.kotlin." + plugin
                    add(path, "gradle-plugin", plugin, match[3])
                # ktlint { version.set("1.8.0") } is the ktlint the plugin runs.
                match = re.search(
                    r'\bktlint\s*\{[^}]*?\bversion\.set\("([^"]+)"\)', text
                )
                if match:
                    add(path, "maven", "com.pinterest.ktlint:ktlint-cli", match[1])
            elif path.name == "gradle-wrapper.properties":
                # ./gradlew downloads this Gradle, so it is the build's toolchain.
                match = re.search(
                    r"^distributionUrl=\S*/gradle-([^/]+?)-(?:bin|all)\.zip$",
                    path.read_text(),
                    re.M,
                )
                if not match:
                    raise ValueError(f"unsupported distributionUrl: {path}")
                add(path, "gradle", GRADLE_DISTRIBUTION, match[1])
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
            elif path.name == "CMakeLists.txt":
                # FetchContent pins a GitHub release archive by tag and hash.
                for match in re.finditer(
                    r"URL\s+https://github\.com/([\w.-]+/[\w.-]+)/releases/download/([^/\s]+)/",
                    path.read_text(),
                ):
                    add(path, "github", match[1], match[2])
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
        # pre-commit builds a hook's environment once per machine, so an
        # unpinned additional dependency freezes whichever release was newest
        # at that moment.
        for block in re.finditer(
            r"^(\s*)additional_dependencies:\s*\n((?:\1\s+-[^\n]*\n)+)",
            precommit.read_text(),
            re.M,
        ):
            for item in re.findall(r"-\s*['\"]?([^'\"\s]+)", block[2]):
                pin = re.fullmatch(r"(@?[^@]+)@(\d[^@]*)", item)
                if pin:
                    add(precommit, "npm", pin[1], pin[2])
                else:
                    add(precommit, "npm", item, None)
    return list(dict.fromkeys(found))


def changed(dependencies, revision, root=ROOT):
    """The declarations in `dependencies` that `revision` does not have.

    A declaration is the manifest path, package and version requirement, so
    a bumped or newly added dependency is changed; an untouched one is not,
    even in a manifest the pull request edits.
    """
    paths = [
        path
        for path in (*ACTIVE, ".github/workflows", ".pre-commit-config.yaml")
        if subprocess.run(
            ["git", "cat-file", "-e", revision + ":" + path],
            cwd=root,
            capture_output=True,
        ).returncode
        == 0
    ]
    with tempfile.TemporaryDirectory() as temporary:
        base = Path(temporary)
        if paths:
            archive = subprocess.run(
                ["git", "archive", "--format=tar", revision, "--", *paths],
                cwd=root,
                check=True,
                capture_output=True,
            ).stdout
            with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
                tar.extractall(base, filter="data")
        try:
            before = {
                (d.path.relative_to(base), d.ecosystem, d.name, d.declared)
                for d in manifests(base)
            }
        except ValueError as error:
            # The revision itself would fail this check, so nothing it
            # declares can be trusted as already checked.
            print(f"NOTE {revision} cannot be compared ({error}); checking everything")
            return list(dependencies)
    return [
        d
        for d in dependencies
        if (d.path.relative_to(root), d.ecosystem, d.name, d.declared) not in before
    ]


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
        elif path.name == "CMakeLists.txt":

            def pin(match):
                # The archive name repeats the version and its hash changes.
                url = match[1].replace(
                    original.removeprefix("v"), replacement.removeprefix("v")
                )
                digest = hashlib.sha256(get(url, accept="*/*")).hexdigest()
                return "URL " + url + match[2] + digest

            source = re.sub(
                r"URL\s+(https://github\.com/"
                + name
                + r"/releases/download/"
                + re.escape(original)
                + r"/\S+)(\s+URL_HASH\s+SHA256=)[0-9a-fA-F]{64}",
                pin,
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
        prefix = (
            r"(-\s*['\"]?"
            if path.name == ".pre-commit-config.yaml"
            else r"(npm install -g "
        )
        source = re.sub(
            prefix + name + r"@)" + re.escape(original) + r"(?=['\"\s]|$)",
            lambda m: m[1] + replacement,
            source,
        )
    elif dependency.ecosystem in {"pypi", "go"}:
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
    elif path.name == "maven-wrapper.properties":
        if dependency.name == MAVEN_WRAPPER:
            # mvnw and mvnw.cmd belong to the wrapper release, so only the
            # wrapper plugin can update all three files consistently.
            print(
                f"  regenerate {path.parents[2].relative_to(ROOT)}: ./mvnw -q "
                f"wrapper:wrapper -Dtype=only-script -DwrapperVersion={release}"
            )
            return
        url = re.search(r"^distributionUrl=(\S+)$", source, re.M)[1]
        updated = url.replace("/" + original + "/", "/" + release + "/").replace(
            "-" + original + "-", "-" + release + "-"
        )
        # The wrapper checks the archive against this hash before running it.
        digest = hashlib.sha256(get(updated, accept="*/*")).hexdigest()
        source = source.replace(url, updated)
        source = re.sub(
            r"^(distributionSha256Sum=)[0-9a-fA-F]{64}$",
            lambda m: m[1] + digest,
            source,
            flags=re.M,
        )
    elif path.name == "gradle-wrapper.properties":
        url = re.search(r"^distributionUrl=(\S+)$", source, re.M)[1]
        updated = url.replace("-" + original + "-", "-" + release + "-")
        # The wrapper checks the archive against this hash before running it;
        # Gradle publishes it beside the archive.
        digest = get(updated.replace("\\:", ":") + ".sha256", accept="*/*")
        source = source.replace(url, updated)
        source = re.sub(
            r"^(distributionSha256Sum=)[0-9a-fA-F]{64}$",
            lambda m: m[1] + digest.decode().strip(),
            source,
            flags=re.M,
        )
        # gradlew and gradle-wrapper.jar belong to the Gradle release.
        print(
            f"  regenerate {path.parents[2].relative_to(ROOT)}: ./gradlew wrapper "
            f"--gradle-version {release} --distribution-type bin"
        )
    elif dependency.ecosystem == "gradle-plugin":
        plugin = dependency.name
        call = (
            r'kotlin\("'
            + re.escape(plugin.removeprefix("org.jetbrains.kotlin."))
            + r'"\)'
            if plugin.startswith("org.jetbrains.kotlin.")
            else r'id\("' + name + r'"\)'
        )
        source = re.sub(
            r"(" + call + r'\s+version\s+")' + re.escape(original) + '"',
            lambda m: m[1] + replacement + '"',
            source,
        )
    elif path.name.endswith(".gradle.kts"):
        source = re.sub(
            r'(\bktlint\s*\{[^}]*?\bversion\.set\(")' + re.escape(original) + '"',
            lambda m: m[1] + replacement + '"',
            source,
        )
    elif dependency.ecosystem == "maven":
        group, artifact = dependency.name.split(":")
        # Spotless names the formatter in <googleJavaFormat>; java/pom.xml now
        # declares it as an ordinary dependency of the format profile, which
        # --update silently skipped (issue #377).
        spotless = 0
        if artifact == "google-java-format":
            source, spotless = re.subn(
                r"(<googleJavaFormat>\s*<version>)"
                + re.escape(original)
                + "</version>",
                lambda m: m[1] + replacement + "</version>",
                source,
            )
        if not spotless:
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
    if source == path.read_text():
        # A declaration the checker reads but cannot rewrite would otherwise
        # stay stale after an --update that reported success.
        print(
            f"ERROR {path}: --update found no {dependency.name} {original} to "
            f"raise to {release}; edit the declaration by hand"
        )
        return False
    path.write_text(source)
    return True


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
    parser.add_argument(
        "--changed-since",
        metavar="REV",
        help="fail only for declarations that differ from git revision REV",
    )
    parser.add_argument(
        "--warn-only",
        action="store_true",
        help="report outdated declarations as warnings instead of failing",
    )
    args = parser.parse_args()
    dependencies = manifests()
    gated = (
        set(changed(dependencies, args.changed_since))
        if args.changed_since
        else set(dependencies)
    )
    keys = sorted({(d.ecosystem, d.name) for d in dependencies})
    gated_keys = {(d.ecosystem, d.name) for d in gated}
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
    # A registry error hides whether the package is current, so it fails the
    # check for every package that can fail it.
    failures = len(gated_keys - set(releases))
    stale = 0
    for dependency in dependencies:
        release = releases.get((dependency.ecosystem, dependency.name))
        if release is None:
            continue
        if version_key(dependency.floor) != version_key(release) or (
            dependency.ecosystem == "github"
            and dependency.literal != registry_literal(dependency, release)
        ):
            line = f"{dependency.path.relative_to(ROOT)}: {dependency.name} {dependency.declared} -> {release}"
            if dependency not in gated:
                print(f"NOTE {line} (not changed by this pull request)")
                stale += 1
                continue
            if args.warn_only and not args.update:
                path = dependency.path.relative_to(ROOT)
                print(
                    f"::warning file={path}::{dependency.name} {dependency.declared}"
                    f" is behind the latest stable release {release}"
                )
                stale += 1
                continue
            print(f"OUTDATED {line}")
            if args.update:
                if update(dependency, release) is False:
                    failures += 1
            else:
                failures += 1
    print(
        f"Checked {len(dependencies)} declarations, {len(keys)} published packages/actions."
    )
    if args.changed_since:
        print(
            f"{len(gated)} declarations differ from {args.changed_since} and can "
            f"fail this check; {stale} unchanged ones are behind and are "
            "reported as warnings on main."
        )
    if args.warn_only and stale:
        print(
            f"{stale} declarations are behind their latest stable release; a newer "
            "release does not fail main. To update: merge the open Dependabot pull "
            "requests, or run `python scripts/ci/check-dependencies.py --update`, "
            "regenerate the lockfiles and commit the result."
        )
    if args.update:
        print("Regenerate lockfiles and run tests before committing the updates.")
    elif failures:
        print(
            "To fix: merge the open Dependabot pull requests, or run "
            "`python scripts/ci/check-dependencies.py --update`, regenerate the "
            "lockfiles and commit the result."
        )
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
