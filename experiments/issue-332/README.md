Issue #332 investigation plan and evidence
=========================================

1. Read the issue, all comments, PR discussions, recent quote/binary fixes,
   and the formatter, parser and streaming implementations in all seven ports.
2. Add a shared finite corpus of exact references and reproducing tests before
   changing the formatters. Exercise identifiers and values, Unicode, controls,
   whitespace, quote runs, every two-chunk split, and binary round trips.
3. Share readable n-quote formatting with binary-to-text formatting. Add the
   explicitly versioned `~1{hex}` grammar for empty strings and controls that
   cannot be written portably with the legacy grammar.
4. Run all language suites and their local lint/build checks. Keep large logs
   in ci-logs. Update synchronized package versions and generated artifacts.
5. Investigate initial and final CI by timestamp and head SHA, download failed
   logs, fix concrete errors, review the full PR diff, and merge current main.
6. Commit useful atomic changes, push only issue-332-f564abf51726, update PR 335
   with reproduction and verification, confirm a clean tree and passing checks,
   and mark the PR ready.

The corpus is self-authored and contains no consumer messages. Regenerate with
`python3 experiments/issue-332/generate-fixtures.py`.

Findings and regression coverage
-------------------------------

The native formatters did not share a lossless reference encoding. JavaScript,
Java and Go inserted backslash escapes that the parser does not interpret;
Python, PHP and C# wrapped arbitrary values in single quotes; Rust emitted raw
values. Reproducing fidelity tests failed before the formatter changes.
Reusing binary formatting alone was insufficient: legacy empty quote pairs in
`("": "")` can span the colon, and some control characters are parser separators.
The versioned UTF-8 literal resolves both ambiguities without adding backslash
escaping to existing quoted references. See `docs/protocol/reference-literals.md`
for the compatibility contract and reserved prefix.

The shared fixtures contain 91 exact Unicode references and 13 malformed
literals. Every binding tests native identifiers and nested values, formatter
options, strict literal decoding, streaming at every two-chunk boundary, and
binary round trips. Testing forced indentation also reproduced an independent
empty-identifier bug in Python and PHP: a truthiness check discarded the empty
identifier and detached its children. Both ports now check for a missing value.

Run each binding's normal test and lint commands, plus:

```sh
node examples/reference-literals.mjs
bash examples/binary/run-interop.sh
node scripts/version-consistency.mjs
node scripts/create-test-case-comparison.mjs
python3 scripts/ci/check-dependencies.py
node scripts/ci/check-npm-locks.mjs
python3 experiments/issue-325/test_dependency_check.py
python3 experiments/issue-330/test_pdf_unicode.py
```

The cross-language check compares 1,392 packets and their canonical text
(116 documents times twelve encoding options). Local logs are kept under
`ci-logs/`, including the pre-fix failures. The prepared branch's dependency
workflow, run 37849367937 at head 791f6d9, already failed: lines 209–230 of
`ci-logs/dependencies-37849367937.log` identify stale codec/Vite requirements and
GitHub Actions pins. The separate dependency maintenance change updates those
requirements and lockfiles; its live freshness check validates 153 declarations.
