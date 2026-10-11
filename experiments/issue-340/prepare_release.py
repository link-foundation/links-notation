"""Prepare 0.26.0, the first release with the C++ binding, in every language.

Every binding declares the same version (scripts/version-consistency.mjs), so
adding C++ moves all eight together. The lockfiles record the local JS package
that the website and the JS benchmark link with `file:`.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
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
    "benchmarks/BENCHMARK_RESULTS.md",
    "rust/links-notation/Cargo.toml",
    "rust/links-notation-benchmark/Cargo.toml",
    "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj",
    "php/composer.json",
    "go/VERSION",
    "cpp/VERSION",
    "CONTRIBUTING.md",
)

for name in FILES:
    path = ROOT / name
    text = path.read_text()
    if "0.25.2" not in text:
        raise SystemExit(f"{name} does not mention 0.25.2")
    path.write_text(text.replace("0.25.2", "0.26.0"))

# Composer's caret constraint pins major.minor.
for name in ("php/README.md", "php/README.ru.md"):
    path = ROOT / name
    path.write_text(
        path.read_text().replace(
            '"link-foundation/links-notation": "^0.25"',
            '"link-foundation/links-notation": "^0.26"',
        )
    )

csproj = ROOT / "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj"
csproj.write_text(
    csproj.read_text().replace(
        "Add shared text parity fixtures and JavaScript-gated seven-language CI/CD.",
        "Add the C++ binding; the shared parity contract and CI now cover eight languages.",
    )
)

# The Rust READMEs' commented dependency line had stayed at 0.25.1.
for name in ("rust/links-notation/README.md", "rust/links-notation/README.ru.md"):
    path = ROOT / name
    path.write_text(path.read_text().replace('# links-notation = "0.25.1"', '# links-notation = "0.26.0"'))
