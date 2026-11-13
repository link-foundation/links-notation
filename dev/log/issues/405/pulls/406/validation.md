# Verification evidence

PR: https://github.com/link-foundation/links-notation/pull/406

Local checks were run sequentially where compilation or resolution could be
memory intensive. Rust used one compiler job, incremental/debug information
disabled, the shared `/tmp/links-notation-cargo`, and the 2 GiB budget gate.
The container limit is 2.92 GiB. Native CI remains required for platform targets
and the exact newer patches installed by hosted runners.

`research/local-checks.tar.gz` preserves command output, failed regression
reproductions, corrected checks and native audit results. Its accompanying
SHA-256 index identifies every file. A failed exploratory command is not counted
as a passing check; the final successful evidence is identified below.

| Area | Actual local result | Principal log in the archive |
| --- | --- | --- |
| JavaScript | 368 passed, 16,423 assertions; build, ESLint and format passed | issue-405-js-test.log; issue405-js-lint-final.log |
| Rust | Workspace and no-default-feature tests, fmt, Clippy with warnings denied, release benchmark/check passed | issue-405-rust-test.log; issue-405-rust-no-default.log; issue-405-rust-clippy.log; issue-405-rust-benchmark-check.log |
| Python | 443 passed, one existing skip; Black/isort/flake8; isolated sdist/wheel and Twine passed | issue-405-python-test.log; issue-405-python-{black,isort,flake8}.log; issue405-python-release-build.log |
| Java | 226 tests; native Spotless, install and benchmark format/token-count verification passed | issue-405-java-test.log; issue405-java-transitives.log |
| Kotlin | ktlint, JVM, JS Node and Wasm Node passed; final updated formatter graph and JVM passed again | issue-405-kotlin-final.log; issue405-kotlin-final-graph-check.log |
| C# | 363 passed, no skips; final build has zero warnings/errors; format and tokenizer benchmark passed | issue405-csharp-latest-transitives-test.log; issue-405-csharp-format.log; issue-405-csharp-benchmark-check.log |
| PHP | 278 passed, 15,620 assertions; PHPCS and distribution checks passed | issue-405-php-test.log; issue-405-php-lint.log |
| Go | Tests/vet, tokenizer corpus comparison and both active/benchmark vulnerability checks passed | issue-405-go-test.log; issue-405-go-vet.log; issue-405-go-benchmark-check.log |
| Swift | 349 executed, one existing skip, zero failures; warnings-as-errors build, format and downstream example passed | issue-405-swift-test.log; issue-405-swift-build.log; issue-405-swift-example.log |
| C++ | 383 tests, release build with warnings denied and clang-format 23 checks passed | issue-405-cpp-test.log; issue-405-cpp-build.log; issue-405-cpp-format.log |
| Docs/bench tools | Vite 8 website build/lint, comparison data check, 12 benchmark datasets/81 repetitions passed | issue-405-website-build.log; issue-405-website-lint.log; issue-405-bench-tools-check.log |
| Automation | Dependency/Dependabot checker, workflow contract, merge planner, rerun and publish regression suites; registry probe and ShellCheck passed | issue405-automation-final.log |
| New regressions | Release transport retry, actual artifact files, Mocha reporter discovery/skip/failure propagation passed | issue405-regressions-final.log; issue-405-audit-retry-before.log; issue-405-artifact-before.log |
| Metadata | All ten versions declare 0.31.4; 25 features, 31 text cases, 20 syntax cases, ten languages and zero parity violations | issue405-version-final.log; issue405-parity-final.log |
| Workflow lint/security | Actionlint with ShellCheck; zizmor 1.32 offline, medium threshold; immutable archived SHA/security policy tests passed | issue405-actionlint-final.log; issue405-zizmor-final.log; issue405-archive-pins-recheck.log |
| Locks | Native npm locks, frozen Bun lock, uv project locks, stored Yarn graph verified | issue405-lock-check-final.log; issue405-bun-final.log; issue405-yarn-lock-store.log |

