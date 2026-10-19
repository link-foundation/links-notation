# Links Notation Parser for C++

[![Actions Status](https://github.com/link-foundation/links-notation/actions/workflows/js.yml/badge.svg)](https://github.com/link-foundation/links-notation/actions/workflows/js.yml)
[![GitHub release](https://img.shields.io/github/v/release/link-foundation/links-notation?filter=cpp_*&label=release)](https://github.com/link-foundation/links-notation/releases?q=cpp_&expanded=true)

C++17 implementation of Link Foundation's Links Notation (Lino) parser and
formatter. It has no dependencies beyond the standard library and builds with
CMake 3.16 or newer on GCC, Clang, Apple Clang and MSVC.

## Installation

Every release publishes the `cpp/` folder as a source archive on the GitHub
release `cpp_VERSION`, together with its SHA-256 checksum.

### FetchContent

```cmake
include(FetchContent)
FetchContent_Declare(
  links_notation
  URL https://github.com/link-foundation/links-notation/releases/download/cpp_0.27.1/links-notation-cpp-0.27.1.tar.gz
  # Optional: the checksum from links-notation-cpp-0.27.1.tar.gz.sha256
  # URL_HASH SHA256=...
)
FetchContent_MakeAvailable(links_notation)

target_link_libraries(your_target PRIVATE links_notation::links_notation)
```

The tests and examples are off when the library is added to another project.

### find_package

Build and install the library once:

```bash
cmake -S cpp -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
cmake --install build --prefix /usr/local
```

Then use it from your project:

```cmake
find_package(links_notation 0.27 REQUIRED CONFIG)
target_link_libraries(your_target PRIVATE links_notation::links_notation)
```

### add_subdirectory

A copy of `cpp/` in your source tree works too:

```cmake
add_subdirectory(third_party/links-notation-cpp)
target_link_libraries(your_target PRIVATE links_notation::links_notation)
```

## Quick Start

```cpp
#include <iostream>

#include "links_notation.hpp"

int main() {
  // Parse links notation
  const std::vector<links_notation::Link> links = links_notation::parse("papa (lovesMama: loves mama)");

  // Format back to string
  std::cout << links_notation::format_links(links) << '\n';
}
```

`links_notation.hpp` includes the whole library; everything is in the
`links_notation` namespace. `links_notation/version.hpp` defines
`LINKS_NOTATION_VERSION_STRING` and `links_notation::version`.

## Features

- Parse Links Notation (Lino) into structured `Link` objects
- Format `Link` objects back to Lino notation
- Support for inline and indented syntax
- `#` comments, on by default and switchable off
- Quoted strings with special characters
- Triple-quoted strings for embedded quotes
- Configurable formatting with `FormatConfig`
- Streaming parsing with `StreamParser`, and lazy reading with `parse_chunks`
- Indented documents with `parse_indented_document`
- Binary Links Notation with `BinaryLinoCodec`
- Full compatibility with the other seven implementations (JavaScript, Rust,
  Python, Java, Go, C#, PHP)

Each snippet below is checked by
[`examples/features.cpp`](examples/features.cpp), which runs as a test.

## Streaming Parsing

`StreamParser` accepts arbitrary chunks, which may end in the middle of a
line, a reference or a UTF-8 sequence, and emits complete top-level records
through the links each `write` returns or through `on_link`. Call
`set_collect(false)` when the callback should retain only the unresolved
record.

```cpp
links_notation::StreamParser stream;
stream.on_link([](const links_notation::Link& link) { std::cout << link << '\n'; });
for (const char* chunk : {"papa (lov", "esMama: loves mama)\nson lo", "vesMama\n"}) stream.write(chunk);
stream.finish();
// (papa (lovesMama: loves mama))
// (son lovesMama)
```

`on_error`, `position`, `drain`, `reset` and `set_max_buffer_size` support
long-lived streams. `parse_chunks` reads links lazily from any sequence of
chunks, and `ChunkedLinks` from a function that returns the next chunk:

```cpp
links_notation::ChunkedLinks links = links_notation::parse_chunks(std::vector<std::string>{"a b\nc", " d\n"});
while (std::optional<links_notation::Link> link = links.next()) std::cout << *link << '\n';
// (a b)
// (c d)
```

## API Reference

### Link

```cpp
class Link {
 public:
  std::optional<std::string> id;
  std::vector<Link> values;

  bool is_reference() const;
  std::string format(bool less_parentheses = false, bool compound = false) const;
  std::string format(const FormatConfig& config, bool compound = false) const;
  bool equals(const Link& other) const;
  Link simplify() const;
  Link combine(const Link& other) const;
};
```

Represents a link in Lino notation. A link can be:

- A reference (ID only, no values)
- A link with ID and values
- A link with only values (no ID)

`Link("papa")` is a reference, and `Link(id, values)` a link with an optional
id. Links compare with `==`, and `operator<<` writes `format()`.

### Functions

```cpp
std::vector<Link> parse(std::string_view document);
std::string format_links(const std::vector<Link>& links, bool less_parentheses = false);
std::string format_links(const std::vector<Link>& links, const FormatConfig& config);
```

`parse` reads a document with the default options and throws `ParseError` when
it does not parse.

### Parser

```cpp
links_notation::ParserOptions options;
options.max_depth = 16;
const links_notation::Parser parser(options);
std::vector<links_notation::Link> links = parser.parse(document);
std::vector<links_notation::LinksGroup> groups = parser.parse_groups(document);
```

`ParserOptions` holds:

- `max_input_size` - The largest document accepted, in bytes (default: 10 MB);
  a larger one throws `std::length_error`
- `max_depth` - How deep links may nest (default: `default_max_depth`, which is
  64); see [Nesting Depth](#nesting-depth)
- `comments` - Whether `#` starts a comment (default: `true`)

`parse_groups` keeps each line's link together with the lines indented under
it, as `LinksGroup{element, children}`.

### FormatConfig

```cpp
const links_notation::FormatConfig config = links_notation::FormatConfig::builder()
                                                .indent_long_lines(true)
                                                .max_line_length(20)
                                                .prefer_inline(false)
                                                .build();
std::cout << links_notation::format_links(links_notation::parse("(record: first second third fourth)"), config);
// record:
//   first
//   second
//   third
//   fourth
```

The options are `less_parentheses`, `max_line_length` (default 80),
`indent_long_lines`, `max_inline_refs`, `group_consecutive`, `indent_string`
(default two spaces) and `prefer_inline` (default `true`).

### Indented Documents

`parse_indented_document` reads text parents and their immediate text
children, and `format_indented_document` writes them back with minimal
quoting:

```cpp
const std::vector<links_notation::IndentedEntry> entries =
    links_notation::parse_indented_document("colors\n  red\n  'light blue'\nempty\n");
// entries: {"colors", {"red", "light blue"}}, {"empty", {}}
std::cout << links_notation::format_indented_document(entries);
```

Pass `MultipleValues::join` to join several children into one value, one child
per line.

### Binary Links Notation

`BinaryLinoCodec` writes documents as
[Binary Links Notation](../docs/protocol/binary-links-notation.md) and reads
them back exactly, byte for byte the same as the other implementations:

```cpp
const links_notation::BinaryLinoCodec codec;
const std::vector<std::uint8_t> bytes = codec.encode_text("papa (lovesMama: loves mama)");
std::cout << codec.decode_text(bytes) << '\n';

// Version 2 features: external references, a range of arities, packed widths.
const links_notation::BinaryLinoCodec v2(
    links_notation::BinaryLinoOptions{true, links_notation::ArityRange::parse("2..3"), true});
```

`encode` and `decode` work on `std::vector<Link>`, and `encode_packet` and
`decode_packet` on the packet structure itself. Malformed input throws
`BinaryError`, and `DecodeLimits` bounds what a decoder accepts.

## Examples

### Basic Parsing

```cpp
// Parse a simple link
auto links = links_notation::parse("(papa has car)");

// Parse with ID and values
links = links_notation::parse("(address: source target)");

// Parse multiple links
links = links_notation::parse("(papa has car)\n(mama has house)");
```

### Quoted References

```cpp
// References with spaces need quotes
auto links = links_notation::parse(R"(("New York": city state))");

// Special characters
links = links_notation::parse("('key:with:colons': 'value')");
```

### Indented Syntax

```cpp
// Indented format is equivalent to inline
const auto indented = links_notation::parse("id:\n  value1\n  value2");
const auto inline_links = links_notation::parse("(id: value1 value2)");

// Both produce the same result
assert(indented == inline_links);
```

### Custom Formatting

```cpp
const links_notation::Link link("id", {links_notation::Link("value1"), links_notation::Link("value2")});

// Less parentheses mode
std::cout << link.format(true) << '\n';  // id: value1 value2
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

```cpp
const auto links = links_notation::parse("value (\n  id \"1\"\n  label \"one\"\n)");
std::cout << links_notation::format_links(links) << '\n';  // (value ((id 1) (label one)))
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

```cpp
const auto links =
    links_notation::parse("# the machines this deploys to\ndeploy: staging # only staging, for now\n");
std::cout << links_notation::format_links(links) << '\n';  // (deploy: staging)

links_notation::ParserOptions options;
options.comments = false;
const auto plain = links_notation::Parser(options).parse("# a b\n");
std::cout << links_notation::format_links(plain) << '\n';  // ('#' a b)
```

### Nesting Depth

Every parenthesized group and every indentation level is one level of nesting;
the lines of a document are at level 0, and indentation inside a group counts on
top of the group's own level. The parser recurses once per level, so it refuses
a document nested deeper than `max_depth` (default: `default_max_depth`, which
is 64) with an error instead of recursing until the stack is exhausted, which
would end the whole process.

The error is a `ParseError` whose `kind()` is `ParseError::Kind::nesting`. It
points at the group or the line that is one level too deep:

- `max_depth()` - The deepest nesting allowed, for a nesting error
- `offset()` - Byte offset of the offending position from the start of the
  document
- `line()`, `column()` - Where the offending position is, counted from 1
- `line_text()` - The offending line, as written
- `summary()` and `snippet()` - The first line of the message, and the
  offending line with a caret under the offending column

```cpp
links_notation::ParserOptions options;
options.max_depth = 3;
try {
  links_notation::Parser(options).parse("((((a))))");
} catch (const links_notation::ParseError& error) {
  std::cout << error.line() << ' ' << error.column() << '\n';  // 1 4
  std::cout << error.what() << '\n';
}
```

```text
Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3
1 | ((((a))))
  |    ^
```

A `StreamParser` uses the options it is created with, and wraps the error in a
`StreamParseError` whose `location()` counts from the start of the stream.

## Testing

```bash
cd cpp
cmake -S . -B build -DLINKS_NOTATION_WARNINGS_AS_ERRORS=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure
```

The suites use GoogleTest, which CMake fetches when no GoogleTest 1.11 or newer is
installed, and read the shared fixtures in
the repository's `parity/` and `docs/` folders, so they build from a checkout
of the whole repository. `LINKS_NOTATION_BUILD_TESTS` and
`LINKS_NOTATION_BUILD_EXAMPLES` switch them on or off.

Source files are formatted with the clang-format version pinned in
[`tools/requirements.txt`](tools/requirements.txt).

## License

[Unlicense](../LICENSE)

Exact Unicode identifiers and values round-trip with the
[reference literal contract](../docs/protocol/reference-literals.md), including
mixed quotes, empty strings, controls and multiline text.
