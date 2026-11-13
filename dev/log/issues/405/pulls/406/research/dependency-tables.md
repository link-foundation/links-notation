# Dependency declarations: before, after and latest stable

Registry queries performed on 2026-11-13 UTC. Raw results: `registry-all.json`. Before values are immutable initial-SHA evidence from `declarations-before.json`; local/self references are not external dependencies.

## cargo

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `dev/log/issues/330/pulls/331/templates/rust/Cargo.toml` | clap | `4.4` | `4.6.7` | `4.6.7` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/Cargo.toml` | lino-arguments | `0.3` | `0.5.0` | `0.5.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/Cargo.toml` | regex | `1` | `1.13.1` | `1.13.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/Cargo.toml` | serde_json | `1` | `1.0.154` | `1.0.154` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/Cargo.toml` | walkdir | `2` | `2.5.0` | `2.5.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/Cargo.toml` | clap | `4.4` | `4.6.7` | `4.6.7` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/Cargo.toml` | lino-arguments | `0.3` | `0.5.0` | `0.5.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/Cargo.toml` | regex | `1` | `1.13.1` | `1.13.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/Cargo.toml` | serde_json | `1` | `1.0.154` | `1.0.154` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/Cargo.toml` | walkdir | `2` | `2.5.0` | `2.5.0` | Current stable floor/ref |
| `experiments/issue-316/rust-timing/Cargo.toml` | links-notation | `=0.21.1` | `=0.21.1` | `0.31.3` | Historical before-version in issue-316 performance comparison; changing it would invalidate the comparison |
| `rust/links-notation-benchmark/Cargo.toml` | serde | `1.0.229` | `1.0.229` | `1.0.229` | Current stable floor/ref |
| `rust/links-notation-benchmark/Cargo.toml` | serde_json | `1.0.154` | `1.0.154` | `1.0.154` | Current stable floor/ref |
| `rust/links-notation-benchmark/Cargo.toml` | tiktoken-rs | `0.12.1` | `0.12.1` | `0.12.1` | Current stable floor/ref |
| `rust/links-notation-macro/Cargo.toml` | proc-macro2 | `1.0.107` | `1.0.107` | `1.0.107` | Current stable floor/ref |
| `rust/links-notation-macro/Cargo.toml` | quote | `1.0.47` | `1.0.47` | `1.0.47` | Current stable floor/ref |
| `rust/links-notation-macro/Cargo.toml` | syn | `3.0.9` | `3.0.10` | `3.0.10` | Current stable floor/ref |
| `rust/links-notation/Cargo.toml` | nom | `8.0.0` | `8.0.0` | `8.0.0` | Current stable floor/ref |