## Exact resolved security checks

| Native graph | Scope | Result / evidence |
| --- | --- | --- |
| npm | All ten package trees, including archived nested actions | Zero native audit findings; issue405-npm-refresh-all.log and per-tree logs |
| Yarn | Stored Kotlin graph, 30 packages | Zero findings at low threshold; issue405-yarn-stored-audit.log |
| Cargo | All eleven native lockfiles, including probes/templates | Zero RustSec advisories; per-lock issue-405-audit-*.json |
| Python | All eight hash-checked requirements locks | Zero pip-audit findings; issue-405-pip-audit-locks.log and JSON |
| Composer | All five locks, including root/benchmarks/templates | Zero native audit findings; issue-405-composer-*.log |
| NuGet | All 21 independently restored projects; final runner telemetry graph audited again | Zero vulnerable packages; issue-405-audit-nuget-*.json; issue405-nuget-final-active-audit.json |
| Go | Active and benchmark module graphs | Zero govulncheck findings; saved native command logs |
| Maven/Gradle | Exact 62 artifacts in 230 resolved dependency edges | Zero OSV findings; research/jvm-osv-audit.json |

The first JVM OSV pass found three advisories in ktlint's Logback 1.3.16.
Upgrading both Logback artifacts to 1.6.6 and refreshing formatter transitives
removes these findings. Saved GHSA JSONs preserve the original evidence.
Forcing the embedded compiler to 2.4.21 fails with `Extensions storage is not
registered`; the successful graph retains only the three coupled compiler
modules at 2.2.21. Upstream ktlint#3403 confirms this incompatibility. The
failure stack is in issue405-ktlint-upgrade-trace.log.

A separate attempted CLI smoke probe used the Gradle plugin's source-classified
CLI dependency and failed with ClassNotFoundException. It is not a valid CLI
distribution test and is not counted above. The production integration uses the
Gradle worker, which passes formatting and JVM tests with the final graph.

## Remaining verification and external blockers

- Latest-head hosted CI must pass before completion. Android, iOS/macOS,
  browser/differential and platform matrix checks are preserved in CI; local
  Linux results do not stand in for them. No 0.31.4 registry delivery is claimed.
- Archived template snapshots contain selected configuration files, not their
  complete original applications. Native installs, locks, audits and contained
  policy tests were checked. Full archived application checks remain unverified:
  JS 330/377 lack the referenced custom ESLint rule and application tests; C#
  377 lacks experiment/fixture inputs; PHP 330/377 lack src/tests and PHPStan
  input paths. A zero-test Node invocation is not counted as a passing suite.
- KGP rootPackageJson resolution-input tracking needs an upstream YouTrack
  report. GitHub issues are disabled for JetBrains/kotlin and an authenticated
  YouTrack account is unavailable. The researched, reproducible report remains
  **unfiled** in upstream/kotlin-root-package-inputs.md. Necessary forced
  regeneration remains locally. This upstream-report criterion is unfinished.
- Stable KGP's named-enum Gradle warning and ktlint's embedded-compiler Unsafe
  warning have existing upstream reports. The former fix is only in a Kotlin
  2.5 prerelease; the latter is inside the compiler that cannot safely be
  substituted. These are documented stable-upstream limitations, not hidden
  warnings or claims of a complete upstream repair.

## Initial CI diagnosis

Initial head 7902557fc0bd8a50d5d2c7beba06beb48b559d63, run 43509344617,
created 2026-11-13 21:17:24 UTC and completed before investigation. The saved
release-audit failed-step log has the C# fetch failure on line 14 and exit 1 on
line 23. It does not identify the transport error code. Nine other exact
0.31.3 deliveries were verified. The fix retries only known transient transport
codes with a finite three-attempt bound; HTTP and metadata errors still fail.
The before/after regression tests verify this distinction.

The PR stays unmerged. Current CI observations are saved separately under
research/ with their head SHA and timestamps.
