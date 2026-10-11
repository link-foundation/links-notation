# Four-language representation contracts

This document defines schema revision 2 of the JavaScript, Rust, Lean, and Rocq
surface shared by the Rust crate and JavaScript package. It is a truthful
snapshot of work in progress toward the full delivery target preserved in the
[issue #195 requirement ledger](issue-195-requirement-ledger.md), not a reduced
definition of that target. Callers can inspect the contract before attempting a
transform or translation.

## Supported profiles

| Canonical name | Parser aliases | Declared release | Edition/surface | Extensions |
| --- | --- | --- | --- | --- |
| JavaScript | `javascript`, `js`, `ecmascript` | ECMAScript 2026 | ECMA-262, 17th edition | `.js`, `.mjs`, `.cjs` |
| Rust | `rust`, `rs` | Rust 1.99.0 | 2024 | `.rs` |
| Lean | `lean`, `lean4` | Lean 4.34.1 | Lean 4 | `.lean` |
| Rocq | `rocq`, `coq` | Rocq 9.3 | Vernacular | `.v` |

Extensions are declared metadata. Parsing is selected by canonical name or
alias, or through `ParserRegistry`; it is not inferred from a filename.

Both runtimes use registered grammar frontends for all four languages,
including the pinned Rocq grammar. Grammar-backed paths retain the returned
CST, named fields, child order, exact spans, recovery flags, and source tokens.
The program representation retains project inputs, lexical scopes and bindings,
surface syntax facts, and source mappings. Import requests are extracted from
grammar nodes; a small pinned set of toolchain modules is recognized when
declared. Listed project files and arbitrary dependency names do not establish
module existence or export resolution. Type checking, macro expansion, and
proof elaboration remain open.

## Stable pipeline

The contract is:

```text
source text -> registered parser -> links network -> structural transform
            -> ordered source-token emitter -> source text
```

Each source token retains its text, language, UTF-8 byte range, start/end point,
and recovery flags. Syntax links reference tokens or child syntax links.
Emission sorts the retained source tokens by span, so it remains available
after the caller discards the original source buffer. Structured identifier
edits update the captured token rather than searching the raw source; strings
and comments therefore do not match an `(identifier)` query.

`LANGUAGE_REPRESENTATION_SCHEMA_VERSION` is `2` in both packages. The public
`language_support`/`languageSupport` APIs describe fidelity, and the Rust and
JavaScript parser registries permit explicit extension without silently
changing built-in dispatch.

## Construct and fidelity inventory

The table distinguishes implemented surfaces from the full issue requirement.
Capability labels in the API are not conformance evidence for the complete
language versions.

| Construct or layer | JavaScript | Rust | Lean | Rocq | Evidence |
| --- | --- | --- | --- | --- | --- |
| Complete UTF-8 source and trivia | preserved | preserved | preserved | preserved | shared conformance corpus and reconstruction tests |
| UTF-8 byte spans and line/column points | concrete | concrete | concrete | concrete | parser implementations and corpus tests |
| Comments, strings, numbers, identifiers, keywords, delimiters | grammar CST | grammar CST | grammar CST | grammar CST | real grammar nodes/tokens plus shared corpus |
| Nested grammar hierarchy and recovery | concrete | concrete | concrete | concrete | positive and malformed corpus cases |
| Full grammar-level syntax hierarchy | unverified | unverified | unverified | unverified | grammar materialization exists; complete construct coverage has not been shown |
| Identifier scope and binding resolution | partial | partial | partial | partial | lexical scope and rename cases; complete binding semantics remain open |
| Imports and module references | partial | partial | partial | partial | selected toolchain modules recognized; phantom dependency/file names remain unresolved; exports and project symbol identities remain open |
| Declarations and recursive bodies | partial | partial | partial | partial | surface facts and selected binding cases |
| Types, effects, universes, and elaboration | surface only | surface only | surface only | surface only | annotations and syntax markers are retained; type checking and elaboration remain open |
| Attributes, macros, notation, and plugins | surface only | surface only | surface only | surface only | source syntax is retained; expansion and plugin resolution remain open |
| Proof and tactic syntax | not applicable | not applicable | surface only | surface only | syntax facts are retained; kernel-checked elaborated proof terms remain open |
| Unknown/control syntax | diagnostic and retained | diagnostic and retained | diagnostic and retained | diagnostic and retained | recovery flags plus exact reconstruction |
| Source generation after mutation | ordered token emission | ordered token emission | ordered token emission | ordered token emission | reconstruction and identifier-edit tests |

The inventory is a coverage target, not evidence that the incomplete rows are
finished. Surface syntax must not be described as resolved or elaborated facts.

## Translation contracts

Both packages expose all 12 directed source/target descriptors. Their default
output is a reversible source envelope for transport only and carries an
explicit semantic translation obligation. Two narrowly recognized forms now
emit executable target code in addition to provenance: a constant Rust
zero-argument function to JavaScript and a JavaScript decimal console print to
Rust. Those artifacts report `semantic-subset` and are executed in tests. No
other form or directed pair is claimed to preserve behavior.

| Target | Required validator/runtime |
| --- | --- |
| JavaScript | ECMAScript 2026 host |
| Rust | Rust 1.99.0, edition 2024 |
| Lean | Lean 4.34.1 kernel and project environment |
| Rocq | Rocq 9.3 kernel and project environment |

For the default `portable-encoding` result, the observation is exact source
bytes after decoding. It does not preserve target behavior. The encoding is
UTF-8 represented as lowercase hexadecimal in a target-language comment. Full
semantic translation, including proof preservation, remains required by
issue #195.

## Conformance and boundaries

[`parity/fixtures/four-language-conformance.json`](../parity/fixtures/four-language-conformance.json)
is consumed by both runtime suites. It covers versions, editions, aliases,
extensions, Unicode identifiers, exact reconstruction, syntax roots,
identifier classification, comments, malformed input, regular expressions,
template interpolation, and grammar diagnostics. The versioned
[`language-grammar-inventory.json`](../parity/language-grammar-inventory.json)
additionally audits every known language target and tests all aliases currently
marked as real-grammar paths. The parity manifest no longer exempts
`language_parser` or `parser_registry` from the JavaScript implementation.

RML remains responsible for RML syntax, selectable foundations, logic,
execution semantics, and proof authority. Reusable scope, type, module,
proof-syntax, provenance, and translation concepts remain upstream here.

## Distribution status

The changelog fragment for this work requests the next minor release in the
existing release workflow. Published npm/crates installation evidence can only
be recorded after merge and release. The continuing npm distribution concern
is tracked by [issue #171](https://github.com/link-foundation/meta-language/issues/171);
source-level parity must not be mistaken for published-package parity.
