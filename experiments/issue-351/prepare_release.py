"""Prepare 0.27.1, the release that ships the browser bundling fix of issue #351.

Every binding declares the same version (scripts/version-consistency.mjs), so
all eight move together. It is a patch release: only the JS package changes
behavior, and its StreamParser keeps the listener API it documented.
Composer's caret constraint and CMake's find_package name major.minor, so
their 0.27 snippets stay as they are.

benchmarks/BENCHMARK_RESULTS.md names the version too. It is regenerated with
`cargo run -p links-notation-benchmark --release`, not edited.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = "0.27.0", "0.27.1"
FILES = (
    "js/package.json",
    "python/pyproject.toml",
    "java/pom.xml",
    "java/README.md",
    "java/README.ru.md",
    "benchmarks/java/pom.xml",
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
    "CONTRIBUTING.md",
)


def replace(name, old, new):
    path = ROOT / name
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{name} does not mention {old}")
    path.write_text(text.replace(old, new))


for name in FILES:
    replace(name, OLD, NEW)

# The lockfiles record the local JS package that the website and the JS
# benchmark link with `file:`. Replace only that entry: the website lockfile
# also has an unrelated `"esbuild": "^0.27.0 || ^0.28.0"` peer range.
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

replace(
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
    "Build and test with the latest release of every dependency and toolchain.",
    "No C# changes: the JavaScript package now bundles for browsers without an events polyfill.",
)
