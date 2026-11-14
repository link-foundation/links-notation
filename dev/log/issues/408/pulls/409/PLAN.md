# Issue 408 / PR 409 plan and acceptance ledger

Objective: fully implement and verify issue 408 in
https://github.com/link-foundation/links-notation/pull/409, without merging.
Baseline: `e3dc638c395d9e0c15c3ad143a73299f634ed912`.
Native goal tracking is active. Work only on `issue-408-891b7bc77ff4`.

| ID | Requirement | Solution plan and alternatives | Status / verification |
| --- | --- | --- | --- |
| R01 | Read complete issue, comments, required sub-issues and all three PR feedback types | Save paginated API responses; repeat before finalization | Initial snapshots read; no comments or required sub-issues |
| R02 | Include Dependabot #396 and #407 and resolve their merge blockers | Inspect patches/checks/rules; include current superseding versions; preserve protections | Superseding changes present; stale TruffleHog failure diagnosed; SDK major reviewed; protections preserved; planner tests/dry run pass |
| R03 | Update every JS/TS dependency, dev dependency and transitive | Fresh npm registry queries, all ten manifests, native npm/Bun/Yarn locks; build/test/lint/audit | Ten native npm updates plus Bun/Yarn; JS tests/build/lint/format and npm/Bun/Yarn audits pass; full tables linked in README |
| R04 | Update all Rust crates, locks, toolchains, editions and MSRV review | Registry queries and native Cargo resolution; serial bounded test/fmt/Clippy/audit | Eleven native resolutions/audits; Rust 1.100 fmt/tests/Clippy/benchmark checks pass with one job and budget checks; ten embedded tool inputs/defaults inventoried and aligned; nine workflow-checker tests pass |
| R05 | Update Python dependencies, build/lint/test tools, floors and upper bounds | Fresh PyPI queries, native uv and hashed pip locks; tests/lint/build/audit | Native universal uv/pip locks refreshed; 443 tests pass plus existing platform skip; linters pass; nine audits pass |
| R06 | Update PHP runtime, Composer dependencies and locks | Fresh Packagist/runtime queries; native update; test/lint/audit/distribution checks | Five native updates; four nonempty audits and empty-root validation pass; PHPUnit/PHPCS/distribution checks pass |
| R07 | Update Java/Kotlin plugins, libraries, wrappers and JDK | Maven/Google/Plugin Portal/Gradle queries; native resolution, tests/lint and exact graph audit | Fresh registry and native Maven/Gradle graphs; Java install/tests pass; 62-artifact OSV clean; full hosted matrix linked from PR |
| R08 | Update .NET SDK, frameworks and every NuGet project/lock | Registry/release metadata; native restore/test/format/audit | SDK 11 already supersedes #407; 22 native restores/audits pass; final full test/format evidence from PR checks |
| R09 | Update Swift tools and SwiftPM dependencies | Official release/image queries; resolve/build/test/format root and example | Both SwiftPM native updates pass; no external dependencies; exact platform test/format evidence from PR checks |
| R10 | Update Go compiler/directives and every module/sum | Official releases/proxy; native tidy/test/vet/govulncheck | Ten native tidy passes; fresh compiler metadata; current-toolchain govulncheck logs; full test/vet CI preserved |
| R11 | Update Docker bases and omitted C++/CMake dependencies/tools | Query image registries, upstream C++ releases, Conan/vcpkg; build/test/format | Fresh image/C++ metadata; latest vcpkg baseline updated; explicit port-lag report; full hosted C++ checks preserved |
| R12 | Update all Actions/composite/reusable references and infrastructure/hooks | Fresh releases and immutable SHAs; actionlint/ShellCheck/zizmor and workflow contracts | All copies inventoried; 54 Action references updated; Java annotation regression first; workflow linters pass |
| R13 | Tables of every declaration and transitive before/latest, resolved today; explain every retained version | Reuse repository registry adapters, recollect evidence without altering prior research | 918 declarations, 2250 lock entries, 800 runtime selections, 230 JVM edges; individual retained-version reasons; zero registry query errors |
| R14 | Deliberately migrate every major, read changelogs/guides, adopt replacement upstream features and remove obsolete shims | Review actual deltas and test API/behavior migrations; retain necessary workarounds | npm 12 migration guide and browser pre-1.0 changes reviewed; semver replaces manual comparisons; before/after regression and real browser smoke pass; previous major migrations retained |
| R15 | Align duplicate pins, honest floors, regenerate every lock natively | Full tracked inventory includes archives/examples/experiments; individually explain compatibility constraints | Native lock refreshes complete; four missing locks tracked; duplicate defaults aligned; tested consumer floors documented |
| R16 | Full build/test/lint each ecosystem, no new deprecations, green exact-head CI | JS default; focused local checks; hosted full/platform builds within resource constraints | Local verification table complete; final exact-head hosted results linked from PR checks (never substitute initial passes) |
| R17 | No unresolved security advisories | Native ecosystem audits and exact JVM OSV graph | Native graph audits recorded; current Go toolchain repeat separately recorded; no known dependency advisory in refreshed graphs |
| R18 | Report dependency bugs/missing features/general duplicated logic upstream | Search existing reports, update or file minimal repro/version/workaround/proposal; link reports | Partly complete: existing reports verified; Composer #13274 newly filed. BLOCKED/unfinished: YouTrack Kotlin report rejected HTTP 403; report and repro saved |
| R19 | Dependabot covers every ecosystem and directory, including new manifests | Inventory versus config and existing coverage checker; document unsupported managers | Live manifest/label coverage checker passes; unsupported Yarn/Gradle update cases have upstream reports and native freshness coverage |
| R20 | Deep online research and per-requirement alternatives/plans in requested folder | Primary sources, recent related PRs, native resolvers versus updater/bot alternatives | Complete primary-source snapshots, analysis, per-requirement plans, component alternatives, registry tables and native logs |
| R21 | Preserve existing features and JS reference/ten-language contract | Run JS/parity; JS regression first for behavior changes; review feature coverage before inventory refresh | No parser/API changes; JS regression for Action behavior; parity passes 25 features / 31 text / 20 syntax / ten languages / zero violations |
| R22 | Atomic commits, release preparation, updated PR, clean tree, latest main and ready status | Changelog/release consistency; complete diff review; mark ready after verification; keep unmerged | Atomic commits and ten-binding 0.31.5 release preparation; final PR state and exact-head checks are authoritative; keep unmerged |

Execution: collect evidence and diagnose current CI; draft all required changes;
resolve locks with native tools; verify sequentially; collect/read all latest-SHA
failures before each single push; wait for all active runs; review and finalize.

CI investigation: list recent runs with timestamps/SHA; verify against HEAD;
save every completed failure under `ci-logs/issue-408/`; read logs in chunks of
at most 1,500 lines; record specific errors and line numbers. No push during
an active run on this branch/range.

Resource policy: 2.92 GiB shared memory. No agents authorized. One Rust target
directory `/tmp/links-notation-cargo`, one job, incremental/debug info off,
2 GiB target-budget checks before/after. Run heavy commands sequentially;
delegate platform/heavy coverage to hosted CI. Reusable probes go in
`experiments/issue-408/`, command logs in `ci-logs/issue-408/`.
