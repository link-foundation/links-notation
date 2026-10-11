# Issue 339: same-commit JavaScript gate and publication evidence

Tracking PR: <https://github.com/link-foundation/links-notation/pull/341>.
Issue: <https://github.com/link-foundation/links-notation/issues/339>. Research
date: 2026-10-11 UTC. Baseline main: `28cd9d2f64e34529c71e4c6b73ca09300dc3d733`;
prepared branch: `d99f425353e7ac56dc6bdb6631ac0877214b4a1e`.

## Findings and causes

<!-- markdownlint-disable MD013 -->

| Finding                           | Baseline evidence and root cause                                                                                                                                                                                                                                          | Change / remaining delivery limit                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: Independent language execution | Seven separate push/PR workflows with path detectors; no cross-workflow `needs` edge. A Rust-only change could leave JS unstarted.                                                                                                                                        | `js.yml` is one entry point; local reusable calls select the same commit. All six languages and applicable side workflows depend on successful JS.                                                                                                                    |
| 2: Incomplete parity              | Binary interop tested protocol vectors, but there was no common text oracle or reviewed feature inventory. The libraries are separately maintained.                                                                                                                       | 20 feature rows, per-language implementation/test evidence, 14 shared text fixtures, seven native adapters, source inventory review, and documented host API exceptions.                                                                                              |
| 3: Green Java without delivery    | Main run 37858059228 explicitly warned about four absent secrets (raw log line 1774), returned success, and skipped its GitHub release. Java's namespace and exact 0.25.1 POM return 404. PHP run 37858059237 similarly warned about unregistered Packagist at line 1746. | Missing credentials/registration now fail. Central waits for `published`, public namespace/POM verification precedes `[Java]`, and every registry audit checks exact versions and GitHub releases. **Actual Java/PHP publication remains blocked by provider setup.** |
| 4: Stale conflicting PRs          | All six drafts are `CONFLICTING`; snapshots include all comment types, diffs, branch run metadata, linked traces, and log availability.                                                                                                                                   | Individual closure decisions preserve the feature issues and branches; see the decision records below. No unique feature is silently merged or removed.                                                                                                               |
| 5: Unprotected main               | `rulesets-before.json` is empty; `branch-protection-before.json` records GitHub's 404 response.                                                                                                                                                                           | Checked-in ruleset requires JavaScript plus Rust/Python/Java/Go/CSharp/PHP, with no bypass actor. Activation/readback is recorded after real check names are verified.                                                                                                |
| 6: Missing workflow docs          | Root contributor and agent instructions did not exist.                                                                                                                                                                                                                    | `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`: JS-first tests/ports, one push owner, completed failure batches, bounded Rust builds, no push during active runs.                                                                                                        |
| 7: Independent release paths      | Seven independently triggered publishers, no fragments; registry presence was accepted as “skip” instead of proof of current version.                                                                                                                                     | `changelog.d/339.md`, coordinated 0.25.2 versions, one gated run, publisher verification, and a final audit even after publisher failure. Per-provider tags remain compatible with existing consumers.                                                                |

<!-- markdownlint-enable MD013 -->

## Requirement ledger

<!-- markdownlint-disable MD013 -->

