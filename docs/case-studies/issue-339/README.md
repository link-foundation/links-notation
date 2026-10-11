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
| 5: Unprotected main               | `rulesets-before.json` is empty; `protection-before.json` records GitHub's 404 response.                                                                                                                                                                                  | Checked-in ruleset requires JavaScript plus Rust/Python/Java/Go/CSharp/PHP, with no bypass actor. Activated ruleset 24860631 requires all seven verified GitHub Actions contexts; creation and enforced-rules readback are retained.                                  |
| 6: Missing workflow docs          | Root contributor and agent instructions did not exist.                                                                                                                                                                                                                    | `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`: JS-first tests/ports, one push owner, completed failure batches, bounded Rust builds, no push during active runs.                                                                                                        |
| 7: Independent release paths      | Seven independently triggered publishers, no fragments; registry presence was accepted as “skip” instead of proof of current version.                                                                                                                                     | `changelog.d/339.md`, coordinated 0.25.2 versions, one gated run with all seven native stages completed before publication, publisher verification, and a final audit even after publisher failure. Per-provider tags remain compatible with existing consumers.      |

<!-- markdownlint-enable MD013 -->

## Requirement ledger

<!-- markdownlint-disable MD013 -->

| Issue requirement                                              | Reviewable implementation / evidence                                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1: Same-commit JS gate; no failed/cancelled/skipped JS bypass | Six reusable-only language workflows; `needs: [js]` in entry; 25 workflow regressions in `experiments/issue-339/ci-contract.test.mjs`.                                                                                                           |
| R2: Always run JS lint/test/parity                             | Unfiltered PR/main entry; unconditional format/lint/test/parity jobs; generated Peggy source comparison.                                                                                                                                         |
| R3: Reject ungated non-JS workflows                            | `scripts/ci/check-js-gate.mjs` parses every workflow, checks reusable callers, toolchain jobs, conditions, checkout refs, and concurrency. Includes security/binary/benchmarks/docs.                                                             |
| R4: Manifest and shared text corpus in seven libraries         | `parity/language-features.json`, `parity/text-fixtures.json`, generated TSV, native parsing/formatting/round-trip/stream tests. Missing binding/evidence/fixture/inventory fails the checker.                                                    |
| R5: JS-first development; generated vs hand-written truth      | Contributor/agent/parity docs; only per-language Peggy/Pegasus parsers are generated. Structural meta-language translation is an experiment, not semantic parity evidence.                                                                       |
| R6: Java public artifact, `[Java]`, all-provider exact audit   | Publication path and fail-visible regression tests implemented; live baseline audit fails for Java/PHP. Provider credentials, verified namespace, first Packagist submission, and main merge remain necessary. No fake Java release was created. |
| R7: Disposition of PRs 204/185/170/167/80/76                   | `decisions/pr-*.md`, closure comments and after-state snapshots. Underlying feature issues remain open.                                                                                                                                          |
| R8: Main ruleset and branch concurrency                        | `.github/main-ruleset.json`; entry and gated jobs use `cancel-in-progress: false`. Active ruleset 24860631 and enforced branch rules are saved under `data/`.                                                                                    |
| R9: Single-push protocol and minimal local load                | Three root documents plus the 2 GiB Rust target budget helper; experiments kept in `experiments/issue-339/`.                                                                                                                                     |
| R10: Case study, per-language CI, before/after measurements    | This document, raw compressed logs/API data, local verification, and `measure_ci.py`. Completed CI snapshot: 19 runs, 75.700 runner wall minutes, 65.950 minutes to first seven-language green.                                                  |

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
| JS      | 308 passed                             | 14 cases                | Prettier, ESLint, build/generated diff, TypeScript examples                                  |
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

| Comparison                     | Runs across PR branch | Native workflow runs  | Runner wall minutes | First seven-language green |
| ------------------------------ | --------------------- | --------------------- | ------------------- | -------------------------- |
| Before: PR 335, three PR heads | 41                    | 14                    | 68.450              | 42.167 minutes             |
| Before: PR 336, three PR heads | 41                    | 14                    | 65.600              | 12.783 minutes             |
| After: PR 341, three PR heads  | 19                    | 2 unified native runs | 75.700              | 65.950 minutes             |

