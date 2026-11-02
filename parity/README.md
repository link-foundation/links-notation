# Cross-language contract

JavaScript defines new behavior first. `language-features.json` lists the
implementation and executable evidence for each feature in all ten bindings.
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

## Syntax metadata and concrete syntax tree

`syntax-fixtures.json` is the reviewed golden corpus for how a document was
written (issue 364). Each case has an input; the expected parse tree with each
link's `raw` ID text and `quote`; and the S-expression of its lossless concrete
syntax tree. `syntax-vectors.tsv` is its generated twin: four tab-separated
fields (case ID, input UTF-8 hex, tree, CST S-expression UTF-8 hex). Tree nodes
are `(ID|RAW|QUOTE children…)`, where each slot is UTF-8 hex or `~` for null.
The `syntax-metadata` and `concrete-syntax-tree` rows use the `shared-syntax`
contract. Every binding runs the corpus. It also checks that every text and
syntax fixture input comes back exactly from its CST, by string conversion and
by joining its tokens. The contract is in
`docs/case-studies/issue-364/specification.md`.

The metadata never changes equality, hashing, formatting or serialization.
Each binding's parser records it by default and has an AST mode that leaves it
out. Hosts express this in their own idiom:

- Rust keeps `LiNo<String>` for the existing functions, so their results and
  `PartialEq` stay as they were. `parse_lino_to_syntax_links` returns
  `LiNo<SyntaxReference>`, whose `raw_id()` and `quote()` hold the metadata, and
  `into_values()` turns it back into `LiNo<String>`.
- Go adds a `RawID` field and a `Quote()` method. `NewParser()` turns
  `Syntax` on, while the zero value `Parser{}` is AST mode.
- PHP exposes `getRawId()`/`getQuote()` and stores the text outside the object.
  This keeps `==`, `serialize()` and `json_encode()` unchanged; a `clone`
  therefore does not carry it.
- C# adds `RawId { get; init; }` and `Quote` to `Link<TLinkAddress>`; the
  parser's `Syntax { get; init; }` property defaults to true, so
  `new Parser { Syntax = false }` is AST mode.
- Java adds `getRawId()` and `getQuote()`, and the constructors
  `Parser(boolean comments, boolean syntax)` and
  `Parser(int, int, boolean comments, boolean syntax)`; the existing
  constructors keep the metadata on.
- Swift adds `rawId` and `quote` to the `Link` struct, which `==` and `hash`
  ignore; `ParserOptions(syntax: false)` is AST mode.
- Kotlin adds `rawId` and the derived `quote` to `Link`, outside the data
  class's constructor, so `equals` and `hashCode` ignore them;
  `ParserOptions(syntax = false)` is AST mode.
- Rust's `StreamParser::new()` yields `LiNo<String>` as before, and
  `StreamParser::syntax()` yields `LiNo<SyntaxReference>`.

`parseCst` parses the document first, so it fails whenever `parse` fails. In
bindings whose `parse` accepts unbalanced parentheses (`(a` or `a)`), the CST
cannot nest them, so `parseCst` also rejects them. The shared corpus contains
only balanced documents.

## Explicit API exceptions

PR 336 introduced `parseIndentedDocument`, `formatIndentedDocument`, and minimal
quoting as JavaScript convenience APIs. C++ ports them as
`parse_indented_document` and `format_indented_document`, and Swift and Kotlin
as `parseIndentedDocument` and `formatIndentedDocument`, with the JS tests
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
other nine bindings. These existing differences must not be silently represented
as implemented APIs.

## Generated code

All ten language libraries are hand-written. JavaScript's Peggy parser and
C#'s Pegasus parser are generated from hand-written grammars within their own
language. There is currently no JS-to-Rust translation pipeline. Meta-language's
structural translation can be explored in `experiments/`, but a translated
module must prove semantic equivalence and have a regenerate-and-diff check
before it replaces the working library. See `CONTRIBUTING.md` for the
development order.
