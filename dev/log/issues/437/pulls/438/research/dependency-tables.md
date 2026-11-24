# Direct dependencies: pinned vs. latest registry release

Generated from `scripts/ci/check-dependencies.py` declarations and its registry snapshot.

## cargo

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `rust/links-notation-benchmark/Cargo.toml` | `serde` | 1.0.229 | 1.0.229 |
| `rust/links-notation-benchmark/Cargo.toml` | `serde_json` | 1.0.154 | 1.0.154 |
| `rust/links-notation-benchmark/Cargo.toml` | `tiktoken-rs` | 0.12.1 | 0.12.1 |
| `rust/links-notation-macro/Cargo.toml` | `proc-macro2` | 1.0.107 | 1.0.107 |
| `rust/links-notation-macro/Cargo.toml` | `quote` | 1.0.47 | 1.0.47 |
| `rust/links-notation-macro/Cargo.toml` | `syn` | 3.0.10 | 3.0.10 |
| `rust/links-notation/Cargo.toml` | `nom` | 8.0.0 | 8.0.0 |

## composer

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `benchmarks/php/composer.json` | `squizlabs/php_codesniffer` | ^4.0.4 | 4.0.4 |
| `benchmarks/php/composer.json` | `yethee/tiktoken` | ^1.1.1 | 1.1.1 |
| `php/composer.json` | `phpunit/phpunit` | ^13.4.8 | 13.4.8 |
| `php/composer.json` | `squizlabs/php_codesniffer` | ^4.0.4 | 4.0.4 |

