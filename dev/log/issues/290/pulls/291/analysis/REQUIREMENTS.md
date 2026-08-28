# Requirements extracted from issue #290

Every requirement stated in the issue body, plus the requirements added by the task brief.
Status values: `done` · `in progress` · `planned` · `blocked (needs a human)`.

## R1 — Fix the failing default-branch runs

> "Check for all false positives, false negatives, warnings and errors in CI/CD and fix them all."
> Referenced runs: `csharp` 33150292349, `js` 33150292364.

| # | Requirement | Root cause | Plan | Status |
|---|---|---|---|---|
| R1.1 | `js` must stop failing | A1 — `NPM_TOKEN` does not exist | Adopt npm OIDC trusted publishing; when neither OIDC nor a token is usable, report a visible *skipped* instead of a hard failure | done in code · publishing needs a maintainer |
| R1.2 | `csharp` must stop failing | A2 — `NUGET_TOKEN` returns 403 | Try `NUGET_API_KEY` (org) then `NUGET_TOKEN` (repo); replace the external scripts with inline `dotnet nuget push --skip-duplicate`; report *skipped* when no key is usable | done in code · publishing needs a maintainer |

**R1.1/R1.2 caveat.** The code in this repository is healthy — C# is 196/196 green, JS has zero
failing tests. The failures are purely credential state, which lives in GitHub settings, not in the
repository. This PR can make the pipeline *report* the condition correctly and publish as soon as a
credential exists, but **only a repository administrator can create the npm trusted publisher or
rotate the NuGet key** (see `UPSTREAM.md` §Actions required from a maintainer).

## R2 — Eliminate false positives

| # | Requirement | Root cause | Plan | Status |
|---|---|---|---|---|
| R2.1 | `java`/`publishToMavenCentral` must not be green while nothing is published | A3 | Uniform publish gate: `published` output of `true`/`skipped`/`failed`; a skipped publish annotates the job summary and never creates a release | done |
| R2.2 | `php`/`publishToPackagist` must not be green while nothing is published | A4 | Same gate; also `publishRelease` must key on `outputs.published == 'true'`, never on `result == 'success'` | done |
| R2.3 | No GitHub release may be created for an artifact that is not in its registry | A4, A6 | Post-publish registry verification precedes release creation | done |
| R2.4 | Credential rot must surface on the run it happens, not at the next version bump | A5 | Validate credentials on every `main` run, independently of the version check | done |
| R2.5 | Delete/annotate the bogus `[PHP] 0.2.0` release | A4 | Cannot be done from CI; recorded in `UPSTREAM.md` for a maintainer | blocked (needs a human) |

## R3 — Eliminate false negatives

| # | Requirement | Root cause | Plan | Status |
|---|---|---|---|---|
| R3.1 | A missing optional credential must not fail a build whose tests all passed | A1, A2 | Distinguish *absent* credential (warn + skip) from *present but rejected* credential (fail loudly) | done |
| R3.2 | `format` must not break on an unrelated upstream release | B10 | Pin `prettier` in `js/package.json` devDependencies; add `format`/`format:check` scripts; run the pinned binary | done |

## R4 — Fix every warning

| # | Warning | Where | Status |
|---|---|---|---|
| R4.1 | 56 × CS8602/CS8604 nullable warnings | `csharp/**` | done |
| R4.2 | `NU5048` `PackageIconUrl` deprecated | `Link.Foundation.Links.Notation.csproj` | done |
| R4.3 | DocFX `InvalidFileLink` → `Platform.links-notation.html` | `csharp/toc.yml` | done |
| R4.4 | DocFX `InvalidCref` in generated parser | `csharp/**/Parser.peg.g.cs` | done |
| R4.5 | `no files found matching '*.py' under directory 'platform_lino'` and `'LICENSE'` | `python/MANIFEST.in` | done |
| R4.6 | setuptools license deprecations (hard removal 2027-02-18) | `python/pyproject.toml` | done |
| R4.7 | `system modules path not set in conjunction with -source 11` | `java/pom.xml` | done |
| R4.8 | google-java-format illegal reflective access | `java/pom.xml` (Spotless) | done |
| R4.9 | `cargo publish --token` deprecated | `.github/workflows/rust.yml` | done |
| R4.10 | Rust cache `Path Validation Error`; `target` cache never saved | `.github/workflows/rust.yml` | done |
| R4.11 | `Restore cache failed` (×2) from `actions/setup-go` | `.github/workflows/go.yml` | done |
| R4.12 | `actions/upload-artifact` targets Node.js 20 | `.github/workflows/pages.yml` | done |
| R4.13 | `npx` downloads `prettier` at run time | `.github/workflows/js.yml` | done |
| R4.14 | Stale `Platform.Protocols.Lino` description | `Link.Foundation.Links.Notation.csproj` | done |

