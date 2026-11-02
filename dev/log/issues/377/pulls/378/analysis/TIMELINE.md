# Timeline

All times are UTC. A run ID `<id>` stands for
`https://github.com/link-foundation/links-notation/actions/runs/<id>`. The logs are in
`../ci-logs/`, and `../ci-logs/ci-main-history.tsv` lists every CI run on `main` named here.

## Before the issue: `main` red since 2026-10-11

The last green push run of **CI** (`js.yml`) on `main` was 37858059084 at `9e476ce`, on
2026-10-08. Every CI run on `main` since then has failed.

| When | Run | Commit | Event | What failed | Root cause |
| --- | --- | --- | --- | --- | --- |
| 10-11 02:16 | 38104615789 | `b8a01b4` | push | go `publishRelease`, java, php, `release_audit` | missing registry credentials (java, php); see `ROOT-CAUSES.md` B1 |
| 10-12 05:34 | 38208546589 | `ef32b5b` | push | php, java, cpp `publishRelease`, `release_audit` | B1 |
| 10-12 14:31 | 38263509676 | `ef32b5b` | schedule | `release_audit` | B1 |
| 10-16 19:28 | 38955150603 | `27c4b7d` | push | php, java, `release_audit` | B1 |
| 10-19 09:45 | 39232417438 | `06ee7ea` | push | go, php, java, `release_audit` | B1 |
| 10-19, 10-26 | 39250521438, 40321595705 | `06ee7ea` | schedule | `release_audit` only | B1 |
| 11-02 05:39 | 41395268880 | `6e2d6d1` | push | java, php, `release_audit` | B1 |
| 11-02 09:58 | 41424977881 | `8ea4d6c` | push | csharp `pushToNuget`, java, php, `release_audit` | B1 (NuGet key) |

Registry state on 2026-11-02 (npm `latest` and crates.io `max_version`): 0.28.0. Versions 0.29.0 and
0.30.0 were bumped in the repository but never published.

## 2026-11-02: the runs listed in the issue

| When | What | Evidence |
| --- | --- | --- |
| 11:45 | PR #371 merged as `7508803`. CI 41439293166: **swift / differential** fails, `DifferentialTests.testTheJavaScriptParserAgrees : failed - fuzz-7412`. So `test` fails and `release` is skipped. `release_audit` still blames the credentials of all ten languages. | `CI-41439293166-swift-differential.log`, `CI-41439293166-release_audit-audit.log` |
| 11:58 | Dependabot PR #363 (maven-enforcer-plugin 3.6.3 → 3.7.0). CI 41439729658: **java / maven-floor** fails, `Detected Maven Version: 3.6.3 is not in the allowed range [3.7.0,)`. Dependabot also raised `requireMavenVersion`, which held the same literal. | `CI-41439729658-java-maven-floor.log`, `../pr/dependabot-363.diff` |
| 14:51 | Scheduled CI 41465947978 at `be05f2c`: `release_audit` fails, 0.29.0 absent everywhere. | `CI-41465947978-release_audit-audit.log` |
| 16:03 | PR #372 merged as `940986b`, the commit the issue reports. | `recent-runs-main.json` |
| 16:04 | **dependency freshness** 41477659797 fails with 21 `OUTDATED` lines, including bun-types, eslint, peggy, setuptools, pytest, flake8, google-java-format 2.0.0, maven-enforcer-plugin 3.7.0, phpunit, vite, lino-objects-codec, trufflehog 3.99.7 and npm 12.2.1. Its scheduled run 41475104458 failed the same way at 15:47. | `dependency-freshness-41477659797.log` |
| 16:07 | Three Dependabot jobs fail with `Error during file fetching; aborting: /kotlin/kotlin-js-store/package.json not found`: 41478058464, 41478058822, and the minimatch security update 41478063329. The open alerts against that lockfile (diff, glob, minimatch) can therefore never be fixed by Dependabot, and no CI job reports them. | `dependabot-*.log`, `dependabot-alerts-open.tsv` |
| 16:11 | Dependabot PR (peggy 5.1.1, bun ecosystem). CI 41478085102: **js / test** fails because `js/src/parser-generated.js` no longer matches what peggy 5.1.1 generates. The gate printed a bare diff. | `CI-41478085102-js-test.log` |
| 16:26 | Dependabot PR (pre-commit group). CI 41478329697: **swift / differential** fails on the same comment bug as 11:45. | `CI-41478329697-swift-differential.log` |
| 16:07–16:44 | CI 41477660740 (`940986b`): **kotlin / ios** on `macos-26` is cancelled after 37 minutes (16:07:31–16:44:51) with `The job was not acquired by Runner of type hosted even after multiple attempts`. It ran no steps and has an empty `runner_name`. `release` is skipped. `release_audit` again tells the reader to configure npm, PyPI, crates.io, NuGet, Maven Central and Packagist credentials. | `CI-41477660740-kotlin-ios-job.json`, `CI-41477660740-release_audit-audit.log` |
| 16:20 | Issue #377 opened, listing these runs while CI 41477660740 was still in progress. | `../issue/issue-377.json` |
| 16:45–16:47 | auto-merge 41484505687: `DEPENDABOT_AUTO_MERGE_TOKEN cannot push to this repository (expired or missing the repo scope); merging with GITHUB_TOKEN instead.` It merges PR #376 (eslint pre-commit mirror) as `7a55d33`. | `auto-merge-41484505687.log` |
| 16:46 | On `7a55d33`, only `workflow_run` and `dynamic` runs exist: auto-merge, pages via `workflow_run`, and Dependabot Updates. No `push` run of CI, dependency freshness, bom-check, workflows or links: a `GITHUB_TOKEN` push starts no workflow. | `gh run list --commit 7a55d33...` (quoted in `ROOT-CAUSES.md` C7) |
| 16:50 | Issue comment by konard: the runs above finished, and CI and dependency freshness failed at `940986b`. | `../issue/issue-377-comments.json` |
| 17:22 | PR #375 (pre-commit group) is merged the same way, as `7ff559d`. Again, no push workflow ran. This is the second unchecked commit on `main`. | `gh run list --branch main` |

