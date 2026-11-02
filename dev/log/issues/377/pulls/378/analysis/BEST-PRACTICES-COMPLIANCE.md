# Compliance with the hive-mind CI/CD best practices

- **Source:** <https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.md>,
  at commit `15434023b4fd07f67945f3e02dc991e020b94a35` (2026-10-15). That is still the latest
  commit to touch the file on 2026-11-02. A copy is in `../reference/`.
- **Scope:** the state of branch `issue-377-e0fbca836336`.
- **Previous assessment:** for issue #330, in
  `../../../../330/pulls/331/analysis/BEST-PRACTICES-COMPLIANCE.md`.
- Rows marked **Fixed here** changed in this pull request.

| # | Principle | Status | Evidence |
| --- | --- | --- | --- |
| — | Pin hosted runner images | Compliant | Every job runs on a versioned image (`ubuntu-26.04`, `macos-26`, …). `workflows.yml` "Check that hosted runners are pinned" fails if a `-latest` alias returns. |
| 1 | Run checks only on relevant changes | Deliberate deviation | Issue #339 made CI a single `CI` workflow (`js.yml`). Its language stages `needs: [js]`, and the JS gate always runs, because "path filters must not let a Rust-only change skip the JavaScript gate". `links.yml`, `pages.yml` and the publish workflows keep `paths:` filters. `merge-dependabot.py` honours them when it dispatches (C7). |
| 2 | File size limits | **Gap** (unchanged) | `rust/links-notation/src/lib.rs` is 2197 lines. A limit needs a source split first, which is unrelated to any CI failure in this issue. |
| 3 | Automated formatting | Compliant | prettier, `cargo fmt`, black and isort, gofmt, `dotnet format`, Spotless with google-java-format (now 2.0.0, `07e6f64`), phpcs, ktlint and swift-format. |
| 4 | Static analysis | Compliant | CodeQL, eslint, clippy, flake8, `go vet`, ktlint, plus the cross-language differential tests that caught A1. |
| 5 | Fast-fail ordering | Compliant | `js` → languages → `release` → `release_audit`, through `needs:`. |
| 6 | Changeset-based versioning | Compliant | `changelog.d/` fragments; this pull request adds `changelog.d/377.md`. |
| 7 | Validate the actual merge result | Partial (unchanged) | `pull_request` runs check out GitHub's merge commit (`refs/pull/N/merge`), and `dependency freshness` diffs against its first parent. There is no re-merge just before checks, so a base that moves during a long run is not re-tested. |
| 8 | Pre-commit hooks | Compliant | `.pre-commit-config.yaml`; Dependabot keeps its hooks current (PRs #375, #376). |
| 9 | Release automation | **Fixed here** | The release audit tells a skipped release from a missing credential (C1). The NuGet step names an expired key and supports trusted publishing (B1). Commits merged with `GITHUB_TOKEN` now get push CI, so they can release (C7). |
| 10 | Concurrency control | Compliant | `CI` uses `cancel-in-progress: false` per ref, and the other workflows cancel superseded runs except on `main`. |
| 11 | Secrets detection | Compliant | trufflehog `--results=verified` in `security.yml`. Its pinned version was raised to 3.99.7 (`478a505`). |
| 12 | Documentation validation | Compliant | lychee in `links.yml` on changes and weekly; `docs.yml` builds the API docs. |
| 13 | Native runners per architecture | Not applicable | No container images are built. |
| 14 | Lint the workflows | Compliant (extended) | actionlint, shellcheck and zizmor at medium in `workflows.yml`, which now also runs the offline tests for the re-run planner (A6) and the NuGet publish step (B1). |
| 15 | Audit the dependency tree | **Fixed here** | `npm audit` on a schedule at `moderate` instead of `high` (C5), and the Kotlin/JS `yarn.lock`, which `npm audit` and Dependabot cannot read, is audited too (C6). Other ecosystems rely on Dependabot security alerts. |
| 16 | Prove you can publish before you build | **Gap** (unchanged) | No `preflight` job. Missing credentials surface in the publish jobs and in `release_audit`, each with the remedy (B1). The rust, js, csharp, python and php templates have `scripts/preflight-credentials.*`. Porting them to the eight registries used here is a project of its own, and it would not have prevented any failure in this issue: every one of them was found by the existing jobs. |
| 17 | Tell a broken pipeline from a changed world | **Fixed here** | The dependency freshness gate fails pull requests and warns on push and schedule (C2, `0b8992a`). Jobs that no hosted runner picked up are re-run instead of reported as failures (A6). The release audit names the real failed stage (C1). |

## Template practices adopted or not

`../templates/COMPARISON.md` compares the eight templates defect by defect (D1–D9).

| Practice | Templates | Here |
| --- | --- | --- |
| Dispatch push workflows after an automated merge (D2) | js, rust | Adopted (`cf7c90c`). |
| Audit names the failed stage (D3) | js, rust, python, csharp, cpp, php | Adopted (`7a256fa`). |
| Version range rather than a shared literal for the Maven floor (D4) | java | Adopted (`07e6f64`). |
| Regenerate-and-diff with a remedy message (D6) | js (partial) | Adopted, with the command to run (`478a505`). |
| Audit at `moderate`, on a schedule (D8) | rust, csharp, cpp, php | Adopted (`cc23a71`). The js, python and java templates were told (`../upstream/URLS.txt`). |
| Credential preflight (P16) | rust, js, csharp, python, php | Not adopted; see P16 above. |
| Fresh-merge simulation (P7) | js | Not adopted; see P7 above. |