| Issue requirement                                              | Reviewable implementation / evidence                                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1: Same-commit JS gate; no failed/cancelled/skipped JS bypass | Six reusable-only language workflows; `needs: [js]` in entry; 16 mutation regressions in `experiments/issue-339/ci-contract.test.mjs`.                                                                                                           |
| R2: Always run JS lint/test/parity                             | Unfiltered PR/main entry; unconditional format/lint/test/parity jobs; generated Peggy source comparison.                                                                                                                                         |
| R3: Reject ungated non-JS workflows                            | `scripts/ci/check-js-gate.mjs` parses every workflow, checks reusable callers, toolchain jobs, conditions, checkout refs, and concurrency. Includes security/binary/benchmarks/docs.                                                             |
| R4: Manifest and shared text corpus in seven libraries         | `parity/language-features.json`, `parity/text-fixtures.json`, generated TSV, native parsing/formatting/round-trip/stream tests. Missing binding/evidence/fixture/inventory fails the checker.                                                    |
| R5: JS-first development; generated vs hand-written truth      | Contributor/agent/parity docs; only per-language Peggy/Pegasus parsers are generated. Structural meta-language translation is an experiment, not semantic parity evidence.                                                                       |
| R6: Java public artifact, `[Java]`, all-provider exact audit   | Publication path and fail-visible regression tests implemented; live baseline audit fails for Java/PHP. Provider credentials, verified namespace, first Packagist submission, and main merge remain necessary. No fake Java release was created. |
| R7: Disposition of PRs 204/185/170/167/80/76                   | `decisions/pr-*.md`, closure comments and after-state snapshots. Underlying feature issues remain open.                                                                                                                                          |
| R8: Main ruleset and branch concurrency                        | `.github/main-ruleset.json`; entry and gated jobs use `cancel-in-progress: false`. Actual activation evidence is saved under `data/`.                                                                                                            |
| R9: Single-push protocol and minimal local load                | Three root documents plus the 2 GiB Rust target budget helper; experiments kept in `experiments/issue-339/`.                                                                                                                                     |
| R10: Case study, per-language CI, before/after measurements    | This document, raw compressed logs/API data, local verification, and `measure_ci.py`. Post-push measurements are updated after completed checks.                                                                                                 |

<!-- markdownlint-enable MD013 -->

## Timeline

<!-- markdownlint-disable MD013 -->

| UTC date                 | Event and significance                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-09-10               | PRs 76/80 propose competing arrow/order behavior; Actions requires approval.                                                                                               |
| 2025-10-11               | Maintainer comments on issues 62/63 call arrow/order features low priority and suggest an interpreter layer.                                                               |
| 2025-11-30               | PRs 167/170 add delimiters/tokenization to only part of the language set.                                                                                                  |
| 2025-12-13 to 2025-12-27 | PR 185 iterates on multi-reference identifiers, introducing a breaking collection-based ID API.                                                                            |
| 2026-01-13               | PR 204 tries to repair Java/Go release pipelines. It predates current release identities and Central Portal setup.                                                         |
| 2026-10-08               | PR 335 fixes Unicode contracts across languages; PR 336 introduces JS convenience document APIs; latest main language runs appear green despite absent Java/PHP artifacts. |
| 2026-10-09               | PR 338 updates xUnit; baseline main is 28cd9d2.                                                                                                                            |
| 2026-10-11               | Issue 339 / PR 341 investigation reproduces independent triggers, absent artifacts, and six outdated declarations in prepared-branch dependency CI.                        |
| 2026-10-11               | Added failing guard/parity/publication regressions first, then same-commit orchestration, common fixtures, visible delivery failures, docs, and coordinated versions.      |

<!-- markdownlint-enable MD013 -->

The issue's “all older than nine months” statement is slightly inaccurate for PR
204: January 13 to October 11 is just under nine months. Its conflict and
inactivity are independently confirmed; the disposition does not rely on that
age claim.

## Reproductions and local verification

The archived baseline workflows show independent triggers. Guard mutation tests
reintroduce a Rust push trigger, remove `needs`, add an ungated side job, use a
mutable checkout, or add an unsafe `always()` condition; each must fail. An
early regression demonstrated that checking only for the text “JS success”
incorrectly allowed `always() || needs.js.result == 'success'`; the checker now
accepts only the explicit safe condition for the release audit. Before/after
command output is preserved under `data/local-checks/`.

Parity checker regressions remove a binding, evidence file, documented
exception, or corpus case, or change a source hash. Release audit mocks
reproduce Maven namespace 404, missing GitHub releases, wrong registry versions,
and HTTP 503; provider outages are errors even on PRs. Missing Java credentials
fails with credential names only, without exposing their values.

<!-- markdownlint-disable MD013 -->

