# Issue 364: keep how references were written, and a lossless CST

- Issue: <https://github.com/link-foundation/links-notation/issues/364>
- Pull request: <https://github.com/link-foundation/links-notation/pull/368>
- Raw data: [`data/`](data/) (the issue, its comments, and the PR comments at the time of writing)
- Cross-language contract: [`specification.md`](specification.md)

## The problem

`parse("(t 1 '1')")` returned three references whose IDs were `t`, `1` and
`1`. Once parsed, nothing showed that the third reference was written between
single quotes. Conformance fixtures, editors and linters need that detail. The
reporter asked for the quote information to be kept on references, with
`equals()` and `format()` unchanged, in all language ports.

### Root cause

Each grammar's `reference` rule returned only the **decoded value** of a
reference. In JavaScript, `quotedReference` returned `parsedValue`, the text
between the delimiters with doubled delimiter runs collapsed, and
`singleLineLink` / `indentedIdLink` / `referenceOrLink` built `{ id: value }`.
The delimiter, the number of delimiters in the run, the escapes and the
`~1{…}` literal syntax were dropped at that point. No later stage could get
them back, because the source positions were not kept either. The ports copy
the same design, so all eight bindings lost the information the same way.

The data model was not the problem. `1` and `'1'` mean the same reference,
and the maintainer confirmed that this should stay so:

> 1 and '1' are the same reference, so we don't want to have any typing
> system. But we can add meta data in parsing, so we preserve all the details
> of parsing, meaning we have option to get set our result as CST (default),
> and AST (optional with configuration on what omitted and how).

## Requirements

