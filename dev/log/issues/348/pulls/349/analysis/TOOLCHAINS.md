# Toolchains, runtimes and runner images

The issue counts "the language/toolchain versions themselves" as dependencies. The release and
end-of-life data come from endoflife.date and were saved to `../data/toolchains/` on 2026-10-16.

The rule applied everywhere: **the declared floor is tested, the newest release is tested, and tool
jobs (lint, build, publish) run on the newest supported release.** A floor nothing tests is a
claim, not a constraint.

| Toolchain | Declared floor (where) | CI tests | Tool jobs | Newest release | Notes |
| --- | --- | --- | --- | --- | --- |
| Node.js | none declared | 24 | 24 | 26.12.0 (Current) | Node 24 is the Active LTS. 26 becomes LTS on 2026-10-28. Until then a Current line is not what users run in production, so CI stays on the LTS. Revisit after 2026-10-28 |
| Bun | none | `latest` | `latest` | 1.4.3 | `bun-version: latest` is setup-bun's own way to track the newest release |
| Rust | 1.87 (`rust-version`, `[workspace.package]`) | 1.87.0, stable | stable | 1.99.1 | 1.87 is the real floor (`usize::is_multiple_of`). The `msrv-rejection` job in `rust.yml` runs `experiments/issue-334/check-msrv.sh` on 1.86.0 and proves it is rejected, so the floor cannot drift down unnoticed. Edition 2024 needs 1.85 |
| Python | 3.11 (`requires-python`) | 3.11, 3.15 | 3.15 | 3.15.0 | 3.9 and 3.10 are end of life (3.10 on 2026-10-01). The old floor `>=3.9` was never tested: CI only ran 3.13 |
| .NET SDK | 10.0.402 (`csharp/global.json`, `rollForward: latestFeature`) | from global.json | from global.json | 10.0.402 / runtime 10.0.13 | .NET 10 is the LTS. .NET 8 and 9 reach end of support on 2026-11-10, so the archived experiments moved from net8.0 to net10.0. setup-dotnet and Gitpod read the same global.json |
| Java | 21 (`maven.compiler.release`) | 21, 25, 27 | 25 | Temurin 27+35 | 25 is the LTS. 27 shipped on 2026-09-22 and all 185 tests pass on it (`../ci-logs/deps/java-jdk27.log`) |
| Maven | 3.6.3 (`maven-enforcer-plugin` `requireMavenVersion` in both POMs) | 3.6.3 (`maven-floor` job), 3.10.0 | 3.10.0 (`java/mvnw`) | 3.10.0 (4.0.0 is still a release candidate, rc-7) | Before: no pin. CI ran the runner's Maven (3.9.15 on ubuntu-26.04), and the README claimed "Maven 3.6+", which the plugins reject below 3.6.3. Now the Maven Wrapper pins 3.10.0 with a SHA-256, and the floor is declared and tested. Locally 3.6.3 passes 185/185 tests and 3.6.2 is refused (`../ci-logs/deps/java-maven-3.6.*.log`). Release candidates are not stable releases, so 4.0.0-rc-7 is not used |
| PHP | 8.4 (`composer.json`) | 8.4, 8.5 | 8.5 | 8.5.11 | 8.3 still has security support until 2027-12-31, but phpunit 13.4.3 requires PHP `>=8.4.1` |
| Go | 1.26 (`go` directive in every `go.mod`) | 1.26, 1.27 | 1.27 | 1.27.2 | 1.24 and 1.25 are unsupported (Go supports the two newest releases) |
| CMake | 3.16 (`cmake_minimum_required(VERSION 3.16...4.4)`) | 3.16.9, runner (4.4.4 on ubuntu-26.04) | runner | 4.4.4 | The floor is for consumers who build the library from source. The new `cmake-floor` job tests it. See [`DEFECTS.md`](DEFECTS.md) |
| C++ compilers | C++17 (`cxx_std_17`) | GCC 15, Clang 21 (ubuntu-26.04), MSVC (windows-2025), Apple Clang (macos-26) | — | — | come with the runner images |

## Runner images

| Before | After | Why |
| --- | --- | --- |
| `ubuntu-24.04` | `ubuntu-26.04` | The newest Ubuntu LTS image (`../data/toolchains/Ubuntu2604-Readme.md.txt`). actionlint does not know the label yet ([rhysd/actionlint#682](https://github.com/rhysd/actionlint/issues/682)), so `.github/actionlint.yaml` lists it |
| `macos-15` | `macos-26` | The newest macOS image. macOS 27 is out, but GitHub has no `macos-27` runner label yet (`../data/toolchains/runner-images-README.md.txt`) |
| `windows-2025` | `windows-2025` | Already the newest |

## Base images

| Image | Before | After |
| --- | --- | --- |
| `.gitpod.Dockerfile` | `gitpod/workspace-dotnet:latest` (last pushed 2025-11-26, .NET SDK 8.0.100) | `gitpod/workspace-dotnet:2026-02-12-23-06-03@sha256:253772ff…`, the newest tag, pinned by digest. The SDK comes from `dotnet-install --jsonfile` reading `csharp/global.json` |

The Gitpod image tags are build dates, not semantic versions. Dependabot's docker updater handles
date-like tags, but whether it picks up this scheme cannot be tested locally. If it does not,
the digest pin still keeps the workspace reproducible, and the comment in the Dockerfile says how
to bump it.
