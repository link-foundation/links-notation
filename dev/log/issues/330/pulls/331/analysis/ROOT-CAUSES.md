# Root causes

Every finding comes from the logs in `../ci-logs/`. `annotations.txt` holds the full annotation
inventory, and `warnings.txt` holds the log-only warnings. The findings fall into four classes:

- **Error**: a job failed.
- **False negative**: a real problem passed.
- **False positive**: something that is not a problem was reported as an error.
- **Warning**: noise on a green job.

## Errors (red runs)

### E1. npm audit on a schedule: `brace-expansion` advisories

- **Run:** security 37323195458 (schedule, 2026-10-05), jobs `Audit npm lock (js)` and
  `Audit npm lock (docs/website)`.
- **Root cause:** three advisories against `brace-expansion` 4.0.0–5.0.11 were published on
  2026-09-29: GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p and GHSA-q2hr-2g5m-vwhr. The audit job
  did its job; nothing in the repository had changed.
- **Fix:** Dependabot PRs #328 and #329 (`brace-expansion` 5.0.12) were merged on `main` before
  this pull request. Both lockfiles now resolve 5.0.12. The other three audited lockfiles
  (`docs/comparison`, `benchmarks/js`, `benchmarks/tools`) do not contain `brace-expansion`.
- **Classification:** true positive. No change to the gate was needed.

### E2. lychee: github.com rate limiting, and 5xx answers that are never retried

- **Run:** links 37329071552 (schedule, 2026-10-05). 2068 links checked, 2052 successful,
  7 errors:
  - 3 from `github.com/link-foundation/links-notation/actions?workflow=...` badge targets: one
    `429` and two `502`;
  - 4 `503`s from `www.codefactor.io` badge links in `README.md` and `README.ru.md`.

  The links runs before (`36501019166`) and after (`37486124238`) passed, and every one of these
  URLs answers 200 now. This was a **false positive**.
- **Root cause, part 1:** lychee's defaults are 10 concurrent requests per host, 50 ms apart.
  That burst trips GitHub's secondary rate limit for unauthenticated HTML pages. lychee printed
  the fix itself: a `[hosts."github.com"]` section.
- **Root cause, part 2:** lychee never retries a 5xx answer, whatever `--max-retries` says. A
  rejected status reaches the retry loop as `ErrorKind::RejectedStatusCode`, and
  `ErrorKind::should_retry` (`lychee-lib/src/retry.rs`) only matches `429`. The
  `is_server_error()` branch only applies to transport-level `reqwest` errors. So one short
  outage of any linked host fails the run. Measured with
  `experiments/issue-330/lychee-5xx-retry.sh`: a 503 link gets exactly one request under
  `--max-retries 3`. The same cause was found independently in a comment on
  lycheeverse/lychee#2193.
- **Fix, part 1 (`9a02947`):** `lychee.toml` sets `concurrency = 2` and `request_interval = "1s"`
  for `github.com`, and accepts `429` after lychee's own retries. The same commit:
  - drops a stale `.lycheeignore` entry for the C# Pages site, which serves 200 now, so the
    exclusion only hid regressions;
  - replaces two redirecting URLs with their targets.
- **Fix, part 2 (`c04967e`):** when lychee fails, `links.yml` waits 120 s and runs it again with
  the same arguments. lychee never caches an error (`lychee-bin/src/cache.rs`), so with
  `--cache` the second pass re-requests only the failed links, and a dead link still fails it.
  The experiment shows both halves: the recovered link passes, and the 404 does not.
- **Templates:** rust, csharp and php have both defects. Their recheck scripts treat every failure
  that carries a status code as final. The original reports covered the 429 part, and a
  correction comment on each added the 5xx part. js and python already retry 429 and 5xx in their
  recheck scripts. See `../templates/COMPARISON.md` Q4.

### E3. dependency freshness: trufflehog released

- **Runs:** dependency freshness 37486124184 (`v3.98.0 -> v3.98.1`) and 37529950144
  (`v3.98.0 -> v3.99.0`).
- **Root cause:** the repository requires the latest stable version of every dependency and
  action (`scripts/ci/check-dependencies.py`). trufflehog shipped three releases in 30 hours.
  That much is policy working as designed. The real defect was a **false negative** inside the
  checker: `trufflesecurity/trufflehog` takes a separate `version:` input that pins the
  scanner image, and the checker never read it. The scanner had been running an unpinned
  `latest` image while the action ref looked current.
- **Fix (`ed6272d`):** both pins moved to 3.99.0. The checker now compares `version:` inputs of
  actions that wrap a separately released tool. `experiments/issue-325/test_dependency_check.py`
  has offline tests for it.
- **Not changed:** the policy. It will go red again on the next trufflehog release, until
  Dependabot (daily for `github-actions`) opens the bump. That is the intended trade-off of
  "always latest". A grace period would be a policy change, which is out of scope here.