| #   | Requirement (source)                                                                                                  | Solution                                                                                                                                                                                                                                   | Evidence                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `(t 1 '1')` must be distinguishable after `parse()` (issue)                                                           | Every parsed link with an ID records `rawId`, the ID exactly as written, and `quote`, the delimiter of a complete quoted reference (`'`, `"`, `` ` `` or null)                                                                             | `syntax-metadata` fixtures `issue-364`, `quote-kinds`, `quote-runs`, `literal`, `empty-refs`; per-language focused tests                                |
| R2  | The same through `parseGroups()` (issue)                                                                              | Group and indented APIs reuse the main parser, so they carry the same metadata                                                                                                                                                             | JS `SyntaxMetadata.test.js` "parseGroups keeps …"; per-language equivalents                                                                             |
| R3  | `equals()` unchanged (issue)                                                                                          | Equality and hashing ignore `rawId`/`quote`                                                                                                                                                                                                | Tests assert `1` equals `'1'`, and that hashes/sets are unchanged where the language has them                                                           |
| R4  | `format()` unchanged (issue)                                                                                          | Formatting, `toString` and serialization ignore the metadata. `(t 1 '1')` still formats as `(t 1 1)`                                                                                                                                       | Focused tests in every language; the existing text fixtures all still pass                                                                              |
| R5  | Mirror in all language ports so conformance fixtures can rely on it (issue)                                           | JS, Rust, Python, Java, Go, C#, PHP and C++ implement the [specification](specification.md); shared golden data in `parity/syntax-fixtures.json` and `parity/syntax-vectors.tsv`                                                           | `parity/language-features.json` rows `syntax-metadata` and `concrete-syntax-tree`, enforced by `scripts/ci/check-parity.mjs` (contract `shared-syntax`) |
| R6  | No typing system: `1` and `'1'` stay the same reference (maintainer)                                                  | The metadata is a note on how the ID was written, not a type; the value is unchanged                                                                                                                                                       | R3/R4 tests                                                                                                                                             |
| R7  | Keep _all_ the details of parsing, as a CST, by default (maintainer)                                                  | Metadata is **on by default**. `parseCst(input)` returns a lossless concrete syntax tree: every character, including comments, whitespace, blank lines, line endings, parentheses, colons and quote runs, is in exactly one token          | `concrete-syntax-tree` fixtures (`comments-crlf`, `comment-in-quote`, `whitespace`, `multiline`, `context`, `unicode`, `empty`)                         |
| R8  | AST as an option, with configuration of what is omitted (maintainer)                                                  | AST mode (`syntax: false` and each port's equivalent) leaves out the metadata. `comments: false` makes `#` ordinary text. The existing `parse()` output stays the AST, and the CST is a separate call, so nothing is paid for unless asked | "AST mode" tests in every binding                                                                                                                       |
| R9  | Every language has clear tests that fully restore the original text from the object model (maintainer)                | Each binding checks `parseCst(input).toString() == input` and that the concatenated `tokens()` text equals the input for **every** input in `parity/text-fixtures.json` and `parity/syntax-fixtures.json`                                  | Shared-fixture round-trip tests in every binding                                                                                                        |
| R10 | Gather data in `docs/case-studies/issue-364` (maintainer)                                                             | This folder: `data/` and the specification                                                                                                                                                                                                 | This file                                                                                                                                               |
| R11 | Deep case study with online research, existing components and libraries (maintainer)                                  | See "Prior art" below                                                                                                                                                                                                                      | This file                                                                                                                                               |
| R12 | List each requirement and propose solutions and plans for each (maintainer)                                           | This table and "Design decisions"                                                                                                                                                                                                          | This file                                                                                                                                               |
| R13 | Plan and execute everything in this single pull request (maintainer)                                                  | All eight bindings, fixtures, the parity gate, docs, changelog and version preparation are in PR #368                                                                                                                                      | The PR diff                                                                                                                                             |
| R14 | Repository rules: JS first, parity manifest, changelog fragment, version preparation (`AGENTS.md`, `CONTRIBUTING.md`) | JS was implemented and committed first; then the ports. `changelog.d/364.md`; version 0.28.0 in all eight bindings                                                                                                                         | `node scripts/ci/check-parity.mjs`, `node scripts/version-consistency.mjs`                                                                              |

## Prior art

The question "how do I get the original text back from a parse tree" has two
common answers. One is a **lossless syntax tree**, where every byte, trivia
included, is stored in the tree. The other is **raw text on AST nodes**, where
literal nodes keep the source text next to the decoded value. This change does
both: `rawId` is the second answer and is cheap and on by default; `parseCst`
is the first answer.

| Project                                                                                                                                                                                   | What it keeps                                                                                                                                       | Lesson for Links Notation                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roslyn (C#/VB) [syntax API](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/work-with-syntax)                                                                                        | "Full fidelity" red/green trees. Trivia (whitespace, comments) is attached to tokens; `ToFullString()` returns the exact source                     | Text must round-trip exactly, comments included; equality of meaning is a separate question                                                                   |
| rust-analyzer: [syntax.md](https://github.com/rust-lang/rust-analyzer/blob/master/docs/book/src/contributing/syntax.md), [rowan](https://docs.rs/rowan), [cstree](https://docs.rs/cstree) | Untyped homogeneous green tree of `(kind, text)` tokens; a typed AST is a _view_ over it. Whitespace and comments are ordinary tokens               | One untyped tree with a `kind` per node, with trivia as plain tokens, is simple to port to eight languages. We use the same shape: `kind`, `children`, `text` |
| [tree-sitter](https://tree-sitter.github.io/tree-sitter/using-parsers)                                                                                                                    | Concrete tree with byte ranges; "extras" such as comments are nodes; text comes from slicing the source                                             | Recording start/end offsets and slicing the original input is the cheapest way to get raw text. Our grammars do exactly that                                  |
| [LibCST](https://github.com/Instagram/LibCST) (Python)                                                                                                                                    | A CST that looks like an AST: whitespace and comments are node fields; `module.code` round-trips                                                    | Users want the meaning-level API with the formatting available on demand; hence `rawId` on the ordinary `Link`                                                |
| Babel `extra.raw` / ESTree `raw` ([estree#14](https://github.com/estree/estree/issues/14))                                                                                                | Literal nodes carry `value` and `raw` (for example `'1'` versus `"1"`); equality of values ignores `raw`                                            | Exactly the issue's case. `rawId` is our `raw`, and `value` stays the ID                                                                                      |
| [recast](https://github.com/benjamn/recast)                                                                                                                                               | `print(parse(src)).code === src`; only modified nodes are reprinted                                                                                 | Round-trip identity is the test that matters, so every binding tests it over all shared fixtures                                                              |
| [eemeli/yaml](https://eemeli.org/yaml/#cst-parser)                                                                                                                                        | Lexer → Parser (CST) → Composer (document). The CST keeps every character; scalars record `PLAIN`, `QUOTE_SINGLE`, `QUOTE_DOUBLE`, …                | A data-notation library with the same need. The scalar style is our `quote`; the CST/AST split is our `parseCst`/`parse` split                                |
| [toml_edit](https://docs.rs/toml_edit)                                                                                                                                                    | `Formatted<T>` = value + `Repr` (raw text) + `Decor` (surrounding whitespace/comments). The encoder uses the stored repr if present, else a default | Metadata that does not affect the value, with a default rendering when it is missing. `format()` keeps using the default rendering                            |
| [Peggy](https://peggyjs.org/documentation.html#action-execution-environment) `range()` / `location()` / `text()`                                                                          | Source positions available in every action                                                                                                          | The JS grammar takes `range()` and slices the _original_ input (`text()` would return the comment-blanked copy)                                               |

## Design decisions

1. **Metadata, not a type.** A `quoted` boolean or a "string versus number"
   distinction would add a typing system, which the maintainer rejected (R6).
   `rawId` holds the exact text, so nothing is lost, and `quote` is a
   convenience derived from it.
2. **Equality and formatting ignore the metadata.** Changing them would break
   every existing user. Babel/ESTree and toml_edit make the same choice.
3. **On by default; AST mode is opt-in** (R7/R8). The cost is one string slice
   per ID that is already being read. AST mode (`syntax: false`) is for callers
   who want plain links, for example to compare them with links built in code.
4. **The CST is a separate tree.** Links are a semantic model: an indented
   document and a parenthesized one give the same links, and no `Link` has a
   place for a comment or a blank line. Putting trivia on `Link` would mix the
   two. As in rust-analyzer and eemeli/yaml, the concrete tree is separate, and
   `parseCst` first validates with the same parser, so the two never disagree on
   what is valid.
5. **One lexer, specified once.** The CST lexer is short and uses each binding's
   _existing_ comment stripper and delimited-reference reader, so the CST and
   the parser read quotes and comments the same way. Its exact behavior,
   including the S-expression form used in fixtures, is in
   [`specification.md`](specification.md).
6. **Golden data is shared.** `parity/syntax-fixtures.json` is generated by
   the JS reference implementation and reviewed. `parity/syntax-vectors.tsv`
   is a hex-encoded copy for bindings without a JSON parser in their test
   dependencies (Java, C++). The parity gate fails when the TSV is stale.
7. **Rust idiom.** `LiNo<T>` is generic over the reference type, so Rust gets
   `parse_lino_to_syntax_links(_with_config)`, which returns
   `LiNo<SyntaxReference>`. `SyntaxReference` holds the value and the raw text,
   and its `PartialEq` compares the value only. The existing `parse_lino*`
   functions keep returning `LiNo<String>`, which is the AST mode. The stream
   parser follows the same split: `StreamParser::new()` yields
   `LiNo<String>`, and `StreamParser::syntax()` yields
   `LiNo<SyntaxReference>`. This is recorded as an idiom in
   `parity/README.md`.

## Known limitations

- **A comment marker inside a quoted value that is not at a token boundary.**
  Comment detection runs before parsing, and it treats `"` after `)` as not
  opening a token. So in `(a)"b #c\nd"`, the `#c` is blanked before the parser
  reads the quoted value, and the value becomes `"b   \nd"`. This is existing
  behavior from the comment feature (issue #350), not something this change
  introduced. With this change it becomes _visible_: `rawId` and the CST still
  show the original `"b #c\nd"`, because raw text is always sliced from the
  original input. Verified with:

  ```sh
  node -e 'import("./js/src/index.js").then(({Parser}) => console.log(new Parser().parse("(a)\"b #c\nd\"")[0].values[1]))'
  ```

- `rawId` describes the **ID** of a link. A link without an ID, such as a
  parenthesized group or a value link, has `rawId` null; its references are
  its values, and each value has its own `rawId`. Links made by indentation
  path combination are built by the parser, not read from one place in the
  text, so they have no `rawId` either. Their exact text is in the CST.
- **Quote tracking in bare references (fixed in Python, Go, PHP and Java).**
  Before this change, these four ports kept reading a bare reference past a
  space when a quote character appeared inside it, so `('x y)` read one
  reference `'x y`. JavaScript, Rust, C# and C++ read two bare references, `'x` and
  `y`, which is what the grammar says. The raw text exposed by this change made
  the difference visible in the shared fixtures, so the four ports now split
  the same way JavaScript does. It is listed under "Fixed" in
  `changelog.d/364.md`.
- **`parseCst` and unbalanced parentheses.** The specification says
  `parseCst` throws exactly when `parse` throws. JavaScript, Rust, C# and C++ reject
  unbalanced parentheses in `parse`. The Python, Go, PHP and Java parsers have
  always accepted some unbalanced documents, such as `(a` or `a)`, and this
  change does not tighten them, because that would break existing callers.
  Their `parseCst` rejects these documents anyway, because a tree that
  restores the text must know where each group ends. `parity/README.md`
  records this.
- **Java tokenization outside the shared corpus.** The Java parser reads
  `a(b)` and `x<TAB>y` as one reference, while its CST, which follows the
  shared lexer, splits them. This predates the change and none of the shared
  text or syntax fixtures contain such input, so the CST still restores the
  text exactly; only the token boundaries differ from what `parse` returns.
- The CST does not model indentation-based nesting as tree structure. An
  indented line is a `line` node starting with a `whitespace` token. That is
  enough to restore the text and see the indentation; the nesting meaning is
  what `parse()` returns.

## Per-language API

| Language | Metadata on a link                                                                                                                                               | AST mode                                                | CST                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| JS       | `link.rawId`, `link.quote`, `referenceQuote(raw)`                                                                                                                | `new Parser({ syntax: false })`                         | `parser.parseCst(input)`    |
| Python   | `link.raw_id`, `link.quote`, `reference_quote(raw)`                                                                                                              | `Parser(syntax=False)`                                  | `parser.parse_cst(input)`   |
| Rust     | `SyntaxReference { value, raw }` and `quote()` in `LiNo<SyntaxReference>` from `parse_lino_to_syntax_links` and `StreamParser::syntax()`; `reference_quote(raw)` | the existing `parse_lino*` and `StreamParser::new()`    | `parse_lino_to_cst(input)`  |
| Go       | `link.RawID`, `link.Quote()`, `ReferenceQuote(raw)`                                                                                                              | `parser.Syntax = false` (`NewParser()` sets it to true) | `parser.ParseCst(input)`    |
| C#       | `link.RawId`, `link.Quote` (`char?`), `Link<string>.ReferenceQuote(raw)`                                                                                         | `new Parser { Syntax = false }`                         | `parser.ParseCst(input)`    |
| Java     | `link.getRawId()`, `link.getQuote()`, `Link.referenceQuote(raw)`                                                                                                 | `new Parser(comments, false)`                           | `parser.parseCst(input)`    |
| PHP      | `$link->getRawId()`, `$link->getQuote()`, `Link::referenceQuote($raw)`                                                                                           | `new Parser(syntax: false)`                             | `$parser->parseCst($input)` |
| C++      | `link.raw_id`, `link.quote()`, `reference_quote(raw)`                                                                                                            | `ParserOptions::syntax = false`                         | `parser.parse_cst(input)`   |

Each language's README has the exact signatures.

## Verification

- `node scripts/ci/check-parity.mjs` passes. It checks both feature rows in
  all eight languages and the freshness of `parity/syntax-vectors.tsv`.
- The native suites of all eight bindings run the shared syntax fixtures and
  the text and syntax round trips (see the "evidence" files in
  `parity/language-features.json`).
- `node examples/js_cst_round_trip.mjs` shows the issue's case end to end.
