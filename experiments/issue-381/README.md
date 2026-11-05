# Issue 381 work plan and evidence

Issue: https://github.com/link-foundation/links-notation/issues/381
PR: https://github.com/link-foundation/links-notation/pull/383

The issue requests agreement between `parse` and `parseGroups` followed by
folding the indentation tree for indented IDs, or documentation of the
difference. The maintainer's comment additionally requires the bare `id:`
element to be a self reference with no values. There are no required sub-issues
or PR comments/reviews at the start of this work.

Plan and acceptance checklist:

- [ ] Reproduce the discrepancy with a failing JS regression test.
- [ ] Normalize leaf reference children in indented ID value contexts, keeping
  the bare ID group's values empty and its children separate.
- [ ] Preserve parentheses, ordinary head behavior, nested structure, parser
  diagnostics, comments, and syntax metadata.
- [ ] Port to C++, Swift, and Kotlin, the other bindings exposing this API.
  Document existing API exceptions; verify shared text in all ten bindings.
- [ ] Review shared fixtures and manifest coverage before refreshing inventory.
- [ ] Document canonical `parse` values and the group folding contract.
- [ ] Prepare the next patch release with a changelog fragment and synchronized
  versions, locks, benchmark output, and test comparison.
- [ ] Run local focused checks and JS tests, commit useful atomic steps, and
  merge any new main changes without rewriting history.
- [ ] Collect and read every completed failure log for the latest remote SHA,
  wait for active runs before pushing, review the PR diff, update its title and
  description with reproduction and evidence, and mark it ready after all CI
  checks pass.

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