### E4. C# code PDF: emoji and CJK in a source file

- **Run:** csharp 37486124083, job `generatePdfWithCode`:
  `! LaTeX Error: Unicode character 😀 (U+1F600)`, then `世 (U+4E16)`.
- **Root cause:** PR #326 added test strings such as `"😀 привет 世界"` to
  `BinaryLinoCodecTests.cs`. The PDF is built with pdfLaTeX, `inputenc`, and the T1 and T2A font
  encodings, which cannot typeset either character. The job only ran on `main`, so PR #326 was
  green: a **false negative** at PR time.
- **Fix (`8790d23`):** `csharp/scripts/format-files.py` rewrites characters outside the
  typesettable set as C# `\uXXXX` or `\UXXXXXXXX` escapes, so the listing is still valid C#. The
  PDF job now also runs on pull requests, and LaTeX errors are repeated as annotations.
  `experiments/issue-330/test_pdf_unicode.py` covers the escaping.

### E5. npm verify window shorter than npm's publish-time scan

- **Run:** js 37486124040, `publishToNpm`: `links-notation@0.23.0 on npm was not visible ... after
  10 attempts (last status: HTTP 404)`.
- **Root cause:** npm now scans every new version for malware before serving it. GitHub's
  changelog puts this at "typically around five minutes", sometimes "15 minutes or more". The
  upload finished at 15:18:59. npm's packument records the version at 15:23:08, 4 min 9 s
  later. The verify loop gave up after 150 s. This was a **false positive** (the publish had
  succeeded), and it turned into a **false negative** next.
- **Fix (`5187c7e`):** the npm window is now 80 × 15 s (20 min) with a 35 min job timeout. The
  same commit gives the other registries room based on measured delays:
  - PyPI 0.23.0 used ~75 s of 150 s, so its window is now 40 × 15 s.
  - NuGet 0.23.0 used 7 min 1 s of 10 min, so its window is now 40 × 30 s.

## False negatives (green runs hiding a problem)

### N1. A missing GitHub release is never backfilled, and the audit says "in sync"

- **Root cause:** each `publishRelease` job ran only on `published == 'true'`. Once E5 failed
  the first run, every later run found 0.23.0 already on npm, reported `published=skipped`, and
  skipped the release job for good. The scheduled release audit compared only the declared
  version with the registry, so it passed (`release-audit-37529950165.log`). Three tags are
  affected: `js_0.23.0`, `js_0.21.0` and `rust_0.16.0`.
- **Fix:** two commits:
  - `5187c7e`: `publishRelease` in js, python, rust, java, php and csharp also runs on
    `skipped`. The release step checks `gh release view` first, so it is idempotent. Missing
    credentials still report `failed` and withhold the release.
  - `f2165be`: `scripts/release-audit.mjs` looks up a GitHub release for every version that is
    on its registry, and warns with the `gh release create` command when it is missing.
- **Result:** verified on `bb1b7fe`: `##[warning]js: 0.23.0 is on npm, but the GitHub release
  js_0.23.0 is missing.` The audit only checks the declared version, so the historical
  `js_0.21.0` and `rust_0.16.0` are listed in `UPSTREAM.md` as maintainer actions instead.
- **Templates:** js, python, java and go lack the backfill. python is worse: a re-run fails on
  the duplicate upload. See `../templates/COMPARISON.md` Q2 and Q3.

### N2. The PDF job never ran on pull requests

Covered under E4: the defect that broke `main` was only reachable after merge.

## False positives (error annotations on green jobs)

### P1. rust-cache prints four `##[error]ENOENT` lines after a successful publish

- **Run:** rust 37486124161, `publishToCratesIO` post step:
  `##[error]ENOENT: no such file or directory, opendir '.../rust/target/package/links-notation-0.23.0/tests/trybuild'`
  (and `tests/target`). Each is printed twice.
- **Root cause:**
  - `cargo publish` verifies the crate by unpacking it under `target/package/<name>-<version>/`,
    and that copy includes the crate's `tests/` source folder.
  - `Swatinem/rust-cache@v2.9.2` cleans `target/` before saving it. It treats every directory
    named `tests` as a profile and probes `tests/target` and `tests/trybuild`
    (`src/cleanup.ts:49` and `:53`).
  - The probe calls the async `cleanTargetDir` **without `await`**, inside `try {} catch {}`.
    The rejection escapes the `try`, and the runner reports the unhandled rejection as an error
    annotation. The job still succeeds.
- **Reproduction:** `experiments/issue-330/rust-cache-enoent.sh` runs `cargo package` into a
  temporary target directory and replays the un-awaited call. It prints the same two paths.
- **Fix (`1ebcb5c`):** the publish job deletes `target/package` after verification. Nothing
  reads that directory again, so it should not be cached anyway.
- **Upstream:** Swatinem/rust-cache#193 (open since 2024). The fix is proposed in
  Swatinem/rust-cache#387. The rust template does not use rust-cache.