| Binding | Full local suite                       | Shared fixture coverage | Additional checks                                                                            |
| ------- | -------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| JS      | 321 passed                             | 14 cases                | Prettier, ESLint, build/generated diff, TypeScript examples                                  |
| Rust    | Workspace and no-default suites passed | 14 cases                | rustfmt, Clippy all targets/features; target below 2 GiB, incremental off, two compiler jobs |
| Python  | 272 passed, 1 skipped                  | 14 cases                | Black, isort, flake8 with project configuration                                              |
| Java    | 185 passed                             | 14 cases                | Google Java Format and Spotless                                                              |
| Go      | Full suite passed                      | 14 cases                | gofmt, go vet                                                                                |
| C#      | 321 passed                             | 14 cases                | dotnet format and Release tests                                                              |
| PHP     | 235 passed, 15107 assertions           | 14 cases                | PHP_CodeSniffer                                                                              |

<!-- markdownlint-enable MD013 -->

Static validation additionally covers actionlint with shellcheck, shell helper
tests, zizmor, version consistency, dependency freshness, and the workflow
contract tests. Native adapters use existing test frameworks rather than a new
cross-language subprocess harness. Loop-based adapters exercise every corpus
case even where the framework counts them as one test.

## CI measurements

Measurement command:
`python3 experiments/issue-339/measure_ci.py NUMBER BRANCH`. The collector
paginates runs and jobs and saves raw API responses. Runner minutes are the sum
of completed non-skipped job wall times, **not billed minutes**. Time to first
green starts at the first branch PR run and ends when one commit's entire
seven-language workflow set (or unified CI) completes successfully. Missing
language workflows do not count as green. Queue time contributes to elapsed
time, not summed runner time.

<!-- markdownlint-disable MD013 -->

| Comparison                           | Runs across PR branch      | Native workflow runs    | Runner wall minutes       | First seven-language green |
| ------------------------------------ | -------------------------- | ----------------------- | ------------------------- | -------------------------- |
| Before: PR 335, three tested commits | 41                         | 14                      | 68.450                    | 42.167 minutes             |
| Before: PR 336, three tested commits | 41                         | 14                      | 65.600                    | 12.783 minutes             |
| After: PR 341                        | Updated after completed CI | Unified CI run per push | Measured after completion | Measured after completion  |

<!-- markdownlint-enable MD013 -->

The old pipeline could save minutes by skipping unchanged languages, while also
skipping proof of shared behavior. The new gate trades that omission for
seven-language validation and serial JS startup. These are different PRs, so
their total minutes are observational data, not a controlled speedup claim. The
structural comparison is seven separately triggered language workflows versus
one coordinated workflow; unrelated freshness/link/BOM checks remain.

## Registry evidence and recovery

Live checks of 0.25.1 found npm, PyPI, crates.io, NuGet, and the Go module proxy
plus their GitHub releases. Maven's exact POM and namespace both return 404;
Packagist's package endpoint returns 404. The old audit returned zero despite
both missing providers; `data/registry-audit-exact.txt` now returns two delivery
errors. That confirms the cause is missing publication, not a stale badge.

Repository secret **names** were inspected: only `DEPENDABOT_AUTO_MERGE_TOKEN`,
`NUGET_TOKEN`, and `PYPI_TOKEN` exist; repository variables are empty. Central
credentials/signing keys and Packagist credentials are absent. Rust's new
release also needs a crates.io token or configured trusted-publisher identity.
GitHub repository admin access does not grant control of these provider
accounts. Consequently R6's actual Maven delivery cannot be completed from the
available environment. This is recorded as a remaining limit, not presented as
green publication or a completed registry requirement.

After the verified Central namespace and four Java secrets are configured, merge
through the required checks and run main CI. The Central plugin waits for
publication, both public URLs must return 200, and only then is `[Java]` created
at the gated SHA. Register Packagist and configure its update credentials for
PHP; configure crates.io publishing before releasing the bumped Rust crate.
Reruns verify existing exact versions and backfill missing GitHub releases. The
final audit reports every provider failure even when another publisher failed.
See [release setup](../../releases.md) for the concrete configuration contract.

## Design alternatives and primary research

<!-- markdownlint-disable MD013 -->

