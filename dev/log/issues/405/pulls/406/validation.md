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
| Python | All nine hash-checked requirements locks | Zero pip-audit findings; issue-405-pip-audit-locks.log and JSON |
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
- Archived snapshots contain selected configuration files. Exact original
  application sources for the changed JS/PHP/C# integrations were restored
  temporarily from SHAS.txt, with the updated snapshots overlaid. Their final
  checks pass as recorded below. These temporary upstream sources are validation
  inputs, not additional product sources or a claim to test every uncaptured
  third-party application. A zero-test Node invocation is never counted.
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

## First implementation CI correction

Head `6e5241a699723e88d67fe63d0acf90727b9187d4`, all six runs created
2026-11-13 23:08:01 UTC and completed before the next push. Dependency freshness,
workflow lint/security and pages passed. CI's JS lint, format and 368-test suite
passed; its strict JS gate correctly rejected new non-JS checks in an independent
workflow (CI-43524772708.log lines 196–198). The checks now run in the existing
gated JS parity and Python lint stages. The local gate, its 27 regression tests,
four workflow contracts, actual artifact fixture and three uv lock checks pass.

BOM checking found two downloaded research C# sources (bom-check-43524772333.log
lines 211–213); their UTF-8 BOMs are removed. Links exceeded its ten-minute limit
(links-43524772532.log line 300); the raw downloaded changelogs introduced 1,189
GitHub HTML URLs. These third-party snapshots are now compressed, preserving
authored documentation coverage and the existing timeout. The logs and correction
checks are preserved in research/ci-round-1.tar.gz.

`gh pr diff 406` rejects the 552-file diff with HTTP 406 (maximum 300 files).
The paginated PR-files API and complete native base-to-head diff were saved;
the 107-file implementation/configuration diff was reviewed in bounded chunks.

## Second CI correction and restored template checks

Head `3aebce8edb143f2333ad8ba3a0cfcd106beb6bb3`, all six runs created
2026-11-13 23:24:42 UTC and completed before this correction batch.
The 90 CI jobs concluded with 79 successes, six failures and five existing
conditional skips. Three failures were rollups of the other three root causes:

| Failed job log | Exact evidence | Correction / local proof |
| --- | --- | --- |
| CI-job-132236008048.log | Composer stale content hash, lines 213–216 | Native update --lock; strict validation for root and benchmark passed |
| CI-job-132237323848.log | Python 3.11 hash install misses backports.tarfile, lines 313–315 | Native universal lock at supported 3.11 floor; hash installs and audits pass on 3.11 and 3.15 |
| CI-job-132237745384.log | Distro latexminted 0.6.0 argparse `color` failure, line 911 | Current upstream executable/styles installed together; Python 3.15 version/checksums/audit pass; full PDF remains a hosted CI check |
| links-43526909433.log | One authored migration URL and eight relative links inside downloaded third-party guidance, lines 588–609 | Correct the authored URL; preserve downloaded document as gzip without weakening link coverage |

The six failed job logs and the links log are preserved in
`research/ci-round-2.tar.gz`, with a SHA-256 index. The full 90-job CLI log
request hit GitHub's API limit; no empty file is counted as archived evidence.
The paginated job metadata records exact job IDs and this SHA.

The complete temporary applications used the exact upstream SHAs recorded in
both template snapshots. `experiments/issue-405/restore-template-inputs.py`
restores and overlays tracked captures, reuses installed package trees, aligns
uncaptured validation workflows to the same registry selections, regenerates
the external Deno mirror lock natively, and initializes a disposable Git index
required by the original policy tests. Its end-to-end restore passed.
Deno's 24-hour minimum-age filter was overridden only for this deliberate
lock refresh, because ESLint 10.15.0 was newly published. Deno's emulated Node
26.5.1 warns below the declared Node floor; lock resolution is not claimed as
runtime execution on that Node version.

