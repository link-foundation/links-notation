#!/usr/bin/env bash
# Asks every implementation what it does with a "#", using the same six
# documents. Written for https://github.com/link-foundation/links-notation/issues/301:
# before the issue was fixed the answers disagreed, and prose written after a
# "#" was read as a link. Now every implementation hides the rest of the line.
#
# Run from anywhere; every path below is relative to the repository root.
# Toolchains that are not installed are reported as skipped rather than failing
# the run, so this is useful even on a machine with only some of them.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
cd "$root"

section() {
  printf '\n=== %s ===\n' "$1"
}

skip() {
  printf '(skipped: %s)\n' "$1"
}

section rust
if command -v cargo >/dev/null; then
  cargo run --quiet --manifest-path "$here/rust-probe/Cargo.toml"
else
  skip "cargo is not installed"
fi

section javascript
if command -v bun >/dev/null; then
  bun "$here/probe.mjs"
elif command -v node >/dev/null; then
  node "$here/probe.mjs"
else
  skip "neither bun nor node is installed"
fi

section csharp
if command -v dotnet >/dev/null; then
  dotnet run --project "$here/csharp-probe/Probe.csproj" --verbosity quiet
else
  skip "dotnet is not installed"
fi

section python
if command -v python3 >/dev/null; then
  python3 "$here/probe.py"
else
  skip "python3 is not installed"
fi

section go
if command -v go >/dev/null; then
  (cd "$here/go-probe" && go run .)
else
  skip "go is not installed"
fi

section java
if command -v java >/dev/null; then
  classes="$(ls -d "$root"/java/target/classes 2>/dev/null)"
  if [ -n "$classes" ]; then
    java -cp "$classes" "$here/java-probe/Probe.java"
  else
    skip "java/target/classes is missing, run: mvn -f java/pom.xml compile"
  fi
else
  skip "java is not installed"
fi

section php
if command -v php >/dev/null; then
  php "$here/probe.php"
else
  skip "php is not installed"
fi