| Component / alternative                     | Assessment                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local reusable workflows with `needs`       | Chosen. [GitHub documents](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows) that local relative calls use the caller commit. Existing language matrices and native checks remain.                                                                                                                      |
| `workflow_run` chains                       | Rejected for language orchestration: requires explicit success/SHA checks and cross-workflow artifact/permission handling. The existing Pages deployment may observe the completed unified CI.                                                                                                                                      |
| Branch concurrency                          | [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) preserves the active run with cancellation off, but can replace pending runs. The documented push owner must still wait.                                                                    |
| Existing binary vectors + native frameworks | Reused. A small JSON/TSV text corpus extends the established model; it does not add a parser generator or claim exhaustive proof.                                                                                                                                                                                                   |
| Meta-language                               | Its [translation rules](https://github.com/link-foundation/meta-language/blob/main/docs/translation-rules.md) support structural experiments; semantic parity needs the native/common tests before replacing any library.                                                                                                           |
| Sonatype Central plugin                     | Existing component retained. [Central documentation](https://central.sonatype.org/publish/publish-portal-maven/) distinguishes validation from publication; `waitUntil=published` and public probes close that gap. [Namespace verification](https://central.sonatype.org/register/namespace/) still requires the provider account. |
| Trusted publishing                          | [npm](https://docs.npmjs.com/trusted-publishers/) and [PyPI](https://docs.pypi.org/trusted-publishers/troubleshooting/) identify the calling workflow. The entry filename remains `js.yml`; explicit secrets retain supported bootstrap fallbacks.                                                                                  |
| Benchmark automation under protection       | Direct main writes become a PR followed by explicit gated dispatch. [GitHub's event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) explains why bot-created PR events cannot be assumed to run automatically with `GITHUB_TOKEN`.                                 |

<!-- markdownlint-enable MD013 -->

No reproducible defect in an external project was found. Missing provider setup
is repository configuration, not a Sonatype defect. Existing
[npm/documentation issue 1755](https://github.com/npm/documentation/issues/1755)
already tracks reusable-workflow documentation; opening a duplicate without an
independent reproduction would misreport the investigation.

## Stale PR decisions and evidence retention

<!-- markdownlint-disable MD013 -->

| PR  | Decision and reason                                                                                                                                                             | Feature retained for future work                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 204 | Close superseded release draft: old Go tag and Java/OSSRH assumptions differ from current pipeline; actual Central credentials are still missing.                               | Issue 192; current Central/Go release work in PR 341 |
| 185 | Close incomplete breaking API draft: ID collections replace scalar APIs in six bindings, no PHP port, and current binary/shared contracts need a new coordinated design.        | Issue 184; all proposed designs and traces archived  |
| 170 | Close partial punctuation draft: changes reference tokenization/formatting in only part of the bindings, with insufficient compatibility coverage for current quoting/literals. | Issue 148                                            |
| 167 | Close partial delimiter draft: independent opening/closing rules accept mismatched delimiters; no Java/Go/PHP port and no current reference-literal compatibility proof.        | Issue 143                                            |
| 80  | Close conflicting arrow draft: partial ports and unsettled ordering; maintainer explicitly suggests an interpreter layer.                                                       | Issue 62                                             |
| 76  | Close conflicting JS-only arrow draft: issue 63 asks for reversed order, while its tests use ordinary order; maintainer deprioritized the parser feature.                       | Issue 63                                             |

<!-- markdownlint-enable MD013 -->

All three GitHub comment types were fetched separately: inline comments,
conversation comments, and reviews. The stale branch run inventories contain
14/113/9/11/3/3 runs respectively; expired logs return HTTP 410 or “log not
found” and are explicitly listed in `pr-*-log-availability.json`. Seventeen
linked Gist traces were fetched through authenticated `gh gist view`; terminal
escape content was accepted explicitly and provider-token patterns redacted
before archiving. Raw traces/logs are gzip-compressed to keep the repository
usable. Large traces use lossless parts with an index and SHA-256, respecting
the 1000 KiB file limit. Large run inventories are JSON gzip files.
`compact_evidence.py` verifies the round trip. Availability and redaction counts
are preserved; unavailable logs are never inferred green.

The case data includes issue/PR bodies, comments, source-review diffs, current
main and prepared-branch runs, registry responses, before/after protection
state, local reproductions, and CI timing data. New CI failures are matched to
their exact SHA, preserved with line-numbered findings, fixed as a complete
batch, and rerun before the PR is marked ready.
