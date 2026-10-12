#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ran=0

run_if_available() {
  local tool="$1"
  local label="$2"
  shift 2
  if command -v "$tool" >/dev/null 2>&1; then
    printf '\n== %s ==\n' "$label"
    "$@"
    ran=$((ran + 1))
  else
    printf '\n-- %s skipped (%s unavailable) --\n' "$label" "$tool"
  fi
}

cd "$repo_root"
run_if_available bun JavaScript bun test js/tests/StreamParser.test.js
run_if_available python3 Python bash -c 'cd python && python3 -m pytest -q tests/test_stream_parser.py'
run_if_available go Go bash -c 'cd go && go test -run StreamParser ./...'
run_if_available cargo Rust cargo test --manifest-path rust/links-notation/Cargo.toml --test stream_parser_tests
run_if_available mvn Java mvn -q -f java/pom.xml -Dtest=StreamParserTest test

if command -v php >/dev/null 2>&1 && [[ -x php/vendor/bin/phpunit ]]; then
  printf '\n== PHP ==\n'
  php/vendor/bin/phpunit --configuration php/phpunit.xml --filter StreamParserTest
  ran=$((ran + 1))
else
  printf '\n-- PHP skipped (PHPUnit unavailable) --\n'
fi

# The C++ suite is one GoogleTest binary; the filter selects its stream tests.
cpp_stream_tests() {
  local build
  build="$(mktemp -d)"
  cmake -S cpp -B "$build" -DCMAKE_BUILD_TYPE=Release -DLINKS_NOTATION_BUILD_EXAMPLES=OFF >/dev/null
  cmake --build "$build" --target links_notation_tests --parallel 2 >/dev/null
  "$build/tests/links_notation_tests" --gtest_filter='StreamParser*'
  rm -rf "$build"
}
run_if_available cmake C++ cpp_stream_tests

# The repository opts into Microsoft.Testing.Platform in csharp/global.json;
# invoking a project from the repository root would fall back to VSTest.
run_if_available dotnet CSharp bash -c 'cd csharp && dotnet test --no-restore'

if ((ran == 0)); then
  printf '\nNo supported toolchain was available.\n' >&2
  exit 1
fi

printf '\nStreaming parity checks passed for %d available toolchain(s).\n' "$ran"