## Warnings on green runs

| # | Warning | Root cause | Fix |
| --- | --- | --- | --- |
| W1 | `PEG0021` at `Parser.peg(288,59)` and `PEG0022` at `(295,125)`, on every C# and benchmark build | The `element` rule's fallback was an always-failing predicate kept for its side effect, and Pegasus could not prove it consumes input. | `c3504d8`: a trailing `.` that is never reached. Same parse; 316 tests pass. |
| W2 | setup-java: `server-username`, `server-password` and `gpg-passphrase` are deprecated | setup-java v6 renamed them to `*-env-var` inputs. | `a3a3a58` |
| W3 | setup-go: `Restore cache failed: Dependencies file is not found ... go.mod` (binary-interop) | Caching is on by default, but there is no `go.mod` at the root and the module has no dependencies. | `a3a3a58`: `cache: false`, as in `go.yml` |
| W4 | CodeQL extraction noise: C# restored about a dozen throwaway projects under `experiments/`; Rust warned `no manifest found` for three files under `dev/log/`; Java reported `The POM for io.github.link-foundation:links-notation:jar:0.23.0 is missing` | CodeQL scanned the whole checkout. `benchmarks/java` depends on the library by coordinates and only builds after `mvn install`. | `bb1b7fe`: `.github/codeql/codeql-config.yml` with `paths-ignore`. Verified on run 37534592831. |
| W5 | CodeQL C#: `Warning: No NuGet feeds are reachable.` | The extractor checks an empty feed list at the repository root when there is no `nuget.config`. It then reaches nuget.org fine for `csharp/`. | Upstream only: github/codeql#22766 |
| W6 | `DEP0005 Buffer() is deprecated` in artifact downloads | `actions/download-artifact` v8.0.1 → `@actions/artifact` → `unzip-stream` → `binary` → `buffers` | Upstream only, already tracked: actions/download-artifact#484 and #381, actions/toolkit#2003, mhr3/unzip-stream#38 and #55 |
| W7 | `DEP0040 The punycode module is deprecated` in Pages deployment | `actions/deploy-pages` v5.0.1 → `tr46` 0.0.3 | Upstream only, already tracked: actions/deploy-pages#434 and #413, actions/toolkit#2173 |
| W8 | `hint: Using 'master' as the name for the initial branch` | `git init` inside `actions/checkout` and the CodeQL action. Informational. | none needed |
| W9 | Runners on `ubuntu-latest` | Not a warning yet, but a latent false positive: the alias moves without a diff in this repository. | `bf9ccdc`: 67 labels pinned to `ubuntu-24.04`, and a guard in `workflows.yml` |
| W10 | CodeQL on this pull request only: `Cannot retrieve the full diff because there are too many (300) changed files in the pull request.` (`ci-logs/security-37537892762-5dddf32.log`) | The CodeQL action reads the pull request's changed files to limit alerts to the diff, and the API returns at most 300. This pull request changes 373 files, 340 of them this evidence folder. On `bb1b7fe`, before the folder was committed, it logged `Persisted 112 diff range(s) across 31 file(s)` and no warning. The action then falls back to a full analysis (`Reverting overlay database mode to none`), so no alert is lost; only the diff-informed speed-up is. | none: it is specific to this pull request's size, and `paths-ignore` does not change the file count. Shrinking the evidence would go against the issue's request to keep every log here. |
| W11 | Not a warning: the C# PDF job took 25 of its 30 minutes on `bfd2871` (`ci-logs/csharp-pdf-37539077808-bfd2871.log`) | `Fetched 293 MB in 21min 53s (223 kB/s)`: a slow apt mirror on the hosted runner. The four runs before took 1.5 to 2 minutes for the same step. This pull request runs the job on every C# pull request (N2), so a slow mirror there would show up as a false failure. | Cache the `.deb` files with `actions/cache`, and point apt at them with `Dir::Cache::Archives` (`e803efd`). |

## Notices that need a maintainer, not code

| Notice | Where | Action |
| --- | --- | --- |
| `java: declared 0.23.0, but nothing is published on Maven Central` and `Skipping Maven Central publishing: CENTRAL_USERNAME, CENTRAL_TOKEN, GPG_PRIVATE_KEY and GPG_PASSPHRASE secrets are not configured` | release-audit, java | Add the four secrets. |
| `php: ... nothing is published on Packagist` and `not registered on Packagist` | release-audit, php | Submit the repository once at packagist.org. |
| `A new Trusted Publisher for the currently running publishing workflow can be created` | python | Register the trusted publisher on PyPI, then drop the token. |
| `CODECOV_TOKEN is not configured` | go | Add the secret, or accept no coverage upload. |

These are reported as `::notice` or `::warning` on purpose: the code is right, and the job cannot
fix the account state. They are listed again in `UPSTREAM.md`.
