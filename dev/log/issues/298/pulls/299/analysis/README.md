# Issue #298 — analysis

Evidence for this analysis is in the sibling folders:

| Folder | Contents |
| --- | --- |
| `../ci-logs/` | Raw job logs from the failing run 33168552506 |
| `../api/` | Job and annotation inventories for all 15 runs of the push |
| `../templates/` | The seven pipeline templates' workflows, as downloaded |
| `../CI-CD-BEST-PRACTICES.md` | The referenced best-practices document |

Two edits were made to the collected evidence, both because a repository-wide
check flagged them and both preserving the content:

- `../CI-CD-BEST-PRACTICES.md` carries a provenance header and its five
  repository-relative links were rewritten to absolute hive-mind URLs, since
  they cannot resolve from this directory. This is the same treatment the copy
  under `dev/log/issues/290/pulls/291/analysis/` received.
- `../ci-logs/rust-33168552506-publishToCratesIO.log` had the UTF-8 BOM that
  `gh run view --log` prepends stripped from byte 1, so it passes `bom-check`.
  Nothing else in the file was touched.

Both were caught by this PR's own CI run 33172747906 / 33172748012, whose logs
are also in `../ci-logs/`. They are recorded here because they are exactly the
kind of finding issue #298 asks for: the checks were right, the newly added
files were wrong.

## 1. Timeline

