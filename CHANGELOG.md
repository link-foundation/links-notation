# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CI/CD: Dependabot covers every ecosystem in the repository. The `maven`,
  `composer` and `gomod` manifests were unwatched, so Java, PHP and Go were
  never offered updates ([#292](https://github.com/link-foundation/links-notation/issues/292))
- CI/CD: `scripts/version-consistency.mjs`, a hard-failing check on every pull
  request that the seven implementations declare the same version. The release
  audit only warns, because a bump legitimately lands before the release that
  publishes it; disagreement between the implementations reads only the working
  tree and is always a defect
  ([#292](https://github.com/link-foundation/links-notation/issues/292))
- Native PHP implementation of the Links Notation parser and formatter
  (`link-foundation/links-notation` on Packagist), with a full PHPUnit test
  suite ported from Python, PSR-12 linting and a dedicated CI workflow
  ([#284](https://github.com/link-foundation/links-notation/issues/284))
- Parentheses open a nested context in every implementation (JavaScript, Python,
  Rust, Go, Java, C#): the body of `( )` starts fresh at indentation level zero
  and follows the same rules as the root document, so indentation is structural
  inside parentheses and parenthesised groups can express nested records
  ([#282](https://github.com/link-foundation/links-notation/issues/282))
- Blank lines inside a block are skipped instead of ending it, at the root and
  inside parentheses alike
- Tests covering nested indentation inside parentheses for all six
  implementations
- Comprehensive code quality improvements across all language implementations
- Input validation and size limits for all parsers
- Proper error types in Rust implementation
- JSDoc documentation for JavaScript/TypeScript implementation
- Security policy (SECURITY.md)
- Pre-commit hooks configuration
- Dependabot for automated dependency updates

- CI/CD: a `workflows` check that runs actionlint and zizmor over
  `.github/workflows/`, so a workflow defect is caught in review rather than on
  the default branch ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: a `security` workflow carrying CodeQL analysis for every language the
  extractors support, dependency review on pull requests, and a TruffleHog scan
  of the history for live credentials ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: a `links` check over the repository's Markdown, with known false
  positives listed in `.lycheeignore` ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: `scripts/release-audit.mjs`, which compares each language's declared
  version against what the registry actually serves, so a silently failed
  publish stops looking like a successful one ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: every workflow accepts a `verbose` input (default off) and exports
  `CI_VERBOSE`, so extra diagnostics can be turned on for one run without
  editing or committing anything ([#290](https://github.com/link-foundation/links-notation/issues/290))
- Publish steps verify the artefact after pushing it: npm, PyPI, crates.io,
  NuGet, Maven Central, Packagist and proxy.golang.org are each polled for the
  version just released, and the GitHub release is created only once the
  registry confirms it ([#290](https://github.com/link-foundation/links-notation/issues/290))

### Changed
- Every language's dependencies updated to their current releases, including the
  major bumps: PHPUnit 10 to 13, PHP_CodeSniffer 3 to 4, xunit 2 to xunit.v3 4,
  JUnit 5 to 6, `maven.compiler.release` 11 to 21, Go 1.21 to 1.24 (CI on 1.26),
  `net8.0` to `net10.0`, and PHP `>=8.1` to `>=8.4` (CI on 8.4 and 8.5). Each
  suite was run against the new versions before the bump was kept
  ([#292](https://github.com/link-foundation/links-notation/issues/292))
- C#: the test project runs on Microsoft.Testing.Platform. The .NET 10 SDK
  dropped the VSTest path xunit v2 used, so `csharp/global.json` selects the new
  runner and the test project builds as a self-executing `Exe`
  ([#292](https://github.com/link-foundation/links-notation/issues/292))
- Grammar: a reference is a `delimited_reference` (`n_quoted_reference` or
  `empty_reference`) or a `simple_reference`; the three delimiters `"`, `'`
  and `` ` `` are documented as equivalent, and an even delimiter run that does
  not open an n-quoted reference with a substantive body is the empty reference
  ([#288](https://github.com/link-foundation/links-notation/issues/288))
- Grammar: `multiline_link`, `multiline_value_link` and `multiline_values` are
  replaced by `nested_group` and `nested_group_body`; `eol` now also matches the
  end of a nested group, and `ENTER_NESTED_CONTEXT`/`EXIT_NESTED_CONTEXT` were
  added to the indentation semantic actions
- Python minimum version relaxed from 3.13 to 3.9+
- Updated GitHub Actions to latest versions (v4/v5)
- Replaced deprecated `actions-rs` with `dtolnay/rust-toolchain`
- Standardized release tag format across all workflows (language_version)
- Improved null/undefined checking in JavaScript
- Improved None checking in Python (explicit `is not None`)
- Enhanced C# `Equals()` method to properly compare anonymous links
- Reduced excessive cloning in Rust implementation
- Improved quote escaping to handle edge cases in JavaScript

- CI/CD: npm, PyPI and crates.io publish through OIDC trusted publishing where
  it is configured, falling back to the existing token secret until it is ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: per-job concurrency groups cancel superseded pull request runs but
  never cancel a run on `main`, and publish jobs queue instead of cancelling so
  a release is never interrupted half-way ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: workflow `permissions` are declared least-privilege, checkouts no
  longer persist the job token, and `always()` was replaced by `!cancelled()`
  where a cancelled run should not continue ([#290](https://github.com/link-foundation/links-notation/issues/290))
- C# packaging and DocFX configuration are vendored in the repository instead of
  being fetched at run time ([#290](https://github.com/link-foundation/links-notation/issues/290))

### Fixed
- A bare delimiter pair is now the empty reference in every implementation
  (JavaScript, Python, Rust, Go, Java, C#, PHP): `(a "" b)` holds an empty
  reference instead of the two-character text `""`, `(a "" "" b)` holds two
  empty references instead of merging into one holding a space, and
  `("" ("" 1))` parses instead of failing. A run of an even number of
  delimiters keeps its n-quote meaning only when it encloses a substantive
  body, so `(a ""x"" b)` and `(x "" " "")` are unchanged
  ([#288](https://github.com/link-foundation/links-notation/issues/288))
- Formatters no longer drop a reference that holds nothing or only whitespace:
  the empty reference is written as `""` and `Ref(" ")` as `' '`, so both read
  back as themselves
  ([#288](https://github.com/link-foundation/links-notation/issues/288))
- Indentation inside `( )` was ignored, so a parenthesised group collapsed to one
  flat list of references and records such as `value (` / `  id "1"` /
  `  label "one"` / `)` lost their boundaries
  ([#282](https://github.com/link-foundation/links-notation/issues/282))
- JavaScript Parser: Fixed null/undefined checks to use explicit comparison
- JavaScript Parser: Preserved error stack traces in error handling
- JavaScript Link: Added input validation for constructor parameters
- JavaScript Link: Fixed defensive programming in `simplify()` and `equals()` methods
- JavaScript Link: Improved quote escaping for references containing both single and double quotes
- Python Parser: Fixed None checks to use `is not None` instead of truthiness
- Python Parser: More specific exception handling (no longer catches all exceptions)
- Python Parser: Added input size validation
- Rust lib: Fixed `unwrap()` usage with proper error handling using `if let`
- Rust lib: Added proper `ParseError` type instead of returning String errors
- C# Link: Fixed `Equals()` method to properly handle two anonymous links (both with null IDs)
- CI/CD: Standardized release tag format across all workflows
- CI/CD: Added timeout-minutes to all workflow jobs
- CI/CD: Updated all deprecated GitHub Actions

- CI/CD: `workflow_dispatch` runs did nothing. Every job was gated on a changed
  file list, which is empty for a manual trigger, so the manual run each
  workflow advertised skipped its own work ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: the C# API reference was published to the `gh-pages` branch but never
  reachable. Pages serves the uploaded artefact, not that branch, so every
  `/csharp/` URL the READMEs advertise returned 404; the branch is now overlaid
  onto the artefact ([#290](https://github.com/link-foundation/links-notation/issues/290))
- C#: all 56 nullable reference warnings ([#290](https://github.com/link-foundation/links-notation/issues/290))
- C#: a failure while building the documentation withheld an already published
  release ([#290](https://github.com/link-foundation/links-notation/issues/290))
- Go: `setup-go` was told to cache a dependency file that does not exist, which
  logged a restore failure on every run of both jobs ([#290](https://github.com/link-foundation/links-notation/issues/290))
- Rust: the Cargo cache keyed only on `Cargo.lock` with no restore keys and no
  compiler version, so any lockfile edit was a total miss and a toolchain update
  silently poisoned `target` ([#290](https://github.com/link-foundation/links-notation/issues/290))
- Java and PHP declared a version that did not match the rest of the repository ([#290](https://github.com/link-foundation/links-notation/issues/290))
- `scripts/` regenerated `TEST_CASE_COMPARISON.md` from a Rust test path that
  the workspace restructure had moved, so the pre-commit hook had been failing
  with ENOENT and the published counts were stale ([#290](https://github.com/link-foundation/links-notation/issues/290))
- Every link in `TEST_CASE_COMPARISON.md`, and several in the READMEs, was dead ([#290](https://github.com/link-foundation/links-notation/issues/290))
- A live high-severity advisory in `js/package-lock.json`
  ([GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg))
  was resolved by matching the version `js/bun.lock` already carried ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: 62 shellcheck findings in `run:` blocks, mostly unquoted `>> $GITHUB_OUTPUT`
  ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: the secret scan aborted in argument parsing (`flag 'no-update' cannot be repeated`) without
  reading a single commit, and pinned the wrapper action while the scanner itself floated on
  `latest` ([#290](https://github.com/link-foundation/links-notation/issues/290))
- CI/CD: the `php` test matrix cancelled itself. All four legs shared one concurrency group, so
  three were cancelled the same second they started while the run stayed green: the repository had
  been testing one PHP version and reporting four ([#290](https://github.com/link-foundation/links-notation/issues/290))
- Go: coverage was never uploaded. Codecov answered `Token required - not valid tokenless upload` on
  every run and `fail_ci_if_error: false` reported the step as a success; the upload now runs only
  when `CODECOV_TOKEN` is configured, fails loudly when it is, and no longer sweeps
  `experiments/test_coverage_data.json` into the `go` flag ([#290](https://github.com/link-foundation/links-notation/issues/290))
- Docs website: `docs/website/package.json` declares `"type": "module"`, so the ESM `vite.config.js`
  is no longer loaded as CommonJS and every build no longer warns ([#290](https://github.com/link-foundation/links-notation/issues/290))

## [0.11.2] - 2024-XX-XX

### Added
- Multi-language support (JavaScript, Python, Rust, C#)
- Comprehensive test suites for all implementations
- CI/CD workflows for automated testing and publishing
- Support for indented syntax
- Support for multiline quoted strings
- Support for mixed indentation modes

### Fixed
- Various parser improvements and bug fixes

## [0.11.0] - 2024-XX-XX

### Added
- Initial multi-language release
- Core parser functionality
- Basic link notation support

<!-- This repository never tagged a unified `vX.Y.Z`; every release carries a
     per-language tag, so these links use the tags that actually exist. -->
[Unreleased]: https://github.com/link-foundation/links-notation/compare/0.11.2_rust...main
[0.11.2]: https://github.com/link-foundation/links-notation/releases/tag/0.11.2_rust
[0.11.0]: https://github.com/link-foundation/links-notation/releases/tag/0.11.0_rust
