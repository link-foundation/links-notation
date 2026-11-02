"""Prepare 0.29.0, the release that adds issue #370's Kotlin Multiplatform binding.

Every binding declares the same version (scripts/version-consistency.mjs), so
all nine move together, Kotlin's first release included. It is a minor
release: a new binding is new API, and no existing call changes what it
returns. Composer's caret constraint and CMake's find_package name
major.minor, so they move to 0.29.

benchmarks/BENCHMARK_RESULTS.md names the version in its last line only; the
benchmark measures document sizes, which this release does not change.

kotlin/build.gradle.kts and kotlin/README*.md already name 0.29.0: the binding
was written for this release, so it has no older version to replace.

Run from anywhere: python3 experiments/issue-370/prepare_release.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = "0.28.0", "0.29.0"
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
        '"link-foundation/links-notation": "^0.28"',
        '"link-foundation/links-notation": "^0.29"',
    )
for name in ("cpp/README.md", "cpp/README.ru.md"):
    replace(
        name, "find_package(links_notation 0.28 ", "find_package(links_notation 0.29 "
    )

replace(
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
    "Parsed links keep how their IDs were written (RawId, Quote), an AST mode "
    "leaves that out, and ParseCst returns a lossless concrete syntax tree.",
    "No C# changes: Kotlin Multiplatform joins as the ninth binding.",
)
