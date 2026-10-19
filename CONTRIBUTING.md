# Contributing

Develop shared behavior in JavaScript first. Start with a small failing JS test,
implement the behavior, then add a reviewed input/tree/format fixture in
`parity/text-fixtures.json` and port it to the other seven libraries. A port of
behavior already implemented in JS can reference that existing JS test. Do not
merge a new shared feature with missing bindings: update its manifest evidence
or record an explicit, explained exception in `parity/README.md`.

All eight libraries are hand-written. JS's Peggy parser and C#'s Pegasus parser
are generated from their own hand-written grammars; none of the language
libraries is translated from JS.
[Meta-language translation rules](https://github.com/link-foundation/meta-language/blob/main/docs/translation-rules.md)
may help structural translation experiments. They are not evidence of semantic
equivalence. Keep experiments in `experiments/`; replacing a working module with
generated code requires reproducible generation, a regenerate-and-diff check,
and the same shared and native tests. Keep useful usage examples in `examples/`.

## Local checks

Use JS by default; run other language suites when changing their binding or the
shared contract. Install Bun and Node, then from the repository root:

```sh
bun install --cwd js --frozen-lockfile
bun run --cwd js format:check
bun run --cwd js lint
bun run --cwd js build
bun test js/tests
bun scripts/ci/check-js-gate.mjs
bun test experiments/issue-339/ci-contract.test.mjs
node scripts/ci/check-parity.mjs
node --test experiments/issue-339/parity-contract.test.mjs experiments/issue-339/release-audit.test.mjs
python3 experiments/issue-339/test_workflow_contract.py
node scripts/version-consistency.mjs
node scripts/ci/php-distribution.mjs
node --test experiments/issue-339/php-distribution.test.mjs
python3 experiments/issue-332/test_test_comparison.py
node scripts/create-test-case-comparison.mjs --check
```

After reviewing feature coverage, run
`node scripts/ci/check-parity.mjs --refresh-inventory`. Commit the manifest and
generated text vectors together. Hashes require an inventory review when code
changes; the native tests validate behavior. Refreshing hashes alone does not
establish parity.

For native checks use the commands in the reusable workflows: `pytest` and
Black/isort/flake8 for Python, `go test ./...` and `go vet ./...` for Go,
`./mvnw test`, `bash format.sh --check` and `./mvnw spotless:check` for Java,
`dotnet test --configuration Release` and `dotnet format --verify-no-changes`
for C#, `composer run-script test` / `lint` for PHP, and
`cmake -S cpp -B build && cmake --build build && ctest --test-dir build` plus
`clang-format --dry-run --Werror` (version pinned in `cpp/tools/requirements.txt`)
for C++. PHP distribution changes
also require `python3 experiments/issue-339/test_php_distribution.py` from the
root, using PHP 8.4+ and Composer. Refresh root metadata after changing
`php/composer.json` with `node scripts/ci/php-distribution.mjs --write`.
Workflow changes also
require actionlint with shellcheck on PATH, `shellcheck -x scripts/ci/*.sh`,
`bash scripts/ci/registry-probe.test.sh`, and the zizmor command in
`.github/workflows/workflows.yml`. After adding tests, regenerate the comparison
with `node scripts/create-test-case-comparison.mjs`. After a library version bump,
regenerate benchmarks with `cargo run -p links-notation-benchmark --release`
from `rust/`, using the bounded Rust settings below. Check the result with
`cargo run -p links-notation-benchmark --release -- --check`. Save verbose logs
in `ci-logs/`.

For Rust use one shared, bounded build directory rather than a separate target
tree per agent:

```sh
export CARGO_TARGET_DIR="/tmp/links-notation-cargo"
export CARGO_INCREMENTAL=0 CARGO_BUILD_JOBS=2
export CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0
bash scripts/ci/check-rust-target-budget.sh
cargo test --manifest-path rust/Cargo.toml --workspace
cargo test --manifest-path rust/Cargo.toml -p links-notation --no-default-features
cargo clippy --manifest-path rust/Cargo.toml --all-targets --all-features \
  -- -D warnings
bash scripts/ci/check-rust-target-budget.sh
```

The budget check defaults to 2 GiB and fails when exceeded. Stop all users of
the shared directory before explicitly cleaning build output. Do not run
simultaneous Rust builds in that directory. Deliberate stack/memory probes must
use finite inputs and process limits; preserve their scripts in `experiments/`.

## One push gate

When using sub-agents, drafting agents edit, test, and make useful local
commits; they never push, merge, or deploy. One designated CI/CD agent owns
pushing the PR branch. It collects every failure from the latest commit's
completed runs, downloads their logs, fixes the complete failure set, runs local
checks, and pushes once. No agent pushes while a run for that branch/range is in
progress. Keep history forward-moving; do not rewrite the shared branch.

Before a push, inspect `gh pr checks` and the recent runs:

```sh
gh run list --repo link-foundation/links-notation --branch BRANCH --limit 5 \
  --json databaseId,status,conclusion,createdAt,headSha
```

Match runs to the latest SHA and timestamp. Save non-passing
logs using `gh run view RUN --log` under `ci-logs/`, inspect actual errors, and
wait for all running jobs and delegated work. Repeat only after the next run
finishes. GitHub's concurrency setting preserves active runs; it can replace an
older pending run, so it does not replace this push rule.

## CI and releases

`.github/workflows/js.yml` is the single CI entry point. It calls
`javascript.yml` from the same commit, then the six language workflows, binary
interop, security, benchmarks, and docs. JS format/lint/test/parity always run
for every PR and main push. Cancelled, failed, or skipped JS prevents non-JS
execution. The static guard rejects independent language triggers, unsafe
conditions, mutable checkout refs, and ungated reusable callers. The required
summary checks fail when their underlying stage is skipped or cancelled.

Keep `js.yml` as the calling filename: npm trusted publishers identify the
caller. Configure crates.io/PyPI trusted publishing for that caller when opting
in; otherwise provide their bootstrap tokens. Do not register a reusable callee
as the PyPI publisher. See [release setup](docs/releases.md).

Add a fragment under `changelog.d/` for each user-visible change. Release PRs
combine the reviewed fragments into `CHANGELOG.md` and update all eight declared
versions together. This PR prepares 0.27.1. Per-registry tags remain for
existing consumers, especially Go's required `go/vVERSION` tag. One CI run
waits for all eight native stages before calling `release.yml`, coordinates
publishing, and performs the final exact-version audit. A distributed
release cannot be atomic across registries: a partial delivery fails the final
audit and must be recovered by rerunning after the failing provider is repaired.

Main's ruleset requires JavaScript, Rust, Python, Java, Go, CSharp, PHP, and Cpp. Use
a pull request for changes to main. Wait for every check, inspect the whole
diff, ensure no existing feature disappeared, update the PR title/body with
reproduction and validation, and mark the completed draft ready.