## github

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `.github/workflows/AutoMerge.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/AutoMerge.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/benchmarks.yml` | `Swatinem/rust-cache` | v2.9.3 | v2.9.3 |
| `.github/workflows/benchmarks.yml` | `actions/cache` | v6.1.0 | v6.1.0 |
| `.github/workflows/benchmarks.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/benchmarks.yml` | `actions/download-artifact` | v8.0.2 | v8.0.2 |
| `.github/workflows/benchmarks.yml` | `actions/setup-dotnet` | v6.1.0 | v6.1.0 |
| `.github/workflows/benchmarks.yml` | `actions/setup-go` | v7.1.0 | v7.1.0 |
| `.github/workflows/benchmarks.yml` | `actions/setup-java` | v6.3.0 | v6.3.0 |
| `.github/workflows/benchmarks.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/benchmarks.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/benchmarks.yml` | `actions/upload-artifact` | v7.0.2 | v7.0.2 |
| `.github/workflows/benchmarks.yml` | `shivammathur/setup-php` | 2.40.0 | 2.40.0 |
| `.github/workflows/benchmarks.yml` | `tj-actions/changed-files` | v47.0.6 | v47.0.6 |
| `.github/workflows/binary-interop.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/binary-interop.yml` | `actions/setup-dotnet` | v6.1.0 | v6.1.0 |
| `.github/workflows/binary-interop.yml` | `actions/setup-go` | v7.1.0 | v7.1.0 |
| `.github/workflows/binary-interop.yml` | `actions/setup-java` | v6.3.0 | v6.3.0 |
| `.github/workflows/binary-interop.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/binary-interop.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/binary-interop.yml` | `shivammathur/setup-php` | 2.40.0 | 2.40.0 |
| `.github/workflows/bom-check.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/cpp.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/csharp.yml` | `Swatinem/rust-cache` | v2.9.3 | v2.9.3 |
| `.github/workflows/csharp.yml` | `actions/cache` | v6.1.0 | v6.1.0 |
| `.github/workflows/csharp.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/csharp.yml` | `actions/setup-dotnet` | v6.1.0 | v6.1.0 |
| `.github/workflows/csharp.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/csharp.yml` | `actions/upload-artifact` | v7.0.2 | v7.0.2 |
| `.github/workflows/dependencies.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/dependencies.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/dependencies.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/dependencies.yml` | `actions/upload-artifact` | v7.0.2 | v7.0.2 |
| `.github/workflows/dependencies.yml` | `oven-sh/setup-bun` | v2.2.0 | v2.2.0 |
| `.github/workflows/docs.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/docs.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/docs.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/go.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/go.yml` | `actions/setup-go` | v7.1.0 | v7.1.0 |
| `.github/workflows/go.yml` | `codecov/codecov-action` | v7.1.1 | v7.1.1 |
| `.github/workflows/java.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/java.yml` | `actions/setup-java` | v6.3.0 | v6.3.0 |
| `.github/workflows/javascript.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/javascript.yml` | `oven-sh/setup-bun` | v2.2.0 | v2.2.0 |
| `.github/workflows/js.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/js.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/kotlin.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/kotlin.yml` | `actions/setup-java` | v6.3.0 | v6.3.0 |
| `.github/workflows/kotlin.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/links.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/links.yml` | `lycheeverse/lychee-action` | v2.9.0 | v2.9.0 |
| `.github/workflows/pages.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/pages.yml` | `actions/configure-pages` | v6.0.0 | v6.0.0 |
| `.github/workflows/pages.yml` | `actions/deploy-pages` | v5.0.1 | v5.0.1 |
| `.github/workflows/pages.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/pages.yml` | `actions/upload-pages-artifact` | v5.0.0 | v5.0.0 |
| `.github/workflows/pages.yml` | `tj-actions/changed-files` | v47.0.6 | v47.0.6 |
| `.github/workflows/php.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/php.yml` | `shivammathur/setup-php` | 2.40.0 | 2.40.0 |
| `.github/workflows/publish-cpp.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-csharp.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-csharp.yml` | `actions/download-artifact` | v8.0.2 | v8.0.2 |
| `.github/workflows/publish-csharp.yml` | `actions/setup-dotnet` | v6.1.0 | v6.1.0 |
| `.github/workflows/publish-go.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-java.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-java.yml` | `actions/setup-java` | v6.3.0 | v6.3.0 |
| `.github/workflows/publish-js.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-js.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/publish-js.yml` | `oven-sh/setup-bun` | v2.2.0 | v2.2.0 |
| `.github/workflows/publish-kotlin.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-kotlin.yml` | `actions/setup-java` | v6.3.0 | v6.3.0 |
| `.github/workflows/publish-php.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-php.yml` | `shivammathur/setup-php` | 2.40.0 | 2.40.0 |
| `.github/workflows/publish-rust.yml` | `Swatinem/rust-cache` | v2.9.3 | v2.9.3 |
| `.github/workflows/publish-rust.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/publish-rust.yml` | `rust-lang/crates-io-auth-action` | v1.0.6 | v1.0.6 |
| `.github/workflows/publish-swift.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/python.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/python.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/release-audit.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/release-audit.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/release-audit.yml` | `actions/upload-artifact` | v7.0.2 | v7.0.2 |
| `.github/workflows/rerun-unacquired.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/rust.yml` | `Swatinem/rust-cache` | v2.9.3 | v2.9.3 |
| `.github/workflows/rust.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/security.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/security.yml` | `actions/dependency-review-action` | v5.0.1 | v5.0.1 |
| `.github/workflows/security.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/security.yml` | `github/codeql-action` | v4.39.5 | v4.39.5 |
| `.github/workflows/security.yml` | `trufflesecurity/trufflehog` | v3.100.1 | v3.100.1 |
| `.github/workflows/swift.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/swift.yml` | `actions/setup-node` | v7.1.0 | v7.1.0 |
| `.github/workflows/workflows.yml` | `actions/checkout` | v7.0.1 | v7.0.1 |
| `.github/workflows/workflows.yml` | `actions/setup-python` | v7.1.0 | v7.1.0 |
| `.github/workflows/workflows.yml` | `rhysd/actionlint` | 1.7.12 | v1.7.12 |
| `.pre-commit-config.yaml` | `PyCQA/flake8` | 7.5.0 | 7.5.0 |
| `.pre-commit-config.yaml` | `PyCQA/isort` | 9.0.2 | 9.0.2 |
| `.pre-commit-config.yaml` | `doublify/pre-commit-rust` | v1.0 | v1.0 |
| `.pre-commit-config.yaml` | `igorshubovych/markdownlint-cli` | v0.50.1 | v0.50.1 |
| `.pre-commit-config.yaml` | `pre-commit/mirrors-eslint` | v10.15.0 | v10.15.0 |
| `.pre-commit-config.yaml` | `pre-commit/pre-commit-hooks` | v6.0.0 | v6.0.0 |
| `.pre-commit-config.yaml` | `psf/black` | 26.10.1 | 26.10.1 |
| `cpp/tests/CMakeLists.txt` | `google/googletest` | v1.18.0 | v1.18.0 |

