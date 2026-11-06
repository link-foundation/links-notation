# Links Notation Parser for Swift

[![Actions Status](https://github.com/link-foundation/links-notation/actions/workflows/js.yml/badge.svg)](https://github.com/link-foundation/links-notation/actions/workflows/js.yml)
[![GitHub release](https://img.shields.io/github/v/tag/link-foundation/links-notation?filter=%5B0-9%5D*&label=SwiftPM)](https://github.com/link-foundation/links-notation/tags)

Swift implementation of Link Foundation's Links Notation (Lino) parser and
formatter. It has no dependencies beyond the Swift standard library (not even
Foundation), needs Swift 5.9 or newer, and runs on macOS 13+, iOS 16+ and
Linux.

## Installation

The package is distributed with the Swift Package Manager. `Package.swift`
is at the root of this repository, and every release is tagged with its plain
version number, so add the repository to your package's dependencies:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/link-foundation/links-notation.git", from: "0.31.3"),
],
targets: [
    .target(
        name: "YourTarget",
        dependencies: [.product(name: "LinksNotation", package: "links-notation")]),
]
```

In Xcode, choose **File > Add Package Dependencies...** and enter
`https://github.com/link-foundation/links-notation.git`.

[`examples/swift`](../examples/swift) is a complete package that depends on
this one; CI builds and runs it.

## Quick Start

```swift
import LinksNotation

// Parse links notation
let links = try Parser().parse("papa (lovesMama: loves mama)")

// Format back to string
print(formatLinks(links))  // (papa (lovesMama: loves mama))
```

## Features

- Parse Links Notation (Lino) into structured `Link` values
- Format `Link` values back to Lino notation
- Support for inline and indented syntax
- `#` comments, on by default and switchable off
- Parsed links remember how their ids were written (`rawId`, `quote`), and
  `parseCst` gives a lossless concrete syntax tree
- Quoted strings with special characters
- Triple-quoted strings for embedded quotes
- Configurable formatting with `FormatOptions` (also named `FormatConfig`)
- Streaming parsing with `StreamParser`, from a `Sequence` or an
  `AsyncSequence` of chunks
- Indented documents with `parseIndentedDocument`
- Binary Links Notation with `BinaryLinoCodec`
- Full compatibility with the other eight implementations (JavaScript, Rust,
  Python, Java, Go, C#, PHP, C++)

## API Reference

### Link

```swift
public struct Link: Hashable, Sendable, CustomStringConvertible {
    public var id: String?
    public var values: [Link]
    public var rawId: String?   // the id exactly as the parser read it
    public var quote: String?   // the quote rawId was written between

    public init(id: String? = nil, values: [Link] = [], rawId: String? = nil)
    public func format(lessParentheses: Bool = false) -> String
    public func format(options: FormatOptions) -> String
    public func simplify() -> Link
    public func combine(_ other: Link) -> Link
}
```

Represents a link in Lino notation. A link can be:

- A reference (ID only, no values)
- A link with ID and values
- A link with only values (no ID)

Links compare with `==`, ignoring `rawId`, and `description` is `format()`.

### Functions

```swift
public func formatLinks(_ links: [Link], lessParentheses: Bool = false) -> String
public func formatLinks(_ links: [Link], options: FormatOptions) -> String
public func escapeReference(_ reference: String?, minimal: Bool = false) -> String
public func unescapeReference(_ reference: String) throws -> String
```

### Parser

```swift
let parser = Parser(options: ParserOptions(maxDepth: 16))
let links: [Link] = try parser.parse(document)
let groups: [LinksGroup] = try parser.parseGroups(document)
let cst: CstNode = try parser.parseCst(document)
```

`ParserOptions` holds:

- `maxDepth` - How deep links may nest (default: `defaultMaxDepth`, which is
  64); see [Nesting Depth](#nesting-depth)
- `maxInputSize` - The longest document accepted, in UTF-16 code units
  (default: `nil`, which means `defaultMaxInputSize`, 10 MiB); a longer one
  throws `ParseError.inputTooLarge`
- `comments` - Whether `#` starts a comment (default: `true`)
- `syntax` - Whether parsed links record how their ids were written in
  `rawId` (default: `true`); `false` is the AST mode

`parse` throws `ParseError`; `parseLocated` reads the same links but throws
`LocatedParseError`, which also says where the document failed (`line`,
`column`, `offset`, `found`, `lineText` and `snippet`). Lines and columns count
from 1, and columns and offsets are in UTF-16 code units, as in JavaScript.

`parseGroups` keeps each line's link together with the lines indented under
it, as `LinksGroup(element, children:)`.

Within an indented ID such as `x:\n  a\n  b`, the `x:` element has an empty
value list and its children are references `a` and `b`. Folding the children
into the element gives `(x: a b)`, as canonical `parse` does. Explicit `(a)`
keeps its one-value link, and ordinary heads such as `x: kind` keep their
existing child links and path expansion. Since 0.30.2, access a reference
leaf as `child.element`, rather than `child.element.values[0]`.

### Syntax Metadata and the Concrete Syntax Tree

A parsed link records how its id was written. `rawId` is the id exactly as
the document wrote it, quotes, doubled quote runs and `~1{...}` literals
included, and `quote` is its delimiter (`'`, `"` or `` ` ``) when it is one
complete quoted reference. Equality, hashing and formatting ignore both, so
`1` and `'1'` are still the same reference:

```swift
let link = try Parser().parse("(t 1 '1')")[0]
// link.values[1].rawId == "1",   link.values[1].quote == nil
// link.values[2].rawId == "'1'", link.values[2].quote == "'"
// link.values[1] == link.values[2], and link.format() == "(t 1 1)"
```

Links built in code, links without an id and links made by combining an
indented path have no `rawId`. `parseGroups` and `StreamParser` keep it, and
`ParserOptions(syntax: false)` (AST mode) drops it. `referenceQuote(_:)`
reads the delimiter of any written reference the same way.

`parseCst` reads the lossless concrete syntax tree: every character belongs to
exactly one token, so `description` gives the document back exactly, comments,
whitespace and line endings included. It throws whatever `parse` throws for
the same document.

```swift
let cst = try Parser().parseCst("a '1' # note\n")
// cst.description == "a '1' # note\n"
// cst.toSExpression() ==
//   (document (line reference:"a" whitespace:" " reference:"'1'"
//     whitespace:" " comment:"# note" newline:"\n"))
```

A `CstNode` has a `kind` (`.document`, `.line` or `.group` for nodes, and
`.whitespace`, `.newline`, `.comment`, `.openParen`, `.closeParen`, `.colon` or
`.reference` for tokens), its `children`, and for a reference token its decoded
`value` and its `quote`. `text`, `tokens()`, `isToken` and `toSExpression()`
read it.

### FormatOptions

```swift
let options = FormatOptions(maxLineLength: 20, indentLongLines: true, preferInline: false)
print(formatLinks(try Parser().parse("(record: first second third fourth)"), options: options))
// record:
//   first
//   second
//   third
//   fourth
```

The options are `lessParentheses`, `maxLineLength` (default 80),
`indentLongLines`, `maxInlineRefs`, `groupConsecutive`, `indentString`
(default two spaces) and `preferInline` (default `true`).

### Streaming Parsing

`StreamParser` accepts arbitrary chunks, which may end in the middle of a
line or a reference, and emits complete top-level links through what each
`write` returns and through `onLink`:

```swift
let stream = StreamParser()
_ = stream.onLink { print($0) }
for chunk in ["papa (lov", "esMama: loves mama)\nson lo", "vesMama\n"] {
    _ = try stream.write(chunk)
}
_ = try stream.end()
// (papa (lovesMama: loves mama))
// (son lovesMama)
```

`onError`, `onEnd`, `position()`, `drain()`, `reset()` and
`StreamParserOptions(maxBufferSize:collect:)` support long-lived streams.
`StreamParser.parse` reads every link of a `Sequence` of chunks, or yields the
links of an `AsyncSequence` of chunks as an `AsyncThrowingStream`:

```swift
for link in try StreamParser.parse(["a b\nc", " d\n"]) { print(link) }
// (a b)
// (c d)
```

### Indented Documents

`parseIndentedDocument` reads text parents and their immediate text
children, and `formatIndentedDocument` writes them back with minimal
quoting:

```swift
let document = try parseIndentedDocument("colors\n  red\n  'light blue'\nempty\n")
// ["colors": .list(["red", "light blue"]), "empty": .list([])]
print(formatIndentedDocument(document), terminator: "")
```

Pass `IndentedDocumentOptions(multipleValues: .join)` to join several children
into one value, one child per line.

### Binary Links Notation

`BinaryLinoCodec` writes documents as
[Binary Links Notation](../docs/protocol/binary-links-notation.md) and reads
them back exactly, byte for byte the same as the other implementations:

```swift
let codec = BinaryLinoCodec()
let bytes: [UInt8] = try codec.encodeText("papa (lovesMama: loves mama)")
print(try codec.decodeText(bytes))  // papa (lovesMama: loves mama)

// Version 2 features: external references, a range of arities, packed widths.
let v2 = BinaryLinoCodec(
    options: BinaryLinoOptions(
        externalReferences: true, arity: try ArityRange.parse("2..3"), packedWidths: true))
```

`encode` and `decode` work on `[Link]`, and `encodePacket` and `decodePacket`
on the `LinksPacket` structure itself. Malformed input throws `BinaryError`,
and `DecodeLimits` bounds what a decoder accepts.

## Examples

### Basic Parsing

```swift
let parser = Parser()

// Parse a simple link
var links = try parser.parse("(papa has car)")

// Parse with ID and values
links = try parser.parse("(address: source target)")

// Parse multiple links
links = try parser.parse("(papa has car)\n(mama has house)")
```

### Quoted References

```swift
// References with spaces need quotes
var links = try Parser().parse("(\"New York\": city state)")

// Special characters
links = try Parser().parse("('key:with:colons': 'value')")
```

### Indented Syntax

```swift
// Indented format is equivalent to inline
let indented = try Parser().parse("id:\n  value1\n  value2")
let inline = try Parser().parse("(id: value1 value2)")

// Both produce the same result
assert(indented == inline)
```

### Custom Formatting

```swift
let link = Link(id: "id", values: [Link(id: "value1"), Link(id: "value2")])

// Less parentheses mode
print(link.format(lessParentheses: true))  // id: value1 value2
```

## Syntax Overview

### Doublets (2-tuple)

```lino
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
```

### Triplets (3-tuple)

```lino
papa has car
mama has house
(papa and mama) are happy
```

### Sequences (N-tuple)

```lino
I'm a friendly AI.
(I'm a friendly AI too.)
(linksNotation: links notation)
```

### Indented Syntax

```lino
3:
  papa
  loves
  mama
```

Equivalent to: `(3: papa loves mama)`

### Multi-line Groups

A parenthesized group opens a *nested context*: its body starts fresh at
indentation level zero and follows the same rules as the root document, so a
line break inside parentheses is structure rather than decoration.

```lino
value (
  id "1"
  label "one"
)
```

The document above parses to `(value ((id 1) (label one)))` - two children, each
a link of its own - rather than to one flat list in which the boundary between
`id` and `label` would be lost. A body that stays on a single line still
collapses to a single link, so `(a b c)` is unchanged.

```swift
let links = try Parser().parse("value (\n  id \"1\"\n  label \"one\"\n)")
print(formatLinks(links))  // (value ((id 1) (label one)))
```

### Comments

A `#` hides the rest of the line it stands on, so a document can carry prose
about itself:

```lino
# the machines this deploys to
deploy: staging # only staging, for now
```

Both comments are gone by the time the document is read, leaving the single
link `(deploy: staging)`. A `#` only opens a comment where a reference could
begin, so a `#` inside a token (`issue#1047`) and a `#` inside a delimited
reference (`"#"`) stay ordinary characters.

A formatter keeps the same rule from the other side: a reference that begins
with a `#` is written quoted (`'#tag'`), so a document it writes reads back as
itself.

Comments are on by default, and a parser can be told to read `#` as an ordinary
character again, for documents written before comments existed:

```swift
let links = try Parser().parse("# the machines this deploys to\ndeploy: staging # only staging, for now\n")
print(formatLinks(links))  // (deploy: staging)

let plain = try Parser(options: ParserOptions(comments: false)).parse("# a b\n")
print(formatLinks(plain))  // ('#' a b)
```

### Nesting Depth

Every parenthesized group and every indentation level is one level of nesting;
the lines of a document are at level 0, and indentation inside a group counts on
top of the group's own level. The parser recurses once per level, so it refuses
a document nested deeper than `maxDepth` (default: `defaultMaxDepth`, which is
64) with an error instead of recursing until the stack is exhausted, which
would end the whole process.

`parse` throws `ParseError.depthExceeded(maxDepth)`, and `parseLocated` a
`LocatedParseError` that points at the group or the line that is one level too
deep:

```swift
do {
    _ = try Parser(options: ParserOptions(maxDepth: 3)).parseLocated("((((a))))")
} catch let error as LocatedParseError {
    print(error.line!, error.column!)  // 1 4
    print(error.message)
}
```

```text
Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
1 | ((((a))))
  |    ^
```

A `StreamParser` uses the options it is created with, and wraps the error in a
`StreamParseError` whose `offset`, `line` and `column` count from the start of
the stream.

## Testing

From the root of the repository:

```bash
swift build --build-tests -Xswiftc -warnings-as-errors
swift test --parallel
swift format lint --strict --recursive Package.swift swift examples/swift
```

The tests use XCTest and read the shared fixtures in the repository's
`parity/` and `docs/` folders. Set `LINKS_NOTATION_VECTORS` to the output of
`node experiments/issue-369/differential-vectors.mjs` to compare the parser with
the JavaScript reference implementation on random documents.

## License

[Unlicense](../LICENSE)

Exact Unicode identifiers and values round-trip with the
[reference literal contract](../docs/protocol/reference-literals.md), including
mixed quotes, empty strings, controls and multiline text.