<!-- markdownlint-enable MD013 -->

The old pipeline could save minutes by skipping unchanged languages, while also
skipping proof of shared behavior. The new gate trades that omission for
seven-language validation and serial JS startup. These are different PRs, so
their total minutes are observational data, not a controlled speedup claim. The
structural comparison is seven separately triggered language workflows versus
one coordinated workflow; unrelated freshness/link/BOM checks remain.

The after snapshot ends at 2026-10-11 01:25:26 UTC, the first fully green
implementation commit `e0326ca6a705689d15b83fa5c3d337e0e7a64df4`. Its seven
workflow runs consumed 31.267 runner wall minutes and completed in 4.533 elapsed
minutes. The prepared branch's five infrastructure-only runs consumed 10.550
runner minutes; the first implementation batch, including its link retry,
consumed 33.883. From the first implementation push at 00:58:28 to first green
was 26.967 minutes. The 65.950-minute branch metric also includes the initial
38.983-minute implementation gap. Total runner time increased relative to the
comparison PRs; this is not a measured speedup. `pr-341-metrics.json` contains
per-commit totals and the corresponding paginated run/job data. The final
hardening/evidence commits are verified separately through the PR's latest
checks; they do not retroactively alter this first-green measurement snapshot.
The linked PR records final total run counts and runner time, including these
follow-ups. Collect a fresh complete-branch snapshot without overwriting the
archived first-green evidence with

```sh
python3 experiments/issue-339/measure_ci.py 341 issue-339-12b617cefd5b \
  --output-dir ci-logs/final-metrics
```

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
at the gated SHA. The root Composer descriptor and version-tag step now provide
the PHP distribution layout. Register this repository on Packagist after merge
and configure its update credentials;
configure crates.io publishing before releasing the bumped Rust crate.
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

