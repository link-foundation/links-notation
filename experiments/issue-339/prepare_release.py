"""Prepare the coordinated issue-339 release without changing archived evidence."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = (
    "js/package.json",
    "js/package-lock.json",
    "python/pyproject.toml",
    "java/pom.xml",
    "java/README.md",
    "java/README.ru.md",
    "benchmarks/java/pom.xml",
    "rust/links-notation/Cargo.toml",
    "rust/links-notation-benchmark/Cargo.toml",
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
    "php/composer.json",
    "go/VERSION",
)

for name in FILES:
    path = ROOT / name
    path.write_text(path.read_text().replace("0.25.1", "0.25.2"))

for name in ("rust/links-notation-macro/Cargo.toml", "rust/links-notation/Cargo.toml"):
    path = ROOT / name
    path.write_text(path.read_text().replace('version = "0.1.1"', 'version = "0.1.2"'))
