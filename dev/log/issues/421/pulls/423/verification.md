# Verification

## Local native checks

| Scope | Observed result |
| --- | --- |
| JS | Frozen Bun install, scoped suite, format, lint and build passed. The parity checker reports 25 features and 51 shared cases across ten languages with zero violations. |
| npm and Bun | All ten npm audits and the Bun audit found zero vulnerabilities after the scoped override. Both artifact transports resolved minimatch 11.0.9. The Python action bundled successfully and all five cross-template artifact tests passed. |
| Website and benchmark tools | Website lint and production build passed. Comparison artifacts are reproducible and the benchmark generator verified 12 source datasets and 81 readbacks with lino-objects-codec 1.0.0. |
| Rust | Rust 1.100.0 workspace tests, no-default-features, fmt, Clippy and the deterministic check of 73 benchmark outputs passed. Cargo audit 0.23.0 completed for eleven locks. Dedicated target ended at 434292 KiB against a 2097152 KiB budget. |
| Python | Hashed install, package build and twine/distribution checks passed. pytest reported 445 passed and one existing skip. Black, isort, flake8 and mypy passed. Nine hashed requirements audits found zero vulnerabilities. |
| PHP | PHPUnit reported 278 tests and 15,620 assertions. Coding standard passed. The two archived pipeline suites passed 31 and 33 tests. PHPStan passed for the shipped `scripts` and `tests` in both archives, and PHP syntax lint passed for all 42 and 43 tracked PHP files. The archives lack the generated `src` and `tests/Unit` directories required by their full Composer check. Four nonempty Composer locks passed the audit. The platform-only root has an empty graph and reproduces Composer's audit issue. |
| Java | Maven Wrapper selected 3.10.1, and Maven verify passed on the local Temurin 25 runtime. CI covers the repository's newer JDK default and minimum consumer lane. |
| Kotlin | Gradle regenerated the Kotlin/JS Yarn lock. JVM, JS Node and ktlint tasks passed. The Yarn security audit reports no moderate-or-higher advisories in 30 entries. |
| C# | .NET 11.0.100 ran 363 passing tests and the formatter. There were zero reported vulnerabilities in the 22 tracked NuGet projects. The original DocFX project evaluation gave 20 CS0234 errors. The new build generated the public API pages with zero errors and five existing cross-directory link warnings. |
| Go | Current Go 1.27.4 passed race tests, vet, formatting and the library and benchmark vulnerability checks. |
| Swift | The local Swift 6.4.1 toolchain passed SwiftPM tests and built the example. CI selects the current 6.4.2 Linux image and checks Apple and minimum toolchains. |
| C++ | CMake, build and all 383 CTest cases passed. clang-format 23.1.5 passed across tracked sources. |
| Infrastructure | Dependabot coverage, pre-commit configuration, JS-first workflow gate, DocFX contract and Yarn audit contract passed. |

## CI and releases

The issue's original default-branch run and the Dependabot checks failed because
the PHP and Kotlin 0.31.6 artifacts and corresponding GitHub releases arrived
at different times. Go also timed out during the first publish attempt. Its
exact registry and release pair is now present. The Packagist source reference
matches original release SHA `e6df0d710ee6e87fab723a857b9823bf1f5a6d72`, and the
targeted retry restored the [PHP 0.31.6 release](https://github.com/link-foundation/links-notation/releases/tag/php_0.31.6)
at that SHA. Kotlin recovery uses the
[original release run](https://github.com/link-foundation/links-notation/actions/runs/43628697572).
Maven Central verified eight coordinates, 19 files and 35 signatures for
Kotlin 0.31.6. GitHub rejected the individual Kotlin job rerun with HTTP 403
because that job belonged to an earlier attempt. The failed-jobs rerun verified
the signed artifacts and identified a consumer failure. JDK 27 selected Java
target 27, while Kotlin 2.4.21 selected 26. The same failure reproduced locally
on Temurin 27.0.1.1+4 with `bash scripts/ci/maven-consumer.sh kotlin 0.31.6`.
Setting both consumer targets to JVM 11 made the same command pass against the
public artifacts. The current-JDK workflow now runs that check. The missing
[Kotlin 0.31.6 release](https://github.com/link-foundation/links-notation/releases/tag/kotlin_0.31.6)
was restored at the original source SHA after verifying the tag and release
were absent. Maven Central retained the existing signed deployment.
The release audit then verified the exact registry version and matching GitHub
release for all ten languages, with zero delivery failures.
[Kotlin consumer and audit output](research/ci/kotlin-recovery.txt)

The [latest default branch run checked](https://github.com/link-foundation/links-notation/actions/runs/44355881870/attempts/3)
also shows why the full publisher cannot pass at `e01fdfaff7148f72e6a347f92686080de4b7cfc5`.
PHP and Swift refuse to relabel the existing 0.31.6 source as a different commit,
and C# ran DocFX against the test project. The updated manifests and the DocFX
configuration fix are in this PR. [CI excerpts](research/ci/44355881870.txt)

The [first refresh CI run](https://github.com/link-foundation/links-notation/actions/runs/44372476527)
found that both archived npm-selection test fixtures still expected 12.2.2.
After updating the fixtures for 12.2.3, all eight archived npm integration tests
and all five artifact tests passed locally. The failed assertions are in
[the CI excerpt](research/ci/44372476527.txt).
The [link check](https://github.com/link-foundation/links-notation/actions/runs/44372475728)
found that the codec's GitHub release URL returns 404. The research now links
to the exact npm registry record for codec 1.0.0.

The [Java 25 job at 9d798aaa](https://github.com/link-foundation/links-notation/actions/runs/44373808370/job/135047997473)
exhausted Maven's retries for the Surefire 3.6.1 POM with HTTP 429. The public
POM returned HTTP 200 separately, and the Java 21, Java 27 and Maven minimum
jobs passed at that revision. [Job log excerpt](research/ci/44373808370.txt)

The release auditor saw 0.31.7 pending across all ten registries in the initial
PR checkout. [PR #422](https://github.com/link-foundation/links-notation/pull/422)
merged first with that version, so this PR includes its changes and prepares
0.31.8 across all ten languages. Registry delivery and matching release tags
require a successful main release, followed by the exact-version audit.

The [first 0.31.8 PHP run](https://github.com/link-foundation/links-notation/actions/runs/44387636054/job/135096676998)
rejected the Composer lock because its content hash includes the package
version. Composer 2.11.2 regenerated the hash with no dependency changes.
Strict validation, the coding standard and all 278 PHPUnit tests passed.

The [reported link check](https://github.com/link-foundation/links-notation/actions/runs/43903758448)
failed on a 503 from the external Railroad Diagram Generator. The grammar URL
belongs to that upstream service. The captured error is in [research/ci](research/ci/).
