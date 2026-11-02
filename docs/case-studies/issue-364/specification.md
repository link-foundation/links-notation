# Issue 364: syntax metadata and lossless CST, cross-language specification

This is the contract every binding implements. JavaScript (`js/src`) is the
reference implementation. The golden data is `parity/syntax-fixtures.json` and
its generated twin `parity/syntax-vectors.tsv`.

## A. Syntax metadata on parsed links (on by default)

A link read by the parser records **how its ID was written**:

| accessor | meaning                                                                                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rawId`  | The ID exactly as it appears in the source document, with quotes, doubled quote runs and `~1{…}` literal syntax included. Examples: `'1'`, `1`, `""a b""`, `~1{31}`, and a multi-line quoted reference with its line breaks. The text is sliced from the original input, not from the comment-blanked copy. |
| `quote`  | Derived from `rawId`: `'`, `"` or `` ` `` when `rawId` is one complete quoted reference, otherwise null.                                                                                                                                                                                                    |

- `rawId` is null when the link has no ID, was built in code, was made by
  indentation path combination, or was parsed in **AST mode**.
- **Equality, hashing, formatting, `toString` and serialization ignore
  `rawId` and `quote`.** `(t 1 '1')` still has two equal references `1`;
  formatting still prints `(t 1 1)`. Existing users see no difference.
- AST mode turns the metadata off: JS `new Parser({ syntax: false })`, and each
  port's idiomatic equivalent (for example Python `Parser(syntax=False)`).
- Stream parsers and group or indented-tree APIs, such as `parseGroups`, keep
  the metadata. They need no extra work when they reuse the main parser.
- `referenceQuote(raw)` returns the first character when that character is a
  quote and reading a delimited reference at offset 0 consumes all of `raw`;
  otherwise it returns null. Examples: `'unclosed` → null (it is a bare
  reference), `'a' b` → null, `~1{31}` → null.

### How the JS reference gets the raw text

In `js/src/grammar.pegjs`, the `reference` rule returns
`{ value, raw: source.slice(start, end) }`. `source` is the original input,
passed as `options.source`; the grammar itself reads the comment-blanked copy,
which has the same length and the same offsets. Link-producing rules then put
`rawId` next to `id`, and `Parser.js` copies `item.rawId` onto the `Link` only
when `syntax` is on and the link has an ID. A port should record the start and
end offsets wherever it reads a reference, then slice the original input. Byte
and character offsets are both fine, as long as they are the same as the
prepared text's.

## B. Lossless concrete syntax tree

`parseCst(input)` validates the input with the regular parser, so it throws
exactly when `parse(input)` throws: same errors, same depth limit, same
options. It then returns a CST in which **every character belongs to exactly
one token**, so `cst.toString() == input` for every input that parses.

Names per language:

| Language | Function                                                                       |
| -------- | ------------------------------------------------------------------------------ |
| JS       | `parser.parseCst(input)`                                                       |
| Python   | `parser.parse_cst(input)`                                                      |
| Rust     | `parse_lino_to_cst(input)` and `parse_lino_to_cst_with_config(input, &config)` |
| Go       | `parser.ParseCst(input)`                                                       |
| C#       | `parser.ParseCst(input)`                                                       |
| Java     | `parser.parseCst(input)`                                                       |
| PHP      | `$parser->parseCst($input)`                                                    |
| C++      | `parser.parse_cst(input)`                                                      |

### Nodes and tokens

A node (or token) has:

- `kind`
- `children`: empty for a token
- `text`: a token's exact text. For a node, it is the concatenation of its
  children's text.
- `value`: a reference token's decoded value (the ID a parsed link would get);
  null otherwise
- `quote`: the delimiter character of a quoted reference token; null otherwise
- `toString()` / `str()` / `Display`: same as `text`
- `tokens()`: every token in document order
- `toSExpression()`

Node kinds:

- `document`: holds lines
- `line`: tokens and groups up to and including its newline token
- `group`: `open_paren` token, the lines inside it, then `close_paren` token

Token kinds: `whitespace`, `newline`, `comment`, `open_paren`, `close_paren`,
`colon`, `reference`.

