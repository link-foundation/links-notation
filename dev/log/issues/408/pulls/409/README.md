# Issue 408 / pull request 409 evidence

Repository-wide dependency refresh, researched on **2026-11-14 UTC** for
[issue 408](https://github.com/link-foundation/links-notation/issues/408) and
[PR 409](https://github.com/link-foundation/links-notation/pull/409).
Initial branch SHA: `e3dc638c395d9e0c15c3ad143a73299f634ed912`.

- [Requirements and solution plans](PLAN.md): every issue requirement and its verification state.
- [Analysis](analysis.md): root causes, migrations, alternatives, compatibility decisions and upstream reports.
- [Validation](validation.md): native commands, security results and exact-SHA CI evidence.
- [Every declaration](research/dependency-tables.md): 909 selections, before/current/latest registry results.
- [Toolchains and compatibility floors](research/toolchains.md): 800 workflow/runtime selections and explicit exceptions.
- Native lock entries: [npm/Bun/Yarn](research/locked-npm.md), [Cargo](research/locked-cargo.md), [Python](research/locked-pypi.md), [Composer](research/locked-composer.md), [NuGet](research/locked-nuget.md), [Go](research/locked-go.md).
- [Native JVM graphs](research/jvm-transitives.md): 230 edges, 62 exact artifacts and their current registry releases.
- [Retained-version decisions](research/retained-lock-review.json): an individual explanation for each of 283 non-latest lock selections.
- [Primary source index](research/primary-source-index.json): dated runtime/image/upstream snapshots; package results are `registry-all.json`, `registry-transitive.json`, and `registry-jvm-transitive.json` in `research/`.
- [Upstream report ledger](upstream/README.md), including a new Composer report and the unfinished YouTrack submission.

Evidence tables describe registry releases observed today, not packages necessarily released today. Hand-written language ports remain hand-written. No publishing or registry delivery is claimed by this dependency PR. Raw third-party Markdown/diffs are compressed to preserve their original content without treating their relative links as repository documentation.
