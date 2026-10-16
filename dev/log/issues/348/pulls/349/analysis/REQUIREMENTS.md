# Requirements of issue #348, and what was done for each

The issue lists nine ecosystems and twelve general requirements. Each is quoted or summarised
below. The **Done** column names the commit (on branch `issue-348-a1c0fc463277`) or the file that
meets it. `data/changes.md` is the per-dependency table the issue asks for.

Most of the repository was already close to current when the work started. The freshness gate
from issue #325 (`scripts/ci/check-dependencies.py`, run daily in `dependencies.yml`) fails CI
once a newer release of any declared dependency is out. So most of the work was in what that gate
did not see: toolchain floors, lockfile entries, archived experiments, Dependabot coverage, and
the claims made in manifests and READMEs.

## Scope decision: `dev/log` snapshots are not updated

The issue lists several manifests under `dev/log/issues/290/...` and `dev/log/issues/330/...`.
These are snapshots of *other* repositories' pipeline templates, saved as evidence for issues #290
and #330. Updating them would rewrite the record of what those issues found. They also never
build here. The freshness gate already skips them (scope `snapshot`), and so do the Dependabot
config and its new guard. All three say why in a comment. The inventories in `data/` still list
them (scope `snapshot`), so the record shows what they pin.

For the same reason, the composite `action.yml` files the issue lists for GitHub Actions are all
`dev/log` snapshots. This repository has no `.github/actions` directory.

## Per-ecosystem requirements

| # | Ecosystem | Requirement | Done |
| --- | --- | --- | --- |
| 1 | JavaScript / TypeScript | Every manifest at `latest`, lockfiles regenerated (`npm-check-updates -u && npm install`) | `c0d2b3e`: eslint 10.13.0 in `js` and `docs/website`, gpt-tokenizer 4.0.3, every compatible transitive entry in the five `package-lock.json` files and `js/bun.lock`. No direct dependency crossed a major: every one was already on its latest major. Remaining transitive lag: [`TRANSITIVE.md`](TRANSITIVE.md) |
| 1a | JavaScript | The pre-commit `eslint` hook | `0c26f7a`: it installed an unpinned `eslint` and failed on every run (no `eslint.config.*` at the root). Now `eslint@10.13.0`, scoped to the two configured projects, and the freshness gate checks `additional_dependencies` |
| 2 | Rust | `cargo upgrade --incompatible && cargo update`; revisit `edition` and `rust-version` | `dc215bb`: edition 2024, resolver 3, `[workspace.package]` metadata, `rust-version` 1.87 (the real floor: `usize::is_multiple_of`; `check-msrv.sh` proves 1.86 fails), syn 3.0.9. `2dbf4a3`: every experiment crate on edition 2024 with a fresh lockfile. `rust/Cargo.lock` stays untracked on purpose (`.gitignore`: library workspace) |
| 3 | Python | Raise floors, drop upper bounds, upgrade lock/requirements | `e452c16`: `requires-python >=3.11` (3.9 and 3.10 are end of life), CI tests 3.11 and 3.15, the 3.9 shims are removed (regex version reader replaced by `tomllib`, the second `setuptools` marker, the `pypi-py39` resolver in the gate), and zizmor 1.31.1. `python/setup.cfg` only holds flake8 settings |
| 4 | C# / .NET | `dotnet outdated -u`; check `TargetFramework` | `58bb7f3`: SDK 10.0.402 pinned in `csharp/global.json`, Microsoft.ML.Tokenizers 2.0.1, `Microsoft.SourceLink.GitHub` removed (the SDK ships Source Link), the `Microsoft.Bcl.Memory` security pin removed (no longer needed), dead `net4*` reference assemblies removed, archived experiments moved from net8.0 (EOL 2026-11-10) to net10.0 |
| 5 | PHP | `composer update --with-all-dependencies` | `47aa156`: phpunit 13.4.3; both lockfiles current. The root `composer.json` is the Packagist mirror of `php/` and has no lockfile |
| 6 | Java | `versions:use-latest-releases` + `update-properties`; review the compiler release | `c542ce5`: central-publishing-maven-plugin 0.12.0; every other plugin and dependency was current. `26f06f9`: tests on JDK 21 (the `maven.compiler.release` floor), 25 (LTS) and 27 (newest). Maven itself was not pinned: CI used the runner's 3.9.15. `8f0b8c7`: the Maven Wrapper (`java/mvnw`) pins Maven 3.10.0 by SHA-256 for every build, workflow and script, and the freshness gate tracks it. `4b9b1c4`: `maven-enforcer-plugin` declares the real floor, 3.6.3, and the `maven-floor` job tests it |
| 7 | Go | `go get -u ./... && go mod tidy`; review the `go` directive | `12b8c40`: `go 1.26` in every module (1.24 and 1.25 are unsupported); `go fix` modernizers applied, and CI fails when `go fix -diff` reports more. Tests on 1.26 and 1.27. `9a484e1`: testify 1.12.1 in `benchmarks/go`'s module graph instead of the 1.8.2 that tiktoken-go's tests asked for ([`TRANSITIVE.md`](TRANSITIVE.md)) |
| 8 | GitHub Actions | Every `uses:` at its newest release | `3064b18`: setup-java v6.1.0, codeql-action v4.39.0 (all others were current), runners ubuntu-26.04 and macos-26, tool jobs on current toolchains |
| 9 | Infrastructure as code | `pre-commit autoupdate`; base images | Every hook `rev` was already its newest tag (`ci-logs/deps/pre-commit-autoupdate.log`). `bd93837`: `.gitpod.Dockerfile` was on `gitpod/workspace-dotnet:latest`, which ships .NET SDK 8.0.100 and cannot build `csharp/`. It is now pinned by tag and digest, and it installs the SDK `global.json` pins |
| 10 | C++, Shell, PEG.js, CMake | Check whether they pull dependencies through other means | C++: GoogleTest v1.18.0 by FetchContent (newest; tracked by the gate, since Dependabot cannot read CMake) and clang-format 23.1.3 from `cpp/tools/requirements.txt` (newest). CMake: the declared 3.16 floor was false for the test build, see [`DEFECTS.md`](DEFECTS.md) and `86a88e4`. PEG.js: peggy 5.1.0 in `js` (newest). Shell: scripts call tools that the workflows install. shellcheck runs in CI from the runner image |