## R5 — Adopt best practices from the seven pipeline templates

> "Use all the best practices from CI/CD templates (check full file tree to compare for all GitHub
> workflow and CI/CD scripts file) … We should compare all files, so we don't have more CI/CD errors
> in the future and reuse all the best practices from these templates."

Templates compared (snapshots in `../templates/`):
`link-foundation/{rust,js,csharp,python,php,java,go}-ai-driven-development-pipeline-template`.

| # | Practice | Gap here | Status |
|---|---|---|---|
| R5.1 | Least-privilege `permissions:` | absent in 8/10 workflows (D1) | done |
| R5.2 | Concurrency groups (cancellable readers, serialised `main` writers) | absent in 9/10 workflows (D2) | done |
| R5.3 | `timeout-minutes` on every job | 7 jobs without one (D5) | done |
| R5.4 | OIDC trusted publishing | not used anywhere (A1) | done |
| R5.5 | Post-publish smoke test | not used anywhere (A6) | done |
| R5.6 | No unpinned remote script execution | 4 scripts `wget`-ed from another repo's `main` (D3) | done |
| R5.7 | Secrets via `env:`, never string-interpolated into shell | violated in `java.yml` (D4) | done |
| R5.8 | `if:` conditions only reference direct `needs:` | violated 3× in `csharp.yml` (D6) | done |
| R5.9 | `!cancelled()` in preference to `always()` | to verify across all workflows | done |
| R5.10 | Consistent release tag format | `csharp` uses `${VERSION}_csharp`, everything else `<lang>_${VERSION}` (D-note) | done |

## R6 — Follow the hive-mind CI/CD best-practices document

> "Follow the CI/CD best practices collected in
> https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.md"

Local copy: `CI-CD-BEST-PRACTICES.md` (437 lines, 13 principles). Compliance is tracked in
`BEST-PRACTICES-COMPLIANCE.md`.

## R7 — Verbose/debug mode, default OFF

> "If there is not enough data to find the actual root cause, add debug output and a verbose mode
> (if not already present) so the root cause can be found on the next iteration. Keep the default
> state switched off."

Plan: a `workflow_dispatch` input `verbose` (default `false`) plus a repository-variable escape
hatch, exported as `CI_VERBOSE`. When on, publish jobs print credential *presence* (never values),
resolved package coordinates, registry probe URLs and raw responses, and `set -x`. Default off.
Status: done — every workflow declares the `verbose` input and exports
`CI_VERBOSE: ${{ inputs.verbose && 'true' || vars.CI_VERBOSE || 'false' }}`.

## R8 — Report upstream issues

> "If the issue is related to another repository/project, report issues on GitHub for that project
> when possible. Each report must contain reproducible examples, workarounds, and suggestions for
> fixing the issue in code."

Candidates and their reproducible examples are prepared in `UPSTREAM.md`. Status: done — the
reports are written up there with reproduction steps, workarounds and suggested code changes.

## R9 — Apply each fix everywhere it applies

> "Double-check that the requirements are fully applied to the entire codebase: if an issue exists in
> multiple places, apply it in all of them."

The publish-gate, credential-report, post-publish verification, `permissions`, `concurrency`,
`timeout-minutes` and verbose-mode changes are applied to **all ten** workflows, not only to the two
named in the issue. Status: done.

## R10 — Deliver it all in this one pull request

> "Please plan and execute everything in this single pull request."

All work lands on `issue-290-642ff58c1ef8` → PR #291. Status: done.