Missing provider setup is repository configuration, not a Sonatype defect.
Existing
[npm/documentation issue 1755](https://github.com/npm/documentation/issues/1755)
already tracks reusable-workflow documentation; opening a duplicate without an
independent reproduction would misreport the investigation. The later link
investigation did reproduce Lychee's HTTP-status retry behavior and reported
the evidence on its existing upstream issue, as detailed below.

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

## First implementation CI batch

Commit `97414a829ef77902dcfcc1a0cf21b0311edd4d71` started seven workflow
runs at 2026-10-11 00:58:28 UTC. Unified CI run 38100234094 passed every
native language summary, binary interoperability, CodeQL, and security audit.
The two failing jobs were generated-file drift, preserved as complete job logs:

- `docs-test-cases-first.log.gz`, lines 200–201: the six new native test
  declarations changed `TEST_CASE_COMPARISON.md` and both README count tables.
  The comparison only extracts static declarations. JS's fourteen dynamically
  named fixtures were initially invisible, so the adapter now uses one named
  test with all fourteen fixtures, matching the other six adapters; assertion
  messages retain the individual fixture ID. The generator and its check pass.
- `benchmark-first.log.gz`, lines 535–549: benchmark generation changed only
  the report's library version line from 0.25.1 to 0.25.2. A verbose local
  `--check` reproduced the drift, then regeneration and all 73 output checks
  passed without changing measured data.
- Separate links run 38100233916 failed after its retry on seven unique GitHub
  blob URLs with HTTP 503 (`links-38100233916.log.gz`, lines 499–535). The
  scratch report was also scanned on retry, duplicating error occurrences.
  Local HTML and authenticated contents-API probes returned 200. The second
  Actions attempt recovered with no code changes, checking 2321 links with
  zero errors at 01:09:32 UTC. This confirms intermittent provider responses
  rather than missing files. A bounded probe also observed 503 with the Lychee
  agent and 200 with curl; subsequent probes returned 200 for both agents, so
  bot filtering is an inference, not a proven cause. The documented GitHub-only
  user-agent workaround retains 404 failures; the scratch report is excluded
  and optional verbose diagnostics are connected to both action invocations.

No commit was pushed while any branch run was active.
All fifty executed unified-CI job logs, including successful jobs, are retained
as `run-38100234094-*.log.gz`. GitHub CLI could not assemble the full run log
because of its API-request limit; the authenticated Actions ZIP supplied the
complete logs instead. `gh pr diff 341` also exceeded GitHub's 300-file diff
limit; review uses the paginated PR files API plus the local diff at the same
SHA. Most files are raw evidence, and no implementation files were deleted.

Main's active [ruleset 24860631](https://github.com/link-foundation/links-notation/rules/24860631)
requires `JavaScript`, `Rust`, `Python`, `Java`, `Go`, `CSharp`, and `PHP`
from GitHub Actions integration 15368. Their actual check names and successful
seven-language summary results were verified before activation. Readback
confirms strict checks,
PR-only changes, deletion/force-push protection, and no bypass actors; snapshots
are `main-ruleset-created.json`, `main-ruleset-readback.json`, and
`main-enforced-rules.json`.

Review also reproduced two static-guard gaps: bare `pytest` / `python3 -m
pytest`, and language commands hidden by a native working directory. Both
mutation tests failed before the fix and pass afterward; the guard now has 25
regressions. No parser or formatter behavior was changed. The link-check
workaround follows [Lychee's own troubleshooting guidance](https://lychee.cli.rs/troubleshooting/redirects/)
and per-host header configuration. Its limits and the upstream retry behavior
were investigated after the later recurrence described below.

## Publication barrier review

Final review reproduced another release-ordering defect: a provider could
publish after only its own language tests had passed. The original 19th
regression failed because the entry had no all-language release prerequisite
(`data/local-checks/all-native-release-before.log.gz`). Publishers now live in
seven reusable `publish-*.yml` files called by `release.yml`; its entry needs all
seven native stages and runs only on main pushes. Provider-to-GitHub-release
dependencies and C# PDF/DocFX coverage remain intact. Native tests receive no
publication credentials. The final audit explicitly waits for release completion
and still runs after a provider failure. Three mutation checks reject a removed
native prerequisite, publication moved into a native stage, and a skipped final
audit. All 25 workflow regressions and four Python checks pass locally.

## First fully green implementation batch

All seven workflow runs for commit `e0326ca6a705689d15b83fa5c3d337e0e7a64df4`
completed before another push. Unified CI
[38101530910](https://github.com/link-foundation/links-notation/actions/runs/38101530910)
finished successfully at 01:25:26 UTC: 57 executed jobs passed, two main-only
jobs were skipped as intended on a PR. All 57 complete job logs, SHA-checked
metadata, and SHA-256 log indices are retained under `data/run-38101530910-*`.
The other executed workflows' full logs are also retained. The standalone
auto-merge workflow is intentionally skipped for this draft feature PR.

<!-- markdownlint-disable MD013 -->

| Required summary | CI execution                                                                                   | Result  |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------- |
| JavaScript       | Bun; 308 native tests, format/lint/build, 22 workflow regressions at this commit               | Success |
| Rust             | Stable and 1.87.0 workspace/no-default tests, Clippy, rustfmt, 1.86.0 rejection, target budget | Success |
| Python           | Python 3.13; 272 passed, 1 skipped, Black/isort/flake8                                         | Success |
| Java             | JDK 21 and 25; 185 passed on each, formatter and Spotless                                      | Success |
| Go               | Go 1.26; full tests and vet, race detection, 87.7% coverage                                    | Success |
| CSharp           | .NET 10; 321 tests, formatting, PDF artifact generation                                        | Success |
| PHP              | PHP 8.4 and 8.5; 235 tests / 15107 assertions on each, PHPCS                                   | Success |

<!-- markdownlint-enable MD013 -->

Every binding exercised all fourteen text fixtures. Binary interop, all seven
benchmark bindings and dataset checks, documentation generation, all seven
CodeQL targets, secret scan, dependency audits/review, workflow analysis,
freshness, pages build, BOM and links also passed. The exact-version release
audit correctly reports 0.25.2 absent as PR notices, with zero delivery errors;
publishers do not run on PRs. These results prove validation, not publication.

GitHub's 300-file diff limit also produces CodeQL PR-diff warnings; the full
analyses and SARIF uploads succeeded. Go reports the pre-existing missing
`CODECOV_TOKEN`; the tests still generated the coverage report, but external
coverage upload remains unconfigured. These existing limits are recorded rather
than mistaken for failures or silently removed checks.

Final guard review added failing reproductions for workflow-level native
working-directory defaults and bare Composer commands. The guard now inspects
both global and job/step directories and recognizes Composer. Before output is
`data/local-checks/guard-workflow-defaults-before.log.gz` (22 pass, two fail);
after output records all 24 regressions passing. No library behavior changed.
Provider configuration was rechecked after green CI: the same three secret
names remain, variables are empty, and actual R6 delivery remains blocked.

Coverage review found Go's optional `CODECOV_TOKEN` was referenced by the test
job but not declared or forwarded by the new reusable caller. A failing
regression reproduced the missing declaration. The callee now declares the
optional secret and `js.yml` forwards it explicitly, preserving the existing
coverage-upload capability when configured. Current repository configuration
still lacks that token, so the documented notice remains expected. All 25
workflow regressions pass locally; before/after logs are preserved as
`data/local-checks/go-coverage-*.log.gz`.

The final provider review identified an additional PHP setup requirement:
`php/composer.json` is not repository-root metadata, and the publisher updates
the monorepo URL. Public Packagist's
[documented repository requirement](https://packagist.org/about) and
[monorepo explanation](https://blog.packagist.com/installing-composer-packages-from-monorepos/)
confirm it cannot index that subdirectory directly. The existing
[upstream request #472](https://github.com/composer/packagist/issues/472)
covers subdirectory support; this is a documented limitation, so no duplicate
issue was opened.

The minimal Composer installation regression failed before the fix with
“No valid composer.json was found in any branch or tag.” Root `composer.json`
now derives runtime metadata from the native descriptor and prefixes its
autoload paths with `php/`; versions come from Git tags. The publisher creates
a bare `VERSION` tag at the gated SHA after provider preflight, preserving the
existing `php_VERSION` GitHub release convention. Ten JS regressions cover
metadata, exact tag matching, annotated tags, immutable source commits, dev-only
registration, version normalization, and outage failures. The JS gate runs
these checks; PHP 8.4/8.5 CI installs a minimal tagged repository without network
registries and verifies the installed parser via Composer's autoloader.
Before/after logs are retained under `data/local-checks/php-distribution-*`.
Actual Packagist registration and credentials remain unavailable; the exact
version audit will fail on main until actual delivery exists. No remote version
tag or PHP release was created during PR validation.

The third push, `301578b6af829d475321deec399992210259905e`, passed unified CI
(`38102050448`) and every other executing workflow except links. Links run
`38102050110` failed twice on GitHub HTML file 503s: attempt one had 21
occurrences across 13 distinct URLs; attempt two ended with seven occurrences.
Both complete logs and matching SHA metadata are preserved as
`data/links-38102050110-attempt-*`. Attempt-one log lines 524–568 and attempt-two
lines 515–527 list the actual errors. Both attempts finished before the next
push; no library failure was hidden or attributed to a different commit.

The user-agent workaround was insufficient: a fresh probe returned 503 with
both agents. `probe_github_blob_content.py` then verified every one of the 13
equivalent raw files returned 200 while a missing-file control returned 404.
Lychee's [supported remapping](https://lychee.cli.rs/guides/cli/#--remap) now
checks GitHub file content at the same owner/repository/ref/path, preserving
readable documentation links. Other GitHub URL types retain their own checks.
Three local server regressions failed before configuration and pass afterward;
the links workflow runs them using the same installed Lychee binary. They
verify capture substitution, narrow URL matching, and a real 404 failure.
The local cached crawl checked 2,331 links with zero errors and three existing
exclusions; the raw-content probe made fresh requests for the 13 failures.
Before/after and crawl logs are preserved in `data/local-checks/`.

The finite `probe_lychee_retry.py` confirmed `--max-retries 3` makes only one
request to a 503-then-200 endpoint, while a second invocation succeeds and a
persistent 404 still fails. Pinned 0.24.2 source and a search of upstream issues
confirm the distinction between actual rejected status codes and transport
errors. The [existing upstream discussion](https://github.com/lycheeverse/lychee/issues/2193)
already covers this classification; the
[evidence report](https://github.com/lycheeverse/lychee/issues/2193#issuecomment-6104315167)
adds the standalone reproduction, real CI failures, verified workarounds, and
suggested regression cases. No duplicate issue or unverified GitHub root cause
was asserted.
