# Compliance with the hive-mind CI/CD best practices

Source: <https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.md>, at
commit `9208ae6f40b53fd93d6fa1328f634a0c99f3c41f` (2026-10-01). It has sixteen principles plus a
note on runner pinning.

This is the state of branch `issue-330-9a9f62f53865`. The previous assessment, for issue #290, is
in `../../../../290/pulls/291/analysis/BEST-PRACTICES-COMPLIANCE.md`. Rows marked "fixed here"
changed in this pull request.

| # | Principle | Status | Evidence |
| --- | --- | --- | --- |
| — | Pin hosted runner operating systems | **Fixed here** | `bf9ccdc`: 67 `ubuntu-latest` labels pinned to `ubuntu-24.04`, the image every job already resolved to. `workflows.yml` fails if a `-latest` alias returns. |
| 1 | Run checks only on relevant changes | Compliant | `paths:` filters plus a `findChanged*Files` gate in every language workflow. |
| 2 | File size limits | **Gap** (unchanged) | No line-limit job. `rust/links-notation/src/lib.rs` is 2053 lines; enforcing a limit needs a source split first. Same reasoning as in #290. |
| 3 | Automated formatting | Compliant | `cargo fmt`, prettier, black and isort, gofmt, `dotnet format`, Spotless with google-java-format, and `phpcs` (`composer run-script lint`). |
| 4 | Static analysis | Compliant (extended) | CodeQL now runs with a config file that scopes it to shipped code (`bb1b7fe`). Pegasus grammar warnings fixed (`c3504d8`). |
| 5 | Fast-fail ordering | Compliant | `format` → `lint` → `test` → publish, through `needs:`. |
| 6 | Changeset-based versioning | **Gap** (unchanged) | Seven independently versioned packages. `release-audit` covers the drift risk; see #290. |
| 7 | Validate the actual merge result | **Gap** (unchanged) | No fresh-merge step. It would touch every workflow's checkout and is unrelated to any failure in this issue. Plan: one composite step after `actions/checkout` on `pull_request`, as in the hive-mind snippet. |
| 8 | Pre-commit hooks | Partial (unchanged) | `.githooks/pre-commit` regenerates `TEST_CASE_COMPARISON.md` only. |
| 9 | Release automation | **Fixed here** | Verify windows sized from measured registry delays (`5187c7e`). Releases backfilled on `published=skipped`, and the audit detects missing releases (`f2165be`). This closes the "published but never released" hole. |
| 10 | Concurrency control | Compliant | Per-job groups that cancel superseded runs except on `main`. Publish jobs use `cancel-in-progress: false`. |
| 11 | Secrets detection | **Fixed here** | trufflehog `--results=verified`. The scanner image itself is now pinned and tracked (`ed6272d`); before, it ran `latest`. |
| 12 | Documentation validation | **Fixed here** | lychee no longer fails on GitHub's rate limiting (`9a02947`). The C# code PDF builds again and is checked on pull requests (`8790d23`). |
| 13 | Native runners per architecture | Not applicable | No container images. |
| 14 | Lint the workflows | Compliant (extended) | actionlint as the Docker image (shellcheck included), zizmor at medium, and now the runner-pin guard. |
| 15 | Audit the dependency tree | Compliant for npm, partial otherwise | `npm audit --package-lock-only --audit-level=high` on a schedule over all five lockfiles. It is what caught E1. Other ecosystems rely on Dependabot security alerts, which are enabled (`GET /vulnerability-alerts` → 204, 0 open alerts). A scheduled `cargo audit`, `pip-audit`, `govulncheck` or `composer audit` would be the next step. |
| 16 | Prove you can publish before you build | **Gap** | No preflight job. The missing Java and Packagist credentials surface as notices in the publish jobs and the release audit, not before the build. The rust template has `scripts/preflight-credentials.sh`. Porting it to six registries is a project of its own, and none of the failures in this issue would have been prevented by it. |

## Template practices considered and not adopted

From `../templates/COMPARISON.md`, "Good practices in templates that links-notation lacks":

| Practice | Templates | Why not here |
| --- | --- | --- |
| Credential preflight (`preflight-credentials.*`) | rust, js, csharp, python, php | Principle 16 above. |
| Smoke test of the published package before the GitHub release | js, rust, csharp, python | The verify step already polls the registry until the exact version is served. An install test would need a consumer project per language for little extra signal. |
| Publish/verify separation with long backoff (`publish-retry.mjs`) | js | Adopted in substance: links-notation never republishes after a verification miss. It reports `published=skipped` on the next run and backfills the release (N1). The fixed-interval windows are now sized from measured delays (E5). |
| Re-check of broken links (`recheck-broken-links.*`) | js, python, others | Covered by lychee's own retries plus `accept = 429` and the per-host limit (E2). A second pass would add a script for the same effect. |
| Pipeline status gate (`check-pipeline-status.sh`) | several | Branch protection is configured outside the repository; it cannot be verified or changed from a pull request. |
| Changesets or changelog fragments | all | Principle 6 above. |
| Fresh-merge simulation (`simulate-fresh-merge.sh`) | js | Principle 7 above. |
| Resilient buildx setup | rust, js | No Docker images are built here. |