### Lexer (identical in every language)

```text
prepared = comments ? stripComments(input) : input   # same length, # comments blanked to spaces
pos = 0
while pos < len(input):
  c = input[pos]
  if comments and c == '#' and prepared[pos] != '#':
      COMMENT up to (not including) the next '\r' or '\n'
  elif c in '\r\n':
      NEWLINE: "\r\n" if c == '\r' and the next char is '\n', else the single char
      ends the current line of the innermost open container
  elif c in ' \t':
      WHITESPACE: maximal run of spaces/tabs
  elif c == '(':
      new GROUP containing OPEN_PAREN; add the group to the current line, then make the group the innermost container
  elif c == ')':
      append CLOSE_PAREN to the innermost group (NOT inside a line), pop it
  elif c == ':':
      COLON
  else:
      REFERENCE; its end is computed on `prepared`:
        1. prepared[pos] == '~' and the regex  ~[0-9]+\{[^} \t\r\n()]*\}  matches at pos → end of the match;
           value = decodeReferenceLiteral(text)
        2. prepared[pos] is a quote and the binding's delimited-reference reader
           (the same one the parser uses) reads a reference at pos → pos + its length;
           value = what it read; quote = c
        3. otherwise, a bare reference: up to the next char in " \t\r\n(:)" (in prepared); value = text
  token text is ALWAYS sliced from `input` (the original), never from `prepared`.
```

"Add to the current line" means: if the innermost container (the document or
a group) has no open line, start a new `line` node and append it to that
container. Then append the token or group to the line. A newline token is
added like any other token and then closes the line. A line therefore
includes its line ending. A group belongs to the line where it opens, however
many lines it spans.

An empty document is `(document)`.

### S-expression

A node is written `(kind child child …)` with children separated by single
spaces, for example `(document)` when there are no children. A token is
written `kind:"text"`. In the text, `\` → `\\`, `"` → `\"`, LF → `\n`,
CR → `\r` and TAB → `\t`; all other characters, including non-ASCII, are
written as-is in UTF-8.

Example for `(t 1 '1')`:

```text
(document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" whitespace:" " reference:"'1'") close_paren:")")))
```

## C. Golden fixtures

`parity/syntax-fixtures.json` is an array of entries of this form:

```json
{
  "id": "issue-364",
  "feature": "syntax-metadata",
  "input": "(t 1 '1')",
  "links": [{ "id": null, "raw": null, "quote": null, "values": [
    { "id": "t", "raw": "t", "quote": null, "values": [] }, … ] }],
  "cst": "(document …)"
}
```

`links` is the result of `parse(input)`, each link mapped to
`{id, raw: rawId, quote, values}`. `cst` is
`parseCst(input).toSExpression()`.

`parity/syntax-vectors.tsv` has a `#` header line, then one line per case with
four tab-separated fields:

1. the case ID
2. the input as UTF-8 hex
3. the links tree
4. the CST S-expression as UTF-8 hex

The links tree is a space-separated list of `(ID|RAW|QUOTE children…)`. Each
of the three slots is the UTF-8 hex of the value, or `~` for null. An empty
string is an empty slot, so `(|2222|22)` is the empty reference written `""`.
Children follow the head, separated by spaces.

Every binding's tests must:

1. For each syntax fixture: parse the input, compare the tree including raw
   and quote, and check that the CST S-expression matches and that
   `toString()` equals the input. Check the stream parser too, where the
   binding's text-parity test already streams.
2. For every input in **both** `parity/text-fixtures.json` (or
   `text-vectors.tsv`) and the syntax fixtures, check that
   `parseCst(input).toString() == input` and that the concatenated
   `tokens()` text equals the input. This is the "original text is fully
   recoverable" requirement.
3. Focused tests:
   - `(t 1 '1')` gives equal references, quote null versus `'`, and formats as
     `(t 1 1)`.
   - The equality, formatting and repr outputs are unchanged.
   - AST mode drops the metadata.
   - `comments=false` turns `#` into reference text in the CST.
   - Unbalanced input throws from `parseCst`.