| Snapshot / command | Final result | Log in additional-checks.tar.gz |
| --- | --- | --- |
| 330 JS: declared npm test | 487 passed, zero skipped | issue405-restored-330-js-declared-test-final.log |
| 377 JS: declared npm test, one worker | 1,050 passed, zero skipped | issue405-restored-377-js-declared-test-corrected.log |
| Both JS snapshots: lint / format / duplication | Passed; original unchanged-line lint warnings remain reported by the existing policy | issue405-restored-330-js-lint-corrected.log; issue405-restored-377-js-lint-final.log; final format and duplication logs |
| 330 PHP: Composer check and test | 112 tests / 512 assertions; PHPStan/style passed; no warnings or deprecations | issue405-restored-330-php-check-corrected.log; issue405-restored-330-php-test-corrected.log |
| 377 PHP: Composer check and test | 128 tests / 579 assertions; PHPStan/style passed; no warnings or deprecations | issue405-restored-377-php-check-corrected.log; issue405-restored-377-php-test-corrected.log |
| 377 C#: Bun helper suite / lint / format / TypeScript | 303 passed; all checks passed using installed .NET 11 | issue405-restored-377-csharp-script-final.log; issue405-restored-377-csharp-check-final.log |
| 377 C#: restored core/library tests | 21 passed; library/test formatting checked separately | issue405-restored-377-csharp-test-clean.log; issue405-restored-377-csharp-library-format.log |
| 330 C#: workflow injection/credential policy | Seven passed | issue405-330-csharp-workflow-final.log |
| Current tool policy regression | Failed first at old zizmor action map; final eleven pass | issue405-zizmor-policy-before.log; issue405-zizmor-policy-after.log |

The new captured policy tests are the exact original test files with updated
current-version assertions; the implementation checks were retained. The
475-line reviewed source delta against the recorded upstream tarballs is saved
as issue405-restored-source-changes.diff. JS native glob's real broken-link and
file-layout fixture also passes. PHPUnit's removed executionOrder dependency
syntax is replaced by its native resolveDependencies setting. Improved PHPStan
narrowing uses JSON_THROW_ON_ERROR instead of redundant casts/assertions.
The finite minimatch security probe now verifies the upstream expansion-limit
error and a valid nested match; no stress size or security limit was increased.

The inline zizmor installer and action inputs now all select 1.32.0. The action's
native hashed tool lock confirms compatibility. Explicit runner versions are
updated across every archived snapshot; Windows 11 ARM is the current distinct
ARM label, alongside Windows Server 2025 x64. The complete runtime table now
records 800 selections. The three newly explicit TeX styles have their own
before/current registry table in research/minted-tools.md.


The minimal KGP resolution-input probe independently reproduces the remaining
upstream bug with three successful package-generation commands and no compiler
or package installation. The second command stays UP-TO-DATE with the previous
resolution; a forced rerun writes the new resolution. Its report draft records
the corrected canonical-range assertion and primary-source input inspection.

The new VSTest container warning matches existing
[microsoft/vstest#16652](https://github.com/microsoft/vstest/issues/16652).
Setting `VSTEST_ARTIFACTS_BASE_DIRECTORY=/tmp` for this container lets the SDK
create its protected per-session directory. The restored C# suite then passes
all 21 tests without the warning. This keeps directory verification enabled;
no SDK/package downgrade or warning suppression is used. Full upstream text,
comments and inspected screenshots are preserved with the research/logs.


## Third CI round and final artifact regression

Head `9317249dc454ba8bea9b52546bcd6baae4e95b87`, all six runs created
2026-11-14 00:10:45 UTC. All six completed successfully before the next push:
CI 43532397346, links 43532397141, bom-check 43532397108, dependency freshness
43532397150, workflows 43532397089 and pages 43532397102. There were 87
successful jobs and four existing conditional skips (benchmark publishing,
release, Python publishing and Python release). This includes native Android,
iOS/macOS, browser/differential and the remaining platform matrix. Skipped
publishing is not registry delivery.

`research/ci-round-3.tar.gz` preserves exact run/job metadata and targeted
success logs for the prior root failures: PHP's native install/tests/distribution
passed (CI-job-132253326079.log, test result line 297); Python 3.11 installs
backports-tarfile and passes 443 tests plus one existing skip
(CI-job-132253384465.log, lines 324 and 1018). The current minted executable
and all three style checksums pass on Python 3.15; the PDF is generated and its
artifact finalized (CI-job-132254423697.log, lines 899–935 and 1882–1927).

Final diff review found a directory-exclusion regression in both artifact
adapters. The expanded JS fixture failed four tests before the fix, including
incorrectly included children of an excluded directory. Five artifact tests now
pass, covering both copies' directory recursion, exclusion, ordered reinclusion,
comments and tilde expansion plus the original layout/symlink/hidden-file cases.
The active JS suite passes again (368 tests, 16,423 assertions); archived JS lint
and formatting pass. Together with the release and Mocha checks there are 25
focused regressions. `research/final-review-checks.tar.gz` preserves before/after
and final local logs, fresh issue/comment/PR snapshots and the paginated diff
review. Empty API-error outputs are excluded and failed exploratory commands
are not counted as passing checks. Both archives have SHA-256 indexes.

This correction requires one fresh exact-head CI run. The live PR checks and
final PR description record that result without pretending the prior SHA tests
an unpushed change. The YouTrack reporting blocker above remains unfinished.
