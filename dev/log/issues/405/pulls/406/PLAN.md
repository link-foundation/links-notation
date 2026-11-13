# Issue 405 / PR 406 work plan

Objective: implement and verify the complete dependency update in
https://github.com/link-foundation/links-notation/pull/406. Do not merge it.
Native goal tracking is active. All work stays on `issue-405-e18bfd98e937`.

## Requirements and verification ledger

| ID | Requirement | Approach / alternative considered | Completion evidence |
| --- | --- | --- | --- |
| R01 | Read the entire issue, comments, required sub-issues, PR discussion, inline comments and reviews | Preserve API snapshots in `research/`; refresh before finalization | Initial snapshots collected; no comments/reviews/sub-issues |
| R02 | Apply open Dependabot PRs 361, 395, 396, 400, 401, 403, 404 and resolve their merge blockers | Update their exact declarations here, superseding them when the registry has a newer release; inspect checks and rules without weakening protection | Pending |
| R03 | Update all JS/TS dependencies and transitive entries, including templates, benchmark and docs packages | Query npm dist-tags; regenerate npm and Bun locks; test build/lint/test and audit each tree | Pending |
| R04 | Update all Rust crates, lockfiles, edition and compiler/toolchain pins | Query crates.io; update manifests and regenerate locks; bounded serial builds and RustSec audit | Pending |
| R05 | Update Python build/test/lint/runtime packages and constraints everywhere | Query PyPI; raise floors; resolve complete environments and run tests/lint/audits | Pending |
| R06 | Update Maven and Gradle dependencies, plugins, wrappers and JDK pins | Query Maven Central/Google/Plugin Portal/Gradle; regenerate checksums and wrapper scripts; build/test/lint | Pending |
| R07 | Update PHP runtime, Composer packages and locks | Query Packagist/PHP; update constraints, install/audit/test/lint | Pending |
| R08 | Update .NET SDK/framework and every NuGet package, including examples and experiments | Query NuGet and .NET release metadata; adapt tokenizer major; restore/test/format/audit | Pending |
| R09 | Update Swift toolchain and SwiftPM dependencies | Query official releases; resolve/build/test; root and example have only local dependencies | Pending |
| R10 | Update Go runtime/directives, dependencies and sums in every module | Query official Go/proxy metadata; tidy/test/vet/vulnerability check | Pending |
| R11 | Update Docker base images, external CMake/C++ dependencies and tools | Inspect actual Dockerfiles despite issue detector reporting none; registry digest/tag and GitHub release checks | Pending |
| R12 | Update all Actions/reusable workflow/composite action references and pre-commit hooks | Query release tags; include templates; preserve workflow coverage; actionlint/shellcheck/zizmor and workflow tests | Pending |
| R13 | Produce per-ecosystem before/latest tables for every dependency, with registry evidence and written reasons for every retained version | Reuse existing registry checker, extend one-off inventory to requested historical files and toolchains; never infer latest from memory | Pending |
| R14 | Read changelog/migration guide for every major bump, migrate APIs, remove obsolete shims and use upstream features | Inspect major deltas and existing workaround reports; replace local adapters only after reproducing upstream support | Pending |
| R15 | Align repeated pins, honest floors, no obsolete upper bounds; regenerate and commit every lockfile | Review complete inventory and resolution output; distinguish intentional historical comparison inputs with specific written reasons | Pending |
| R16 | Full build/test/lint in every ecosystem; green CI, no new deprecations, no unresolved security advisories | Focus local work to low-memory checks; collect latest-SHA completed CI logs before every push; use adequately provisioned CI for heavy/platform builds | Pending |
| R17 | Report general missing features/bugs/duplicated workarounds upstream, searching existing reports first | Recheck existing reports; reuse or update reports with versions/reproducer/workaround/proposal; record external credential blockers honestly | Pending |
| R18 | Verify Dependabot covers every ecosystem/directory/manifest and newly added manifests | Existing checker plus complete inventory, including requested templates; no fabricated yarn-only manifest | Pending |
| R19 | Deep online research, alternatives/components and per-requirement solution plan, all data under requested folder | Primary documentation, registry responses and existing PRs; use native package managers rather than custom lockfile writers | In progress |
| R20 | JS reference/ten-language evidence for shared behavior changes; preserve every existing feature | No shared syntax change planned; JS tests default; existing parity/native suites remain required | Pending |
| R21 | Atomic commits, release trigger/version preparation, updated title/body, correct closing references, latest main merged, clean tree and final diff review | Add reviewed changelog fragment; verify version consistency, branch ancestry, full PR diff/checks; mark ready only upon completion | Pending |

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
