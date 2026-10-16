"""Prepare 0.27.0, the release that ships the dependency update of issue #348.

Every binding declares the same version (scripts/version-consistency.mjs), so
all eight move together. It is a minor release because Python drops 3.9 and
3.10 (requires-python >=3.11) and Go raises its `go` directive to 1.26, which
breaks consumers on those versions. The lockfiles record the local JS package
that the website and the JS benchmark link with `file:`.

benchmarks/BENCHMARK_RESULTS.md names the version too. It is regenerated with
`cargo run -p links-notation-benchmark --release`, not edited. benchmarks/go
keeps requiring v0.26.0, the newest published tag: its `replace` builds
against ../../go either way.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = "0.26.0", "0.27.0"
FILES = (
    "js/package.json",
    "js/package-lock.json",
    "benchmarks/js/package-lock.json",
    "docs/website/package-lock.json",
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

# Composer's caret constraint and CMake's find_package name major.minor.
for name in ("php/README.md", "php/README.ru.md"):
    replace(
        name,
        '"link-foundation/links-notation": "^0.26"',
        '"link-foundation/links-notation": "^0.27"',
    )
for name in ("cpp/README.md", "cpp/README.ru.md"):
    replace(
        name, "find_package(links_notation 0.26 ", "find_package(links_notation 0.27 "
    )

replace(
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
    "Add the C++ binding; the shared parity contract and CI now cover eight languages.",
    "Build and test with the latest release of every dependency and toolchain.",
)