## composer

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `benchmarks/php/composer.json` | squizlabs/php_codesniffer | `^4.0.4` | `^4.0.4` | `4.0.4` | Current stable floor/ref |
| `benchmarks/php/composer.json` | yethee/tiktoken | `^1.1.1` | `^1.1.1` | `1.1.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/composer.json` | friendsofphp/php-cs-fixer | `^3.64` | `^3.95.30` | `3.95.30` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/composer.json` | phpstan/phpstan | `^1.12` | `^2.3.5` | `2.3.5` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/composer.json` | phpunit/phpunit | `^10.5` | `^13.4.7` | `13.4.7` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/composer.json` | friendsofphp/php-cs-fixer | `^3.64` | `^3.95.30` | `3.95.30` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/composer.json` | phpstan/phpstan | `^1.12` | `^2.3.5` | `2.3.5` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/composer.json` | phpunit/phpunit | `^10.5` | `^13.4.7` | `13.4.7` | Current stable floor/ref |
| `php/composer.json` | phpunit/phpunit | `^13.4.6` | `^13.4.7` | `13.4.7` | Current stable floor/ref |
| `php/composer.json` | squizlabs/php_codesniffer | `^4.0.4` | `^4.0.4` | `4.0.4` | Current stable floor/ref |

## github

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/AutoMerge.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/AutoMerge.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | Swatinem/rust-cache | `v2.9.3` | `v2.9.3` | `v2.9.3` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/cache | `v6.1.0` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/download-artifact | `v8.0.2` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/setup-dotnet | `v6.0.0` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/setup-go | `v7.0.0` | `v7.0.0` | `v7.0.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/setup-java | `v6.1.0` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | actions/upload-artifact | `v7.0.2` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | shivammathur/setup-php | `2.40.0` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `.github/workflows/benchmarks.yml` | tj-actions/changed-files | `v47.0.6` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `.github/workflows/binary-interop.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/binary-interop.yml` | actions/setup-dotnet | `v6.0.0` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `.github/workflows/binary-interop.yml` | actions/setup-go | `v7.0.0` | `v7.0.0` | `v7.0.0` | Current stable floor/ref |
| `.github/workflows/binary-interop.yml` | actions/setup-java | `v6.1.0` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `.github/workflows/binary-interop.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/binary-interop.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/binary-interop.yml` | shivammathur/setup-php | `2.40.0` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `.github/workflows/bom-check.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/cpp.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/csharp.yml` | Swatinem/rust-cache | `v2.9.3` | `v2.9.3` | `v2.9.3` | Current stable floor/ref |
| `.github/workflows/csharp.yml` | actions/cache | `v6.1.0` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `.github/workflows/csharp.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/csharp.yml` | actions/setup-dotnet | `v6.0.0` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `.github/workflows/csharp.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/csharp.yml` | actions/upload-artifact | `v7.0.2` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `.github/workflows/dependencies.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/dependencies.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/dependencies.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/dependencies.yml` | actions/upload-artifact | `v7.0.2` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `.github/workflows/dependencies.yml` | oven-sh/setup-bun | `v2.2.0` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `.github/workflows/docs.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/docs.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/docs.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/go.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/go.yml` | actions/setup-go | `v7.0.0` | `v7.0.0` | `v7.0.0` | Current stable floor/ref |
| `.github/workflows/go.yml` | codecov/codecov-action | `v7.1.1` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `.github/workflows/java.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/java.yml` | actions/setup-java | `v6.1.0` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `.github/workflows/javascript.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/javascript.yml` | oven-sh/setup-bun | `v2.2.0` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `.github/workflows/js.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/js.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/kotlin.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/kotlin.yml` | actions/setup-java | `v6.1.0` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `.github/workflows/kotlin.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/links.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/links.yml` | lycheeverse/lychee-action | `v2.9.0` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `.github/workflows/pages.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/pages.yml` | actions/configure-pages | `v6.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `.github/workflows/pages.yml` | actions/deploy-pages | `v5.0.1` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `.github/workflows/pages.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/pages.yml` | actions/upload-pages-artifact | `v5.0.0` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `.github/workflows/pages.yml` | tj-actions/changed-files | `v47.0.6` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `.github/workflows/php.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/php.yml` | shivammathur/setup-php | `2.40.0` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `.github/workflows/publish-cpp.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-csharp.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-csharp.yml` | actions/download-artifact | `v8.0.2` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `.github/workflows/publish-csharp.yml` | actions/setup-dotnet | `v6.0.0` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `.github/workflows/publish-go.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-java.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-java.yml` | actions/setup-java | `v6.1.0` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `.github/workflows/publish-js.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-js.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/publish-js.yml` | oven-sh/setup-bun | `v2.2.0` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `.github/workflows/publish-kotlin.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-kotlin.yml` | actions/setup-java | `v6.1.0` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `.github/workflows/publish-php.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-php.yml` | shivammathur/setup-php | `2.40.0` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `.github/workflows/publish-rust.yml` | Swatinem/rust-cache | `v2.9.3` | `v2.9.3` | `v2.9.3` | Current stable floor/ref |
| `.github/workflows/publish-rust.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/publish-rust.yml` | rust-lang/crates-io-auth-action | `v1.0.6` | `v1.0.6` | `v1.0.6` | Current stable floor/ref |
| `.github/workflows/publish-swift.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/python.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/python.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/release-audit.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/release-audit.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/release-audit.yml` | actions/upload-artifact | `v7.0.2` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `.github/workflows/rerun-unacquired.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/rust.yml` | Swatinem/rust-cache | `v2.9.3` | `v2.9.3` | `v2.9.3` | Current stable floor/ref |
| `.github/workflows/rust.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/security.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/security.yml` | actions/dependency-review-action | `v5.0.0` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `.github/workflows/security.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/security.yml` | github/codeql-action | `v4.39.1` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `.github/workflows/security.yml` | trufflesecurity/trufflehog | `v3.99.7` | `v3.99.9` | `v3.99.9` | Current stable floor/ref |
| `.github/workflows/swift.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/swift.yml` | actions/setup-node | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/workflows.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `.github/workflows/workflows.yml` | actions/setup-python | `v7.1.0` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `.github/workflows/workflows.yml` | rhysd/actionlint | `1.7.12` | `1.7.12` | `v1.7.12` | Current stable floor/ref |
| `.pre-commit-config.yaml` | PyCQA/flake8 | `7.5.0` | `7.5.0` | `7.5.0` | Current stable floor/ref |
| `.pre-commit-config.yaml` | PyCQA/isort | `9.0.2` | `9.0.2` | `9.0.2` | Current stable floor/ref |
| `.pre-commit-config.yaml` | doublify/pre-commit-rust | `v1.0` | `v1.0` | `v1.0` | Current stable floor/ref |
| `.pre-commit-config.yaml` | igorshubovych/markdownlint-cli | `v0.50.0` | `v0.50.0` | `v0.50.0` | Current stable floor/ref |
| `.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v6.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `.pre-commit-config.yaml` | psf/black | `26.10.1` | `26.10.1` | `26.10.1` | Current stable floor/ref |
| `cpp/tests/CMakeLists.txt` | google/googletest | `v1.18.0` | `v1.18.0` | `v1.18.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/docs.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/docs.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/docs.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/docs.yml` | actions/setup-dotnet | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/docs.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/release.yml` | actions/setup-dotnet | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/release.yml` | peter-evans/create-pull-request | `v8` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/csharp/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/go/.github/workflows/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/go/.github/workflows/release.yml` | actions/setup-go | `v5` | `v7.0.0` | `v7.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/go/.github/workflows/release.yml` | codecov/codecov-action | `v4` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/go/.github/workflows/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/java/.github/workflows/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/java/.github/workflows/release.yml` | actions/setup-java | `v4` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/java/.github/workflows/release.yml` | actions/upload-artifact | `v4` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/java/.github/workflows/release.yml` | codecov/codecov-action | `v4` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/java/.github/workflows/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/java/.github/workflows/release.yml` | peter-evans/create-pull-request | `v6` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/metadata-action | `v6` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/actions/setup-buildx-resilient/action.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | actions/setup-java | `v5` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/example-app.yml` | android-actions/setup-android | `v3` | `v4.0.4` | `v4.0.4` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | denoland/setup-deno | `v2` | `v2.0.5` | `v2.0.5` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/release.yml` | peter-evans/create-pull-request | `v8` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/security.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/js/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/docs.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/docs.yml` | actions/configure-pages | `v5` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/docs.yml` | actions/deploy-pages | `v4` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/docs.yml` | actions/upload-artifact | `v4` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/docs.yml` | actions/upload-pages-artifact | `v3` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/docs.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/links.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/links.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/release.yml` | ramsey/composer-install | `v3` | `4.0.0` | `4.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/php/.github/workflows/release.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/docs.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/docs.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/docs.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/docs.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/docs.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/docs.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | actions/download-artifact | `v7` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/release.yml` | pypa/gh-action-pypi-publish | `release/v1` | `v1.14.3` | `v1.14.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/security.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/python/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/actions/setup-buildx-resilient/action.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/desktop-release.yml` | actions/attest | `v4` | `v4.2.2` | `v4.2.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/desktop-release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/desktop-release.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/desktop-release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | actions/cache | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | actions/download-artifact | `v7` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | actions/upload-artifact | `v6` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | peter-evans/create-pull-request | `v8` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/release.yml` | taiki-e/install-action | `cargo-llvm-cov` | `v2.90.3` | `v2.90.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/security.yml` | taiki-e/install-action | `v2` | `v2.90.3` | `v2.90.3` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/AutoMerge.yml` | dependabot/fetch-metadata | `v2` | `v3.1.0` | `v3.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/bom-check.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/csharp.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/csharp.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/csharp.yml` | actions/setup-dotnet | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/csharp.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/csharp.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/go.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/go.yml` | actions/setup-go | `v6` | `v7.0.0` | `v7.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/go.yml` | codecov/codecov-action | `v6` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/go.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/java.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/java.yml` | actions/setup-java | `v5` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/java.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/js.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/js.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/js.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/pages.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/pages.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/pages.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/pages.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/pages.yml` | actions/upload-pages-artifact | `v4` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/pages.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/php.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/php.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/php.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/python.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/rust.yml` | actions/cache | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/rust.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/290/pulls/291/workflows/repo-github/workflows/rust.yml` | tj-actions/changed-files | `v47` | `v47.0.6` | `v47.0.6` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/docs.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/docs.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/docs.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/docs.yml` | actions/setup-dotnet | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/docs.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/release.yml` | actions/setup-dotnet | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/release.yml` | peter-evans/create-pull-request | `v8` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/csharp/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/go/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/go/release.yml` | actions/setup-go | `v5` | `v7.0.0` | `v7.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/go/release.yml` | codecov/codecov-action | `v4` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/go/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/java/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/java/release.yml` | actions/setup-java | `v4` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/java/release.yml` | actions/upload-artifact | `v4` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/java/release.yml` | codecov/codecov-action | `v4` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/java/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/java/release.yml` | peter-evans/create-pull-request | `v6` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | actions/setup-java | `v5` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/example-app.yml` | android-actions/setup-android | `9fc6c4e9069bf8d3d10b2204b1fb8f6ef7065407` | `be39fa834029ff78f1a44aa3bb0819b8fc2bd8fd` | `v4.0.4` | Immutable commit for v4.0.4; original SHA pin policy preserved |
| `dev/log/issues/298/pulls/299/templates/js/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | denoland/setup-deno | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` | `v2.0.5` | Immutable commit for v2.0.5; original SHA pin policy preserved |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | oven-sh/setup-bun | `0c5077e51419868618aeaa5fe8019c62421857d6` | `0c5077e51419868618aeaa5fe8019c62421857d6` | `v2.2.0` | Immutable commit for v2.2.0; original SHA pin policy preserved |
| `dev/log/issues/298/pulls/299/templates/js/release.yml` | peter-evans/create-pull-request | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` | `3ffccacd46053766916f087ce41d627c0b8cf2d1` | `v8.1.3` | Immutable commit for v8.1.3; original SHA pin policy preserved |
| `dev/log/issues/298/pulls/299/templates/js/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/security.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/js/workflows.yml` | zizmorcore/zizmor-action | `v0.6.2` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/docs.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/docs.yml` | actions/configure-pages | `v5` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/docs.yml` | actions/deploy-pages | `v4` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/docs.yml` | actions/upload-artifact | `v4` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/docs.yml` | actions/upload-pages-artifact | `v3` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/docs.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/links.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/links.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/release.yml` | ramsey/composer-install | `v3` | `4.0.0` | `4.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/php/release.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/docs.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/docs.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/docs.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/docs.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/docs.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/docs.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | actions/download-artifact | `v7` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/release.yml` | pypa/gh-action-pypi-publish | `release/v1` | `v1.14.3` | `v1.14.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/security.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/python/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/desktop-release.yml` | actions/attest | `v4` | `v4.2.2` | `v4.2.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/desktop-release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/desktop-release.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/desktop-release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | actions/cache | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | actions/download-artifact | `v7` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | actions/upload-artifact | `v6` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | peter-evans/create-pull-request | `v8` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/release.yml` | taiki-e/install-action | `cargo-llvm-cov` | `v2.90.3` | `v2.90.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/security.yml` | taiki-e/install-action | `v2` | `v2.90.3` | `v2.90.3` | Current stable floor/ref |
| `dev/log/issues/298/pulls/299/templates/rust/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/docs.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/docs.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/docs.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/docs.yml` | actions/setup-dotnet | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/docs.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/release.yml` | actions/setup-dotnet | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/release.yml` | peter-evans/create-pull-request | `v8` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.2` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/csharp/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/go/.github/workflows/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/go/.github/workflows/release.yml` | actions/setup-go | `v5` | `v7.0.0` | `v7.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/go/.github/workflows/release.yml` | codecov/codecov-action | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/go/.github/workflows/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/go/.github/workflows/workflows.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/go/.github/workflows/workflows.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/go/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/.github/workflows/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/.github/workflows/release.yml` | actions/setup-java | `v4` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/.github/workflows/release.yml` | actions/upload-artifact | `v4` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/.github/workflows/release.yml` | codecov/codecov-action | `v7` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/.github/workflows/release.yml` | oven-sh/setup-bun | `v2` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/.github/workflows/release.yml` | peter-evans/create-pull-request | `v6` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/metadata-action | `v6` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/actions/setup-buildx-resilient/action.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | actions/setup-java | `v5` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/example-app.yml` | android-actions/setup-android | `9fc6c4e9069bf8d3d10b2204b1fb8f6ef7065407` | `be39fa834029ff78f1a44aa3bb0819b8fc2bd8fd` | `v4.0.4` | Immutable commit for v4.0.4; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/links.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | denoland/setup-deno | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` | `v2.0.5` | Immutable commit for v2.0.5; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | oven-sh/setup-bun | `0c5077e51419868618aeaa5fe8019c62421857d6` | `0c5077e51419868618aeaa5fe8019c62421857d6` | `v2.2.0` | Immutable commit for v2.2.0; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/release.yml` | peter-evans/create-pull-request | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` | `3ffccacd46053766916f087ce41d627c0b8cf2d1` | `v8.1.3` | Immutable commit for v8.1.3; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/security.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/workflows.yml` | actions/setup-node | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.2` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/docs.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/docs.yml` | actions/configure-pages | `v5` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/docs.yml` | actions/deploy-pages | `v4` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/docs.yml` | actions/upload-artifact | `v4` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/docs.yml` | actions/upload-pages-artifact | `v3` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/docs.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/links.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/links.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/release.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/release.yml` | ramsey/composer-install | `v3` | `4.0.0` | `4.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/release.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/security.yml` | actions/checkout | `v4` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/security.yml` | shivammathur/setup-php | `v2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/workflows.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/php/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.2` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/docs.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/docs.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/docs.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/docs.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/docs.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/docs.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | codecov/codecov-action | `fb8b3582c8e4def4969c97caa2f19720cb33a72f` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/release.yml` | pypa/gh-action-pypi-publish | `dc37677b2e1c63e2034f94d8a5b11f265b73ba33` | `7245906fb61fa33a13554f9d5fb856fe61758086` | `v1.14.3` | Immutable commit for v1.14.3; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/security.yml` | actions/setup-python | `v6` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.2` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.pre-commit-config.yaml` | astral-sh/ruff-pre-commit | `v0.8.4` | `v0.17.5` | `v0.17.5` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.pre-commit-config.yaml` | pre-commit/mirrors-mypy | `v1.13.0` | `v2.4.1` | `v2.4.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/actions/setup-buildx-resilient/action.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/desktop-release.yml` | actions/attest | `v4` | `v4.2.2` | `v4.2.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/desktop-release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/desktop-release.yml` | actions/download-artifact | `v8` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/desktop-release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/desktop-release.yml` | dtolnay/rust-toolchain | `6bed0761d98439e5a578e2877258200ad565ba87` | `683b588c487a69d01f6c6ddf40f036ff682cc2c8` | `v1` | Immutable commit for v1; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/links.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | actions/cache | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | actions/download-artifact | `v7` | `v8.0.2` | `v8.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | actions/upload-artifact | `v6` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | codecov/codecov-action | `fb8b3582c8e4def4969c97caa2f19720cb33a72f` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | dtolnay/rust-toolchain | `6bed0761d98439e5a578e2877258200ad565ba87` | `683b588c487a69d01f6c6ddf40f036ff682cc2c8` | `v1` | Immutable commit for v1; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | peter-evans/create-pull-request | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` | `3ffccacd46053766916f087ce41d627c0b8cf2d1` | `v8.1.3` | Immutable commit for v8.1.3; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/release.yml` | taiki-e/install-action | `e67fa11c4b9316fa714ddf0abed07a0c3143b95b` | `cfdb7ed4ccc7c7dce37759eae89dc5674b469b39` | `v2.90.3` | Immutable commit for v2.90.3; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/security.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/security.yml` | taiki-e/install-action | `e67fa11c4b9316fa714ddf0abed07a0c3143b95b` | `cfdb7ed4ccc7c7dce37759eae89dc5674b469b39` | `v2.90.3` | Immutable commit for v2.90.3; original SHA pin policy preserved |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/workflows.yml` | actions/checkout | `v6` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.2` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/rust/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/docs.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/docs.yml` | actions/configure-pages | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | `v6.0.0` | Immutable commit for v6.0.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/docs.yml` | actions/deploy-pages | `368f82528645a54fb793d4d04e342629a3f51346` | `368f82528645a54fb793d4d04e342629a3f51346` | `v5.0.1` | Immutable commit for v5.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/docs.yml` | actions/upload-artifact | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `v7.0.2` | Immutable commit for v7.0.2; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/docs.yml` | actions/upload-pages-artifact | `fc324d3547104276b827a68afc52ff2a11cc49c9` | `fc324d3547104276b827a68afc52ff2a11cc49c9` | `v5.0.0` | Immutable commit for v5.0.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/links.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/links.yml` | lycheeverse/lychee-action | `e7477775783ea5526144ba13e8db5eec57747ce8` | `e7477775783ea5526144ba13e8db5eec57747ce8` | `v2.9.0` | Immutable commit for v2.9.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/release.yml` | NuGet/login | `8d196754b4036150537f80ac539e15c2f1028841` | `8d196754b4036150537f80ac539e15c2f1028841` | `v1.2.0` | Immutable commit for v1.2.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/release.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/release.yml` | actions/setup-python | `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` | `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` | `v7.1.0` | Immutable commit for v7.1.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/release.yml` | actions/upload-artifact | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `v7.0.2` | Immutable commit for v7.0.2; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/release.yml` | codecov/codecov-action | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/release.yml` | peter-evans/create-pull-request | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` | `3ffccacd46053766916f087ce41d627c0b8cf2d1` | `v8.1.3` | Immutable commit for v8.1.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/security.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/security.yml` | actions/dependency-review-action | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | `v5.0.0` | Immutable commit for v5.0.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/security.yml` | actions/setup-python | `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` | `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` | `v7.1.0` | Immutable commit for v7.1.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/security.yml` | actions/upload-artifact | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `v7.0.2` | Immutable commit for v7.0.2; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/security.yml` | github/codeql-action | `9b3254085494b55a0f7c4c2b3d2d52cc712ce370` | `33d7b85da1a04171e211befe2c739303b9a4c066` | `v4.39.3` | Immutable commit for v4.39.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/workflows.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `cc914d7f3750a2d13d75c7f184a1060aa0e9d482` | `45d7276c9ca790aabd705e31ca99c6185c3e76dd` | `v0.8.1` | Immutable commit for v0.8.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/cpp/.pre-commit-config.yaml` | pre-commit/mirrors-clang-format | `v20.1.8` | `v23.1.5` | `v23.1.5` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/docs.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/docs.yml` | actions/configure-pages | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | `v6.0.0` | Immutable commit for v6.0.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/docs.yml` | actions/deploy-pages | `368f82528645a54fb793d4d04e342629a3f51346` | `368f82528645a54fb793d4d04e342629a3f51346` | `v5.0.1` | Immutable commit for v5.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/docs.yml` | actions/setup-dotnet | `a98b56852c35b8e3190ac28c8c2271da59106c68` | `0f4a354dd5547a28c70b7853dbd95d5b67886e73` | `v6.1.0` | Immutable commit for v6.1.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/docs.yml` | actions/upload-pages-artifact | `fc324d3547104276b827a68afc52ff2a11cc49c9` | `fc324d3547104276b827a68afc52ff2a11cc49c9` | `v5.0.0` | Immutable commit for v5.0.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/links.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/links.yml` | lycheeverse/lychee-action | `e7477775783ea5526144ba13e8db5eec57747ce8` | `e7477775783ea5526144ba13e8db5eec57747ce8` | `v2.9.0` | Immutable commit for v2.9.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/release.yml` | NuGet/login | `8d196754b4036150537f80ac539e15c2f1028841` | `8d196754b4036150537f80ac539e15c2f1028841` | `v1.2.0` | Immutable commit for v1.2.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/release.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/release.yml` | actions/setup-dotnet | `a98b56852c35b8e3190ac28c8c2271da59106c68` | `0f4a354dd5547a28c70b7853dbd95d5b67886e73` | `v6.1.0` | Immutable commit for v6.1.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/release.yml` | actions/upload-artifact | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `v7.0.2` | Immutable commit for v7.0.2; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/release.yml` | codecov/codecov-action | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/release.yml` | oven-sh/setup-bun | `0c5077e51419868618aeaa5fe8019c62421857d6` | `0c5077e51419868618aeaa5fe8019c62421857d6` | `v2.2.0` | Immutable commit for v2.2.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/release.yml` | peter-evans/create-pull-request | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` | `3ffccacd46053766916f087ce41d627c0b8cf2d1` | `v8.1.3` | Immutable commit for v8.1.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/security.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/security.yml` | actions/dependency-review-action | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | `v5.0.0` | Immutable commit for v5.0.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/security.yml` | actions/download-artifact | `9000827ccba6bdab643e8b6fd33ac0654aef8333` | `9000827ccba6bdab643e8b6fd33ac0654aef8333` | `v8.0.2` | Immutable commit for v8.0.2; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/security.yml` | actions/setup-dotnet | `a98b56852c35b8e3190ac28c8c2271da59106c68` | `0f4a354dd5547a28c70b7853dbd95d5b67886e73` | `v6.1.0` | Immutable commit for v6.1.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/security.yml` | actions/upload-artifact | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `v7.0.2` | Immutable commit for v7.0.2; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/security.yml` | github/codeql-action | `9b3254085494b55a0f7c4c2b3d2d52cc712ce370` | `33d7b85da1a04171e211befe2c739303b9a4c066` | `v4.39.3` | Immutable commit for v4.39.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/security.yml` | oven-sh/setup-bun | `0c5077e51419868618aeaa5fe8019c62421857d6` | `0c5077e51419868618aeaa5fe8019c62421857d6` | `v2.2.0` | Immutable commit for v2.2.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/workflows.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `53290badfa369cb0bf7ad16342cb62c2fa47ac7b` | `45d7276c9ca790aabd705e31ca99c6185c3e76dd` | `v0.8.1` | Immutable commit for v0.8.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/csharp/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v6.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/go/.github/workflows/release.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/go/.github/workflows/release.yml` | actions/setup-go | `b7ad1dad31e06c5925ef5d2fc7ad053ef454303e` | `b7ad1dad31e06c5925ef5d2fc7ad053ef454303e` | `v7.0.0` | Immutable commit for v7.0.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/go/.github/workflows/release.yml` | codecov/codecov-action | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/go/.github/workflows/release.yml` | oven-sh/setup-bun | `0c5077e51419868618aeaa5fe8019c62421857d6` | `0c5077e51419868618aeaa5fe8019c62421857d6` | `v2.2.0` | Immutable commit for v2.2.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/go/.github/workflows/workflows.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/go/.github/workflows/workflows.yml` | oven-sh/setup-bun | `0c5077e51419868618aeaa5fe8019c62421857d6` | `0c5077e51419868618aeaa5fe8019c62421857d6` | `v2.2.0` | Immutable commit for v2.2.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/go/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.github/workflows/release.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.github/workflows/release.yml` | actions/setup-java | `v6.0.1` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.github/workflows/release.yml` | actions/upload-artifact | `v7.0.1` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.github/workflows/release.yml` | codecov/codecov-action | `v7.1.1` | `v7.1.1` | `v7.1.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.github/workflows/release.yml` | oven-sh/setup-bun | `v2.2.0` | `v2.2.0` | `v2.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.github/workflows/release.yml` | peter-evans/create-pull-request | `v8.1.1` | `v8.1.3` | `v8.1.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.github/workflows/workflows.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/publish-dockerhub/action.yml` | docker/metadata-action | `v6` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/setup-buildx-resilient/action.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/example-app.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/example-app.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/example-app.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/example-app.yml` | actions/setup-java | `v6` | `v6.2.0` | `v6.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/example-app.yml` | actions/setup-node | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/example-app.yml` | android-actions/setup-android | `9fc6c4e9069bf8d3d10b2204b1fb8f6ef7065407` | `be39fa834029ff78f1a44aa3bb0819b8fc2bd8fd` | `v4.0.4` | Immutable commit for v4.0.4; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/javascript-first-example.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/javascript-first-gate.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/javascript-first-gate.yml` | actions/setup-node | `949feb2413d6458794dcd2491c4babbbce0c15c1` | `949feb2413d6458794dcd2491c4babbbce0c15c1` | `v7.1.0` | Immutable commit for v7.1.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/links.yml` | actions/cache | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/links.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/links.yml` | actions/setup-node | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/release.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/release.yml` | actions/setup-node | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/release.yml` | denoland/setup-deno | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` | `v2.0.5` | Immutable commit for v2.0.5; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/release.yml` | oven-sh/setup-bun | `0c5077e51419868618aeaa5fe8019c62421857d6` | `0c5077e51419868618aeaa5fe8019c62421857d6` | `v2.2.0` | Immutable commit for v2.2.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/release.yml` | peter-evans/create-pull-request | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` | `3ffccacd46053766916f087ce41d627c0b8cf2d1` | `v8.1.3` | Immutable commit for v8.1.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/security.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/security.yml` | actions/setup-node | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/workflows.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/workflows.yml` | actions/setup-node | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.4` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/docs.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/docs.yml` | actions/configure-pages | `v6.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/docs.yml` | actions/deploy-pages | `v5.0.1` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/docs.yml` | actions/upload-artifact | `v7.0.2` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/docs.yml` | actions/upload-pages-artifact | `v5.0.0` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/docs.yml` | shivammathur/setup-php | `2.37.2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/links.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2.9.0` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/links.yml` | shivammathur/setup-php | `2.37.2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/release.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/release.yml` | ramsey/composer-install | `4.0.0` | `4.0.0` | `4.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/release.yml` | shivammathur/setup-php | `2.37.2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/security.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/security.yml` | actions/dependency-review-action | `v5.0.0` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/security.yml` | github/codeql-action | `v4.38.2` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/security.yml` | shivammathur/setup-php | `2.37.2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/workflows.yml` | actions/checkout | `v7.0.1` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/workflows.yml` | shivammathur/setup-php | `2.37.2` | `2.40.0` | `2.40.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/php/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.4` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/docs.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/docs.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/docs.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/docs.yml` | actions/setup-python | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/links.yml` | actions/cache | `v5` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/links.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml` | actions/setup-python | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml` | codecov/codecov-action | `fb8b3582c8e4def4969c97caa2f19720cb33a72f` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/release.yml` | pypa/gh-action-pypi-publish | `7245906fb61fa33a13554f9d5fb856fe61758086` | `7245906fb61fa33a13554f9d5fb856fe61758086` | `v1.14.3` | Immutable commit for v1.14.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/security.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/security.yml` | actions/setup-python | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/workflows.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/workflows.yml` | actions/setup-node | `v7` | `v7.1.0` | `v7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.4` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.pre-commit-config.yaml` | astral-sh/ruff-pre-commit | `v0.8.4` | `v0.17.5` | `v0.17.5` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.pre-commit-config.yaml` | pre-commit/mirrors-mypy | `v1.13.0` | `v2.4.1` | `v2.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.pre-commit-config.yaml` | shellcheck-py/shellcheck-py | `v0.11.0.1` | `v0.11.0.1` | `v0.11.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/actions/download-artifact/action.yml` | actions/download-artifact | `9000827ccba6bdab643e8b6fd33ac0654aef8333` | `9000827ccba6bdab643e8b6fd33ac0654aef8333` | `v8.0.2` | Immutable commit for v8.0.2; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/actions/setup-buildx-resilient/action.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/desktop-release.yml` | actions/attest | `v4` | `v4.2.2` | `v4.2.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/desktop-release.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/desktop-release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/desktop-release.yml` | dtolnay/rust-toolchain | `e2a55d2ffb04f378e9626c28d38b36d230d1e12f` | `683b588c487a69d01f6c6ddf40f036ff682cc2c8` | `v1` | Immutable commit for v1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/javascript-first-example.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/javascript-first-example.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/javascript-first-example.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/javascript-first-example.yml` | dtolnay/rust-toolchain | `e2a55d2ffb04f378e9626c28d38b36d230d1e12f` | `683b588c487a69d01f6c6ddf40f036ff682cc2c8` | `v1` | Immutable commit for v1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/javascript-first-gate.yml` | actions/checkout | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` | Immutable commit for v7.0.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/javascript-first-gate.yml` | actions/setup-node | `949feb2413d6458794dcd2491c4babbbce0c15c1` | `949feb2413d6458794dcd2491c4babbbce0c15c1` | `v7.1.0` | Immutable commit for v7.1.0; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/links.yml` | actions/cache | `v6` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/links.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/links.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/links.yml` | lycheeverse/lychee-action | `v2` | `v2.9.0` | `v2.9.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | actions/cache | `v6` | `v6.1.0` | `v6.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | actions/configure-pages | `v6` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | actions/deploy-pages | `v5` | `v5.0.1` | `v5.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | actions/upload-pages-artifact | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | codecov/codecov-action | `fb8b3582c8e4def4969c97caa2f19720cb33a72f` | `303a32d7a59b442fa8d48b6a1cc6825c09c847a5` | `v7.1.1` | Immutable commit for v7.1.1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | docker/build-push-action | `v7` | `v7.4.0` | `v7.4.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | docker/login-action | `v4` | `v4.8.0` | `v4.8.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | docker/setup-buildx-action | `v4` | `v4.4.1` | `v4.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | dtolnay/rust-toolchain | `e2a55d2ffb04f378e9626c28d38b36d230d1e12f` | `683b588c487a69d01f6c6ddf40f036ff682cc2c8` | `v1` | Immutable commit for v1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | peter-evans/create-pull-request | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` | `3ffccacd46053766916f087ce41d627c0b8cf2d1` | `v8.1.3` | Immutable commit for v8.1.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | rust-lang/crates-io-auth-action | `c6f97d42243bad5fab37ca0427f495c86d5b1a18` | `3268eb413133e2960fa4ae0e963ca76380c54cd9` | `v1.0.6` | Immutable commit for v1.0.6; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/release.yml` | taiki-e/install-action | `e67fa11c4b9316fa714ddf0abed07a0c3143b95b` | `cfdb7ed4ccc7c7dce37759eae89dc5674b469b39` | `v2.90.3` | Immutable commit for v2.90.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/security.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/security.yml` | actions/dependency-review-action | `v5` | `v5.0.0` | `v5.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/security.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/security.yml` | github/codeql-action | `v4` | `v4.39.3` | `v4.39.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/security.yml` | taiki-e/install-action | `e67fa11c4b9316fa714ddf0abed07a0c3143b95b` | `cfdb7ed4ccc7c7dce37759eae89dc5674b469b39` | `v2.90.3` | Immutable commit for v2.90.3; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/workflows.yml` | actions/checkout | `v7` | `v7.0.1` | `v7.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/workflows.yml` | actions/upload-artifact | `v7` | `v7.0.2` | `v7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/workflows.yml` | dtolnay/rust-toolchain | `e2a55d2ffb04f378e9626c28d38b36d230d1e12f` | `683b588c487a69d01f6c6ddf40f036ff682cc2c8` | `v1` | Immutable commit for v1; original SHA pin policy preserved |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/workflows.yml` | zizmorcore/zizmor-action | `v0.6.4` | `v0.8.1` | `v0.8.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.pre-commit-config.yaml` | pre-commit/pre-commit-hooks | `v5.0.0` | `v6.0.0` | `v6.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/rust/.pre-commit-config.yaml` | shellcheck-py/shellcheck-py | `v0.11.0.1` | `v0.11.0.1` | `v0.11.0.1` | Current stable floor/ref |

