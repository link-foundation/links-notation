# Validation evidence

Commands run on 2026-11-14 UTC. Detailed native logs are preserved in the
research log archive; reusable orchestration is in `experiments/issue-408/`.
The package-manager summaries record every directory, exact command and exit
status. CI runs on hosted runners provide the full platform matrix within the
container's 2.92 GiB memory limit.

| Area | Verification and observed result |
| --- | --- |
| JavaScript | `bun test --cwd js`: 368 passed, 16,423 assertions, zero failures; build/lint/format checks passed. Java annotation regression failed before the migration, passes afterward, and runs in CI. |
| Rust | Rust 1.100.0 workspace tests, no-default-features tests, fmt, Clippy with warnings denied, release benchmark generation and deterministic `--check` all passed. One compiler job, incremental off, shared target and debug info off. Target 434,296 KiB after checks, under the 2 GiB budget. |
| Java | Native Maven install/test/format/package passed on installed JDK 25; Maven/Gradle native dependency graphs resolved successfully. Hosted CI tests JDK 21/25/27, Android, iOS, Kotlin JS/Wasm/JVM and consumer floors. |
| Python | 443 passed, 1 existing platform-conditioned skip; Black, isort and flake8 using the package configuration passed. Universal uv and hashed requirements locks checked/refreshed. |
| PHP | PHPUnit 278 tests, 15,620 assertions; PHPCS 49 files passed. Distribution metadata regenerated and checked. |
| Website | Native npm clean install, Vite production build and ESLint passed after PostCSS lock refresh. No visual behavior was changed. |
| .NET / Swift / Go | Native .NET SDK 11 restore across all 22 projects, SwiftPM updates for both manifests, and Go tidy across all ten modules passed. Full test/build/lint platform coverage remains in hosted CI. |
| C++ | Full build/test/lint, CMake minimum and sanitizers remain in hosted CI; no C++ source or API changes. Latest vcpkg registry metadata reviewed. |
| Workflow quality | actionlint 1.7.12 with ShellCheck, ShellCheck on CI scripts, zizmor 1.32 offline medium-or-higher audit, merge-planner tests and live dry run passed. |
| Freshness | All declarations and transitive registry queries completed without errors; live Dependabot manifest/label coverage and dependency freshness checks passed. |
| Shared contract | Version consistency: ten bindings at 0.31.5. Parity: 25 features, 31 text fixtures, 20 syntax fixtures, ten languages, zero violations. No source inventory refresh was needed. |
| Native resolution | 10 npm graphs plus Bun, 11 Cargo projects, 12 Python lock/export commands, five Composer updates, 22 NuGet restores, ten Go tidy commands, two Swift updates, native Gradle/Yarn refresh and Maven graphs passed. |

## Security

Native npm audit checked all ten package locks, Bun audit checked its separate
text lock, Yarn checked 30 packages, cargo-audit checked all eleven Cargo locks,
pip-audit checked all nine hashed Python requirement graphs, Composer audited
four nonempty graphs and validated the empty root graph, and NuGet reported no
vulnerabilities across 22 projects including transitives. JVM OSV batch queries
for all 62 exact resolved artifacts returned no advisories.

Go govulncheck's initial use of the container's older Go 1.27.2 identified
standard-library advisories GO-2026-6859 and GO-2026-6809, fixed in Go 1.27.4
and 1.27.3 respectively. Repository CI already pins 1.27.4. The current-toolchain
repeat passed for both the library and benchmark modules and is recorded separately; the older-host scan is not counted as a passing
audit. See `go-vuln-current.log` and `go-benchmarks-vuln-current.log` in the
native log archive for final results.

## CI investigation and final verification

The initial SHA `e3dc638c395d9e0c15c3ad143a73299f634ed912` has
[run 43575938491](https://github.com/link-foundation/links-notation/actions/runs/43575938491).
All ten required language rollups passed; the release audit failed for the
already-published Kotlin 0.31.4 lacking GitHub release `kotlin_0.31.4`.
`initial-ci-failed.log:202` preserves the exact error. Full-run CLI log download
hit GitHub CLI's job-count limit, so the complete failed job was downloaded
with `--job 132395955896`, read, and retained. Freshness and BOM runs passed.
Dependabot 396's earlier TruffleHog freshness failure was also downloaded and
read before editing.

Final exact-head checks and run URLs are recorded on
[PR 409](https://github.com/link-foundation/links-notation/pull/409/checks).
Initial-SHA or previous-main passes are not substituted for final-head checks.
No push is made during an active run on the same branch/range. Every completed
failure is downloaded and reviewed before a correction batch. Publishing jobs
skipped on pull requests are not registry delivery evidence.