## github-input

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `.github/workflows/security.yml` | `trufflesecurity/trufflehog` | 3.100.1 | v3.100.1 |

## go

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `benchmarks/go/go.mod` | `github.com/dlclark/regexp2` | v1.12.0 | 1.12.0 |
| `benchmarks/go/go.mod` | `github.com/google/uuid` | v1.6.0 | 1.6.0 |
| `benchmarks/go/go.mod` | `github.com/pkoukk/tiktoken-go` | v0.1.8 | 0.1.8 |
| `benchmarks/go/go.mod` | `github.com/pkoukk/tiktoken-go-loader` | v0.0.2 | 0.0.2 |
| `benchmarks/go/go.mod` | `github.com/stretchr/testify` | v1.12.1 | 1.12.1 |
| `benchmarks/go/go.mod` | `go.yaml.in/yaml/v3` | v3.0.6 | 3.0.6 |

## gradle

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `kotlin/gradle/wrapper/gradle-wrapper.properties` | `gradle` | 9.9.2 | 9.9.2 |

## gradle-plugin

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `examples/maven/kotlin/build.gradle.kts` | `org.jetbrains.kotlin.jvm` | 2.4.21 | 2.4.21 |
| `kotlin/build.gradle.kts` | `com.android.kotlin.multiplatform.library` | 9.5.2 | 9.5.2 |
| `kotlin/build.gradle.kts` | `com.vanniktech.maven.publish` | 0.37.0 | 0.37.0 |
| `kotlin/build.gradle.kts` | `org.jetbrains.kotlin.multiplatform` | 2.4.21 | 2.4.21 |
| `kotlin/build.gradle.kts` | `org.jlleitschuh.gradle.ktlint` | 14.2.0 | 14.2.0 |

