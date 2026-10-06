#!/usr/bin/env bash
# Reproduces the four `##[error]ENOENT ... opendir '.../tests/trybuild'` lines
# that the post step of Swatinem/rust-cache@v2.9.2 printed on the green
# publishToCratesIO job of run 37486124161 (issue #330).
#
# 1. `cargo package` (which `cargo publish` runs) unpacks the crate under
#    target/package/<name>-<version>/, including its `tests/` source folder.
# 2. rust-cache's cleanTargetDir treats every directory named `tests` as a
#    profile directory and probes `tests/target` and `tests/trybuild` with an
#    async call it does not await (src/cleanup.ts:49 and :53), so the
#    surrounding try/catch never sees the ENOENT and Node reports an unhandled
#    rejection, which the runner turns into an error annotation.
#
# Usage: experiments/issue-330/rust-cache-enoent.sh   (needs cargo and node)
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
target=$(mktemp -d)
trap 'rm -rf "$target"' EXIT

echo "== step 1: what cargo package leaves in target/package"
(cd "$root/rust" && CARGO_TARGET_DIR="$target" cargo package -p links-notation --allow-dirty --quiet)
tests_dir=$(find "$target/package" -mindepth 2 -maxdepth 2 -type d -name tests | head -1)
[ -n "$tests_dir" ] || { echo "no unpacked tests/ under $target/package"; exit 1; }
echo "found $tests_dir"
for probe in target trybuild; do
  [ -e "$tests_dir/$probe" ] && echo "  $probe exists" || echo "  $probe is missing -> rust-cache's probe rejects with ENOENT"
done

echo "== step 2: the un-awaited probe pattern from rust-cache src/cleanup.ts"
node - "$tests_dir" <<'JS'
const fs = require("fs");
const path = require("path");
async function cleanTargetDir(dir) { await fs.promises.opendir(dir); }
process.on("unhandledRejection", (e) => console.log(`unhandled rejection (shown as ##[error] by the runner): ${e.message}`));
const testsDir = process.argv[2];
try { cleanTargetDir(path.join(testsDir, "target")); } catch { console.log("caught (never printed)"); }
try { cleanTargetDir(path.join(testsDir, "trybuild")); } catch { console.log("caught (never printed)"); }
JS
