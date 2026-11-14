#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
repository_root="$PWD"
export CARGO_TARGET_DIR=/tmp/links-notation-cargo
export CARGO_INCREMENTAL=0 CARGO_BUILD_JOBS=1
export CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0
trap 'bash "$repository_root/scripts/ci/check-rust-target-budget.sh"' EXIT
bash scripts/ci/check-rust-target-budget.sh
cargo +1.100.0 fmt --manifest-path rust/Cargo.toml --all -- --check > ci-logs/issue-408/rust-fmt.log 2>&1
cargo +1.100.0 test --manifest-path rust/Cargo.toml --workspace -j 1 > ci-logs/issue-408/rust-test.log 2>&1
cargo +1.100.0 test --manifest-path rust/Cargo.toml -p links-notation --no-default-features -j 1 > ci-logs/issue-408/rust-no-default.log 2>&1
cargo +1.100.0 clippy --manifest-path rust/Cargo.toml --workspace --all-targets -j 1 -- -D warnings > ci-logs/issue-408/rust-clippy.log 2>&1
cd rust
cargo +1.100.0 run -p links-notation-benchmark --release -j 1 > ../ci-logs/issue-408/rust-benchmark.log 2>&1
cargo +1.100.0 run -p links-notation-benchmark --release -j 1 -- --check > ../ci-logs/issue-408/rust-benchmark-check.log 2>&1
cd ..