## maven

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `benchmarks/java/pom.xml` | `com.diffplug.spotless:spotless-maven-plugin` | 3.12.0 | 3.12.0 |
| `benchmarks/java/pom.xml` | `com.google.code.gson:gson` | 2.15.0 | 2.15.0 |
| `benchmarks/java/pom.xml` | `com.google.errorprone:error_prone_annotations` | 2.53.0 | 2.53.0 |
| `benchmarks/java/pom.xml` | `com.google.googlejavaformat:google-java-format` | 2.0.0 | 2.0.0 |
| `benchmarks/java/pom.xml` | `com.knuddels:jtokkit` | 1.1.0 | 1.1.0 |
| `benchmarks/java/pom.xml` | `org.apache.maven.plugins:maven-compiler-plugin` | 3.16.0 | 3.16.0 |
| `benchmarks/java/pom.xml` | `org.apache.maven.plugins:maven-enforcer-plugin` | 3.7.0 | 3.7.0 |
| `benchmarks/java/pom.xml` | `org.apache.maven.plugins:maven-jar-plugin` | 3.5.1 | 3.5.1 |
| `benchmarks/java/pom.xml` | `org.codehaus.mojo:exec-maven-plugin` | 3.7.0 | 3.7.0 |
| `java/.mvn/wrapper/maven-wrapper.properties` | `org.apache.maven.wrapper:maven-wrapper` | 3.3.4 | 3.3.4 |
| `java/.mvn/wrapper/maven-wrapper.properties` | `org.apache.maven:apache-maven` | 3.10.2 | 3.10.2 |
| `java/pom.xml` | `com.diffplug.spotless:spotless-maven-plugin` | 3.12.0 | 3.12.0 |
| `java/pom.xml` | `com.google.googlejavaformat:google-java-format` | 2.0.0 | 2.0.0 |
| `java/pom.xml` | `org.apache.maven.plugins:maven-compiler-plugin` | 3.16.0 | 3.16.0 |
| `java/pom.xml` | `org.apache.maven.plugins:maven-enforcer-plugin` | 3.7.0 | 3.7.0 |
| `java/pom.xml` | `org.apache.maven.plugins:maven-gpg-plugin` | 3.2.8 | 3.2.8 |
| `java/pom.xml` | `org.apache.maven.plugins:maven-jar-plugin` | 3.5.1 | 3.5.1 |
| `java/pom.xml` | `org.apache.maven.plugins:maven-javadoc-plugin` | 3.12.0 | 3.12.0 |
| `java/pom.xml` | `org.apache.maven.plugins:maven-source-plugin` | 3.4.0 | 3.4.0 |
| `java/pom.xml` | `org.apache.maven.plugins:maven-surefire-plugin` | 3.6.1 | 3.6.1 |
| `java/pom.xml` | `org.jspecify:jspecify` | 1.0.1 | 1.0.1 |
| `java/pom.xml` | `org.junit.jupiter:junit-jupiter` | 6.1.3 | 6.1.3 |
| `java/pom.xml` | `org.sonatype.central:central-publishing-maven-plugin` | 0.12.0 | 0.12.0 |
| `kotlin/build.gradle.kts` | `com.pinterest.ktlint:ktlint-cli` | 1.8.0 | 1.8.0 |

## npm

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `.github/workflows/publish-js.yml` | `npm` | 12.2.3 | 12.2.3 |
| `benchmarks/js/package.json` | `gpt-tokenizer` | ^4.1.2 | 4.1.2 |
| `benchmarks/tools/package.json` | `csv-parse` | ^7.0.3 | 7.0.3 |
| `benchmarks/tools/package.json` | `fast-xml-parser` | ^5.12.1 | 5.12.1 |
| `benchmarks/tools/package.json` | `lino-objects-codec` | ^1.1.0 | 1.1.0 |
| `benchmarks/tools/package.json` | `yaml` | ^2.9.1 | 2.9.1 |
| `docs/comparison/package.json` | `lino-objects-codec` | ^1.1.0 | 1.1.0 |
| `docs/comparison/package.json` | `yaml` | ^2.9.1 | 2.9.1 |
| `docs/website/package.json` | `eslint` | ^10.15.0 | 10.15.0 |
| `docs/website/package.json` | `lino-objects-codec` | ^1.1.0 | 1.1.0 |
| `docs/website/package.json` | `vite` | ^8.3.8 | 8.3.8 |
| `js/package.json` | `bun-types` | ^1.4.5 | 1.4.5 |
| `js/package.json` | `eslint` | ^10.15.0 | 10.15.0 |
| `js/package.json` | `peggy` | ^5.1.1 | 5.1.1 |
| `js/package.json` | `prettier` | ^3.10.1 | 3.10.1 |
| `js/package.json` | `typescript` | ^7.0.2 | 7.0.2 |

