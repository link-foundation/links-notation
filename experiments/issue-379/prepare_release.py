"""Prepare 0.30.1, the release that fixes issue #379 in all ten bindings.

Every binding declares the same version (scripts/version-consistency.mjs), so
all ten move together. It is a patch release: format(true) of a link that did
not read back now writes text that does, and no API changes. Composer's caret
constraint and CMake's find_package name major.minor, so they stay at 0.30.

benchmarks/BENCHMARK_RESULTS.md names the version in its last line only; the
benchmark measures document sizes, which this release does not change.

Run once from anywhere: python3 experiments/issue-379/prepare_release.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = "0.30.0", "0.30.1"
CSPROJ = "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj"
FILES = (
    "js/package.json",
    "python/pyproject.toml",
    "java/pom.xml",
    "java/README.md",
    "java/README.ru.md",
    "benchmarks/java/pom.xml",
    "benchmarks/BENCHMARK_RESULTS.md",
    "rust/links-notation/Cargo.toml",
    "rust/links-notation/README.md",
    "rust/links-notation/README.ru.md",
    "rust/links-notation-benchmark/Cargo.toml",
    CSPROJ,
    "php/composer.json",
    "go/VERSION",
    "cpp/VERSION",
    "cpp/README.md",
    "cpp/README.ru.md",
    "swift/VERSION",
    "swift/README.md",
    "swift/README.ru.md",
    "examples/swift/Package.swift",
    "kotlin/build.gradle.kts",
    "kotlin/README.md",
    "kotlin/README.ru.md",
    "docs/releases.md",
)


def replace(name, old, new):
    path = ROOT / name
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{name} does not mention {old}")
    path.write_text(text.replace(old, new))


for name in FILES:
    replace(name, OLD, NEW)

replace("CONTRIBUTING.md", f"This PR prepares {OLD}.", f"This PR prepares {NEW}.")
replace(
    CSPROJ,
    "No C# changes: Kotlin Multiplatform joins as the tenth binding.",
    "Format(lessParentheses: true) reads back as the same link: it keeps the"
    " parentheses of a lone nested value and of an empty link.",
)

# The lockfiles record the local JS package that the website and the JS
# benchmark link with `file:`. Replace only that entry.
for name in (
    "js/package-lock.json",
    "benchmarks/js/package-lock.json",
    "docs/website/package-lock.json",
):
    path = ROOT / name
    text = path.read_text()
    marker = '"name": "links-notation",'
    parts = text.split(marker)
    for index in range(1, len(parts)):
        parts[index] = parts[index].replace(
            f'"version": "{OLD}"', f'"version": "{NEW}"', 1
        )
    path.write_text(marker.join(parts))
