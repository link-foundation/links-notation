#!/usr/bin/env python3
"""Record native lock resolutions and registry latests, including transitives.

This is evidence collection, not a lockfile generator. Run native resolvers
first. Baseline blobs are read from the initial issue SHA without checkout.
"""

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import tomllib
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


def entries(name, source):
    if name == "bun.lock":
        # Bun's text lock is JSONC, with each resolved package on one line.
        for match in re.finditer(r'^\s*"[^"\n]+": (\[.*\]),?$', source, re.M):
            package = json.loads(match[1])
            if package and isinstance(package[0], str) and "@" in package[0]:
                dependency, version = package[0].rsplit("@", 1)
                if version[:1].isdigit():
                    yield "npm", dependency, version
    elif name == "package-lock.json":
        data = json.loads(source)
        for location, package in data.get("packages", {}).items():
            if (
                not package.get("version")
                or package.get("link")
                or not package.get("resolved", "").startswith("https:")
            ):
                continue
            yield "npm", location.rsplit("node_modules/", 1)[-1], package["version"]
    elif name == "Cargo.lock":
        for package in tomllib.loads(source).get("package", []):
            if package.get("source", "").startswith("registry+"):
                yield "cargo", package["name"], package["version"]
    elif name == "uv.lock":
        for package in tomllib.loads(source).get("package", []):
            if "registry" in package.get("source", {}):
                yield "pypi", package["name"], package["version"]
    elif name == "composer.lock":
        data = json.loads(source)
        for package in data.get("packages", []) + data.get("packages-dev", []):
            yield "composer", package["name"], package["version"].removeprefix("v")
    elif name == "packages.lock.json":
        for framework in json.loads(source).get("dependencies", {}).values():
            for package, info in framework.items():
                if info.get("resolved") and info.get("type") != "Project":
                    yield "nuget", package, info["resolved"]
    elif name.startswith("requirements") and name.endswith(".lock"):
        for match in re.finditer(
            r"^([\w.-]+)(?:\[[^]]+\])?==([^\s;\\]+)", source, re.M
        ):
            yield "pypi", match[1], match[2]
    elif name == "yarn.lock":
        for selectors, version in re.findall(
            r'^([^\n#][^\n]*):\n  version "([^\"]+)"', source, re.M
        ):
            selector = selectors.split(", ")[0].strip('"')
            yield "npm", selector.rsplit("@", 1)[0], version
    elif name == "go.sum":
        for line in source.splitlines():
            module, version, _ = line.split()
            if not version.endswith("/go.mod"):
                yield "go", module, version.removeprefix("v")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resolve", action="store_true")
    args = parser.parse_args()
    paths = (
        subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=ROOT,
        )
        .decode()
        .split("\0")
    )
    names = {
        "package-lock.json",
        "bun.lock",
        "Cargo.lock",
        "uv.lock",
        "composer.lock",
        "packages.lock.json",
        "yarn.lock",
        "go.sum",
    }
    rows = []
    for relative in sorted(set(filter(None, paths))):
        path = ROOT / relative
        if path.name not in names and not (
            path.name.startswith("requirements") and path.suffix == ".lock"
        ):
            continue
        old = subprocess.run(
            ["git", "show", f"{BASE}:{relative}"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        baseline = {}
        if old.returncode == 0:
            for ecosystem, package, version in entries(path.name, old.stdout):
                baseline.setdefault((ecosystem, package), set()).add(version)
        for ecosystem, package, version in set(entries(path.name, path.read_text())):
            rows.append(
                {
                    "path": relative,
                    "ecosystem": ecosystem,
                    "name": package,
                    "before": sorted(baseline.get((ecosystem, package), [])),
                    "after": version,
                }
            )
    rows.sort(
        key=lambda row: (row["ecosystem"], row["name"], row["path"], row["after"])
    )
    cache = OUT / "registry-transitive.json"
    releases = (
        json.loads(cache.read_text())
        if cache.exists()
        else json.loads((OUT / "registry-all.json").read_text())
    )
    errors = {}
    if args.resolve:
        keys = sorted(
            {
                (row["ecosystem"], row["name"])
                for row in rows
                if row["ecosystem"] + ":" + row["name"] not in releases
            }
        )

        def query(key):
            label = ":".join(key)
            try:
                return label, CHECK.latest(*key), None
            except Exception as error:
                return label, None, str(error)

        with ThreadPoolExecutor(max_workers=4) as executor:
            for label, release, error in executor.map(query, keys):
                if error:
                    errors[label] = error
                else:
                    releases[label] = release
        cache.write_text(json.dumps(releases, indent=2, sort_keys=True) + "\n")
        (OUT / "registry-transitive-errors.json").write_text(
            json.dumps(errors, indent=2) + "\n"
        )
    for row in rows:
        row["latest"] = releases.get(row["ecosystem"] + ":" + row["name"])
    (OUT / "locked-dependencies.json").write_text(json.dumps(rows, indent=2) + "\n")
    print(
        f"Inventoried {len(rows)} native locked entries, {len(releases)} registry releases; {len(errors)} errors."
    )
    for key, error in errors.items():
        print(key, error)
    return bool(errors)


if __name__ == "__main__":
    sys.exit(main())