## nuget

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `benchmarks/csharp/Benchmark.csproj` | `Microsoft.ML.Tokenizers` | 3.0.0 | 3.0.0 |
| `benchmarks/csharp/Benchmark.csproj` | `Microsoft.ML.Tokenizers.Data.Cl100kBase` | 3.0.0 | 3.0.0 |
| `benchmarks/csharp/Benchmark.csproj` | `Microsoft.ML.Tokenizers.Data.O200kBase` | 3.0.0 | 3.0.0 |
| `csharp/.config/dotnet-tools.json` | `docfx` | 2.81.0 | 2.81.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Azure.Core` | 1.65.0 | 1.65.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.ApplicationInsights` | 3.2.0 | 3.2.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Bcl.AsyncInterfaces` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Extensions.Configuration` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Extensions.Configuration.Binder` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Extensions.Configuration.EnvironmentVariables` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Extensions.DependencyInjection` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Extensions.Logging` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Extensions.Logging.Configuration` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Extensions.Options.ConfigurationExtensions` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Identity.Client` | 4.92.0 | 4.92.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Identity.Client.Extensions.Msal` | 4.92.0 | 4.92.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.IdentityModel.Abstractions` | 8.23.0 | 8.23.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Testing.Extensions.Telemetry` | 2.5.3 | 2.5.3 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Testing.Extensions.TrxReport.Abstractions` | 2.5.3 | 2.5.3 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Testing.Platform` | 2.5.3 | 2.5.3 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `Microsoft.Testing.Platform.MSBuild` | 2.5.3 | 2.5.3 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `OpenTelemetry` | 1.21.0 | 1.21.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `OpenTelemetry.Api` | 1.21.0 | 1.21.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `OpenTelemetry.Api.ProviderBuilderExtensions` | 1.21.0 | 1.21.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `OpenTelemetry.Extensions.Hosting` | 1.21.0 | 1.21.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `OpenTelemetry.PersistentStorage.Abstractions` | 1.2.0 | 1.2.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `OpenTelemetry.PersistentStorage.FileSystem` | 1.2.0 | 1.2.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `System.ClientModel` | 1.17.0 | 1.17.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `System.Memory.Data` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `System.Security.Cryptography.ProtectedData` | 11.0.0 | 11.0.0 |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | `xunit.v3` | 4.0.3 | 4.0.3 |
| `csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj` | `Pegasus` | 4.1.0 | 4.1.0 |
| `csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj` | `Platform.Collections` | 0.4.0 | 0.4.0 |

## pypi

| Manifest | Dependency | Pinned | Latest |
| --- | --- | --- | --- |
| `benchmarks/python/requirements.txt` | `tiktoken` | >=0.14.0 | 0.14.0 |
| `cpp/tools/requirements.txt` | `clang-format` | ==23.1.5 | 23.1.5 |
| `csharp/tools/requirements.txt` | `Pygments` | >=2.21.0 | 2.21.0 |
| `csharp/tools/requirements.txt` | `latex2pydata` | >=0.5.0 | 0.5.0 |
| `csharp/tools/requirements.txt` | `latexminted` | ==0.7.1 | 0.7.1 |
| `csharp/tools/requirements.txt` | `latexrestricted` | >=0.6.2 | 0.6.2 |
| `python/pyproject.toml` | `black` | >=26.10.1 | 26.10.1 |
| `python/pyproject.toml` | `flake8` | >=7.5.0 | 7.5.0 |
| `python/pyproject.toml` | `isort` | >=9.0.2 | 9.0.2 |
| `python/pyproject.toml` | `mypy` | >=2.4.1 | 2.4.1 |
| `python/pyproject.toml` | `pytest` | >=9.2.0 | 9.2.0 |
| `python/pyproject.toml` | `pytest-timeout` | >=2.4.0 | 2.4.0 |
| `python/pyproject.toml` | `setuptools` | >=84.2.1 | 84.2.1 |
| `scripts/ci/requirements.txt` | `build` | >=1.6.1 | 1.6.1 |
| `scripts/ci/requirements.txt` | `pypi-attestations` | >=0.0.32 | 0.0.32 |
| `scripts/ci/requirements.txt` | `twine` | >=7.0.0 | 7.0.0 |
| `scripts/ci/requirements.txt` | `uv` | ==0.13.10 | 0.13.10 |
| `scripts/ci/requirements.txt` | `zizmor` | ==1.33.1 | 1.33.1 |

