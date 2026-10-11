# Release setup and recovery

The CI entry is `js.yml`, and every called workflow uses the caller's commit.
The main-only `release.yml` call waits for all seven native language stages.
It then calls the seven `publish-*.yml` workflows. A final audit waits
for all providers, including failures, then checks exact versions and GitHub
releases. Pull requests expect their new version to be absent and never publish.
HTTP/authentication/transport errors still fail PR audits. A successful release
requires all seven registries; green tests alone do not prove delivery.

<!-- markdownlint-disable MD013 -->

| Language | Provider / identity                                            | Repository configuration                                                            |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| JS       | npm trusted publisher for `js.yml`                             | Configure this repository/caller on npm; optional `NPM_TOKEN` fallback              |
| Rust     | crates.io trusted publisher for `js.yml`                       | Set `CRATES_IO_TRUSTED_PUBLISHING=true` after registration; otherwise `CARGO_TOKEN` |
| Python   | PyPI trusted publisher for `js.yml`                            | Set `PYPI_TRUSTED_PUBLISHING=true` after registration; otherwise `PYPI_TOKEN`       |
| Java     | Central Portal, verified `io.github.link-foundation` namespace | `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY`, `GPG_PASSPHRASE`            |
| Go       | Git tag in the module's subdirectory                           | Workflow `GITHUB_TOKEN`; `go/vVERSION` tag at the gated SHA                         |
| C#       | NuGet package API key                                          | `NUGET_API_KEY` or existing `NUGET_TOKEN`                                           |
| PHP      | Packagist package submission and update API                    | Submit package once, then `PACKAGIST_USERNAME`, `PACKAGIST_TOKEN`                   |

<!-- markdownlint-enable MD013 -->

Register provider identities against the **caller** `js.yml`. Local reusable
calls preserve the commit, but npm and PyPI publisher configuration must still
match the calling workflow. Secrets are passed explicitly to their own callee.

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

The issue-339 investigation found Java and PHP 0.25.1 absent, and no Central or
Packagist secrets configured. The implementation makes these failures visible;
the case study records provider setup as an unresolved delivery requirement. Do
not invent a token, create an unverified release, or substitute a GitHub asset
for Maven Central/Packagist publication.

After provider setup, rerun the main CI run. Existing exact versions are
verified and reused, failed providers retry, and missing GitHub releases are
backfilled. The final audit checks exact npm/PyPI/crates metadata, NuGet package
content availability, Go module info, the Java POM/namespace, and Packagist
version metadata. Any mismatch or missing release is an error. Preserve the
`registry-audit-RUN` artifact when investigating partial delivery.

GitHub release tags must explicitly target `github.sha`; never let
`gh release create` select a later main head. Benchmark regeneration uses a pull
request, so it remains compatible with main's required checks.
