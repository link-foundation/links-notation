# Issue 405 / PR 406 work plan

Objective: implement and verify the complete dependency update in
https://github.com/link-foundation/links-notation/pull/406. Do not merge it.
Native goal tracking is active. All work stays on `issue-405-e18bfd98e937`.

## Requirements and verification ledger

| ID | Requirement | Approach / alternative considered | Completion evidence |
| --- | --- | --- | --- |
| R01 | Read the entire issue, comments, required sub-issues, PR discussion, inline comments and reviews | Preserve API snapshots in `research/`; refresh before finalization | Read and refreshed all four comment/review endpoints; all empty. Original issue and seven Dependabot PR snapshots preserved; no required sub-issues. |
| R02 | Apply open Dependabot PRs 361, 395, 396, 400, 401, 403, 404 and resolve their merge blockers | Update their exact declarations here, superseding them when the registry has a newer release; inspect checks and rules without weakening protection | All seven updates included or superseded; saved diffs/checks/rules reviewed. BEHIND means branch freshness, not missing required-context names; analysis.md maps each PR. |
| R03 | Update all JS/TS dependencies and transitive entries, including templates, benchmark and docs packages | Query npm dist-tags; regenerate npm and Bun locks; test build/lint/test and audit each tree | Ten native npm trees and Bun/Yarn locks updated; JS 368 tests plus build/lint/format, docs and audits passed. Exact archived JS application inputs restored; migration and policy verification are recorded in validation.md. |
| R04 | Update all Rust crates, lockfiles, edition and compiler/toolchain pins | Query crates.io; update manifests and regenerate locks; bounded serial builds and RustSec audit | All eleven native locks updated; current toolchain/edition pins reviewed. Tests, fmt, Clippy, benchmarks, RustSec and target-budget checks passed. |
| R05 | Update Python build/test/lint/runtime packages and constraints everywhere | Query PyPI; raise floors; resolve complete environments and run tests/lint/audits | All direct declarations plus three uv/nine hashed locks updated; tests/lint/package build/Twine and nine audits passed. Scriv exact pins have resolver evidence and upstream #208. |
| R06 | Update Maven and Gradle dependencies, plugins, wrappers and JDK pins | Query Maven Central/Google/Plugin Portal/Gradle; regenerate checksums and wrapper scripts; build/test/lint | Current wrappers/plugins/JDK pins and native formatter migration implemented; Java 226 tests and Kotlin JVM/JS/Wasm/ktlint passed. Final exact JVM graph has zero OSV findings; embedded compiler exception reproduced and documented. |
| R07 | Update PHP runtime, Composer packages and locks | Query Packagist/PHP; update constraints, install/audit/test/lint | Current PHP defaults/constraints and five native locks; 278 tests, PHPCS, distribution and audits passed. Both restored PHP snapshot applications pass their full checks without warnings or deprecations. |
| R08 | Update .NET SDK/framework and every NuGet package, including examples and experiments | Query NuGet and .NET release metadata; adapt tokenizer major; restore/test/format/audit | SDK 11, tokenizer 3, latest direct and compatible transitive selections, 21 native locks; 363 tests, zero build warnings, format/benchmark and native audits passed. |
| R09 | Update Swift toolchain and SwiftPM dependencies | Query official releases; resolve/build/test; root and example have only local dependencies | Verified current official image tag/digest. 349 tests executed with one existing skip; warnings-as-errors build/format/example passed; hosted macOS passed at 9317249. |
| R10 | Update Go runtime/directives, dependencies and sums in every module | Query official Go/proxy metadata; tidy/test/vet/vulnerability check | Current compiler and module declarations/sums; test/vet/benchmark/govulncheck passed. Supported language floors explicitly documented. |
| R11 | Update Docker base images, external CMake/C++ dependencies and tools | Inspect actual Dockerfiles despite issue detector reporting none; registry digest/tag and GitHub release checks | Both Dockerfiles and Swift image verified against registries; CMake/LLVM/gtest/benchmark/vcpkg/Conan updated. 383 C++ tests and format/build passed; vcpkg port lag reported #55056. |
| R12 | Update all Actions/reusable workflow/composite action references and pre-commit hooks | Query release tags; include templates; preserve workflow coverage; actionlint/shellcheck/zizmor and workflow tests | Every active/archived Action/tool input and hook reviewed; immutable archive policy preserved. Actionlint/ShellCheck/zizmor and archived security policy suites passed (11 current-tool plus seven C# workflow tests). |
| R13 | Produce per-ecosystem before/latest tables for every dependency, with registry evidence and written reasons for every retained version | Reuse existing registry checker, extend one-off inventory to requested historical files and toolchains; never infer latest from memory | 909 declaration rows, 1,951 native lock entries, 800 runtime pins and 230 native JVM edges have registry evidence/tables; retained versions individually explained. |
| R14 | Read changelog/migration guide for every major bump, migrate APIs, remove obsolete shims and use upstream features | Inspect major deltas and existing workaround reports; replace local adapters only after reproducing upstream support | Primary guides/release notes saved and reviewed in analysis.md. Native Spotless/glob migration and removed obsolete overrides reduce duplicated code; major API regressions have tests. |
| R15 | Align repeated pins, honest floors, no obsolete upper bounds; regenerate and commit every lockfile | Review complete inventory and resolution output; distinguish intentional historical comparison inputs with specific written reasons | Repeated actual tool selections aligned, honest supported floors documented, native locks regenerated/tracked. Final inventory and retention tables saved. |
| R16 | Full build/test/lint in every ecosystem; green CI, no new deprecations, no unresolved security advisories | Focus local work to low-memory checks; collect latest-SHA completed CI logs before every push; use adequately provisioned CI for heavy/platform builds | Local active ecosystem build/test/lint/audit coverage passed; all six hosted workflows passed at 9317249 (87 successful jobs, four existing conditional skips). The final artifact correction requires a fresh exact-head CI run. Exact archived JS, PHP and C# sources were restored temporarily and checked with the updated snapshots; results in validation.md. |
| R17 | Report general missing features/bugs/duplicated workarounds upstream, searching existing reports first | Recheck existing reports; reuse or update reports with versions/reproducer/workaround/proposal; record external credential blockers honestly | Five new reports/comments published after searches; existing reports refreshed and linked. KGP YouTrack report remains unfiled: authenticated tracker access unavailable. This criterion is unfinished. |
| R18 | Verify Dependabot covers every ecosystem/directory/manifest and newly added manifests | Existing checker plus complete inventory, including requested templates; no fabricated yarn-only manifest | Checker regression first, all supported active/archived dirs configured, live repository label/coverage check passed; unsupported bot ecosystems are explicitly documented. |
| R19 | Deep online research, alternatives/components and per-requirement solution plan, all data under requested folder | Primary documentation, registry responses and existing PRs; use native package managers rather than custom lockfile writers | Deep primary-source research, alternatives and solutions in analysis.md; reproducible probes under experiments/issue-405 and all requested evidence under this folder. |
| R20 | JS reference/ten-language evidence for shared behavior changes; preserve every existing feature | No shared syntax change planned; JS tests default; existing parity/native suites remain required | No shared syntax/API change. All native suites exercised; Kotlin redundant-condition cleanup reviewed against 25 feature rows before inventory refresh; zero parity violations. |
| R21 | Atomic commits, release trigger/version preparation, updated title/body, correct closing references, latest main merged, clean tree and final diff review | Add reviewed changelog fragment; verify version consistency, branch ancestry, full PR diff/checks; mark ready only upon completion | Atomic implementation, CI correction and archive-validation commits preserved; release 0.31.4 prepared. Third-round exact-head CI passed; final artifact regression correction and fourth-round CI/readiness review remain in progress. Main ancestry checked before push; paginated PR files and the complete native diff reviewed because GitHub rejects a diff over 300 files. |

## Execution sequence

1. Save source material and initial CI/SHA evidence; build complete registry inventory and before/latest tables.
2. Review major migration notes and obsolete adapters, then update dependency declarations in coherent atomic steps.
3. Regenerate lockfiles using native package managers and make required API changes.
4. Run JS by default, focused local checks and security audits sequentially; run full native coverage in CI where resources/platforms require it.
5. Collect every completed latest-SHA failure and read saved logs; fix the complete batch, wait for active runs, then push once.
6. Repeat validation only for new changes/failures, review the whole PR, refresh comments/main ancestry, finalize description and mark ready.

## Resource policy

2.92 GiB container limit. No sub-agents authorized. Rust: shared
`/tmp/links-notation-cargo`, one compiler job, incremental off, debug info off,
budget checks before/after. Other memory-heavy builds run sequentially with
bounded workers/heaps. Command logs go in `ci-logs/`; experiments stay in
`experiments/issue-405/`. No deliberate unbounded stress tests.

## Scope interpretation

The issue explicitly includes historical manifests under `dev/log/` and
experiments. This overrides the existing checker's default historical exclusions:
these are inventoried and reviewed too. Original research remains recoverable
through Git history; intentionally pinned before/after comparison artifacts must
have an individual reason rather than being silently omitted.
