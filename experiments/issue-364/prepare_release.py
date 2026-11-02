"""Prepare 0.28.0, the release that ships issue #364's syntax metadata and CST.

Every binding declares the same version (scripts/version-consistency.mjs), so
all eight move together. It is a minor release: every binding gains new API
(the raw ID and quote of a parsed link, an AST mode, and a lossless concrete
syntax tree) without changing what existing calls return. Composer's caret
constraint and CMake's find_package name major.minor, so they move to 0.28.

benchmarks/BENCHMARK_RESULTS.md names the version in its last line only; the
benchmark measures document sizes, which this release does not change, so only
that line differs from what `cargo run -p links-notation-benchmark --release`
writes. The benchmarks workflow regenerates it and fails on any other drift.

Run from anywhere: python3 experiments/issue-364/prepare_release.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = "0.27.1", "0.28.0"
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
        '"link-foundation/links-notation": "^0.27"',
        '"link-foundation/links-notation": "^0.28"',
    )
for name in ("cpp/README.md", "cpp/README.ru.md"):
    replace(name, "find_package(links_notation 0.27 ", "find_package(links_notation 0.28 ")

replace(
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
    "No C# changes: the JavaScript package now bundles for browsers without an events polyfill.",
    "Parsed links keep how their IDs were written (RawId, Quote), an AST mode "
    "leaves that out, and ParseCst returns a lossless concrete syntax tree.",
)
