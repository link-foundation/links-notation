# Root causes

Every error, false positive, false negative, warning and notice found in the CI/CD runs listed in
issue #377. Each entry gives the evidence, the root cause, the fix and how it is verified.

- A run ID `<id>` means `https://github.com/link-foundation/links-notation/actions/runs/<id>`.
- Logs are in `../ci-logs/`.
- Every annotation from the seven examined runs on `main` is in
  `../ci-logs/annotations-main-runs.tsv`, and `warnings.txt` counts them.

Sections:

- **A**: real errors, where CI was right to fail.
- **B**: failures that only a maintainer can fix.
- **C**: false positives and false negatives in the CI logic itself.
- **W**: warnings and notices.

## A. Errors

### A1. Comments and references were not read token by token (all ten bindings)

- **Evidence:**
  - CI 41439293166 and 41478329697, `swift / differential`:
    `DifferentialTests.testTheJavaScriptParserAgrees : failed - fuzz-7412`.
  - The Kotlin differential test failed on fuzz-2359 the same way.
  - Both runs skipped `release`.
- **Root cause:**
  - Every binding blanked `#` comments with a scan over the raw line, before tokenising. That scan
    did not know where a token starts.
  - A `#` inside a quoted reference that directly follows a group, another reference or a literal
    (`(a)" #b"`) was blanked as if it started a comment.
  - Blanking a comment could also turn an empty `""` into a reference holding the blanked text.
  - The grammar (`js/src/grammar.pegjs`) starts a token only after a separator, a delimited
    reference or a literal.
  - The differential fuzzers in Swift and Kotlin compare against the JavaScript reference, and they
    found the disagreement.
- **Fix:** the comment and reference scan follows the grammar's token boundaries. It landed in the
  JS reference first, then in each port:

  | Binding | Commit |
  | --- | --- |
  | JS | `b41fd15` |
  | Python | `3b3efc4` |
  | Go | `3e8e5b4` |
  | Rust | `0bab111` |
  | C# | `5fcc0ca` |
  | PHP | `f30e475` |
  | C++ | `78025d5` |
  | Java | `a5ea292` |
  | Swift | `09de5fb` |
  | Kotlin | `5b14b24` |

  `6bcdf8d` regenerates the shared syntax vectors with the new fixtures, and `927db23` refreshes
  the parity inventory.
- **Verified:**
  - The fixtures fuzz-7412 and fuzz-2359 are in the shared vectors, and every binding's test suite
    runs them.
  - The JS, Python, Go, Rust, C#, PHP, C++ and Java suites were run locally.
  - Swift and Kotlin run in CI.

### A2. A `StreamParser` cut a document at a line that leaves a quote run open

- **Evidence:** the new comment-after-adjacent-quote fixture from A1 found it. A stream read
  `a "" b` as the empty reference followed by `b`, but the whole document reads one reference
  holding ` b\n`.
- **Root cause:**
  - An even run of delimiters is the empty reference only when no later run closes it.
  - The stream emitted the lines before such a run as soon as they looked complete
    (`structurallyComplete`).
- **Fix:** a reference that nothing closes yet counts as incomplete, so the stream waits for the
  line that closes it:
  - in JS, `a875202`;
  - in the ports, in the same commits as A1.
- **Verified:** there is a regression test in each binding that compares the stream with the
  whole-document parse.

### A3. The generated parser went stale on a peggy update

- **Evidence:** CI 41478085102 on Dependabot's peggy 5.1.1 pull request, `js / test`. The step
  `git diff --exit-code -- src/parser-generated.js` failed, and it printed only a bare diff.
- **Root cause:**
  - `js/src/parser-generated.js` is committed, and peggy 5.1.1 generates slightly different code.
  - The gate was right to fail, but it did not say why or what to run.
- **Fix (`478a505`):**
  - The parser is regenerated with peggy 5.1.1.
  - The gate (`.github/workflows/javascript.yml`, "Verify generated parser matches its grammar")
    now prints an `::error` naming the locked peggy version and the command to run:
    `bun install && bun run build`.
- **Verified:** `js / test` regenerates the parser and diffs it. Locally, the diff is empty.

### A4. A Dependabot plugin bump raised the Maven floor

- **Evidence:**
  - CI 41439729658 on PR #363 (maven-enforcer-plugin 3.6.3 → 3.7.0), `java / maven-floor`:
    `Detected Maven Version: 3.6.3 is not in the allowed range [3.7.0,).`
  - The diff is in `../pr/dependabot-363.diff`.