Everything below happened on one push to `main` (commit `2b829f3`, "Merge pull
request #294"), which bumped every implementation from 0.15.0 to 0.16.0.

| Time (UTC) | Event |
| --- | --- |
| 11:48:28 | The push starts all 15 workflow runs simultaneously |
| 11:48:36 | `release-audit` finishes, **8 seconds in**, and annotates all seven languages as drifted |
| 11:49:42 | `php` finishes; warns that the package is not registered on Packagist |
| 11:50:09 | `cargo publish` reports `Published links-notation v0.16.0 at registry crates-io` |
| 11:50:09 | The next step begins probing `https://crates.io/api/v1/crates/links-notation/0.16.0` |
| 11:50:52 | `python` finishes; warns that `attestations: true` was ignored |
| 11:50:09 → 11:55:10 | Twenty attempts, 15 seconds apart, every one reported as "Not visible yet" |
| 11:55:10 | `::error::links-notation@0.16.0 did not appear on crates.io within 5 minutes`; the run goes red |
| 2026-08-28 (now) | `crates.io` serves 0.16.0, and so do npm, PyPI, NuGet and proxy.golang.org |

The last row is the decisive one. Running the repository's own audit today:

```
js: 0.16.0 (in sync with npm)
python: 0.16.0 (in sync with PyPI)
rust: 0.16.0 (in sync with crates.io)
csharp: 0.16.0 (in sync with NuGet.org)
go: 0.16.0 (in sync with proxy.golang.org)
```

The release the workflow declared missing had already shipped when it said so.

## 2. Requirements

Enumerated from the issue text, with where each is addressed.

| # | Requirement | Status |
| --- | --- | --- |
| R1 | Fix the one failing default-branch workflow (`rust`, run 33168552506) | Done — §3.1 |
| R2 | Find and fix **false negatives** across CI/CD | Done — §3.1 |
| R3 | Find and fix **false positives** across CI/CD | Done — §3.2, §3.3 |
| R4 | Find and fix **warnings** | Done — §3.3, §3.4; §5 lists what remains and why |
| R5 | Find and fix **errors** | Done — §3.1, §3.2, §3.5 |
| R6 | Compare **all files** against the seven pipeline templates | Done — §4 |
| R7 | Report the same defect upstream in the templates where it exists | Done — two issues filed, §4.2 |
| R8 | Follow `link-assistant/hive-mind` CI/CD best practices | Done — §6 |
| R9 | Apply each fix **everywhere** it applies, not only where it failed | Done — §3.1, 11 call sites across 7 workflows |
| R10 | Add debug output and a verbose mode, default off | Done — §7 |
| R11 | Everything in the single PR #299 | Done |

## 3. Root causes

### 3.1 False negative: crates.io rejects unidentified clients (the failing run)

The verification step ran, in full:

```bash
for attempt in $(seq 1 20); do
  if curl -fsS "https://crates.io/api/v1/crates/${PACKAGE_NAME}/${PACKAGE_VERSION}" >/dev/null 2>&1; then
    echo "Verified ..."; exit 0
  fi
  echo "Not visible yet, retrying in 15s (attempt ${attempt}/20)"
  sleep 15
done
echo "::error::${PACKAGE_NAME}@${PACKAGE_VERSION} did not appear on crates.io within 5 minutes"
exit 1
```

**crates.io answers 403 to clients that do not identify themselves**, and curl's
default `User-Agent: curl/8.x` is one of them. `-f` turns 403 into a non-zero
exit, so all twenty attempts failed for a reason unrelated to the release.

Reproduced in `experiments/issue-298/registry-user-agent-probe.sh`:

```
crates.io    default-UA=403  explicit-UA=200  <-- DIFFERS
npm          default-UA=200  explicit-UA=200  same
pypi         default-UA=200  explicit-UA=200  same
nuget        default-UA=200  explicit-UA=200  same
goproxy      default-UA=200  explicit-UA=200  same
packagist    default-UA=404  explicit-UA=404  same
```

Only crates.io discriminates, which is why only the rust workflow failed — the
identical pattern in the other six workflows happened to be talking to
registries that tolerate it. That is luck, not correctness.

A second, compounding defect: `>/dev/null 2>&1` discarded the status code. Had
the log said `HTTP 403` even once, this would have been a five-minute
diagnosis rather than an investigation. The message the step did print —
"did not appear on crates.io" — asserts something the step had no evidence for.

The repository already knew the rule. `scripts/release-audit.mjs:28` has always
sent `'user-agent': 'links-notation-release-audit'`. The knowledge simply never
reached the workflow.

**Fix.** `scripts/ci/registry-probe.sh`, sourced by all seven workflows:

- every request carries an identifying `User-Agent`;
- the last observed status is always in the failure message, so 404 (indexing
  lag) is distinguishable from 403 (broken probe);
- `CI_VERBOSE=true` logs every attempt's status. Default off.

Applied to **all 11 registry call sites across 7 workflows** (R9), not only the
one that failed.

### 3.2 False positive: an `::error::` annotation for an unconfigured optional feature

`rust-lang/crates-io-auth-action@v1` fails with

```
Failed to retrieve token from Cargo registry. Status: 400.
Error: No Trusted Publishing config found for repository `link-foundation/links-notation`.
```

Trusted publishing has to be registered on crates.io first, and it has not
been. The step carried `continue-on-error: true`, so the *job* survived — but
the action writes an `::error::` annotation, and annotations are not suppressed
by `continue-on-error`. Every run got a red error for a fallback path that
worked perfectly.

**Fix.** Gate the step on an opt-in repository variable
(`vars.CRATES_IO_TRUSTED_PUBLISHING == 'true'`), so it does not run — and
cannot annotate — until trusted publishing is actually configured.

### 3.3 False positive: the audit races the publishes it audits

`release-audit` triggers on `push` to `main`. So do the seven publish
workflows. The audit finished **8 seconds** after the push; rust was still
publishing **six minutes later**. Comparing a just-bumped version against a
registry that has not been written to yet can only produce drift, so all seven
warnings were structurally guaranteed:

```
::warning::rust: declared 0.16.0, latest on crates.io is 0.15.0.
```

Today crates.io serves 0.16.0. The warnings described a race, not drift.

**Fix.** On `push`, wait for this commit's other workflow runs to complete
before comparing. On `pull_request` no publish job runs at all, so being ahead
of the registry is the expected state there and is reported as a notice.

### 3.4 Contradictory inputs: PyPI attestations

`pypa/gh-action-pypi-publish` defaults `attestations` to true, but attestations
require trusted publishing, and the step passes `PYPI_TOKEN`. Every release
therefore logged:

```
::warning::The workflow was run with the 'attestations: true' input, but an
explicit password was also set, disabling Trusted Publishing. As a result, the
attestations input is ignored.
```

The two inputs contradicted each other and the action was right to say so.

**Fix.** Both now derive from one variable (`vars.PYPI_TRUSTED_PUBLISHING`), so
they cannot disagree.

### 3.5 Log noise: publishing a crate that is already published

The rust workflow re-publishes `links-notation-macro` on every run, so any run
where only the main crate was bumped logs

```
error: crate links-notation-macro@0.1.0 already exists on crates.io index
```

The calling function handled it and reported "skipped", so the job was correct,
but a red `error:` line in a healthy run is exactly the noise this issue is
about. Every other language workflow has a "Check if version already published"
step; rust did not.

**Fix.** `crate_version_published` checks the sparse index before publishing.

A note on why the *index* and not the JSON API: `cargo` resolves dependencies
against `https://index.crates.io/<prefix>/<name>`, so that is the artifact whose
visibility actually matters. The index returns 200 for **any** crate that
exists, so the version has to be matched inside the document — the first draft
of this helper checked only the status and would have reported every version of
an existing crate as published. Three tests now cover it, including that `0.1`
must not match `0.16.0`.

## 4. Template comparison (R6, R7)

### 4.1 What the templates do

None of the seven templates uses bare `curl` to verify a release. Each has a
dedicated script in its own language:

| Template | Script | Sends a `User-Agent`? | Reports the status on failure? |
| --- | --- | --- | --- |
| rust | `scripts/wait-for-crate.rs` | yes | partially — per-attempt warning only |
| csharp | `scripts/wait-for-nuget.mjs` | n/a (`fetch`) | **yes** — returns `{available, status, url}` |
| js | `scripts/wait-for-npm.mjs` | n/a (`npm view`) | **no** — bare `catch { return false }` |
| php | `scripts/wait-for-packagist.php` | n/a | fails open, continues |
| python, go, java | none | — | — |

So the specific trigger for #298 — a missing `User-Agent` — **does not exist
upstream**. The rust template sets it correctly. This repository's bash
reimplementation dropped it. No upstream report is warranted for that.

### 4.2 What does exist upstream

The *class* of defect does. Two templates collapse "the registry did not
answer" into "the package is not published", and then print a message
asserting the release failed:

**`rust-ai-driven-development-pipeline-template`** — `wait-for-crate.rs`:

```rust
Ok(response) => response.status() == 200,
Err(ureq::Error::Status(404, _)) => false,   // genuinely not published
Err(e) => { eprintln!("Warning: ..."); false }  // 403, 429, 5xx -> "not published"
```

A `bool` cannot carry the difference, so the caller cannot report it either.
Filed: <https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/143>

**`js-ai-driven-development-pipeline-template`** — `wait-for-npm.mjs`:

```js
} catch {
  return false;   // E404, EAI_AGAIN, 429, 503, npm-not-on-PATH: all identical
}
```

The bare `catch {}` discards the error object entirely.
Filed: <https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/149>

Both reports include a runnable reproduction, a workaround, and a concrete
code-level fix, and both point at the C# template as the in-family reference
implementation — `wait-for-nuget.mjs` already returns the status alongside the
verdict, which is exactly the shape the other two need.

## 5. Annotations that remain, and why

These are accurate statements about optional integrations that are genuinely
not configured. Silencing them would replace a false positive with a false
negative, which is the failure mode this issue exists to remove.

| Annotation | Severity | Why it stays |
| --- | --- | --- |
| `php: not registered on Packagist` | warning | True. Requires a human to submit the package once at packagist.org. |
| `java: Skipping Maven Central publishing: CENTRAL_USERNAME... not configured` | warning | True. Requires Sonatype credentials as repository secrets. |
| `go: CODECOV_TOKEN is not configured` | notice | True, and already at the right severity. |
| `python: Trusted Publishers allows publishing...` | warning | Emitted by the action while a token is in use. Removable by setting `PYPI_TRUSTED_PUBLISHING` once trusted publishing is registered. |
| `links: Summary report available at ...` | notice | Informational by design. |

Each is a prompt for a one-time configuration action, listed in §8.

## 6. Best-practices conformance (R8)

Checked against `../CI-CD-BEST-PRACTICES.md`. Every language workflow already
had path filters, per-job `concurrency` groups with
`cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`, `timeout-minutes`
on every job, `persist-credentials: false` on every checkout, and fast-fail
ordering (`lint` → `test` → `publish`). `AutoMerge.yml` has no checkout, so
credential persistence does not apply.

Two gaps this PR closes:

- **§4 Static Analysis & Linting** — `actionlint` only reaches shell inlined in
  a `run:` block, so the new shared helper had no lint gate. The `workflows`
  workflow now runs `shellcheck -x scripts/ci/*.sh` and the helper's test suite,
  and its path filter now includes `scripts/ci/**` so changes to it are covered.
- **§9 Release Automation** — verification steps that cannot distinguish
  "not published" from "could not check" are not verification. Addressed in §3.1.

## 7. Debug output and verbose mode (R10)

The repository already had a `CI_VERBOSE` convention, default off:

```yaml
CI_VERBOSE: ${{ inputs.verbose && 'true' || vars.CI_VERBOSE || 'false' }}
```

The registry polls never used it, which is why the failing run produced twenty
identical lines and no diagnosis. Now:

- `CI_VERBOSE=true` logs `probe <url> -> HTTP <code>` for every attempt, and the
  full set of versions the sparse index returned;
- the last observed status is in the final `::error::` **unconditionally**, so
  the next occurrence is diagnosable from the default log;
- the audit's new wait step lists each pending workflow under `CI_VERBOSE`.

Default remains off. `scripts/ci/registry-probe.test.sh` asserts both halves:
silence by default, status codes when asked.

## 8. Follow-up configuration (needs repository/registry access)

Not code changes; each removes one remaining warning.

1. Register trusted publishing at <https://crates.io/crates/links-notation/settings>, then set the `CRATES_IO_TRUSTED_PUBLISHING` repository variable to `true`.
2. Register trusted publishing at <https://pypi.org/manage/project/links-notation/settings/publishing/>, then set `PYPI_TRUSTED_PUBLISHING` to `true` and drop the `PYPI_TOKEN` secret.
3. Submit the package once at <https://packagist.org/packages/submit>.
4. Add `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY` and `GPG_PASSPHRASE` for Maven Central.
5. Optionally add `CODECOV_TOKEN`.

## 9. Existing components surveyed

| Component | Verdict |
| --- | --- |
| [`rust-lang/crates-io-auth-action`](https://github.com/rust-lang/crates-io-auth-action) | Already in use; now gated so it cannot annotate before it is configured. |
| [`pypa/gh-action-pypi-publish`](https://github.com/pypa/gh-action-pypi-publish) | Already in use; its inputs no longer contradict each other. |
| The templates' `wait-for-*` scripts | Reviewed in §4. `wait-for-nuget.mjs` is the reference shape; the others are the subject of the upstream reports. |
| `cargo publish --dry-run`, `cargo-release`, `release-plz` | Rejected. They manage version bumping and publication, which already work here; the defect was in verification, which none of them owns. |
| A generic HTTP-retry action (e.g. `nick-fields/retry`) | Rejected. Retrying was never the problem — every retry did exactly what it was told. The problem was that the predicate was wrong and its result was discarded. |

The fix is 164 lines of shell with no new dependency, which matters for a step
whose whole job is to be more trustworthy than the thing it verifies.

## 10. Reproduction and regression test

- `experiments/issue-298/registry-user-agent-probe.sh` — probes six real
  registries with and without an identifying `User-Agent`. This is what
  established the root cause.
- `scripts/ci/registry-probe.test.sh` — 21 assertions against a local server
  that reproduces the crates.io 403. No network, so it cannot go flaky. It
  fails against the pre-fix behaviour:

  ```
  NOT OK - probe_registry got HTTP 403, so it is not sending a real User-Agent
  NOT OK - the status code is recorded (expected '200', got '403')
  ```

  Both run in CI via the `ci-scripts` job in `.github/workflows/workflows.yml`.
