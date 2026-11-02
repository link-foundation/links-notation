"""Prepare 0.30.0, the release that adds issue #370's Kotlin Multiplatform binding.

Every binding declares the same version (scripts/version-consistency.mjs), so
all ten move together, Kotlin's first release included. Swift (issue #369)
became the ninth binding and prepared 0.29.0 while this binding was in review,
so Kotlin, the tenth, ships in the next minor release. It is a minor release: a
new binding is new API, and no existing call changes what it returns.
Composer's caret constraint and CMake's find_package name major.minor, so they
move to 0.30.

benchmarks/BENCHMARK_RESULTS.md names the version in its last line only; the
benchmark measures document sizes, which this release does not change.

kotlin/build.gradle.kts and kotlin/README*.md were written at 0.29.0 and move
with the others; Kotlin was never published at that version.

Run from anywhere: python3 experiments/issue-370/prepare_release.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = "0.29.0", "0.30.0"
OLD_MINOR, NEW_MINOR = "0.29", "0.30"
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
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
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

# The lockfiles record the local JS package that the website and the JS
# benchmark link with `file:`. Replace only that entry.
for name in (
    "js/package-lock.json",
    "benchmarks/js/package-lock.json",
    "docs/website/package-lock.json",
):
    path = ROOT / name
    if not path.exists():
        continue
    text = path.read_text()
    marker = '"name": "links-notation",'
    parts = text.split(marker)
    for index in range(1, len(parts)):
        parts[index] = parts[index].replace(
            f'"version": "{OLD}"', f'"version": "{NEW}"', 1
        )
    path.write_text(marker.join(parts))

# Composer's caret constraint and CMake's find_package name major.minor.
for name in ("php/README.md", "php/README.ru.md"):
    replace(
        name,
        f'"link-foundation/links-notation": "^{OLD_MINOR}"',
        f'"link-foundation/links-notation": "^{NEW_MINOR}"',
    )
for name in ("cpp/README.md", "cpp/README.ru.md"):
    replace(
        name,
        f"find_package(links_notation {OLD_MINOR} ",
        f"find_package(links_notation {NEW_MINOR} ",
    )

replace(
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
    "No C# changes: this release adds the Swift implementation.",
    "No C# changes: Kotlin Multiplatform joins as the tenth binding.",
)
