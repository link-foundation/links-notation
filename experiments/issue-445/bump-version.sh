#!/bin/bash
# Move every declared version (and the docs and locks that quote it) from $1 to $2.
# Usage: experiments/issue-445/bump-version.sh 0.31.9 0.32.0
set -euo pipefail
from=$1 to=$2
cd "$(git rev-parse --show-toplevel)"
files=(
  CONTRIBUTING.md benchmarks/BENCHMARK_RESULTS.md benchmarks/go/go.mod benchmarks/java/pom.xml
  cpp/README.md cpp/README.ru.md cpp/VERSION
  csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj
  examples/swift/Package.swift go/VERSION java/README.md java/README.ru.md java/pom.xml
  js/package.json kotlin/README.md kotlin/README.ru.md kotlin/build.gradle.kts php/composer.json
  python/pyproject.toml rust/links-notation-benchmark/Cargo.toml rust/links-notation/Cargo.toml
  rust/links-notation/README.md rust/links-notation/README.ru.md
  swift/README.md swift/README.ru.md swift/VERSION
)
locks=$(git grep -l -F "$from" -- '*.lock' '*package-lock.json')
f=${from//./\\.}
for file in "${files[@]}"; do sed -i "s/$f/$to/g" "$file"; done
# Locks: only the lines that name this package's version, not third-party pins.
for file in $locks; do
  python3 - "$file" "$from" "$to" <<'PY'
import re, sys
path, old, new = sys.argv[1:]
text = open(path).read()
lines = text.split('\n')
out = []
for i, line in enumerate(lines):
    ctx = '\n'.join(lines[max(0, i - 3):i + 1])
    if old in line and re.search(r'links-notation', ctx):
        line = line.replace(old, new)
    out.append(line)
open(path, 'w').write('\n'.join(out))
PY
done
git grep -n -F "$from" -- . ':!CHANGELOG.md' ':!changelog.d' ':!dev' || true
# A minor bump also has to move the caret and find_package floors, which quote an
# older patch (or no patch) and so are not caught above. For 0.32.0 these were
# benchmarks/php/composer.json (^0.31.4 -> ^0.32.0, then its lock content-hash via
# composer-hashes.php), the PHP README install snippets (^0.31 -> ^0.32) and the
# C++ README find_package floors (0.31 -> 0.32).
git grep -nE "\\^${f%\\.*}|find_package\\(links_notation ${f%\\.*}" -- . ':!CHANGELOG.md' ':!changelog.d' ':!dev' || true