- **Root cause:**
  - `requireMavenVersion` held the literal `3.6.3`, which was also the enforcer plugin's version.
  - Dependabot's Maven updater rewrites every literal equal to the old version inside the plugin's
    declaration, `<configuration>` included, so it also raised the floor.
- **Fix (`07e6f64`):**
  - The floor is written as the range `[3.6.3,)` in `java/pom.xml` and `benchmarks/java/pom.xml`.
    The enforcer reads the range the same way, and no plugin version string can equal it.
  - `maven-floor` checks that the declared floor matches the Maven version it installs.
- **Upstream:** dependabot-core#16797.
- **Verified:** the `maven-floor` job passes on Maven 3.6.3 and fails, naming both values, if the
  declared floor drifts from the Maven version it installs.

### A5. Dependabot cannot update the Kotlin/JS `yarn.lock`

- **Evidence:**
  - Dependabot runs 41478058464, 41478058822 and 41478063329 (the minimatch security update)
    failed with:
    `Error during file fetching; aborting: /kotlin/kotlin-js-store/package.json not found`.
  - `../ci-logs/dependabot-alerts-open.tsv` lists open alerts for diff, glob and minimatch against
    that lock.
- **Root cause:**
  - Kotlin Multiplatform writes `kotlin/kotlin-js-store/yarn.lock` with no `package.json` next to
    it. The `package.json` is generated under `build/js` at build time.
  - Dependabot's npm/yarn updater requires a manifest, so these alerts can never be fixed
    automatically.
  - Nothing in CI audited this lock either; see C6.
- **Fix:**
  - `3c113f8` resolves diff 7.0.0 → 8.0.4, glob 10.5.0 → 14.0.3 and minimatch 9.0.9 → 11.0.4 in
    `kotlin/build.gradle.kts`. They come from Mocha 11.7.6, which the Kotlin/JS plugin installs for
    `jsNodeTest`.
  - The lock is regenerated with `./gradlew rootPackageJson --rerun kotlinUpgradeYarnLock`, because
    a plain `kotlinUpgradeYarnLock` keeps the old lock when only the resolutions change.
  - `cc23a71` audits the lock (C6).
- **Upstream:**
  - dependabot-core#16798.
  - A Kotlin YouTrack report about `rootPackageJson` staying up to date when only its resolutions
    change is **blocked**: JetBrains/kotlin
    has GitHub issues disabled, and YouTrack needs an account. The draft is in
    `../upstream/third-party/`.
- **Verified:** `jsNodeTest` passes 354 of 354 with the new versions, and the yarn.lock audit passes.

### A6. A hosted macOS runner was never acquired

- **Evidence:**
  - CI 41477660740, `kotlin / ios` on `macos-26`, was cancelled after 37 minutes with
    `The job was not acquired by Runner of type hosted even after multiple attempts`.
  - It ran no steps, and its `runner_name` is empty (`../ci-logs/CI-41477660740-kotlin-ios-job.json`).
  - As a result, `release` was skipped.
- **Root cause:** a GitHub-hosted capacity shortage. The same runs carry 12 notices
  "Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue
  times". No commit can fix this, so a re-run is the remedy.
- **Fix (`a40a1f3`):**
  - `rerun-unacquired.yml` starts on `workflow_run` completion.
  - It re-runs the failed jobs once, only when every failed job ran no steps and has no runner
    name.
  - Any other failure is left alone.
- **Upstream:** the same gap is reported to the templates that use hosted macOS or Windows
  runners (`../upstream/URLS.txt`, "runner-acquisition-rerun").

## B. Needs a maintainer

These fail on `main` on purpose: AGENTS.md says that missing credentials must fail publishing
visibly. On pull requests, nothing publishes and they do not run, so PR CI passes without them.
Each failure on `main` now names the exact remedy.

### B1. Registry credentials are missing or expired

| Registry | Evidence | What a maintainer must do |
| --- | --- | --- |
| NuGet | CI 41424977881 `release / csharp / pushToNuget`: `403 (The specified API key has expired. Please create a new API key at https://www.nuget.org/account/apikeys.)` | Either set up NuGet.org trusted publishing for `publish-csharp.yml` and set the repository variable `NUGET_USER` (`0f37907` uses it through `NuGet/login`), or renew `NUGET_API_KEY`. The step now names both remedies when the key is rejected (`experiments/issue-377/test_nuget_publish.py`). |
| Maven Central (Java, Kotlin) | `Maven Central version is absent and publishing credentials are missing: CENTRAL_USERNAME CENTRAL_TOKEN GPG_PRIVATE_KEY GPG_PASSPHRASE` | Add the four secrets (docs/releases.md). |
| Packagist | `link-foundation/links-notation is not registered on Packagist. Submit it once at https://packagist.org/packages/submit` | Submit the package, then set `PACKAGIST_USERNAME`/`PACKAGIST_TOKEN`. |

