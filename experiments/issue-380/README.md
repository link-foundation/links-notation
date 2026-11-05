# Issue 380 work plan and evidence

Objective: implement and verify every requirement of #380 in PR #384.

- [x] Read the complete issue, comments, related formatter, PR feedback, and repository guidance. No required sub-issues or review comments exist.
- [ ] Reproduce recursive formatting and anonymous threshold round-trip failures in JS before changing behavior.
- [ ] Add a public recursive `formatNested` writer; preserve value order, escaping, and parentheses needed for ambiguous lines.
- [ ] Fix anonymous threshold formatting without losing its container.
- [ ] Check group folding against every existing text fixture and targeted ordering/quoting/empty/bare-ID cases.
- [ ] Port the writer and anonymous fallback to all ten bindings, with native golden-corpus evidence. Document existing group-parser API boundaries.
- [ ] Review feature coverage and refresh parity inventory; regenerate test comparison.
- [ ] Add usage documentation, release fragment, synchronized next version and benchmark metadata.
- [ ] Collect and read every completed CI failure for the latest SHA, complete focused local checks, and wait for active runs before pushing a complete batch.
- [ ] Review the full PR diff, merge current main if needed, verify all checks on the final SHA, update title/body and mark PR ready.

Design: the writer keeps leading atoms on the head line and nests only a trailing
run of eligible links, preserving order when atoms and links alternate. A line
that cannot represent its link keeps parentheses. Nested output is read using
`parseGroups` followed by recursively appending children to the element values;
canonical `parse` retains its existing path-expansion semantics. The six bindings
without `parseGroups` still write the same shared text. Existing threshold
formatting uses a safe inline fallback for anonymous links, since a headless
indented list loses the anonymous container.

Command logs are saved under ignored `ci-logs/`. Native and CI evidence will be
recorded here as it becomes available.
