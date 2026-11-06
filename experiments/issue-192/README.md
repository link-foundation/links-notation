# Issue 192 delivery work plan

Scope: [issue 192](https://github.com/link-foundation/links-notation/issues/192)
and [PR 388](https://github.com/link-foundation/links-notation/pull/388).
The issue and all three PR comment/review endpoints were read on 2026-11-06;
there are no comments or required sub-issues. Upstream manager issues 83–85
and gh-manager 33 are related tool reports, not required sub-issues.

| Requirement | Implementation / verification |
| --- | --- |
| Actual ten-provider delivery | Recheck exact public 0.31.0 packages and releases; PHP registration, credentials, Composer consumer and release remain to verify. Never infer publication from skipped jobs. |
| NuGet trusted-first, controlled supplied-token fallback | Reproduce login/push authentication failures offline; retry only credentials with the same packed artifact. Fail other errors without retry. |
| PyPI trusted-first, controlled supplied-token fallback | Replace the empty-string expression; exercise OIDC rejection, upload rejection, missing credentials and ambiguous failures offline. |
| Correct NuGet identity | Use `publish-csharp.yml` in workflow, docs and audit; keep npm/PyPI caller identities. |
| Exact Maven artifacts, no directory-listing gate | Reproduce exact POM 200 / parent 404; verify coordinates, signatures, strong hashes, complete Kotlin variants, bounded propagation and public consumers. |
| Accurate partial-release audit | Distinguish validation-skipped, partial, cancelled and unknown outcomes; identify each missing destination without claiming nothing shipped. |
| Immutable release preparation | Prepare 0.31.1 consistently in ten bindings and references; keep macro 0.1.2 and existing tags unchanged; regenerate benchmarks. |
| Effective main protection | Added Cpp, Swift and Kotlin to ruleset 24860631 and read back all ten checks; retained every other live rule parameter, main-only scope and bypass actors. |
| Latest-SHA CI investigation | List timestamps/SHAs, preserve and read every failed run log, collect the whole failure set before a push, and wait for active branch runs. |
| PR completion | Merge current main into this branch if necessary, inspect full PR diff, keep atomic history, update title/body and positive closing reference, verify clean tree and all latest checks, mark ready when implementation is reviewable. |
| External cleanup | Inspect temporary namespace-proof repository; delete only if account access permits. |

Local resource policy: JS and offline publishing tests first; no native library
semantics change. Leave full native suites to same-commit CI. Rust benchmark
regeneration uses one shared target directory, no incremental/debug output,
one compiler job, and budget checks before and after.

Historical source: published 0.31.0 was gated at
`f7392958aff149e18525947d305594dde31ad145` (push run 42104467330,
attempt 6). Main at intake is `2f1475efa78ff7cf543784285ced18885d2bf5e0`.
Neither historical run establishes delivery for a new code SHA. Registry
configuration and a future main push are external acceptance criteria, not
work that passing PR CI can prove.

## Evidence collected on 2026-11-06

- The public 0.31.0 audit freshly verified nine exact package/release pairs;
  `link-foundation/links-notation` is absent from Packagist. The historical PHP
  publication log (job 127628652907, lines 257–258) reports the unregistered
  package; the aggregate audit (job 127629110434, lines 177–187) incorrectly
  diagnosed the partial release. Both logs are preserved under `ci-logs/`.
- The exact public Java 0.31.0 artifacts passed four signatures and three JAR
  checks; Kotlin passed eight coordinates, 19 referenced files and 35 signatures.
  Public Java and root-coordinate Kotlin/JVM parser/formatter consumers passed;
  Kotlin used a fresh Gradle distribution and dependency cache. This is not an
  Android or iOS execution claim.
- JS format, lint, parser regeneration, all 368 library tests, the JS gate,
  ten-language source/fixture parity and PHP descriptor consistency passed.
  The tagged temporary monorepo installed through Composer with PHP 8.5 and
  passed its installed-parser consumer. This is local distribution evidence;
  the public Packagist consumer remains blocked until registration/delivery.
  Offline tests reproduce directory-listing false negatives, partial-release
  misdiagnosis, wrong Composer provenance, OIDC/push rejection and unchanged
  artifact retries. A signed immutable 0.31.0 POM fixture verifies the pinned
  public key and rejects modified bytes.
- Actionlint 1.7.12 with shellcheck/pyflakes, shellcheck 0.11.0, the registry
  probe and zizmor 1.31.1 passed. Benchmark regeneration and its 73-file check
  passed with one Rust compiler job; the target used 125332 KiB of its
  2097152 KiB budget. Macro version 0.1.2 and existing release tags are unchanged.
- Live ruleset 24860631 was repaired and the effective main branch rules were
  read back with all ten strict checks, preserving the other live settings.
- Packagist setup remains blocked on account access: the browser has no signed-in
  session, and the repository secret-name listing contains neither
  `PACKAGIST_USERNAME` nor `PACKAGIST_TOKEN`. No credential values were printed.
  Once configured, retry only PHP in push run 42104467330 and its final audit;
  verify 0.31.0's original SHA, public Composer consumer and `php_0.31.0` release.
- Deleting the empty namespace-proof repository `link-foundation/ykwmkw8bq5`
  returned HTTP 403: this credential lacks `delete_repo` scope. No scope change
  or deletion succeeded.
- The prepared 0.31.1 repair still requires an approved merge and new main push,
  followed by exact ten-provider delivery and release evidence for that SHA.
  PR checks deliberately do not publish. Keep the PR unmerged while recording
  these unmet acceptance criteria; do not describe issue 192 as completed.