## github-input

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/security.yml` | trufflesecurity/trufflehog | `3.99.7` | `3.99.9` | `v3.99.9` | Current stable floor/ref |

## go

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `benchmarks/go/go.mod` | github.com/dlclark/regexp2 | `v1.12.0` | `v1.12.0` | `1.12.0` | Current stable floor/ref |
| `benchmarks/go/go.mod` | github.com/google/uuid | `v1.6.0` | `v1.6.0` | `1.6.0` | Current stable floor/ref |
| `benchmarks/go/go.mod` | github.com/pkoukk/tiktoken-go | `v0.1.8` | `v0.1.8` | `0.1.8` | Current stable floor/ref |
| `benchmarks/go/go.mod` | github.com/pkoukk/tiktoken-go-loader | `v0.0.2` | `v0.0.2` | `0.0.2` | Current stable floor/ref |
| `benchmarks/go/go.mod` | github.com/stretchr/testify | `v1.12.1` | `v1.12.1` | `1.12.1` | Current stable floor/ref |
| `benchmarks/go/go.mod` | go.yaml.in/yaml/v3 | `added` | `v3.0.6` | `3.0.6` | Current stable floor/ref |

## gradle

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `kotlin/gradle/wrapper/gradle-wrapper.properties` | gradle | `9.8.2` | `9.9.1` | `9.9.1` | Current stable floor/ref |

## gradle-plugin

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `examples/maven/kotlin/build.gradle.kts` | org.jetbrains.kotlin.jvm | `2.4.21` | `2.4.21` | `2.4.21` | Current stable floor/ref |
| `experiments/issue-377/kgp-named-enum/build.gradle.kts` | org.jetbrains.kotlin.multiplatform | `2.4.21` | `2.4.21` | `2.4.21` | Current stable floor/ref |
| `kotlin/build.gradle.kts` | com.android.kotlin.multiplatform.library | `9.5.1` | `9.5.1` | `9.5.1` | Current stable floor/ref |
| `kotlin/build.gradle.kts` | com.vanniktech.maven.publish | `0.37.0` | `0.37.0` | `0.37.0` | Current stable floor/ref |
| `kotlin/build.gradle.kts` | org.jetbrains.kotlin.multiplatform | `2.4.21` | `2.4.21` | `2.4.21` | Current stable floor/ref |
| `kotlin/build.gradle.kts` | org.jlleitschuh.gradle.ktlint | `14.2.0` | `14.2.0` | `14.2.0` | Current stable floor/ref |

## maven

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `benchmarks/java/pom.xml` | com.diffplug.spotless:spotless-maven-plugin | `3.11.0` | `3.11.0` | `3.11.0` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | com.google.code.gson:gson | `2.15.0` | `2.15.0` | `2.15.0` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | com.google.errorprone:error_prone_annotations | `added` | `2.52.0` | `2.52.0` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | com.google.googlejavaformat:google-java-format | `added` | `2.0.0` | `2.0.0` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | com.knuddels:jtokkit | `1.1.0` | `1.1.0` | `1.1.0` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | org.apache.maven.plugins:maven-compiler-plugin | `3.16.0` | `3.16.0` | `3.16.0` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | org.apache.maven.plugins:maven-enforcer-plugin | `3.7.0` | `3.7.0` | `3.7.0` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | org.apache.maven.plugins:maven-jar-plugin | `3.5.1` | `3.5.1` | `3.5.1` | Current stable floor/ref |
| `benchmarks/java/pom.xml` | org.codehaus.mojo:exec-maven-plugin | `3.6.4` | `3.7.0` | `3.7.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | com.diffplug.spotless:spotless-maven-plugin | `2.43.0` | `3.11.0` | `3.11.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | com.github.spotbugs:spotbugs-maven-plugin | `4.8.3.1` | `4.10.5.0` | `4.10.5.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | com.google.googlejavaformat:google-java-format | `1.19.2` | `2.0.0` | `2.0.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.apache.maven.plugins:maven-compiler-plugin | `3.12.1` | `3.16.0` | `3.16.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.apache.maven.plugins:maven-enforcer-plugin | `3.4.1` | `3.7.0` | `3.7.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.apache.maven.plugins:maven-gpg-plugin | `3.1.0` | `3.2.8` | `3.2.8` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.apache.maven.plugins:maven-jar-plugin | `3.3.0` | `3.5.1` | `3.5.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.apache.maven.plugins:maven-javadoc-plugin | `3.6.3` | `3.12.0` | `3.12.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.apache.maven.plugins:maven-source-plugin | `3.3.0` | `3.4.0` | `3.4.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.apache.maven.plugins:maven-surefire-plugin | `3.2.5` | `3.6.1` | `3.6.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.jacoco:jacoco-maven-plugin | `0.8.11` | `0.8.16` | `0.8.16` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.jspecify:jspecify | `added` | `1.0.1` | `1.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.junit.jupiter:junit-jupiter | `5.10.2` | `6.1.3` | `6.1.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/java/pom.xml` | org.junit.jupiter:junit-jupiter-params | `5.10.2` | `6.1.3` | `6.1.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | com.diffplug.spotless:spotless-maven-plugin | `2.43.0` | `3.11.0` | `3.11.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | com.github.spotbugs:spotbugs-maven-plugin | `4.8.3.1` | `4.10.5.0` | `4.10.5.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | com.google.googlejavaformat:google-java-format | `1.19.2` | `2.0.0` | `2.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.apache.maven.plugins:maven-compiler-plugin | `3.12.1` | `3.16.0` | `3.16.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.apache.maven.plugins:maven-enforcer-plugin | `3.4.1` | `3.7.0` | `3.7.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.apache.maven.plugins:maven-gpg-plugin | `3.1.0` | `3.2.8` | `3.2.8` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.apache.maven.plugins:maven-jar-plugin | `3.3.0` | `3.5.1` | `3.5.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.apache.maven.plugins:maven-javadoc-plugin | `3.6.3` | `3.12.0` | `3.12.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.apache.maven.plugins:maven-source-plugin | `3.3.0` | `3.4.0` | `3.4.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.apache.maven.plugins:maven-surefire-plugin | `3.2.5` | `3.6.1` | `3.6.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.jacoco:jacoco-maven-plugin | `0.8.11` | `0.8.16` | `0.8.16` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.jspecify:jspecify | `added` | `1.0.1` | `1.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.junit.jupiter:junit-jupiter | `5.10.2` | `6.1.3` | `6.1.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/java/pom.xml` | org.junit.jupiter:junit-jupiter-params | `5.10.2` | `6.1.3` | `6.1.3` | Current stable floor/ref |
| `java/.mvn/wrapper/maven-wrapper.properties` | org.apache.maven.wrapper:maven-wrapper | `3.3.4` | `3.3.4` | `3.3.4` | Current stable floor/ref |
| `java/.mvn/wrapper/maven-wrapper.properties` | org.apache.maven:apache-maven | `3.10.0` | `3.10.0` | `3.10.0` | Current stable floor/ref |
| `java/pom.xml` | com.diffplug.spotless:spotless-maven-plugin | `3.11.0` | `3.11.0` | `3.11.0` | Current stable floor/ref |
| `java/pom.xml` | com.google.googlejavaformat:google-java-format | `2.0.0` | `2.0.0` | `2.0.0` | Current stable floor/ref |
| `java/pom.xml` | org.apache.maven.plugins:maven-compiler-plugin | `3.16.0` | `3.16.0` | `3.16.0` | Current stable floor/ref |
| `java/pom.xml` | org.apache.maven.plugins:maven-enforcer-plugin | `3.7.0` | `3.7.0` | `3.7.0` | Current stable floor/ref |
| `java/pom.xml` | org.apache.maven.plugins:maven-gpg-plugin | `3.2.8` | `3.2.8` | `3.2.8` | Current stable floor/ref |
| `java/pom.xml` | org.apache.maven.plugins:maven-jar-plugin | `3.5.1` | `3.5.1` | `3.5.1` | Current stable floor/ref |
| `java/pom.xml` | org.apache.maven.plugins:maven-javadoc-plugin | `3.12.0` | `3.12.0` | `3.12.0` | Current stable floor/ref |
| `java/pom.xml` | org.apache.maven.plugins:maven-source-plugin | `3.4.0` | `3.4.0` | `3.4.0` | Current stable floor/ref |
| `java/pom.xml` | org.apache.maven.plugins:maven-surefire-plugin | `3.6.1` | `3.6.1` | `3.6.1` | Current stable floor/ref |
| `java/pom.xml` | org.jspecify:jspecify | `added` | `1.0.1` | `1.0.1` | Current stable floor/ref |
| `java/pom.xml` | org.junit.jupiter:junit-jupiter | `6.1.3` | `6.1.3` | `6.1.3` | Current stable floor/ref |
| `java/pom.xml` | org.sonatype.central:central-publishing-maven-plugin | `0.12.0` | `0.12.0` | `0.12.0` | Current stable floor/ref |
| `kotlin/build.gradle.kts` | com.pinterest.ktlint:ktlint-cli | `1.8.0` | `1.8.0` | `1.8.0` | Current stable floor/ref |

## npm

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/publish-js.yml` | npm | `12.2.1` | `12.2.2` | `12.2.2` | Current stable floor/ref |
| `.pre-commit-config.yaml` | eslint | `10.14.0` | `10.15.0` | `10.15.0` | Current stable floor/ref |
| `benchmarks/js/package.json` | gpt-tokenizer | `^4.1.0` | `^4.1.2` | `4.1.2` | Current stable floor/ref |
| `benchmarks/tools/package.json` | csv-parse | `^7.0.3` | `^7.0.3` | `7.0.3` | Current stable floor/ref |
| `benchmarks/tools/package.json` | fast-xml-parser | `^5.12.0` | `^5.12.1` | `5.12.1` | Current stable floor/ref |
| `benchmarks/tools/package.json` | lino-objects-codec | `^0.9.5` | `^0.9.6` | `0.9.6` | Current stable floor/ref |
| `benchmarks/tools/package.json` | yaml | `^2.9.1` | `^2.9.1` | `2.9.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | @changesets/cli | `^3.0.3` | `^3.0.3` | `3.0.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | @eslint/js | `added` | `^10.0.1` | `10.0.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | eslint | `^9.38.0` | `^10.15.0` | `10.15.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | eslint-config-prettier | `^10.1.8` | `^10.1.8` | `10.1.8` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | eslint-plugin-prettier | `^5.5.4` | `^5.5.7` | `5.5.7` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | husky | `^9.1.7` | `^9.1.7` | `9.1.7` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | jscpd | `^5.4.0` | `^5.4.3` | `5.4.3` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | lint-staged | `^16.4.0` | `^17.6.0` | `17.6.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | prettier | `^3.6.2` | `^3.10.1` | `3.10.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/js/package.json` | test-anywhere | `^0.8.48` | `^0.9.1` | `0.9.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/package.json` | @eslint/js | `10.0.1` | `10.0.1` | `10.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/package.json` | @types/bun | `1.4.4` | `1.4.4` | `1.4.4` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/package.json` | @types/node | `26.6.6` | `26.6.6` | `26.6.6` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/package.json` | eslint | `10.14.0` | `^10.15.0` | `10.15.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/package.json` | globals | `17.13.0` | `17.14.0` | `17.14.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/package.json` | prettier | `3.9.10` | `3.10.1` | `3.10.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/package.json` | typescript | `7.0.2` | `7.0.2` | `7.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json` | @actions/artifact | `6.3.1` | `6.3.1` | `6.3.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json` | @actions/core | `3.0.1` | `3.0.1` | `3.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json` | @zip.js/zip.js | `2.24.0` | `2.25.0` | `2.25.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json` | glob | `13.0.6` | `14.0.6` | `14.0.6` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json` | glob-parent | `added` | `6.0.2` | `6.0.2` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json` | punycode | `2.3.1` | `2.3.1` | `2.3.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/package.json` | unzip-stream | `0.3.4` | `0.3.4` | `0.3.4` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | @changesets/cli | `^3.0.3` | `^3.0.3` | `3.0.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | @eslint/js | `^10.0.1` | `^10.0.1` | `10.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | command-stream | `2.4.0` | `2.6.0` | `2.6.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | eslint | `^10.13.0` | `^10.15.0` | `10.15.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | eslint-config-prettier | `^10.1.8` | `^10.1.8` | `10.1.8` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | eslint-plugin-prettier | `^5.5.4` | `^5.5.7` | `5.5.7` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | husky | `^9.1.7` | `^9.1.7` | `9.1.7` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | jscpd | `^5.4.0` | `^5.4.3` | `5.4.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | lino-arguments | `0.4.0` | `0.4.1` | `0.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | lint-staged | `^16.4.0` | `^17.6.0` | `17.6.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | prettier | `^3.6.2` | `^3.10.1` | `3.10.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/js/package.json` | test-anywhere | `^0.8.48` | `^0.9.1` | `0.9.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/package.json` | @actions/artifact | `6.3.1` | `6.3.1` | `6.3.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/package.json` | @actions/core | `3.0.1` | `3.0.1` | `3.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/package.json` | @vercel/ncc | `0.45.0` | `0.45.0` | `0.45.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/package.json` | glob | `13.0.6` | `14.0.6` | `14.0.6` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/package.json` | glob-parent | `added` | `6.0.2` | `6.0.2` | Current stable floor/ref |
| `docs/comparison/package.json` | lino-objects-codec | `^0.9.5` | `^0.9.6` | `0.9.6` | Current stable floor/ref |
| `docs/comparison/package.json` | yaml | `^2.9.1` | `^2.9.1` | `2.9.1` | Current stable floor/ref |
| `docs/website/package.json` | eslint | `^10.14.0` | `^10.15.0` | `10.15.0` | Current stable floor/ref |
| `docs/website/package.json` | lino-objects-codec | `^0.9.5` | `^0.9.6` | `0.9.6` | Current stable floor/ref |
| `docs/website/package.json` | vite | `^8.3.5` | `^8.3.8` | `8.3.8` | Current stable floor/ref |
| `js/package.json` | bun-types | `^1.4.4` | `^1.4.4` | `1.4.4` | Current stable floor/ref |
| `js/package.json` | eslint | `^10.14.0` | `^10.15.0` | `10.15.0` | Current stable floor/ref |
| `js/package.json` | peggy | `^5.1.1` | `^5.1.1` | `5.1.1` | Current stable floor/ref |
| `js/package.json` | prettier | `^3.9.10` | `^3.10.1` | `3.10.1` | Current stable floor/ref |
| `js/package.json` | typescript | `^7.0.2` | `^7.0.2` | `7.0.2` | Current stable floor/ref |

## nuget

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `benchmarks/csharp/Benchmark.csproj` | Microsoft.ML.Tokenizers | `2.0.1` | `3.0.0` | `3.0.0` | Current stable floor/ref |
| `benchmarks/csharp/Benchmark.csproj` | Microsoft.ML.Tokenizers.Data.Cl100kBase | `2.0.1` | `3.0.0` | `3.0.0` | Current stable floor/ref |
| `benchmarks/csharp/Benchmark.csproj` | Microsoft.ML.Tokenizers.Data.O200kBase | `2.0.1` | `3.0.0` | `3.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Azure.Core | `added` | `1.65.0` | `1.65.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.ApplicationInsights | `added` | `3.2.0` | `3.2.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Bcl.AsyncInterfaces | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Extensions.Configuration | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Extensions.Configuration.Binder | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Extensions.Configuration.EnvironmentVariables | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Extensions.DependencyInjection | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Extensions.Logging | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Extensions.Logging.Configuration | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Extensions.Options.ConfigurationExtensions | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Identity.Client | `added` | `4.92.0` | `4.92.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Identity.Client.Extensions.Msal | `added` | `4.92.0` | `4.92.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.IdentityModel.Abstractions | `added` | `8.23.0` | `8.23.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Testing.Extensions.Telemetry | `added` | `2.5.3` | `2.5.3` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Testing.Extensions.TrxReport.Abstractions | `added` | `2.5.3` | `2.5.3` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Testing.Platform | `added` | `2.5.3` | `2.5.3` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | Microsoft.Testing.Platform.MSBuild | `added` | `2.5.3` | `2.5.3` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | OpenTelemetry | `added` | `1.21.0` | `1.21.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | OpenTelemetry.Api | `added` | `1.21.0` | `1.21.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | OpenTelemetry.Api.ProviderBuilderExtensions | `added` | `1.21.0` | `1.21.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | OpenTelemetry.Extensions.Hosting | `added` | `1.21.0` | `1.21.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | OpenTelemetry.PersistentStorage.Abstractions | `added` | `1.2.0` | `1.2.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | OpenTelemetry.PersistentStorage.FileSystem | `added` | `1.2.0` | `1.2.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | System.ClientModel | `added` | `1.17.0` | `1.17.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | System.Memory.Data | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | System.Security.Cryptography.ProtectedData | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation.Tests/Link.Foundation.Links.Notation.Tests.csproj` | xunit.v3 | `4.0.3` | `4.0.3` | `4.0.3` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj` | Pegasus | `4.1.0` | `4.1.0` | `4.1.0` | Current stable floor/ref |
| `csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj` | Platform.Collections | `0.4.0` | `0.4.0` | `0.4.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/tests/MyPackage.Tests/MyPackage.Tests.csproj` | Microsoft.Bcl.AsyncInterfaces | `added` | `11.0.0` | `11.0.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/tests/MyPackage.Tests/MyPackage.Tests.csproj` | Microsoft.NET.Test.Sdk | `18.11.0` | `18.12.0` | `18.12.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/tests/MyPackage.Tests/MyPackage.Tests.csproj` | coverlet.collector | `10.1.0` | `10.1.0` | `10.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/tests/MyPackage.Tests/MyPackage.Tests.csproj` | xunit.runner.visualstudio | `4.0.1` | `4.0.1` | `4.0.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/csharp/tests/MyPackage.Tests/MyPackage.Tests.csproj` | xunit.v3.mtp-off | `4.0.2` | `4.0.3` | `4.0.3` | Current stable floor/ref |
| `docs/case-studies/csharp-peg-simplification/solutions/01-parse-expression/project/TestParseExpression.csproj` | Pegasus | `4.1.0` | `4.1.0` | `4.1.0` | Current stable floor/ref |
| `docs/case-studies/csharp-peg-simplification/solutions/02-capture-validate/project/TestCaptureValidate.csproj` | Pegasus | `4.1.0` | `4.1.0` | `4.1.0` | Current stable floor/ref |
| `docs/case-studies/csharp-peg-simplification/solutions/03-semantic-predicates/project/TestSemanticPredicates.csproj` | Pegasus | `4.1.0` | `4.1.0` | `4.1.0` | Current stable floor/ref |
| `docs/case-studies/csharp-peg-simplification/solutions/04-hybrid-approach/project/TestHybrid.csproj` | Pegasus | `4.1.0` | `4.1.0` | `4.1.0` | Current stable floor/ref |
| `docs/case-studies/csharp-peg-simplification/solutions/05-minimized-hybrid/project/TestMinimizedHybrid.csproj` | Pegasus | `4.1.0` | `4.1.0` | `4.1.0` | Current stable floor/ref |
| `experiments/minimal-peg-rules/TestMinimalRules.csproj` | Pegasus | `4.1.0` | `4.1.0` | `4.1.0` | Current stable floor/ref |

