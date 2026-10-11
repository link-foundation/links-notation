# Cross-language contract

JavaScript defines new behavior first. `language-features.json` lists the
implementation and executable evidence for each feature in all eight bindings.
`node scripts/ci/check-parity.mjs` rejects missing languages, missing evidence,
undocumented exceptions, uncovered text features, and changed source
inventories. After reviewing feature coverage, use `--refresh-inventory` to
record source changes and regenerate the text vectors. Inventory hashes detect
unreviewed source changes; they do not prove semantic equivalence.

`text-fixtures.json` is the reviewed golden corpus. Each case has an input,
expected recursive `{id, values}` tree, and exact default formatted output.
Every language's native tests check parsing, formatting, round trips, and
streamed input. Java and Rust consume `text-vectors.tsv`, generated only from
that JSON: four tab-separated fields (case ID, input UTF-8 hex, expected tree,
formatted UTF-8 hex). Tree nodes contain the ID's hex bytes and their children;
`~` denotes null, while an empty ID remains distinct. CI verifies the two
representations agree. Empty inputs and outputs are represented by empty fields.

The corpus covers core text syntax, indentation, nested contexts, quoting, empty
IDs, Unicode, comments, quote runs, multiline strings, and version 1 reference
literals. The manifest additionally points to native binary and depth limit
suites. This is executable evidence for the listed contracts, not a claim that a
finite fixture corpus proves every possible input equivalent.

## Explicit API exceptions

PR 336 introduced `parseIndentedDocument`, `formatIndentedDocument`, and minimal
quoting as JavaScript convenience APIs. C++ ports them as
`parse_indented_document` and `format_indented_document`, with the JS tests
translated. The other six bindings retain the shared Link representation and
its syntax; they do not yet expose those convenience APIs. The
`indented-document-api` manifest row records this existing exception. Porting
it requires a JS-first contract and fixtures before removing the exception.

Language idioms also differ: Rust has compile-time macros and tuple conversions;
Java exposes boolean formatting options rather than the `FormatConfig` object;
callback and collection interfaces use their host language's types. These APIs
are hand-written adapters, and the common interchange contract is their parsed
tree, text output, and binary protocol. New shared syntax cannot use these
adapter differences as an implicit parity exception.

Python, PHP, and Go express link groups through nested links and collections;
they do not expose JS's `LinksGroup` class. The manifest records the class API
exception separately from the common nested-tree contract. Java lacks the full
`FormatConfig` object, while default formatting is covered by the shared corpus.
Rust's compile-time macro and tuple adapters are host-specific exceptions in the
other seven bindings. These existing differences must not be silently represented
as implemented APIs.

## Generated code

All eight language libraries are hand-written. JavaScript's Peggy parser and
C#'s Pegasus parser are generated from hand-written grammars within their own
language. There is currently no JS-to-Rust translation pipeline. Meta-language's
structural translation can be explored in `experiments/`, but a translated
module must prove semantic equivalence and have a regenerate-and-diff check
before it replaces the working library. See `CONTRIBUTING.md` for the
development order.