Versions 0.29.0 and 0.30.0 were bumped in the repository but never published anywhere, because
`release` was skipped by A1 and A6. Registry `latest` is 0.28.0. The next green `main` run publishes
0.30.0 wherever credentials work, so no version bump is needed.

### B2. `DEPENDABOT_AUTO_MERGE_TOKEN` expired

- **Evidence:** auto-merge 41484505687 printed
  `DEPENDABOT_AUTO_MERGE_TOKEN cannot push to this repository (expired or missing the repo scope); merging with GITHUB_TOKEN instead.`
- **Remedy:** renew the token. Until then, C7 keeps the fallback safe.

### B3. PyPI Trusted Publisher warning (optional)

- **Evidence:** run 41424977881 `release / python / publishToPyPI`:
  `A new Trusted Publisher for the currently running publishing workflow can be created ...`.
- **Explanation:** `pypa/gh-action-pypi-publish` prints this when it publishes with an API token.
- **Remedy:** register the trusted publisher on PyPI and set `PYPI_TRUSTED_PUBLISHING=true`.

### B4. `CODECOV_TOKEN` not configured (optional)

- **Evidence:** 10 notices `CODECOV_TOKEN is not configured, so coverage was not uploaded`, from
  `.github/workflows/go.yml:123`.
- **Explanation:** this is an informational notice by design: coverage upload is optional.

## C. False positives and false negatives in CI logic

### C1. The release audit blamed credentials when the release never ran (false positive)

- **Evidence:** the `release_audit` jobs in CI 41439293166, 41465947978 and 41477660740 printed
  `js: 0.30.0 is absent from npm. To publish it, configure npm trusted publishing ... or the NPM_TOKEN secret`
  for all ten languages, although `release` had been **skipped** because `test` failed (A1) or a
  job was not acquired (A6).
- **Root cause:** the audit checked only whether each version was on its registry, not whether the
  release job ran.
- **Fix (`7a256fa`):** when `release` did not run, the audit names the failed stage and does not
  give credential advice.

### C2. The freshness gate turned `main` red for a fact about the world (false negative of the pipeline)

- **Evidence:** dependency freshness 41477659797 (push) and 41475104458 (schedule) failed with
  21 `OUTDATED` lines, for example `js/package.json: peggy ^5.1.0 -> 5.1.1`.
