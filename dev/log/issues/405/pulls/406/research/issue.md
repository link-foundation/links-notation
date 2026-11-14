### Dependabot pull requests merged before this issue was created

These Dependabot pull requests could not be merged automatically and are still open:

- [#361](https://github.com/link-foundation/links-notation/pull/361) chore(deps): Bump dotnet-sdk from 10.0.402 to 10.0.403 in /csharp → `main` — not passing: [auto-merge / auto-merge](https://github.com/link-foundation/links-notation/actions/runs/40782303846/job/123146763273) (failure), [dependency freshness / latest-stable](https://github.com/link-foundation/links-notation/actions/runs/40782303789/job/123146763090) (failure) — merge failed: GraphQL: Repository rule violations found
- [#395](https://github.com/link-foundation/links-notation/pull/395) chore(deps): Bump gradle-wrapper from 9.8.2 to 9.9.0 in /kotlin in the gradle-minor-and-patch group across 1 directory → `main` — not passing: [dependency freshness / latest-stable](https://github.com/link-foundation/links-notation/actions/runs/43323120607/job/131548639252) (failure) — merge failed: GraphQL: Repository rule violations found
- [#396](https://github.com/link-foundation/links-notation/pull/396) chore(deps): Bump the actions-minor-and-patch group across 1 directory with 4 updates → `main` — not passing: [dependency freshness / latest-stable](https://github.com/link-foundation/links-notation/actions/runs/43323243785/job/131549073879) (failure) — merge failed: GraphQL: Repository rule violations found
- [#400](https://github.com/link-foundation/links-notation/pull/400) chore(deps): Bump Microsoft.ML.Tokenizers and Microsoft.ML.Tokenizers.Data.Cl100kBase → `main` — all 89 check(s) passing — merge failed: GraphQL: Repository rule violations found
- [#401](https://github.com/link-foundation/links-notation/pull/401) chore(deps): Bump Microsoft.ML.Tokenizers and Microsoft.ML.Tokenizers.Data.O200kBase → `main` — all 89 check(s) passing — merge failed: GraphQL: Repository rule violations found
- [#403](https://github.com/link-foundation/links-notation/pull/403) chore(deps): Bump org.codehaus.mojo:exec-maven-plugin from 3.6.4 to 3.7.0 in /benchmarks/java in the maven-minor-and-patch group across 1 directory → `main` — all 89 check(s) passing — merge failed: GraphQL: Repository rule violations found
- [#404](https://github.com/link-foundation/links-notation/pull/404) chore(deps): Bump the npm-minor-and-patch group across 1 directory with 2 updates → `main` — not passing: [dependency freshness / latest-stable](https://github.com/link-foundation/links-notation/actions/runs/43322946974/job/131548040084) (failure) — merge failed: GraphQL: Repository rule violations found

Apply each of these updates in this issue’s pull request (Dependabot closes a pull request by itself once its update has landed), and fix the errors that made it unmergeable — a failing check, a conflict, or a repository setting such as a disabled auto-merge.

### Dependency ecosystems detected in this repository

Update **every** ecosystem below, in this order (most of the repository first). One pull request may cover them all, but each ecosystem must end up fully current — not partially.

1. **JavaScript / TypeScript**
   - Detected languages: JavaScript, TypeScript
   - Manifests: `benchmarks/js/package.json`, `benchmarks/tools/package.json`, `dev/log/issues/330/pulls/331/templates/js/package.json`, `dev/log/issues/377/pulls/378/templates/csharp/package.json`, `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json`, `dev/log/issues/377/pulls/378/templates/js/package.json`, `dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/package.json`, `docs/comparison/package.json`, `docs/website/package.json`, `js/package.json`
   - Lockfiles to regenerate and commit: `benchmarks/js/package-lock.json`, `benchmarks/tools/package-lock.json`, `docs/comparison/package-lock.json`, `docs/website/package-lock.json`, `js/bun.lock`, `js/package-lock.json`, `kotlin/kotlin-js-store/yarn.lock`
   - Update everything: `npx npm-check-updates -u && npm install`
   - `npm update` stays inside the existing semver ranges and never crosses a major; `npm-check-updates -u` rewrites package.json to the `latest` dist-tag.

2. **Rust**
   - Detected languages: Rust
   - Manifests: `dev/log/issues/330/pulls/331/templates/rust/Cargo.toml`, `dev/log/issues/377/pulls/378/templates/rust/Cargo.toml`, `experiments/Cargo.toml`, `experiments/issue-209/lino-shapes/Cargo.toml`, `experiments/issue-282/parity/rust/Cargo.toml`, `experiments/issue-301/rust-probe/Cargo.toml`, `experiments/issue-314/rust-differential/Cargo.toml`, `experiments/issue-314/rust-probe/Cargo.toml`, `experiments/issue-315/rust-probe/Cargo.toml`, `experiments/issue-316/rust-timing/Cargo.toml`, `rust/Cargo.toml`, `rust/links-notation-benchmark/Cargo.toml`, `rust/links-notation-macro/Cargo.toml`, `rust/links-notation/Cargo.toml`
   - Lockfiles to regenerate and commit: `experiments/Cargo.lock`, `experiments/issue-209/lino-shapes/Cargo.lock`, `experiments/issue-282/parity/rust/Cargo.lock`, `experiments/issue-315/rust-probe/Cargo.lock`, `experiments/issue-316/rust-timing/Cargo.lock`
   - Update everything: `cargo upgrade --incompatible && cargo update  (cargo-edit)`
   - Plain `cargo update` only moves Cargo.lock inside the requirements already in Cargo.toml. `cargo update --breaking` rewrites them but is nightly-only (`-Z unstable-options`), so `cargo upgrade --incompatible` from cargo-edit is the stable route. Revisit `edition` and `rust-version` too.

3. **Python**
   - Detected languages: Python
   - Manifests: `benchmarks/python/requirements.txt`, `cpp/tools/requirements.txt`, `dev/log/issues/330/pulls/331/templates/python/pyproject.toml`, `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-ci.txt`, `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-security.txt`, `dev/log/issues/377/pulls/378/templates/python/pyproject.toml`, `python/pyproject.toml`, `python/setup.cfg`, `scripts/ci/requirements.txt`
   - Update everything: `uv lock --upgrade  •  pip-compile --upgrade  •  poetry update`
   - Raise the floors in pyproject.toml as well: a `>=` floor years below the resolved version means CI and a fresh install are not testing the same tree. Drop upper bounds that exclude the current release.

4. **Java / Kotlin / Scala**
   - Detected languages: Java, Kotlin
   - Manifests: `benchmarks/java/pom.xml`, `dev/log/issues/330/pulls/331/templates/java/pom.xml`, `dev/log/issues/377/pulls/378/templates/java/pom.xml`, `examples/maven/kotlin/build.gradle.kts`, `examples/maven/kotlin/settings.gradle.kts`, `experiments/issue-377/kgp-named-enum/build.gradle.kts`, `experiments/issue-377/kgp-named-enum/settings.gradle.kts`, `java/pom.xml`, `kotlin/build.gradle.kts`, `kotlin/gradle/wrapper/gradle-wrapper.properties`, `kotlin/settings.gradle.kts`
   - Update everything: `mvn versions:use-latest-releases versions:update-properties  •  ./gradlew dependencyUpdates`
   - Maven pins most versions in `<properties>`, so `versions:use-latest-releases` alone leaves them behind — run `versions:update-properties` too. Review `maven.compiler.source/target` and the Gradle wrapper version.

5. **PHP**
   - Detected languages: PHP
   - Manifests: `benchmarks/php/composer.json`, `composer.json`, `dev/log/issues/330/pulls/331/templates/php/composer.json`, `dev/log/issues/377/pulls/378/templates/php/composer.json`, `php/composer.json`
   - Update everything: `composer update --with-all-dependencies`
   - Crossing a major needs the constraint rewritten first (`composer require vendor/pkg:^X`); `composer update` alone resolves inside composer.json.

6. **C# / .NET**
   - Detected languages: C#
   - Manifests: `benchmarks/csharp/Benchmark.csproj`, `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj`, `csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj`, `csharp/global.json`, `dev/log/issues/330/pulls/331/templates/csharp/Directory.Build.props`, `dev/log/issues/377/pulls/378/templates/csharp/Directory.Build.props`, `dev/log/issues/377/pulls/378/templates/csharp/global.json`, `dev/log/issues/377/pulls/378/templates/csharp/src/MyPackage/MyPackage.csproj`, `dev/log/issues/377/pulls/378/templates/csharp/tests/MyPackage.Tests/MyPackage.Tests.csproj`, `docs/case-studies/csharp-peg-simplification/solutions/01-parse-expression/project/TestParseExpression.csproj`, `docs/case-studies/csharp-peg-simplification/solutions/02-capture-validate/project/TestCaptureValidate.csproj`, `docs/case-studies/csharp-peg-simplification/solutions/03-semantic-predicates/project/TestSemanticPredicates.csproj`, `docs/case-studies/csharp-peg-simplification/solutions/04-hybrid-approach/project/TestHybrid.csproj`, `docs/case-studies/csharp-peg-simplification/solutions/05-minimized-hybrid/project/TestMinimizedHybrid.csproj`, `examples/binary/csharp/BinaryExample.csproj`, `experiments/DebugParser/DebugParser.csproj`, `experiments/cref-repro/p.csproj`, `experiments/debug_test.csproj`, `experiments/issue-282/parity/csharp/parity.csproj`, `experiments/issue-288/csharp/GroundTruth.csproj`, `experiments/issue-301/csharp-probe/Probe.csproj`, `experiments/issue-302/csharp-probe/Probe.csproj`, `experiments/issue-314/ports/csharp-differential/csharp-differential.csproj`, `experiments/issue-314/ports/csharp-probe/csharp-probe.csproj`, `experiments/issue-315/csharp-probe/Probe.csproj`, `experiments/minimal-peg-rules/TestMinimalRules.csproj`
   - Update everything: `dotnet outdated -u  (dotnet-outdated)  •  dotnet list package --outdated`
   - Check `TargetFramework` at the same time; a test SDK or xunit major usually moves with it.

7. **Swift**
   - Detected languages: Swift
   - Manifests: `Package.swift`, `examples/swift/Package.swift`
   - Update everything: `swift package update  •  pod update`

8. **Go**
   - Detected languages: Go
   - Manifests: `benchmarks/go/go.mod`, `dev/log/issues/330/pulls/331/templates/go/go.mod`, `dev/log/issues/377/pulls/378/templates/go/go.mod`, `experiments/issue-282/parity/go/go.mod`, `experiments/issue-288/go/go.mod`, `experiments/issue-301/go-probe/go.mod`, `experiments/issue-302/go-probe/go.mod`, `experiments/issue-314/ports/go-probe/go.mod`, `experiments/issue-315/go-probe/go.mod`, `go/go.mod`
   - Lockfiles to regenerate and commit: `benchmarks/go/go.sum`
   - Update everything: `go get -u ./... && go mod tidy`
   - Also review the `go` directive itself — it pins the language version, not just the dependencies.

9. **Docker**
   - Detected languages: Dockerfile
   - Manifests: _none found — check whether one is missing_
   - Update everything: bump each `FROM` base-image tag (and re-pin the digest, if digests are used)
   - A base image is a dependency: an old `FROM` ships the distribution’s unpatched libraries no matter how current the language packages are.

10. **GitHub Actions**
   - Manifests: `.github/workflows/AutoMerge.yml`, `.github/workflows/benchmarks.yml`, `.github/workflows/binary-interop.yml`, `.github/workflows/bom-check.yml`, `.github/workflows/cpp.yml`, `.github/workflows/csharp.yml`, `.github/workflows/dependencies.yml`, `.github/workflows/docs.yml`, `.github/workflows/go.yml`, `.github/workflows/java.yml`, `.github/workflows/javascript.yml`, `.github/workflows/js.yml`, `.github/workflows/kotlin.yml`, `.github/workflows/links.yml`, `.github/workflows/pages.yml`, `.github/workflows/php.yml`, `.github/workflows/publish-cpp.yml`, `.github/workflows/publish-csharp.yml`, `.github/workflows/publish-go.yml`, `.github/workflows/publish-java.yml`, `.github/workflows/publish-js.yml`, `.github/workflows/publish-kotlin.yml`, `.github/workflows/publish-php.yml`, `.github/workflows/publish-rust.yml`, `.github/workflows/publish-swift.yml`, `.github/workflows/python.yml`, `.github/workflows/release-audit.yml`, `.github/workflows/release.yml`, `.github/workflows/rerun-unacquired.yml`, `.github/workflows/rust.yml`, `.github/workflows/security.yml`, `.github/workflows/swift.yml`, `.github/workflows/workflows.yml`, `dev/log/issues/290/pulls/291/templates/js/.github/actions/publish-dockerhub/action.yml`, `dev/log/issues/290/pulls/291/templates/js/.github/actions/setup-buildx-resilient/action.yml`, `dev/log/issues/290/pulls/291/templates/rust/.github/actions/setup-buildx-resilient/action.yml`, `dev/log/issues/330/pulls/331/templates/js/.github/actions/publish-dockerhub/action.yml`, `dev/log/issues/330/pulls/331/templates/js/.github/actions/setup-buildx-resilient/action.yml`, `dev/log/issues/330/pulls/331/templates/rust/.github/actions/setup-buildx-resilient/action.yml`, `dev/log/issues/377/pulls/378/templates/csharp/.github/actions/csharp-layout/action.yml`, `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/action.yml`, `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/run/action.yml`, `dev/log/issues/377/pulls/378/templates/js/.github/actions/publish-dockerhub/action.yml`, `dev/log/issues/377/pulls/378/templates/js/.github/actions/setup-buildx-resilient/action.yml`, `dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/action.yml`, `dev/log/issues/377/pulls/378/templates/rust/.github/actions/download-artifact/action.yml`, `dev/log/issues/377/pulls/378/templates/rust/.github/actions/setup-buildx-resilient/action.yml`
   - Update everything: bump every `uses:` reference to the newest release (tag or pinned digest)
   - Actions pinned to a stale major (`actions/checkout@v3`) are the most common source of deprecation warnings in an otherwise green pipeline. Update reusable workflows and composite `action.yml` files too.

11. **Infrastructure as code**
   - Manifests: `.pre-commit-config.yaml`, `dev/log/issues/330/pulls/331/templates/csharp/.pre-commit-config.yaml`, `dev/log/issues/330/pulls/331/templates/go/.pre-commit-config.yaml`, `dev/log/issues/330/pulls/331/templates/java/.pre-commit-config.yaml`, `dev/log/issues/330/pulls/331/templates/python/.pre-commit-config.yaml`, `dev/log/issues/330/pulls/331/templates/rust/.pre-commit-config.yaml`, `dev/log/issues/377/pulls/378/templates/cpp/.pre-commit-config.yaml`, `dev/log/issues/377/pulls/378/templates/csharp/.pre-commit-config.yaml`, `dev/log/issues/377/pulls/378/templates/go/.pre-commit-config.yaml`, `dev/log/issues/377/pulls/378/templates/java/.pre-commit-config.yaml`, `dev/log/issues/377/pulls/378/templates/python/.pre-commit-config.yaml`, `dev/log/issues/377/pulls/378/templates/rust/.pre-commit-config.yaml`
   - Update everything: `terraform init -upgrade  •  helm dependency update  •  pre-commit autoupdate  •  git submodule update --remote`

Detected languages with no dependency manifest of their own: Shell, C++, PEG.js, CMake. Check whether they pull dependencies through one of the ecosystems above.

### Keeping them current

`.github/dependabot.yml` already exists — verify it covers every ecosystem and directory listed above, then keep it in sync with any manifest this work adds or moves.

The ecosystems found in this repository correspond to these entries:

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directories:
      - '/benchmarks/js'
      - '/benchmarks/tools'
      - '/docs/comparison'
      - '/docs/website'
      - '/js'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'yarn'
    directory: '/kotlin/kotlin-js-store'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'bun'
    directory: '/js'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'cargo'
    directories:
      - '/dev/log/issues/330/pulls/331/templates/rust'
      - '/dev/log/issues/377/pulls/378/templates/rust'
      - '/experiments'
      - '/experiments/issue-209/lino-shapes'
      - '/experiments/issue-282/parity/rust'
      - '/experiments/issue-301/rust-probe'
      - '/experiments/issue-314/rust-differential'
      - '/experiments/issue-314/rust-probe'
      - '/experiments/issue-315/rust-probe'
      - '/experiments/issue-316/rust-timing'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'pip'
    directories:
      - '/benchmarks/python'
      - '/cpp/tools'
      - '/dev/log/issues/330/pulls/331/templates/python'
      - '/dev/log/issues/377/pulls/378/templates/cpp/scripts'
      - '/dev/log/issues/377/pulls/378/templates/python'
      - '/python'
      - '/scripts/ci'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'maven'
    directories:
      - '/benchmarks/java'
      - '/dev/log/issues/330/pulls/331/templates/java'
      - '/dev/log/issues/377/pulls/378/templates/java'
      - '/java'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'gradle'
    directories:
      - '/examples/maven/kotlin'
      - '/experiments/issue-377/kgp-named-enum'
      - '/kotlin'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'composer'
    directories:
      - '/'
      - '/benchmarks/php'
      - '/dev/log/issues/330/pulls/331/templates/php'
      - '/dev/log/issues/377/pulls/378/templates/php'
      - '/php'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'nuget'
    directories:
      - '/benchmarks/csharp'
      - '/csharp'
      - '/csharp/Link.Foundation.Links.Notation'
      - '/csharp/Link.Foundation.Links.Notation.Tests'
      - '/dev/log/issues/330/pulls/331/templates/csharp'
      - '/dev/log/issues/377/pulls/378/templates/csharp'
      - '/dev/log/issues/377/pulls/378/templates/csharp/src/MyPackage'
      - '/dev/log/issues/377/pulls/378/templates/csharp/tests/MyPackage.Tests'
      - '/docs/case-studies/csharp-peg-simplification/solutions/01-parse-expression/project'
      - '/docs/case-studies/csharp-peg-simplification/solutions/02-capture-validate/project'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'dotnet-sdk'
    directories:
      - '/csharp'
      - '/dev/log/issues/377/pulls/378/templates/csharp'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'swift'
    directories:
      - '/'
      - '/examples/swift'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'gomod'
    directories:
      - '/benchmarks/go'
      - '/dev/log/issues/330/pulls/331/templates/go'
      - '/dev/log/issues/377/pulls/378/templates/go'
      - '/experiments/issue-282/parity/go'
      - '/experiments/issue-288/go'
      - '/experiments/issue-301/go-probe'
      - '/experiments/issue-302/go-probe'
      - '/experiments/issue-314/ports/go-probe'
      - '/experiments/issue-315/go-probe'
      - '/go'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'docker'
    directory: '/'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
  - package-ecosystem: 'pre-commit'
    directories:
      - '/'
      - '/dev/log/issues/330/pulls/331/templates/csharp'
      - '/dev/log/issues/330/pulls/331/templates/go'
      - '/dev/log/issues/330/pulls/331/templates/java'
      - '/dev/log/issues/330/pulls/331/templates/python'
      - '/dev/log/issues/330/pulls/331/templates/rust'
      - '/dev/log/issues/377/pulls/378/templates/cpp'
      - '/dev/log/issues/377/pulls/378/templates/csharp'
      - '/dev/log/issues/377/pulls/378/templates/go'
      - '/dev/log/issues/377/pulls/378/templates/java'
    schedule:
      interval: 'weekly'
```

Only the first 10 directories are listed per ecosystem — add the remaining ones, or replace the list with a glob (`directories` supports `*`; `directory` does not).

[Renovate](https://docs.renovatebot.com/) is the alternative if grouped or automerged updates are wanted instead.

Update all dependencies to their latest versions, in JavaScript / TypeScript, Rust, Python, Java / Kotlin / Scala, PHP, C# / .NET, Swift, Go, Docker, GitHub Actions, Infrastructure as code. "All" is literal: development dependencies, transitive lockfile entries, build plugins, test runners, linters, base images, GitHub Actions, and the language/toolchain versions themselves.

For each ecosystem, produce a table of every dependency with the version pinned today and the version released today, resolved from the registry — not from memory. Anything left behind must have a written reason recorded (an upstream bug, a dropped platform, a paid tier), not silence.

Cross major versions deliberately. Read the changelog and the migration guide for every major bump, adapt the code to the new API, and remove the shims the old version needed. A constraint loosened or a test skipped to make a major "pass" is not an update.

Use the new features. Where a newer version replaces something this repository implements by hand, delete the hand-rolled copy and use the upstream feature, so there is less duplicated code and logic afterwards than before.

Make the constraints honest: raise floors that are years below what is actually installed, drop upper bounds that exclude the current release, and regenerate and commit every lockfile so a fresh install and CI resolve the same tree.

If the same dependency is pinned in more than one place — several language implementations, a Dockerfile, a workflow — bring every pin to the same version. A repository that pins one library at four different versions has four different behaviours.

Run the full build, test and lint suite of every ecosystem after updating, and make CI green. Resolve every new deprecation warning the update introduces rather than leaving it for the next reader.

Check the security advisories for the tree as it stands afterwards (`npm audit`, `cargo audit`, `pip-audit`, `bundle audit`, `dotnet list package --vulnerable`, or the ecosystem equivalent) and make sure the update leaves none unresolved.

Report to each dependency’s upstream all general logic or duplicated code that belongs in that dependency, missing features, and bugs that lead to workarounds in this repository. Search existing upstream issues first, then create or update a report with a minimal reproducible example, affected versions, the local workaround, and a suggested fix in code or feature proposal; link every report from the pull request. Keep necessary workarounds in this repository so upstream fixes do not block the pull request.

Follow the dependency-update practices collected in [https://github.com/link-assistant/hive-mind/blob/main/docs/DEPENDENCY-UPDATE-BEST-PRACTICES.md](https://github.com/link-assistant/hive-mind/blob/main/docs/DEPENDENCY-UPDATE-BEST-PRACTICES.md).

Please plan and execute everything in this single pull request, you have unlimited time and context, as context auto-compacts and you can continue indefinitely, until it is each and every requirement fully addressed, and everything is totally done.

---

<details>
<summary>Context collected by <code>/fix --update-all-dependencies</code></summary>

- **Repository:** [link-foundation/links-notation](https://github.com/link-foundation/links-notation)
- **Default branch:** `main`
- **Latest commit:** `16cd60c` ([commit](https://github.com/link-foundation/links-notation/commit/16cd60c24406dfc60b9ea403987120eac658b9a3)) — Merge pull request #398 from link-foundation/dependabot/pip/cpp/tools/pip-minor-and-patch-eeeb19485d
- **Ecosystems detected:** 11
- **Manifest files found:** 146

**Detected languages**

- **JavaScript** — 30.1%
- **Rust** — 16.8%
- **Python** — 15.1%
- **PHP** — 6.9%
- **C#** — 5.7%
- **Shell** — 5.5%
- **C++** — 5.4%
- **Swift** — 4.3%
- **Kotlin** — 3.8%
- **Java** — 3.2%
- **Go** — 2.8%
- **PEG.js** — 0.2%
- **CMake** — 0.2%
- **TypeScript** — 0.0%
- **Dockerfile** — 0.0%

</details>
