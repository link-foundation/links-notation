# Issue 381 work plan and evidence

Issue: https://github.com/link-foundation/links-notation/issues/381
PR: https://github.com/link-foundation/links-notation/pull/383

The issue requests agreement between `parse` and `parseGroups` followed by
folding the indentation tree for indented IDs, or documentation of the
difference. The maintainer's comment additionally requires the bare `id:`
element to be a self reference with no values. There are no required sub-issues
or PR comments/reviews at the start of this work.

Implementation checklist:

- [x] Reproduce the discrepancy with a failing JS regression test.
- [x] Normalize leaf reference children in indented ID value contexts, keeping
  the bare ID group's values empty and its children separate.
- [x] Preserve parentheses, ordinary head behavior, nested structure, parser
  diagnostics, comments, and syntax metadata.
- [x] Port to C++, Swift, and Kotlin, the other bindings exposing this API.
  Document existing API exceptions; add shared text coverage for all ten bindings.
- [x] Review shared fixtures and manifest coverage before refreshing inventory.
- [x] Document canonical `parse` values and the group folding contract.
- [x] Prepare the next patch release with a changelog fragment and synchronized
  versions, locks, benchmark output, and test comparison.
- [x] Run local focused checks and JS tests, commit useful atomic steps, and
  check that the latest main is an ancestor without rewriting history.
Finalization protocol: collect and read every completed failure log for the
latest remote SHA, wait for active runs before pushing, review the PR diff,
update its title and description with reproduction and evidence, and mark it
ready after all CI checks pass. The final CI results and review status are
recorded in the PR description.

Root cause: `collectLinks` uses `transformIndentedValue` within an indented
ID's value context, while `_transformGroup` used `transformLink` independently
for every line. The former unwraps single reference leaves, the latter retains
their anonymous one-value container. Descendants of an indented ID continue
in that value context. Lines with descendants retain their container so folding
can append the descendant values without discarding the line's own reference.

The fix keeps `parse` (the shared text contract) canonical and unchanged.
`parseGroups` still separates the line element from its children, including
for bare `id:`. It cannot generally be folded to `parse` outside indented ID
subtrees, since ordinary indentation expands into paths in `parse`.

Local verification:

- `ci-logs/issue-381-before.log`: 2 failures and 2 passes on the original JS
  parser; the folded `x:` children were anonymous links instead of references.
- `ci-logs/issue-381-js-tests.log`: 364 tests pass, 0 fail after the fix.
- JS build, lint, formatting, JS gate, version consistency, PHP distribution
  metadata, generated test comparison, and the parity manifest checks pass.
- Reviewed golden trees and exact formatting for six `indented-id-*` fixtures.
  The new manifest row records the four group APIs and the existing exceptions.
- The parity gate reports 24 features, 31 text cases, 20 syntax cases, 10
  languages, and 0 violations. Nine parity contract tests pass.

- Swift: 26 focused tests pass across shared text parity, syntax metadata, and
  indented document helpers (`swift test --package-path swift --jobs 1
  --filter 'SharedTextParityTests|SyntaxMetadataTests|IndentedDocumentTests'`).
- Benchmark generation and `--check` agree on all 73 generated files. The
  shared Rust target uses 125264 KiB of its 2097152 KiB budget.

The first full CI run for `d9acb12` exposed two older test expectations:
Swift's explicit corpus ID list lacked the six additions, and Kotlin's
indentation-tree test assumed every descendant had a one-value wrapper.
The latter now checks the exact container and reference shapes. The two
Swift corpus checks also pass locally after updating the inventory. Logs
were saved before the follow-up push; see
[the CI run](https://github.com/link-foundation/links-notation/actions/runs/42090188856).

The existing CI workflows exercise all ten native suites for the exact PR
head, including every shared fixture. Local command logs and downloaded CI
logs stay under ignored `ci-logs/`.