- **Root cause:**
  - The check failed on every event.
  - A new upstream release is external state (best practice 17: "gate external state on pull
    requests; on push, warn").
  - A red push run trains readers to ignore red, and it hides real failures.
- **Fix:**
  - `478a505` raises the reported floors.
  - `0b8992a`:
    - `check-dependencies.py --warn-only` and `check-npm-locks.mjs` print `::warning` annotations
      on push and schedule.
    - Pull requests still fail for the declarations they change (`--changed-since=HEAD^1`).
    - Registry errors, an update that changes nothing (C4), and an `npm ci` or
      `bun install --frozen-lockfile` failure still fail on every event.
- **Verified:** `experiments/issue-325/test_dependency_check.py` passes 22 tests, including
  `test_warn_only_turns_outdated_declarations_into_warnings`.

### C3. `--update` that rewrote nothing passed (false negative)

- **Root cause:**
  - `check-dependencies.py --update` reported google-java-format 2.0.0 as raised, while
    `java/pom.xml` kept 1.35.0.
  - The updater looked only in Spotless's `<googleJavaFormat>`, but `java/pom.xml` declares the
    formatter as a dependency of its `format` profile.
  - It exited 0 anyway.
- **Fix (`f7844c7`):**
  - The updater falls back to the `groupId`/`artifactId` declaration.
  - An update that changes no byte fails, naming the file and the version to raise by hand.

### C4. A leaked HTTP response printed `ResourceWarning`

- **Evidence:** in `dependency-freshness-41477659797.log`, the step "Test the dependency checker
  without network access" printed `tempfile.py:538: ResourceWarning: Implicitly cleaning up <HTTPError ...>`.
- **Root cause:** the gradle-plugin 404 branch left the `HTTPError` response open.
- **Fix (`f7844c7`):** the response is closed, and the test runner now fails on any leaked
  resource.

### C5. npm audit failed only at `high` (false negative)

- **Root cause:** moderate advisories (minimatch under eslint) never failed CI.
- **Fix:**
  - `cc23a71` audits at `moderate`.
  - `1b52305` overrides minimatch to 11.0.4 under eslint, and `check-npm-locks.mjs` no longer
    proposes to undo the override.
- **Upstream:** reported to the js template (`js-npm-audit-moderate`).

### C6. The Kotlin/JS `yarn.lock` was never audited (false negative)

- **Root cause:** neither `npm audit` nor Dependabot can read a `yarn.lock` that has no
  `package.json` (A5).
- **Fix (`cc23a71`):**
  - `scripts/ci/audit-yarn-lock.mjs`, run from `security.yml`, sends the locked versions to the
    npm registry's bulk advisory endpoint, the one `npm audit` uses.
  - It fails with the resolution to add.
  - Its test is `experiments/issue-377/audit-yarn-lock.test.mjs`.

### C7. Commits merged with `GITHUB_TOKEN` started no push CI (false negative)

- **Evidence:**
  - After B2, auto-merge merged PR #376 as `7a55d33` and PR #375 as `7ff559d` with `GITHUB_TOKEN`.
  - `gh run list --commit 7a55d339146f01312abde79f5a04a79a5bfb4311` returns only
    `workflow_run` and `dynamic` runs (auto-merge ×9, pages, Dependabot Updates).
  - There is no `push` run of CI, dependency freshness, bom-check, workflows or links.
  - So two commits on `main` were never checked, and could never have released.
- **Root cause:** GitHub does not start workflows for events caused by `GITHUB_TOKEN`, except
  `workflow_dispatch` and `repository_dispatch`
  ([docs](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow)).
- **Fix (`cf7c90c`):**
  - `workflow_dispatch` is the one event that `GITHUB_TOKEN` may start runs with.
  - After a `GITHUB_TOKEN` merge, `scripts/ci/merge-dependabot.py` dispatches the workflows that
    the push would have started, honouring their `paths` filters.
- **Verified:** `experiments/issue-350/test_merge_dependabot.py`, which also keeps the script's
  workflow table equal to the push triggers in `.github/workflows`.

### C8. The Maven floor job did not check the floor it claims to test (false negative)

- **Root cause:** `maven-floor` installed Maven 3.6.3 but never compared it with the floor
  declared in `pom.xml`, so A4 could have raised the floor silently.
- **Fix (`07e6f64`):** the job checks that the two match.

## W. Warnings and notices

| ID | Warning | Source | Status |
| --- | --- | --- | --- |
| W1 | JDK 25 `WARNING: A restricted method in java.lang.System has been called`, the `--enable-native-access` hint, and `sun.misc.Unsafe` warnings | `CI-41439729658-java-maven-floor.log`: Maven 3.6.3's bundled libraries | **Fixed** (`6596ad8`): `MAVEN_OPTS=--enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow` in that job only |
| W2 | `sun.misc.Unsafe` warnings from the ktlint worker | `CI-41477660740-kotlin-lint.log` | **Upstream**: ktlint-gradle 14.2.0 `BaseKtLintCheckTask.submitKtLintWork` passes only `--add-opens` to the worker's `forkOptions`, so a build cannot add JVM flags. Comment with a reproduction and patch: [ktlint-gradle#944](https://github.com/JLLeitschuh/ktlint-gradle/issues/944#issuecomment-6584621670). |
| W3 | Gradle 9.8.2 `... has been deprecated. This will fail with an error in Gradle 10` for `KotlinNativeBundleArtifactFormat$KotlinNativeBundleArtifactsTypes` | `kotlin / lint`, `test` and `android` | **Upstream**: KGP 2.4.21 registers a plain enum as an attribute. It is fixed by KT-89265, which is in 2.5.0-Beta2 and not yet in a stable release. Reproduction: `experiments/issue-377/kgp-named-enum` (`332cf3d`). The message does not name the plugin: [gradle#39685](https://github.com/gradle/gradle/issues/39685). Dependabot will bump KGP when 2.5.0 is stable. |
| W4 | `(node:…) [DEP0005] DeprecationWarning: Buffer() is deprecated` | `CI-41477660740-benchmarks-java.log`, from `actions/download-artifact@v8.0.2` (latest) | **Upstream**, already reported: [download-artifact#484](https://github.com/actions/download-artifact/issues/484) |
| W5 | `Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times` (12) | GitHub | Informational; see A6 |
| W6 | `Process completed with exit code 1` (14) | the failing steps of A1–A6 and B1 | A consequence, not a cause |
| W7 | B2, B3, B4 | | Need a maintainer; see section B |
| W8 | git `hint:` lines (162) and Dependabot `rehash` lines | `actions/checkout` and the Dependabot updater | Infrastructure output, not warnings about this repository |
| W9 | `ResourceWarning` | dependency freshness | **Fixed**; see C4 |
