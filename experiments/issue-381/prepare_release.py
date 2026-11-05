"""Prepare the synchronized 0.30.2 patch release for issue 381.

Adapted from experiments/issue-379/prepare_release.py. Run once from the root
with python3 experiments/issue-381/prepare_release.py, then regenerate and
check benchmark output using the bounded Rust settings in CONTRIBUTING.md.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = "0.30.1", "0.30.2"
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
