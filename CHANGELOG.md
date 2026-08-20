# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Changed
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

### Fixed
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

[Unreleased]: https://github.com/link-foundation/links-notation/compare/v0.11.2...HEAD
[0.11.2]: https://github.com/link-foundation/links-notation/releases/tag/v0.11.2
[0.11.0]: https://github.com/link-foundation/links-notation/releases/tag/v0.11.0
