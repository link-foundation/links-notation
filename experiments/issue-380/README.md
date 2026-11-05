# Issue 380 work plan and evidence

Objective: implement and verify every requirement of #380 in PR #384.

- [x] Read the complete issue, comments, related formatter, PR feedback, and repository guidance. No required sub-issues or review comments exist.
- [x] Reproduce recursive formatting and anonymous threshold round-trip failures in JS before changing behavior.
- [x] Add a public recursive `formatNested` writer; preserve value order, escaping, and parentheses needed for ambiguous lines.
- [x] Fix anonymous threshold formatting without losing its container.
- [x] Check group folding against every existing text fixture and targeted ordering/quoting/empty/bare-ID cases.
- [x] Port the writer and anonymous fallback to all ten bindings, with native golden-corpus evidence. Document existing group-parser API boundaries.
- [x] Review feature coverage and refresh parity inventory; regenerate test comparison.
- [x] Add usage documentation, release fragment, synchronized next version and benchmark metadata.

Delivery checklist (tracked live in [PR #384](https://github.com/link-foundation/links-notation/pull/384)):
collect every completed failure for the latest SHA, save and read its logs,
wait for active branch runs before pushing, review the full diff, incorporate
current main, verify all checks on the final SHA, update title/body, and mark
the draft ready. The PR records the final CI evidence so a passing run does
not require another commit just to update this snapshot.

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

## Verification

- JS regression tests fail before implementation (commit `8e5a5e6`). The full
  JS suite now passes: 368 tests. Build, lint, and formatting checks pass.
- `parity/nested-fixtures.json` has 44 exact-output cases, covering all 31
  shared text inputs. All ten native test suites consume this corpus; the
  four group-aware bindings also verify folding; JS, Swift, and Kotlin test
  custom indentation.
- Focused Python tests: 73 pass; Go shared tests pass; Rust shared tests:
  4 pass; Swift shared tests: 5 pass; Java shared tests: 3 pass; PHP shared
  tests: 4 pass (270 assertions). Remaining native and platform verification
  will run in PR CI.
- Kotlin formatting and Rust library Clippy pass. C# whitespace formatting
  passes; full native checks need the pinned .NET SDK in CI.
- `fuzz-nested-format.mjs` checks 1,500 deterministic cases with maximum
  generated depth 3. Run with `node --max-old-space-size=256`.
- The parity gate, CI/release/distribution contract tests, version consistency,
  and PHP distribution metadata checks pass. All ten versions are 0.31.0.
- Rust benchmark generation and `--check` pass (73 files); the shared target
  uses 161 MiB of its 2 GiB budget.
- `examples/js_nested_format.mjs` demonstrates the issue's form and reader.
