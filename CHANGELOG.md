# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Token efficiency benchmarks: `benchmarks/` measures what the same information
  costs in a model's context window as Links Notation, JSON, YAML, XML and CSV
  over 11 datasets covering uniform, semi-uniform, nested, deeply nested, keyed,
  sparse and tuple shapes. Counts are real BPE tokens in both `o200k_base` and
  `cl100k_base`, alongside characters and bytes, and the report is
  [benchmarks/BENCHMARK_RESULTS.md](benchmarks/BENCHMARK_RESULTS.md)
  ([#209](https://github.com/link-foundation/links-notation/issues/209))
- Benchmarks: every representation is derived by the benchmark from one source
  dataset, decoded back and compared with that dataset before a number is
  reported, and re-read by third-party parsers (`yaml`, `fast-xml-parser`,
  `csv-parse`, `lino-objects-codec`), so a format cannot win by carrying less
  ([#209](https://github.com/link-foundation/links-notation/issues/209))
- Benchmarks: all seven implementations count every generated document with
  their own parser and their own tokenizer, and each fails unless every number
  matches Rust's, which is what makes the published figures a property of the
  notation rather than of one language
  ([#209](https://github.com/link-foundation/links-notation/issues/209))
- CI/CD: a `benchmarks` workflow that runs the whole chain on every pull request
  that touches it and, on `main`, commits the regenerated documents, results and
  report with `GITHUB_TOKEN` - only when the benchmark succeeded and only when
  something changed ([#209](https://github.com/link-foundation/links-notation/issues/209))
- Go: `README.ru.md`, the only implementation without one. `README.ru.md` used to
  send a Russian reader to the English page with a note saying so
  ([#209](https://github.com/link-foundation/links-notation/pull/210))
- Go: `example_readme_test.go`, the documented snippets as runnable examples with
  `// Output:` comments, so `go test` fails when the README and the package
  disagree ([#209](https://github.com/link-foundation/links-notation/pull/210))
- Rust: `links_notation::VERSION`, the crate's own version, so a tool reporting
  which parser produced a result reads it from the parser. The benchmark report
  used to print the benchmark crate's `0.1.0` while measuring `links-notation`
  0.16.1 ([#209](https://github.com/link-foundation/links-notation/issues/209))
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
  Rust, Go, Java, C#, PHP): the body of `( )` starts fresh at indentation level
  zero and follows the same rules as the root document, so indentation is
  structural inside parentheses and parenthesised groups can express nested
  records ([#282](https://github.com/link-foundation/links-notation/issues/282))
- Blank lines inside a block are skipped instead of ending it, at the root and
  inside parentheses alike
- Tests covering nested indentation inside parentheses for all seven
  implementations, and `experiments/issue-282/parity`, which parses one document
  with all seven libraries at once and fails if any of them reads it differently
  ([#282](https://github.com/link-foundation/links-notation/issues/282))
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
- Rust: `ParseError::SyntaxError` carries where a document stopped parsing —
  `offset`, `line`, `column`, `expected`, `found` and the offending line — and
  `SyntaxError::summary()` and `SyntaxError::snippet()` render it. The crate
  also exports `parse_document_with_diagnostics`, and
  `cargo run --example parse_error_positions` prints what several broken
  documents report ([#302](https://github.com/link-foundation/links-notation/issues/302))
- JavaScript: `ParseError`, exported from the package, thrown by
  `Parser.parse` when a document does not parse. It carries `offset`, `line`,
  `column`, `found`, `lineText`, `snippet`, the generated parser's `location`
  and the original error as `cause` ([#302](https://github.com/link-foundation/links-notation/issues/302))
- C#: `ParseException`, thrown by `Parser.Parse`, carrying `Offset`, `Line`,
  `Column`, `Found`, `LineText`, `Summary` and `Snippet`. The Pegasus grammar
  turns on `@trace true` so `FurthestFailureTracer` can record the furthest
  position any rule reached, which is the only position that says where a
  backtracking parser gave up ([#302](https://github.com/link-foundation/links-notation/issues/302))
- `experiments/issue-302/run.sh` asks all seven implementations about the same
  five documents, four of which do not parse, and prints the answers next to
  each other ([#302](https://github.com/link-foundation/links-notation/issues/302))
- Comments in every implementation (Rust, JavaScript, Python, Go, Java, C#,
  PHP): a `#` written where a reference could begin hides the rest of the line
  it stands on, so a document can carry prose about itself. Prose written after
  a `#` used to parse by accident - `# a b` read as the link `(# a b)` - and
  broke on a bare colon, so `# a: b` was a syntax error
  ([#301](https://github.com/link-foundation/links-notation/issues/301))
- A comment is blanked rather than cut out: each of its characters becomes a
  space, so a parse error still reports the offset, line and column the
  document was written at, and a line holding only a comment becomes
  whitespace, which separates links the way an empty line does and does not end
  an indented block, so a comment can stand between the children of a link
  ([#301](https://github.com/link-foundation/links-notation/issues/301))
- Comments are on by default and can be switched off, which reads `#` as an
  ordinary character again for documents written before comments existed:
  `ParserConfig::without_comments()` and `parse_lino_to_links_with_config` in
  Rust, `new Parser({ comments: false })` in JavaScript, `Parser(comments=False)`
  in Python, `Comments` on a `NewParser()` in Go, `new Parser(false)` in Java,
  `new Parser(comments: false)` in C# and the third constructor argument in PHP
  ([#301](https://github.com/link-foundation/links-notation/issues/301))
- `experiments/issue-301/run.sh` asks all seven implementations what they do
  with six documents containing a `#`, and prints the answers next to each
  other; before this change they gave three different answers to the same
  document ([#301](https://github.com/link-foundation/links-notation/issues/301))
- The grammar documents describe comments: `comment` and `comment_start` rules
  in `docs/grammar/links-notation.ebnf`, `docs/grammar/GRAMMAR.md` and
  `docs/grammar/grammar.lino`, railroad diagrams in
  `docs/grammar/syntax-diagrams.md`, and a `### Comments` section in all
  sixteen READMEs ([#301](https://github.com/link-foundation/links-notation/issues/301))

### Changed
- The broken-document sample in the READMEs of Rust, JavaScript and C# is
  `ci_gate x\nstage: rust: nextest\n` instead of a document whose first two
  lines began with a `#`; those lines are comments now, so the sample no longer
  demonstrates what it claimed to
  ([#301](https://github.com/link-foundation/links-notation/issues/301))
- Every manifest checked against what the registries publish today and updated:
  npm `lino-objects-codec` 0.7 to 0.8, `csv-parse` 6 to 7 and `gpt-tokenizer` 3
  to 4; Go `regexp2` 1.10 to 1.12 and `uuid` 1.3 to 1.6; Maven compiler plugin
  3.15 to 3.16, surefire 3.5.6 to 3.6.0 and spotless 3.10.1 to 3.10.2; NuGet
  `Microsoft.ML.Tokenizers` 1.0.3 to 2.0.0, whose transitive
  `Microsoft.Bcl.Memory` 9.0.4 carries GHSA-73j8-2gch-69rq and is therefore
  pinned to the patched 10.x. Each bump was followed by the check that would
  notice if it changed a result; none did
  ([#209](https://github.com/link-foundation/links-notation/issues/209))
- Benchmarks: the report states what it does not measure - model comprehension,
  vocabularies outside OpenAI's, the prompt around the document, and speed - so
  a token count is not read as a claim it does not support
  ([#209](https://github.com/link-foundation/links-notation/issues/209))
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
- Rust, JavaScript and C# report a failed parse the same way: a first line
  saying the position and what was expected, then the offending line with a
  caret under it. All three agree on the offset of every defect the comparison
  script checks ([#302](https://github.com/link-foundation/links-notation/issues/302))
- Rust: `lino!` used to panic with a fixed sentence that named neither the
  reason nor the position when text that balances its parentheses is refused by
  the parser at runtime; it now panics with the parse error ([#302](https://github.com/link-foundation/links-notation/issues/302))
- C#: `Parser.Parse` throws `ParseException` rather than the generated parser's
  `FormatException`. `ParseException` derives from `FormatException`, so callers
  that catch the base type keep working ([#302](https://github.com/link-foundation/links-notation/issues/302))

### Fixed
- Docs: nested contexts were described in the English READMEs and in the root
  Russian one, but in none of the per-language `README.ru.md` files, so a Russian
  reader of a language guide still got the old reading by omission. The section
  is now in all eight English READMEs and all eight Russian ones — the root plus
  every implementation ([#282](https://github.com/link-foundation/links-notation/issues/282))
- Go: the README documented a `lino.StrPtr` helper the package does not export,
  so that snippet could not compile, and its feature list named four sibling
  implementations when there are six
  ([#209](https://github.com/link-foundation/links-notation/pull/210))
- Docs: the JavaScript, Java and PHP package information sections advertised
  version 0.1.0, six releases stale, and the JavaScript README claimed MIT while
  `js/package.json` declares Unlicense. The version line is gone rather than
  corrected, so there is nothing left to drift
  ([#209](https://github.com/link-foundation/links-notation/pull/210))
- Docs: the Maven, Gradle and Composer installation snippets in the Java and PHP
  READMEs pinned 0.1.0 and `^0.1`, sixteen minors behind the declared 0.17.0, so
  a reader who copied them installed a 2025 release. `scripts/version-consistency.mjs`
  now checks every documented install version against the version its
  implementation declares, which is a hard failure in CI
  ([#209](https://github.com/link-foundation/links-notation/pull/210))
- Website: the header carried a hand-typed version literal alongside the one
  `script.js` writes from `js/package.json` at build time, which is how the page
  advertised v0.6.0 for ten minor releases
  ([#209](https://github.com/link-foundation/links-notation/pull/210))
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
- Rust: a failed parse printed the raw `nom` error —
  `Error(Error { input: "<the whole rest of the document>", code: Eof })` —
  which named no line, no column and nothing that was expected, and grew with
  the size of the document. It now says
  `line 2, column 8: expected "(", a reference or end of line, found ":"` and
  quotes one line. The reported position is the furthest any alternative
  reached, so it points at the defect rather than at the start of the line the
  parser last accepted ([#302](https://github.com/link-foundation/links-notation/issues/302))
- C#: a failed parse said `Failed to parse 'document'.` and pinned its cursor at
  line 1, column 1, because the generated parser backtracks out of the start
  rule before it throws. It now reports the position the document really stopped
  at ([#302](https://github.com/link-foundation/links-notation/issues/302))
- JavaScript: the generated parser reported the position on the error object but
  not in the message, so a caller that printed the message lost it
  ([#302](https://github.com/link-foundation/links-notation/issues/302))

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