## pypi

| Manifest | Dependency | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `benchmarks/python/requirements.txt` | tiktoken | `>=0.14.0` | `>=0.14.0` | `0.14.0` | Current stable floor/ref |
| `cpp/tools/requirements.txt` | clang-format | `==23.1.5` | `==23.1.5` | `23.1.5` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | furo | `>=2024.8.6` | `>=2025.12.19` | `2025.12.19` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | hatchling | `>=0` | `>=1.33.0` | `1.33.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | mypy | `>=1.13.0,<2.0` | `>=2.4.1` | `2.4.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | myst-parser | `>=3.0` | `>=5.2.0` | `5.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | pre-commit | `>=4.0.0` | `>=4.7.0` | `4.7.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | pytest | `>=8.3.0` | `>=9.2.0` | `9.2.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | pytest-asyncio | `>=0.24.0` | `>=1.5.0` | `1.5.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | pytest-cov | `>=6.0.0` | `>=7.1.0` | `7.1.0` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | ruff | `>=0.8.0,<0.9` | `>=0.17.5` | `0.17.5` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | scriv | `>=1.7.0` | `>=1.8.1` | `1.8.1` | Current stable floor/ref |
| `dev/log/issues/330/pulls/331/templates/python/pyproject.toml` | sphinx | `>=7.4` | `>=9.2.0` | `9.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-ci.txt` | clang-format | `==23.1.3` | `==23.1.5` | `23.1.5` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-ci.txt` | clang-tidy | `==22.1.8` | `==23.1.4` | `23.1.4` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-ci.txt` | conan | `==2.33.0` | `==2.34.0` | `2.34.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-ci.txt` | cppcheck | `==1.5.3` | `==1.5.3` | `1.5.3` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-ci.txt` | gcovr | `==8.6` | `==8.8` | `8.8` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-ci.txt` | pytest | `==9.1.1` | `==9.2.0` | `9.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-security.txt` | pip-audit | `==2.10.1` | `==2.10.1` | `2.10.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/cpp/scripts/requirements-security.txt` | zizmor | `==1.29.0` | `==1.32.0` | `1.32.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | furo | `>=2024.8.6` | `>=2025.12.19` | `2025.12.19` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | hatchling | `>=0` | `>=1.33.0` | `1.33.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | mypy | `>=1.13.0,<2.0` | `>=2.4.1` | `2.4.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | myst-parser | `>=3.0` | `>=5.2.0` | `5.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | pre-commit | `>=4.0.0` | `>=4.7.0` | `4.7.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | pytest | `>=8.3.0` | `>=9.2.0` | `9.2.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | pytest-asyncio | `>=0.24.0` | `>=1.5.0` | `1.5.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | pytest-cov | `>=6.0.0` | `>=7.1.0` | `7.1.0` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | ruff | `>=0.8.0,<0.9` | `>=0.17.5` | `0.17.5` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | scriv | `>=1.7.0` | `>=1.8.1` | `1.8.1` | Current stable floor/ref |
| `dev/log/issues/377/pulls/378/templates/python/pyproject.toml` | sphinx | `>=7.4` | `>=9.2.0` | `9.2.0` | Current stable floor/ref |
| `python/pyproject.toml` | black | `>=26.10.1` | `>=26.10.1` | `26.10.1` | Current stable floor/ref |
| `python/pyproject.toml` | flake8 | `>=7.5.0` | `>=7.5.0` | `7.5.0` | Current stable floor/ref |
| `python/pyproject.toml` | isort | `>=9.0.2` | `>=9.0.2` | `9.0.2` | Current stable floor/ref |
| `python/pyproject.toml` | pytest | `>=9.2.0` | `>=9.2.0` | `9.2.0` | Current stable floor/ref |
| `python/pyproject.toml` | pytest-timeout | `>=2.4.0` | `>=2.4.0` | `2.4.0` | Current stable floor/ref |
| `python/pyproject.toml` | setuptools | `>=84.2.1` | `>=84.2.1` | `84.2.1` | Current stable floor/ref |
| `scripts/ci/requirements.txt` | build | `>=1.6.1` | `>=1.6.1` | `1.6.1` | Current stable floor/ref |
| `scripts/ci/requirements.txt` | twine | `>=7.0.0` | `>=7.0.0` | `7.0.0` | Current stable floor/ref |
| `scripts/ci/requirements.txt` | uv | `added` | `==0.13.8` | `0.13.8` | Current stable floor/ref |
| `scripts/ci/requirements.txt` | zizmor | `==1.32.0` | `==1.32.0` | `1.32.0` | Current stable floor/ref |
