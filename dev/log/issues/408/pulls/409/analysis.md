# Analysis and implementation decisions

## Scope and current baseline

The complete issue, its comments, both Dependabot PRs, recent merged PR 406,
and PR 409's conversation comments, inline comments and reviews were collected.
No required sub-issues or additional feedback existed at the initial snapshot.
The [acceptance ledger](PLAN.md) maps the prose requirements to implementation
and validation; it includes C++ although the issue's ecosystem detector omitted
C++ from its numbered list.

Most major migrations had already landed in main through PR 406, immediately
before issue 408. Repeating those migrations or editing constraints already at
the current registry release would add churn. Fresh queries cover 918 declared
selections, 2,250 native lock entries, 800 runtime selections, and the native
JVM graph. Before values come from the immutable initial SHA, independently of
the local commits. Registry query error files are empty. Historical evidence in
older issue directories is preserved; their executable manifests and workflow
copies are included in this refresh.

## Dependabot blockers

PR 396 requested setup-dotnet 6.1.0, setup-java 6.2.0, CodeQL 4.39.3, and
TruffleHog 3.99.8. The base already contained these or newer releases. Its saved
failure at `dependabot-396-failure.log:244` was the freshness gate rejecting
TruffleHog 3.99.8 after 3.99.9 appeared. Both scanner and action now select
3.99.9; setup-java advances further to 6.3.0. The obsolete PR has merge
conflicts, so applying its superseding dependency changes here avoids merging
stale workflow text.

PR 407 requested .NET SDK 11.0.100, already present in the issue baseline.
Its 89 checks passed. Repository rules require the ten language rollups and an
up-to-date main; being behind is still a merge blocker. The live merge planner
correctly refuses automatic major updates, and its dry run reports #407 as
`needs review: version-update:semver-major`. This PR explicitly reviews the
SDK major and includes the existing net11 test/benchmark migration while
preserving the published library's net10 consumer target. Repository rules
remain enforced. Native auto-merge being disabled is not a defect in the custom
merge planner, which uses the merge API and intentionally limits automatic
updates to minor/patch releases. Its existing tests and live dry run pass.

The initial issue SHA's only CI failure was release auditing: Kotlin 0.31.4 is
in the registry but has no matching GitHub release (`initial-ci-failed.log:202`).
All ten language rollups passed. This PR prepares a distinct 0.31.5 release;
the pending-release audit must not manufacture a release or claim a skipped
publisher delivered anything. The release audit remains strict on main.

## Actual updates and migration review

All Action releases and immutable commits were resolved from GitHub today,
including archived composite actions and pipeline snapshots. The Action change
ledger contains 54 refreshed references. `actions/setup-java` 6.3.0 changes the
problem matcher default to false. Its release notes were read, and every
setup-java step now explicitly sets `problem-matcher: true` to preserve compiler
annotations. A JavaScript regression test failed before the change and passes
after it; the JS parity workflow runs it. `taiki-e/install-action` 2.90.4's notes
were also reviewed; it changes installation support without a new local API
migration. Existing major migrations (Node 26, .NET 11, ESLint 10, TypeScript 7,
Mocha 12, PHPUnit 13, JUnit 6, Kotlin 2.4, Gradle 9, Swift 6, current Actions)
are retained and revalidated. There is no additional major dependency bump
among those packages relative to this issue's baseline, and no test is skipped
to accommodate one.

