#!/usr/bin/env bash
# Issue #348: refresh and build every archived Rust experiment, one at a time,
# inside the shared bounded target directory.
set -u
root=$(cd "$(dirname "$0")/../.." && pwd)
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-/tmp/links-notation-cargo} CARGO_INCREMENTAL=0 CARGO_BUILD_JOBS=2 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0
status=0
for project in experiments experiments/issue-209/lino-shapes experiments/issue-282/parity/rust \
  experiments/issue-301/rust-probe experiments/issue-314/rust-differential experiments/issue-314/rust-probe \
  experiments/issue-315/rust-probe experiments/issue-316/rust-timing; do
  echo "=== $project"
  (cd "$root/$project" && cargo update --quiet && cargo check --all-targets --quiet) || { echo "FAIL: $project"; status=1; }
done
exit $status
