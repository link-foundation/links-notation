# Release setup and recovery

The CI entry is `js.yml`, and every called workflow uses the caller's commit.
The main-only `release.yml` call waits for all ten native language stages.
It then calls the ten `publish-*.yml` workflows. A final audit waits
for all providers, including failures, then checks exact versions and GitHub
releases. Pull requests expect their new version to be absent and never publish.
HTTP/authentication/transport errors still fail PR audits. A successful release
requires all ten registries; green tests alone do not prove delivery.

<!-- markdownlint-disable MD013 -->

| Language | Provider / identity                                             | Repository configuration                                                                             |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| JS       | npm trusted publisher for `js.yml`                              | Configure this repository/caller on npm; optional `NPM_TOKEN` fallback                               |
| Rust     | crates.io trusted publisher for `js.yml`                        | Set `CRATES_IO_TRUSTED_PUBLISHING=true` after registration; otherwise `CARGO_TOKEN`                  |
| Python   | PyPI trusted publisher for `js.yml`                             | Set `PYPI_TRUSTED_PUBLISHING=true` after registration; otherwise `PYPI_TOKEN`                        |
| Java     | Central Portal, verified `io.github.link-foundation` namespace  | `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY`, `GPG_PASSPHRASE`                             |
| Go       | Git tag in the module's subdirectory                            | Workflow `GITHUB_TOKEN`; `go/vVERSION` tag at the gated SHA                                          |
| C#       | NuGet.org trusted publishing policy for `js.yml`, or an API key | Set `NUGET_USER` to the policy owner; otherwise `NUGET_API_KEY` (expires; renew it) or `NUGET_TOKEN` |
| PHP      | Packagist package submission and update API                     | Submit package once, then `PACKAGIST_USERNAME`, `PACKAGIST_TOKEN`                                    |
| C++      | GitHub release `cpp_VERSION` with the CMake source archive      | Workflow `GITHUB_TOKEN`; no registry account                                                         |
| Swift    | Bare `VERSION` tag that SwiftPM resolves, `[Swift] VERSION`     | Workflow `GITHUB_TOKEN`; no registry account                                                         |
| Kotlin   | Central Portal, verified `io.github.link-foundation` namespace  | The same four secrets as Java                                                                        |

<!-- markdownlint-enable MD013 -->

Register provider identities against the **caller** `js.yml`. Local reusable
calls preserve the commit, but npm and PyPI publisher configuration must still
match the calling workflow. Secrets are passed explicitly to their own callee.

C++ has no central package registry. `publish-cpp.yml` archives `cpp/` with
`git archive` at the gated SHA, attaches `links-notation-cpp-VERSION.tar.gz` and
its SHA-256 file to the `cpp_VERSION` GitHub release, then downloads the archive
again, checks the hash, and builds and tests `cpp/tests/consumer` against it. The
final audit treats that asset as the C++ registry entry; consumers fetch it with
CMake's `FetchContent`.

Swift has no central package registry either: SwiftPM resolves the root
`Package.swift` at a bare semantic-version tag, and ignores `cpp_VERSION` and
`go/vVERSION`. `publish-swift.yml` creates the bare `VERSION` tag at the gated
SHA, or checks that it already points there, and releases it as
`[Swift] VERSION`. It then waits for the tagged `Package.swift`, and builds and
runs `examples/swift` with its path dependency replaced by
`.package(url: ..., exact: "VERSION")`. Composer reads the same tag, so
`publish-php.yml` uses it too; both create it with
`scripts/ci/ensure-php-version-tag.mjs`, so neither moves it. The final audit
checks that the tagged manifest is this package's.

Java uses `central-publishing-maven-plugin` with `autoPublish=true` and
`waitUntil=published`; setup-java imports the signing key and supplies server
`central` credentials through environment variables. A missing credential fails
immediately before deploy. Central must verify the namespace for the maintainer
account; GitHub admin access cannot create a Central account/token or prove its
ownership. After deploy, both the namespace URL and the exact artifact POM must
return 200 before `[Java] VERSION` is created. Public check:

