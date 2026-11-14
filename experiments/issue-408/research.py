#!/usr/bin/env python3
"""Collect dated primary runtime, image and upstream workaround evidence."""

import gzip
import json
import subprocess
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dev/log/issues/408/pulls/409/research"
SOURCES = {
    "toolchain-node.json": "https://nodejs.org/dist/index.json",
    "toolchain-go.json": "https://go.dev/dl/?mode=json",
    "toolchain-php.json": "https://www.php.net/releases/index.php?json&version=8.5",
    "toolchain-dotnet.json": "https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json",
    "toolchain-rust.toml.gz": "https://static.rust-lang.org/dist/channel-rust-stable.toml",
    "toolchain-java.json": "https://api.adoptium.net/v3/info/available_releases",
    "toolchain-java-releases.json": "https://api.adoptium.net/v3/info/release_names?architecture=x64&heap_size=normal&image_type=jdk&jvm_impl=hotspot&os=linux&project=jdk&release_type=ga&version=%5B27,28%29",
    "docker-swift.json": "https://hub.docker.com/v2/repositories/library/swift/tags/6.4.2-noble",
    "toolchain-docker.json": "https://hub.docker.com/v2/repositories/gitpod/workspace-dotnet/tags?page_size=100&ordering=last_updated",
}
UPSTREAM = {
    "upstream-scriv.json": "repos/nedbat/scriv/issues/208",
    "upstream-ktlint.json": "repos/ktlint/ktlint/issues/3403",
    "upstream-ktlint-security.json": "repos/ktlint/ktlint/issues/3230",
    "upstream-unsafe.json": "repos/JLLeitschuh/ktlint-gradle/issues/944",
    "upstream-gradle-enum.json": "repos/gradle/gradle/issues/39685",
    "upstream-mocha.json": "repos/Kotlin/kotlin-web-helpers/issues/19",
    "upstream-toolkit.json": "repos/actions/toolkit/issues/2564",
    "upstream-vcpkg.json": "repos/microsoft/vcpkg/issues/55056",
    "upstream-vstest.json": "repos/microsoft/vstest/issues/16652",
    "upstream-dependabot-gradle.json": "repos/dependabot/dependabot-core/issues/16797",
    "upstream-dependabot-yarn.json": "repos/dependabot/dependabot-core/issues/16798",
    "toolchain-python.json": "repos/python/cpython/tags?per_page=100",
    "toolchain-swift.json": "repos/swiftlang/swift/releases?per_page=30",
    "vcpkg-latest-baseline.json": "repos/microsoft/vcpkg/commits/master",
}


def collect(item):
    name, url = item
    observed = datetime.now(timezone.utc).isoformat()
    if name in UPSTREAM:
        data = subprocess.check_output(["gh", "api", "--paginate", url])
        url = "https://api.github.com/" + url
    else:
        request = urllib.request.Request(
            url, headers={"User-Agent": "links-notation-issue408"}
        )
        data = urllib.request.urlopen(request).read()
    (OUT / name).write_bytes(
        gzip.compress(data, mtime=0) if name.endswith(".gz") else data
    )
    return dict(file=name, url=url, observed=observed)


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(collect, (SOURCES | UPSTREAM).items()))
    (OUT / "primary-source-index.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Collected", len(results), "primary source snapshots")
