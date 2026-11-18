# Dependency refresh for issue 421

The issue, its comment, and all three classes of PR feedback are captured in [research](research/). GitHub returned no required sub-issues and no PR conversation comments, inline comments, or reviews when the review started. The baseline is `ece88a9e51f77a858eacad0434616dce2e140f33`, whose ancestor `e01fdfaff7148f72e6a347f92686080de4b7cfc5` includes PR 414.

## Requirements and verification plan

| Requirement | Approach and verification |
| --- | --- |
| Preserve PR 414 and fix every related failure | Keep the template xUnit runner update. Compare default-branch CI with the original publication run and restore, test and audit NuGet. [CI excerpts](research/ci/) |
| Fix the reported security failures | Verify the three failing npm trees and all other locks. GitHub withdrew the picomatch advisory. The fresh audit separately identified the glob-parent minimatch pin. Use a scoped override and test both artifact helpers. [Advisory evidence](research/picomatch-advisory.json) |
| Fix release audit and restore green main CI | Verify the existing registry versions, retry the original PHP and Kotlin 0.31.6 publishers at the original SHA and validate their release tags. Build DocFX on PRs with the same tool as deployment. Prepare the independent 0.31.7 release in this PR. |
| Apply PR 415 | Put Maven 3.10.1 and its verified archive checksum in the Java wrapper. Run Maven verify. |
| Apply PRs 416–418 | Update lino-objects-codec in all three consumers. Check website lint and build, compression comparison reproducibility and benchmark round trips. |
| Apply PR 419 | Update the mirror to v10.15.0 and remove the local ESLint pin supplied by the hook itself. Confirm the tag and pre-commit configuration. |
| JavaScript and TypeScript | Review ten npm projects, Bun and Kotlin/JS Yarn. Regenerate native locks, run frozen installs and native audits and tests. |
| Rust | Resolve all Cargo locks and review all manifests, including archived templates and experiments. Run tests, no-default-features, formatting, Clippy, benchmark reproducibility and audit on Rust 1.100.0. |
| Python | Regenerate uv and hashed requirements locks while preserving platform markers and 3.11 support. Test a built distribution, lint, type-check and audit. |
| PHP | Resolve Composer projects and retain the benchmark's local source dependency. Build, test, lint, run static analysis and audit. |
| Java and Kotlin | Check Maven Central, Gradle, plugins and Kotlin/JS test tooling. Verify Maven and Gradle tests and lint, and check the platform jobs. |
| C# / .NET | Refresh NuGet using the current SDK. Preserve the published framework and separate current test runtime. Share the DocFX tool manifest so PR checks and deployment use the same pin. |
| Swift | Check the compiler and Linux image. Both SwiftPM manifests have no external packages. Resolve, build and test natively and verify the compatibility job. |
| Go | Resolve all Go modules. Preserve local replacements solely exercising this checkout. Run native race tests, vet, formatting and vulnerability checks. |
| Docker | Verify Gitpod and Swift image tags and digests against their upstream registries. Preserve compatibility-matrix images. |
| GitHub Actions | Verify all action refs including hidden archive workflows, plus embedded tool pins. Check the JS-first and publishing gates. |
| Infrastructure | Check pre-commit configs, Gitpod and workflow toolchains. Search for Terraform, Helm and other IaC manifests. |
| C++ / CMake | Cover the actual CMake build and the vcpkg template omitted by the issue detector. Refresh vcpkg baseline, reconcile current tools and run CMake, CTest and lint. |
| Full dependency and lock coverage | Compare declarations and transitive locks with registry data, explain retained constraints, and check all locations sharing a pin. Record any unresolved rows. |
| Major migrations and obsolete workarounds | Read release and migration notes, exercise changed API paths and remove obsolete shims. Preserve public compatibility and tests. |
| No unresolved advisories or new deprecation warnings | Audit the resolved graph, review native build and CI warnings, and keep security gates enabled. |
| Dependabot coverage | Check all supported manifests, including template subdirectories. Review tools that can fill the unsupported gaps. |
| Upstream reporting | Search equivalent issues and file current reproductions with a suggested fix and the local workaround. Link the reports and record any restricted tracker. [Upstream ledger](upstream/) |
| Single PR with closing keyword | Preserve release coverage, review the diff, match checks to the final SHA, and keep `Fixes #421` in the description. |

## Alternatives and migration notes

- Native resolvers preserve platform markers, optional dependencies and parent constraints. Registry maxima alone cannot establish that a fresh install will select a compatible graph. [deps.dev API](https://docs.deps.dev/api/v3/index.html)
- Dependabot covers supported manifests here. Renovate can maintain locks automatically but would add another source of dependency pull requests. [Renovate lock-file maintenance](https://docs.renovatebot.com/configuration-options/#lockfilemaintenance)
- OSV-Scanner can supplement the native scanners. Compare lock support before using it in place of an ecosystem-specific audit. [OSV-Scanner support matrix](https://github.com/google/osv-scanner/blob/main/docs/supported_languages_and_lockfiles.md)
- The version 1.0.0 codec keeps the calls used by the three consumers. Existing generation, build and round-trip checks exercise them. [Codec release](https://github.com/link-foundation/lino-objects-codec/releases/tag/v1.0.0)
- glob-parent 7 uses ES modules and minimatch. Both artifact helpers use ES modules and normalize Windows paths before matching. The scoped override changes only the affected dependency edge. [Release](https://github.com/gulpjs/glob-parent/releases/tag/v7.0.0), [upstream report](https://github.com/gulpjs/glob-parent/issues/92)
- Retrying the original publishers preserves registry commit identity. Creating 0.31.6 releases from the PR SHA would put the wrong source in the tags. The version bump establishes a separate release.
- Preserve verified locks, native compatibility and release gates throughout the refresh. [Dependency update practices](https://github.com/link-assistant/hive-mind/blob/main/docs/DEPENDENCY-UPDATE-BEST-PRACTICES.md)
