Refresh every repository dependency graph against 2026-11-14 registry releases, including archived templates, experiments, hooks, composite actions and C++ dependencies omitted by the issue detector. This incorporates or supersedes Dependabot #396 and #407 while preserving branch rules and existing platform coverage.

- Update setup-java 6.3.0 and install-action 2.90.4 across all copies; preserve Java compiler annotations with the native `problem-matcher` input and a JS regression that failed before the migration.
- Align Python defaults at 3.15.2, advance the vcpkg baseline, refresh all native locks and track four previously missing locks. Prepare version 0.31.5 across all ten bindings and regenerate the deterministic benchmark report.
- Preserve tested consumer floors and necessary upstream API constraints. The evidence contains 909 declarations, 2,141 lock entries, 800 runtime selections, 230 JVM graph edges and individual reasons for retained versions.

Validation: JS 368 tests, Python 443 passed plus one existing platform skip, PHP 278 tests, Rust workspace/no-default/fmt/Clippy/benchmark checks, Java Maven install/tests, website build/lint, workflow linters, native lock refreshes, ten-language parity and release consistency passed locally. Native npm/Bun/Yarn, Cargo, Python, Composer, NuGet, JVM OSV and Go 1.27.4 audits found no advisories in the refreshed graphs. Full platform build/test/lint/security/docs checks run on this PR; skipped publishers are not delivery evidence.

[Analysis, requirement ledger, registry tables and preserved logs](https://github.com/link-foundation/links-notation/tree/issue-408-891b7bc77ff4/dev/log/issues/408/pulls/409)

Upstream reports and remaining limitation: [report ledger](https://github.com/link-foundation/links-notation/blob/issue-408-891b7bc77ff4/dev/log/issues/408/pulls/409/upstream/README.md), including newly filed [composer/composer#13274](https://github.com/composer/composer/issues/13274). **R18 is unfinished for the Kotlin task-input report:** the bounded KGP 2.4.21 reproduction still fails, but the correct YouTrack project rejects submission with HTTP 403 and no authenticated account is available. The complete report, fresh reproduction and rejection evidence are committed. The local regeneration workaround remains; keep this PR unmerged while that reporting criterion is unresolved.

The initial CI failure was an existing registry/GitHub-release mismatch for Kotlin 0.31.4; the release audit remains strict. This PR verifies the distinct pending 0.31.5 version and does not create a release or claim registry delivery.

Fixes #408
