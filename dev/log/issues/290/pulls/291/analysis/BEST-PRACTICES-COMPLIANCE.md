# Compliance with the hive-mind CI/CD best practices

Source: <https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.md>
(local copy: `CI-CD-BEST-PRACTICES.md`, 437 lines, 13 principles).

State of `link-foundation/links-notation` on branch `issue-290-642ff58c1ef8`
after the work described in `REQUIREMENTS.md`. Every row is either **compliant**,
**fixed in this pull request**, or a **gap** with the reason it was not closed
here and what closing it would take.

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Run checks only on relevant file changes | Compliant (repaired) | Every language workflow has a `findChanged*Files` job gating the rest. Fixed here: the gate returned an empty list for `workflow_dispatch`, so the manual trigger did nothing in all eight workflows; `pages.yml` was the worst case because the manual trigger was its only trigger for non-`docs/**` work. |
| 2 | File size limits | **Gap** | No line-count check exists. Current offenders against the 1000–1500 line guidance: `rust/links-notation/src/lib.rs` (1661), `js/src/parser-generated.js` (1862, generated), `js/dist/index.js` (2096, generated), `go/lino_test.go` (907). Enforcing the limit today would fail CI on `lib.rs`, which needs a source split, not a CI change. Recorded as follow-up work rather than closed here. |
| 3 | Automated code formatting | Compliant | `prettier` (js), `rustfmt` (rust), `black`+`isort` (python), `gofmt` (go), `dotnet format` (csharp), `google-java-format` (java), `php-cs-fixer` (php) all run in CI. Prettier was pinned in `51872e6` instead of being resolved at run time. |
| 4 | Static analysis and linting | Compliant (extended) | `clippy -D warnings`, `go vet`, `flake8`, ESLint, PHPStan, SpotBugs and .NET analyzers were already wired. Added here: `actionlint` and `zizmor` over the workflows themselves (`workflows.yml`), and CodeQL over every language that has an extractor (`security.yml`). The 56 nullable-reference warnings in the C# build were fixed in `e0c85e2`. |
| 5 | Fast-fail job ordering | Compliant | Each workflow runs `lint` before `test`, and `test` before any publish job, through `needs`. |
| 6 | Changeset-based versioning | **Gap** | The repository versions each language independently (`package.json`, `Cargo.toml`, `pyproject.toml`, `*.csproj`, `pom.xml`, `composer.json`, `go/VERSION`). Adopting `@changesets/cli` would be a release-process change with no bearing on the failures in issue #290; `scripts/release-audit.mjs` covers the concrete risk (declared version drifting from the published one) instead. |
| 7 | Validate the actual merge result | **Gap** | No workflow simulates a fresh merge with `main` before running checks, so a pull request can pass against a stale merge preview. Closing it means adding the same fetch-and-merge step to eight workflows; recorded as follow-up rather than bundled into a pull request that already rewrites all of them. |
| 8 | Pre-commit hooks | Partial (repaired) | `.githooks/pre-commit` exists but only regenerates `TEST_CASE_COMPARISON.md`; it does not run formatters or linters. It was also broken: the generator crashed with `ENOENT` on `rust/tests`, and the hook fails the commit when regeneration fails. Fixed in `5da368d`. Extending the hook to run the formatters is follow-up work. |
| 9 | Release automation | Fixed in this pull request | OIDC trusted publishing for npm, PyPI and crates.io; every publish job now verifies the artifact against the registry before a GitHub release is created; the release gate is an explicit `published` output rather than the job result, because a job that published nothing still reports success. NuGet, Maven Central and Packagist have no OIDC support, so they keep secrets by necessity. |
| 10 | Concurrency control | Fixed in this pull request | Every job carries a group of `${{ github.workflow }}-${{ github.ref }}-<job>` with `cancel-in-progress` only off `main`; every publish job uses a ref-independent group with `cancel-in-progress: false`, so a running publisher is never cancelled half-way. |
| 11 | Secrets detection | Fixed in this pull request | `security.yml` runs TruffleHog over the full history with `--results=verified`. |
| 12 | Documentation validation | Fixed in this pull request | `links.yml` runs lychee over every Markdown file. It found three real defects (root READMEs pointing at the pre-workspace `rust/README.md`, CHANGELOG links to a `vX.Y.Z` tag scheme that was never used, and 827 dead `file:line` links in `TEST_CASE_COMPARISON.md`) plus the C# API reference 404s that `pages.yml` now fixes. Required-section and doc-size checks are not implemented. |
| 13 | Container images on native runners | Not applicable | The repository publishes no container images and contains no Dockerfile. |

## Follow-up work this pull request deliberately leaves open

1. **File-size enforcement (principle 2)** — add a `check-file-line-limits` job
   once `rust/links-notation/src/lib.rs` is split; exclude the generated
   `js/src/parser-generated.js` and `js/dist/`.
2. **Fresh-merge validation (principle 7)** — add the fetch-and-merge step to
   the eight language workflows.
3. **Changeset adoption (principle 6)** — only worthwhile together with a
   single repository-wide version.
4. **Formatter and secret checks in `.githooks/pre-commit` (principles 3, 8, 11)**
   so the same gates run before the commit, not only in CI.