## General requirements

| # | Requirement | Done |
| --- | --- | --- |
| G1 | A table per ecosystem of every dependency, pinned vs released today, from the registry | [`data/before/direct.md`](../data/before/direct.md), [`data/after/direct.md`](../data/after/direct.md), joined in [`data/changes.md`](../data/changes.md). All three are produced by scripts that query npm, crates.io, PyPI, NuGet, Packagist, Maven Central, the Go proxy and GitHub releases |
| G2 | Anything left behind has a written reason | One direct entry: `experiments/issue-316/rust-timing` pins `links-notation =0.21.1` because it is the baseline that experiment times against. Transitive entries: [`TRANSITIVE.md`](TRANSITIVE.md). Toolchains kept below their newest: [`TOOLCHAINS.md`](TOOLCHAINS.md) |
| G3 | Cross majors deliberately, adapt code, remove shims | Rust edition 2024 (`cargo fix --edition`, style edition 2024), Go 1.26 (`go fix`), Python 3.11 (`tomllib`), .NET (Source Link from the SDK). No constraint was loosened and no test was skipped |
| G4 | Use the new features, delete hand-rolled copies | `tomllib` replaces a regex `pyproject.toml` reader. The SDK's Source Link replaces a package. `new(expr)` replaces a Go `strPtr` helper. `range` over int, `strings.SplitSeq`, `slices.Backward`, `errors.AsType` and `max` come from `go fix`. `[workspace.package]` replaces per-crate metadata. `setup-dotnet` reads `global-json-file` instead of keeping a second SDK pin. A CMake policy range (`3.16...4.4`) replaces a per-call keyword. The Maven Wrapper and `maven-enforcer-plugin` replace a hand-written "Maven 3.6+" note |
| G5 | Honest constraints: floors, upper bounds, lockfiles | Python 3.11, Go 1.26, Rust 1.87, CMake 3.16 and Maven 3.6.3 are each tested in CI at the floor. The Python `dev` extra reuses `test` and `lint` instead of repeating them. Every committed lockfile is regenerated |
| G6 | One version per dependency across the repository | eslint 10.13.0 in `js`, `docs/website` and the pre-commit hook. One SDK pin (global.json) for CI and Gitpod. One Go floor for every module. Actions at one release in every workflow (the freshness gate checks every `uses:`) |
| G7 | Full build/test/lint of every ecosystem, CI green, no new deprecations | Local logs in `ci-logs/deps/`. CI on the pull request |
| G8 | Security advisories for the resulting tree | [`AUDITS.md`](AUDITS.md): none, in any ecosystem |
| G9 | Report upstream, with repro, versions, workaround and fix; link from the PR | [`../upstream/README.md`](../upstream/README.md) |
| G10 | Follow the hive-mind dependency-update practices | Copy in [`../reference/`](../reference/); see below |
| G11 | `.github/dependabot.yml` covers every ecosystem and directory | `07bb58b`: 35 committed manifests had no entry. The config now has 12 ecosystems (bun, dotnet-sdk, pre-commit and docker added), with minor and patch grouped and majors separate. `scripts/ci/check-dependabot.py` fails CI when a committed manifest has no entry. It caught one of this pull request's own files, and `1a0eef3` fixed that |
| G12 | Collect data and analysis in `dev/log/issues/348/pulls/349` | This folder |

## Notes against the hive-mind practices

- *Update toolchains, not just packages.* See [`TOOLCHAINS.md`](TOOLCHAINS.md).
- *Lockfiles committed and regenerated.* All of them, except `rust/Cargo.lock`. The workspace is
  a library, so its lockfile is ignored, and CI resolves fresh every run. The audit in
  [`AUDITS.md`](AUDITS.md) generated one to scan it.
- *Automate.* Dependabot runs daily, with a guard that it covers everything. The freshness gate
  fails CI once a release is out. The issue's sample config said `weekly`. The repository already
  chose `daily` to match the gate, and that is kept.
- *Test the floors.* Each language's CI matrix tests its declared floor and its newest release.
- *Security audit after the update.* [`AUDITS.md`](AUDITS.md).