## Work on this pull request

`git log origin/main..HEAD` on `issue-377-e0fbca836336`, oldest first:

| Commit | What |
| --- | --- |
| `b41fd15`, `a875202` | JS (the reference): comments and references are read token by token, and a stream waits for the line that closes an even run of quotes. |
| `3b3efc4` | Python port. |
| `6bcdf8d` | Shared syntax vectors regenerated with the new fixtures. |
| `7a256fa` | `release_audit` names the failed stage when the release job never ran. |
| `3e8e5b4`, `0bab111`, `5fcc0ca`, `f30e475`, `78025d5`, `a5ea292`, `09de5fb` | Go, Rust, C#, PHP, C++, Java and Swift ports. |
| `a40a1f3` | `rerun-unacquired.yml` re-runs jobs that no hosted runner picked up. |
| `f7844c7` | `check-dependencies.py --update` fails an update that rewrites nothing. A leaked HTTP response is closed. |
| `478a505` | The floors the freshness check reported are raised. The peggy 5.1.1 parser is regenerated. The stale-parser gate now prints the command to run. |
| `07e6f64` | The Maven floor becomes `[3.6.3,)`, and maven-floor checks the declared floor. |
| `1b52305` | minimatch is overridden to 11.0.4 under eslint, and check-npm-locks no longer proposes to undo it. |
| `cc23a71` | npm audit runs at `moderate`, and the Kotlin/JS `yarn.lock` is audited. |
| `cf7c90c` | After a `GITHUB_TOKEN` merge, auto-merge dispatches the push workflows. |
| `5b14b24` | The Kotlin parser reads comments and references token by token (A1, A2). |
| `3c113f8` | The Kotlin/JS `yarn.lock` resolves diff, glob and minimatch past their advisories (C6). |
| `927db23` | The parity inventory and test counts are refreshed after the ports. |
| `0f37907` | NuGet publishing uses trusted publishing, and an expired key is named as such (B1). |
| `ef9302a` | `changelog.d/377.md` describes the fixes. |
| `b0c5ff6` | The new scripts are formatted with prettier. |
| `6596ad8` | The Maven 3.6.3 floor job runs JDK 25 without launcher warnings (W1). |
| `332cf3d` | `experiments/issue-377/kgp-named-enum` reproduces the KGP 2.4.21 deprecation (W3). |
| `0b8992a` | The dependency freshness gate fails pull requests and warns on push and schedule (C2). |
| `0c4336f`, `ffefe86` | The annotation collector `experiments/issue-377/collect-annotations.sh`, and this folder. |
| `d9c8fcf` | The first CI run of this branch (41501254429) found the KGP reproduction missing from Dependabot coverage. It is now excluded on purpose, because it pins KGP 2.4.21. |
| `ea87dbe` | The same run's `js / parity` rejected `!cancelled()` on `release_audit` (`check-js-gate.mjs`), so `always()` is restored. The reason is in `BEST-PRACTICES-COMPLIANCE.md`, principle 10. |