```sh
curl -f https://repo1.maven.org/maven2/io/github/link-foundation/
curl -f https://repo1.maven.org/maven2/io/github/link-foundation/links-notation/0.25.2/links-notation-0.25.2.pom
AUDIT_EXPECT_PUBLISHED=true node scripts/release-audit.mjs
```

Kotlin publishes `io.github.link-foundation:links-notation-kotlin` to the same
Central namespace with the same four secrets. Kotlin/Native builds iOS klibs
only on macOS, so `publish-kotlin.yml` runs the whole multiplatform publication
(JVM, Android, iOS, JS and Wasm: one artifact per target behind the root
Gradle module) on `macos-26` with the vanniktech `maven-publish` plugin and
`automaticRelease`. `scripts/ci/require-java-credentials.sh` fails the job
before Gradle runs when a credential is missing, naming it without printing
any value. The namespace URL and the exact `links-notation-kotlin` POM must
return 200 before `[Kotlin] VERSION` (tag `kotlin_VERSION`) is created:

```sh
curl -f https://repo1.maven.org/maven2/io/github/link-foundation/links-notation-kotlin/0.30.0/links-notation-kotlin-0.30.0.pom
```

The required `Kotlin` check is in `.github/main-ruleset.json`; an
administrator applies that file to the live main ruleset, since the workflow
token cannot edit repository rules.

The issue-339 investigation found Java and PHP 0.25.1 absent, and no Central or
Packagist secrets configured. The implementation makes these failures visible;
the case study records provider setup as an unresolved delivery requirement. Do
not invent a token, create an unverified release, or substitute a GitHub asset
for Maven Central/Packagist publication.

PHP's root `composer.json` is the distribution descriptor: its autoload paths
point to `php/src/`, and Composer infers versions from tags. Development metadata
stays in `php/composer.json`. The JS gate checks that runtime metadata matches;
refresh it with `node scripts/ci/php-distribution.mjs --write`. Native PHP CI
installs a tagged temporary monorepo without external registries and exercises
the installed parser through Composer's autoloader.

After the root descriptor is on main, submit this repository once to Packagist
and configure its two credentials. A dev-only registration is sufficient. The
publisher creates a bare `VERSION` tag at the gated SHA before the update call,
then verifies the stable version and creates the existing `php_VERSION` GitHub
release. An existing Composer tag at another commit fails; bump the version
instead of changing an immutable tag. `php_VERSION` alone is not a Composer
version tag. See
[Packagist's requirements](https://packagist.org/about) and
[Composer version tags](https://getcomposer.org/doc/articles/versions.md).

After provider setup, rerun the main CI run. Existing versions
are verified and reused, failed providers retry, and missing GitHub releases are
backfilled. The final audit checks exact npm/PyPI/crates metadata, NuGet package
content availability, Go module info, the Java and Kotlin POMs/namespace,
Packagist version metadata, and the Swift tag's `Package.swift`. Any mismatch or
missing release is an error. Preserve the `registry-audit-RUN` artifact when
investigating partial delivery.

When a language stage fails or is cancelled the release job is skipped, and the
audit then says that the release did not run to completion instead of naming a
credential: fix or re-run the failed stage first. A job that no hosted runner
picked up ("The job was not acquired by Runner of type hosted", seen on
`macos-26` during capacity shortages) is re-run automatically by
`rerun-unacquired.yml`, up to the third attempt; after that, run
`gh run rerun RUN_ID --failed` once runners are available (issue #377).

GitHub release tags must explicitly target `github.sha`; never let
`gh release create` select a later main head. The Swift release, whose tag is
created first, uses `--verify-tag` instead. Benchmark regeneration uses a pull
request, so it remains compatible with main's required checks.