Final diff review also found four archived install-action inputs still selecting
cargo-audit 0.22.2. They now select crates.io's current 0.23.0, matching the
binary used for all eleven local lock audits. The pre-1.0 minor migration's
[release notes](https://github.com/rustsec/rustsec/releases/tag/cargo-audit/v0.23.0)
were reviewed: the breaking advisory-database lock filename correction does not
affect a repository-owned path or parser. Existing `audit` / `--deny warnings`
commands remain supported; no migration shim is needed. Native prebuilt binary
installation avoids compiling the auditor. The supplemental embedded-tool table
includes installer defaults and checker test inputs; their cargo-cyclonedx
example is aligned at 0.5.10. All nine native workflow-checker tests pass.

Python defaults advance from 3.15.0 to 3.15.2 in active and archived workflows.
The vcpkg registry baseline advances to
`4702e381dbbd9b54d3f7e1eb565cd8981c1814cd`.
Native locks advance ctor 1.0.13 to 1.0.14, link-section 0.19.3 to 0.19.4,
PostCSS 8.5.32 to 8.5.33, strip-json-comments 5.0.3 to 5.1.0, and stale
Bun transitive selections to the currently resolved versions. Four previously
ignored native locks are now tracked: three independent Rust probes and the
issue-330 PHP template. All existing locks were refreshed using native
resolvers, including those whose resolved content remains unchanged. Release
0.31.5 is aligned across ten bindings, local benchmark consumers, usage examples,
PHP distribution metadata, and the deterministically regenerated size benchmark.

Adoptium's newest JDK release name is `jdk-27.0.1.0.2+1`, while its official
`version_data.semver` is `27.0.1+0`. The setup-java semver selector remains
27.0.1 so it selects that current build; introducing a five-component Java
selector would misrepresent the action's input. Fresh official image metadata
confirms Swift 6.4.2-noble and both Gitpod image digests already current.

## Constraints and retained dependencies

The final embedded-command review adds 95 workflow tool/image selections and
ten Cargo installer/checker selections to the manifest and runtime inventories.
Both complete JavaScript template snapshots now target npm 12.2.2. Its migration
guide was read and saved as `research/npm-12-migration.txt.gz`: the supported
Node branches are `^22.22.2 || ^24.15.0 || >=26.0.0`, JSON result shapes are
consistent, lifecycle scripts require explicit authorization, and remote/git
installs default to denied. Existing registry adapters already handle npm 12's
JSON shapes; installs retain explicit lifecycle policy. The two setup helpers
now use upstream `semver` for parsing/comparison/range matching and select the
exact reviewed npm release. This removes the hand-written comparator/sorter. The older template also now
uses the existing newer template's native installed-module loader. Its two
release dependencies are declared and locked; over 200 lines of CDN evaluation,
retry and loader workaround code are removed. The old network/Windows skips
are replaced by native import and command-failure tests, which pass.
Four tests fail before the migration and pass after it, including unsupported
Node branches and numeric prerelease ordering. CI executes those regressions.

Browser Commander advances 0.8.1 to 0.34.1 and Playwright 1.59.1 to 1.65.1.
Their release notes and all intervening Browser Commander changes were read.
The 0.21 default launcher change does not affect the preview script's explicit
native Playwright launcher; its page facade still supports the used API.
The actual archived preview script generated all four locale/theme PNGs and
the fallback PNG with the refreshed libraries, with browser/server cleanup.
The two template manifests now lock these dependencies natively;
the older workflow-only snapshots pin them exactly. All four container images
match Playwright 1.65.1; immutable variants use the fresh MCR manifest digest.
Existing image/package consistency assertions were updated and pass.

All four archived Go workflows pin Staticcheck 2026.2.2 (module v0.8.2), whose
release fixes current Go export-format failures and reduces analyzer memory.
Native installation and version verification pass. All six DocFX workflow
installs explicitly select NuGet's current 2.81.0, also installed and verified
natively. pip bootstraps select 26.3; inline build/twine/Scriv helpers select
1.6.1/7.0.0/1.8.1. The active Python publisher installs its tools from the
universal hashed CI lock, including pypi-attestations 0.0.31. The new publisher
graph passes pip-audit. Sigstore 4.5.1 exactly requires sigstore-models 0.0.6;
fresh parent requirements document why 0.0.7 cannot be forced into that graph.

Historical template snapshots omit their original example-app files, one test
helper and a custom ESLint rule. Full archive checks were executed and their
remaining failures reproduced against the immutable initial SHA with the same
installed dependencies. They are not counted as passing suites. No missing
snapshot file is replaced by a fake fixture or a skipped assertion. The changed
npm helpers, image/lock contract, security scans and real preview execution pass
independently; shipping language suites remain covered by exact-head CI.

The declaration, lock, runtime and JVM tables record every retained version.
Consumer floors are separate from installed compiler defaults: Java 21,
Python 3.11, PHP 8.4, Go 1.26, Swift tools 5.9, Rust 1.87 and CMake 3.16 remain
explicitly tested promises. Templates use their current tool floors. Rust uses
edition 2024. The negative Rust 1.86 rejection probe is intentional coverage.
The issue-316 Rust dependency `=0.21.1` is an immutable before-version in a
performance experiment, not an outdated shipping dependency.

Native parent constraints account for non-latest transitive API majors. Each
such row names its selecting parent; replacing incompatible majors globally
would create an invalid graph. Scriv 1.8.1 still exactly requires Click 8.5 and
markdown-it-py 4.2; its existing upstream report remains applicable. ktlint 1.8.0
still embeds Kotlin compiler 2.2.21; upstream confirms stable incompatibility
with 2.4, and only unreleased/pre-release fixes exist. The embedded formatter
runtime is distinct from application Kotlin 2.4.21. The native graph has no
reported advisories. The ESLint pre-commit mirror still publishes 10.14 while
npm publishes 10.15; hook execution explicitly installs ESLint 10.15.0. KGP
owns Yarn Classic 1.22.22 and its lock schema; Yarn Berry is a different API,
not a compatible patch. The new vcpkg baseline still contains benchmark 1.9.5
while upstream benchmark is 1.10.0; the existing port-update issue records that
registry lag.

Python lock generation preserves each original universal-platform command and
minimum Python version. A host-only compile was rejected during investigation
because it dropped Windows markers and Python backports. Final hashed locks
retain those supported platforms and floors. uv's native universal resolution
is used rather than manually changing hashes or silently shrinking support:
[uv resolution documentation](https://docs.astral.sh/uv/concepts/resolution/).

## Existing components and alternatives

| Requirement | Existing component / possible approach | Selected solution and reason |
| --- | --- | --- |
| Current direct ranges across ecosystems | npm-check-updates, cargo-edit, dotnet-outdated, Maven Versions plugin, Gradle dependency-updates | Repository registry adapters query all direct requirements including properties/hooks/archives; native managers refresh each graph. All direct floors already match today's stable releases, so adding updater packages only to rewrite identical constraints is unnecessary. |
| Reproducible graphs | npm, Bun, Cargo, uv, Composer, NuGet, Maven/Gradle, Go, SwiftPM | Use each native resolver; retain universal platform markers, local path references and checksums. Extend the existing inventory for Bun rather than inventing lock generation. |
| Ongoing automation | Dependabot versus Renovate | Keep and verify existing Dependabot coverage plus the repository's live freshness checker, including templates and unsupported C++/hook cases. Avoid a second bot with overlapping PRs and credentials. |
| Security | npm/Bun audits, RustSec cargo-audit, PyPA pip-audit, Composer audit, NuGet vulnerability reports, OSV JVM queries, Go govulncheck | Audit exact native resolved graphs; inspect NuGet JSON because its command can exit zero with findings. Validate the empty Composer graph separately, with a reported upstream bug. |
| Workflow compatibility | setup-java's native problem matcher input | Enable the upstream input explicitly; no custom annotation parser is needed. |
| Artifact matching and Kotlin reporter adapters | Native fs.glob, current toolkit and Kotlin helper releases | Existing narrow adapters remain necessary until reported upstream APIs support current minimatch/Mocha. Deleting them now reproduces known failures; no equivalent newly released feature was found. |
| Stale generated KGP manifest | Gradle declared task inputs versus forced native regeneration | Keep explicit native task regeneration. Reproduce and propose upstream input modeling; the report submission is externally blocked, recorded below. |

Primary component references: [npm-check-updates](https://github.com/raineorshine/npm-check-updates),
[cargo-edit](https://github.com/killercup/cargo-edit),
[Dependabot supported ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories),
[Renovate](https://docs.renovatebot.com/),
[Gradle incremental inputs](https://docs.gradle.org/current/userguide/incremental_build.html).
The issue's linked dependency-update practices were read and archived verbatim.

## Upstream obligations and remaining limitation

The [report ledger](upstream/README.md) links current reports, reproduction,
affected versions, local workarounds and suggested upstream changes. A new
Composer 2.11.2 bug is filed as
[composer/composer#13274](https://github.com/composer/composer/issues/13274):
a valid platform-only empty lock makes `audit --locked` fail and recommend
passing `--locked`. The audit helper records empty-graph validation separately;
it does not convert a failed security audit into a pass.

KGP 2.4.21 / Gradle 9.9.1 still fails to invalidate `rootPackageJson` when only a
Yarn resolution changes. The fresh finite reproduction produced old/old/new
resolutions for generate/change/forced-regenerate. Searches found no exact
upstream report. JetBrains/kotlin disables GitHub issues; anonymous YouTrack
submission to the Kotlin project returned **HTTP 403 Forbidden**. The complete
report, reproduction and API rejection are preserved in `upstream/`.
**R18 remains unfinished for that submission**; no authenticated YouTrack
account is available. The workaround remains in place and does not block
building or reviewing the dependency changes. The PR remains unmerged.

No shared parser/API behavior or source inventory hashes were changed. The
parity checker still verifies 25 features, 31 text fixtures, 20 syntax fixtures,
ten hand-written language implementations and zero violations. Existing test,
benchmark, security, documentation and release jobs are preserved.
