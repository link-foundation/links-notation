# Agent workflow

Read `CONTRIBUTING.md`, `parity/README.md`, and `docs/releases.md` before
changing shared behavior or CI. JS is the reference implementation: write the
failing JS test first, then port the shared contract with eight-language
evidence. Document intentional API differences; never claim the hand-written
ports are generated. Source inventory refresh requires reviewing feature
coverage.

If a task authorizes sub-agents, drafting agents never push, merge, or deploy.
One CI/CD agent collects all completed failures for the latest SHA, saves and
reads their logs, completes local checks, and makes one push after all work is
ready. No push during an active run on the same branch/range. Keep regular
atomic commits and preserve history. Do not spawn agents merely because this
document describes the collaboration protocol.

Run JS tests by default. Check affected bindings and shared fixtures when their
contract changes. For Rust share one `CARGO_TARGET_DIR`, disable incremental
builds, use at most two compiler jobs, and check its 2 GiB budget before/after
building with `scripts/ci/check-rust-target-budget.sh`. Do not run parallel
builds in the same directory. Bound deliberate stress probes with finite inputs
and process limits. Keep reusable probes in `experiments/`, examples in
`examples/`, and command logs in `ci-logs/`.

Never report registry delivery from a successful-but-skipped job. Confirm the
exact version and its GitHub release. Missing credentials must fail publishing
visibly without printing secret values. Preserve test, benchmark, security,
docs, and release coverage when refactoring workflows. Match CI logs to the
latest SHA before diagnosing or pushing a fix batch.
