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
| Python   | PyPI trusted publisher for `js.yml`                             | OIDC is attempted by default; fallback `PYPI_TOKEN`; `PYPI_TRUSTED_PUBLISHING=false` disables OIDC    |
| Java     | Central Portal, verified `io.github.link-foundation` namespace  | `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY`, `GPG_PASSPHRASE`                             |
| Go       | Git tag in the module's subdirectory                            | Workflow `GITHUB_TOKEN`; `go/vVERSION` tag at the gated SHA                                          |
| C#       | NuGet.org trusted publishing policy for `publish-csharp.yml`, or an API key | Set `NUGET_USER` to the policy creator; fallback `NUGET_API_KEY` (expires; renew it) or `NUGET_TOKEN` |
| PHP      | Packagist package submission and update API                     | Submit package once, then `PACKAGIST_USERNAME`, `PACKAGIST_TOKEN`                                    |
| C++      | GitHub release `cpp_VERSION` with the CMake source archive      | Workflow `GITHUB_TOKEN`; no registry account                                                         |
| Swift    | Bare `VERSION` tag that SwiftPM resolves, `[Swift] VERSION`     | Workflow `GITHUB_TOKEN`; no registry account                                                         |
| Kotlin   | Central Portal, verified `io.github.link-foundation` namespace  | The same four secrets as Java                                                                        |

<!-- markdownlint-enable MD013 -->

Register npm and PyPI provider identities against the **caller** `js.yml`.
NuGet evaluates the reusable **`publish-csharp.yml`** workflow instead; this
was verified by the actual 0.31.0 OIDC exchange. Local reusable calls preserve
the commit. Secrets are passed explicitly to their own callee.

NuGet and PyPI use `scripts/ci/publish-package.mjs` to isolate authentication
from packaging. NuGet attempts OIDC when `NUGET_USER` is configured; PyPI
attempts it by default (`PYPI_TRUSTED_PUBLISHING=false` explicitly disables it).
A supplied token is tried only after a definite authentication rejection.
NuGet tries `NUGET_API_KEY`, then the historical `NUGET_TOKEN`; PyPI uses
`PYPI_TOKEN`. No metadata, build, conflict, service or ambiguous transport
failure changes credentials. Every retry uses the original artifact hashes;
packing/building and PyPI metadata checks happen once. OIDC PyPI uploads retain
Sigstore attestations. A failed attestation is a failure, not a token retry.
Logs identify credential sources and redact values. Missing credentials fail
the job and prevent a release. Existing exact versions are verified again.

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
ownership. After deploy, `scripts/ci/maven-central.mjs` verifies the exact
POM coordinates, JAR, sources, Javadoc, SHA-256 checksums and their four detached
signatures before `[Java] VERSION` is created. The publisher then compiles and
runs the [public Java consumer](../examples/maven). Public check:

```sh
PACKAGE_ARTIFACT=links-notation PACKAGE_VERSION=0.31.0 node scripts/ci/maven-central.mjs
AUDIT_EXPECT_PUBLISHED=true node scripts/release-audit.mjs
```

Kotlin publishes `io.github.link-foundation:links-notation-kotlin` to the same
Central namespace with the same four secrets. Kotlin/Native builds iOS klibs
only on macOS, so `publish-kotlin.yml` runs the whole multiplatform publication
(JVM, Android, iOS, JS and Wasm: one artifact per target behind the root
Gradle module) on `macos-26` with the vanniktech `maven-publish` plugin and
`automaticRelease`. `scripts/ci/require-java-credentials.sh` fails the job
before Gradle runs when a credential is missing, naming it without printing
any value. The same verifier checks all eight coordinates (root, JVM, Android,
iOS Arm64, iOS simulator Arm64, iOS x64, JS and Wasm-JS), exact POMs and Gradle
module metadata, required variants, every referenced file's size and strong
hashes, and detached signatures. `available-at.module` is a string, not an
object. The root POM alone cannot establish multiplatform delivery. The
publisher then resolves the root coordinate in a fresh Gradle JVM consumer
before `[Kotlin] VERSION` (tag `kotlin_VERSION`) is created:

```sh
PACKAGE_ARTIFACT=links-notation-kotlin PACKAGE_VERSION=0.31.0 node scripts/ci/maven-central.mjs
```

Both publishers and the final audit use the same verifier. They never request
a parent directory listing: exact artifacts can be public while that listing
is still 404, and listings cannot prove account ownership. Only definite 404
propagation is polled (30 attempts with 30-second pauses); transport, service,
authentication and content/signature failures stay failures. Never re-upload
an immutable version to repair a listing or verifier defect.

The pinned public signing key is `scripts/ci/maven-signing-key.asc`, fingerprint
`75CE1DB5A7CB47FFCF2D39581FA0DD27D01D0D2C` (expires 2027-11-05). Key rotation
requires reviewing the public key/fingerprint and updating the verifier with
the publishing key; private keys remain encrypted repository secrets.

The live main ruleset 24860631 was repaired on 2026-11-06 to require all ten
checks, adding Cpp, Swift and Kotlin while preserving every existing parameter,
PR requirement, main-only scope and bypass restriction. The workflow token
cannot edit repository rules; future changes need administrator read-back.

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
version tag. Both new and reused versions must report the canonical GitHub
source repository and gated SHA; the final audit checks the source against
the immutable bare version tag. Composer-minified metadata is expanded before
checking it. The publisher installs the exact stable version in a fresh
Composer home/cache and runs `examples/php/public_consumer.php` before release.
See
[Packagist's requirements](https://packagist.org/about) and
[Composer version tags](https://getcomposer.org/doc/articles/versions.md).

After provider setup, rerun the main CI run. Existing versions
are verified and reused, failed providers retry, and missing GitHub releases are
backfilled. The final audit checks exact npm/PyPI/crates metadata, NuGet package
content availability, Go module info, the complete signed Java/Kotlin artifacts,
Packagist version metadata, and the Swift tag's `Package.swift`. Any mismatch or
missing release is an error. Preserve the `registry-audit-RUN` artifact when
investigating partial delivery.

When validation or the event gate skips the release job, the audit names that
gate. A failed or cancelled aggregate release can have delivered nine packages:
the audit names each missing destination, preserves successful package/release
pairs, and never claims nothing shipped from an aggregate failure. Fix the
actual failed provider, then retry its publisher and the dependent audit.
A job that no hosted runner
picked up ("The job was not acquired by Runner of type hosted", seen on
`macos-26` during capacity shortages) is re-run automatically by
`rerun-unacquired.yml`, up to the third attempt; after that, run
`gh run rerun RUN_ID --failed` once runners are available (issue #377).

GitHub release tags must explicitly target `github.sha`; never let
`gh release create` select a later main head. The Swift release, whose tag is
created first, uses `--verify-tag` instead. Benchmark regeneration uses a pull
request, so it remains compatible with main's required checks.
