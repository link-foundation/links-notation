#!/usr/bin/env bash
# Regression for #334: Cargo must reject Rust below the declared MSRV before
# compiling either published crate. Install 1.86.0 with rustup before running.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
logs="$root/ci-logs/issue-334"
mkdir -p "$logs"

check_rejection() {
  local package="$1" label="$2"
  shift 2
  local log="$logs/$label.log"
  if cargo +1.86.0 check --manifest-path "$root/rust/Cargo.toml" \
    -p "$package" "$@" > "$log" 2>&1; then
    echo "FAIL: $label unexpectedly compiled on Rust 1.86.0"
    return 1
  fi
  if ! grep -Eq "${package}@[0-9.]+ requires rustc 1\\.87" "$log"; then
    echo "FAIL: $label did not report the required Rust version; see $log"
    cat "$log"
    return 1
  fi
  echo "PASS: $label reports that Rust 1.87 is required"
}

check_rejection links-notation parser-default
check_rejection links-notation parser-without-macro --no-default-features
check_rejection links-notation-macro macro
