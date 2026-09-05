# Links Notation Parser for Go

[![Actions Status](https://github.com/link-foundation/links-notation/workflows/go/badge.svg)](https://github.com/link-foundation/links-notation/actions?workflow=go)
[![Go Reference](https://pkg.go.dev/badge/github.com/link-foundation/links-notation/go.svg)](https://pkg.go.dev/github.com/link-foundation/links-notation/go)

Go implementation of Link Foundation's Links Notation (Lino) parser and formatter.

## Installation

```bash
go get github.com/link-foundation/links-notation/go
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    lino "github.com/link-foundation/links-notation/go"
)

func main() {
    // Parse links notation
    links, err := lino.Parse("papa (lovesMama: loves mama)")
    if err != nil {
        log.Fatal(err)
    }

    // Format back to string
    output := lino.Format(links)
    fmt.Println(output)
}
```

## Features

- Parse Links Notation (Lino) into structured Link objects
- Format Link objects back to Lino notation
- Support for inline and indented syntax
- Quoted strings with special characters
- Triple-quoted strings for embedded quotes
- Configurable formatting with `FormatConfig`
- Full compatibility with the other six implementations (C#, JavaScript, Rust, Python, Java, PHP)

## API Reference

### Types

#### Link

```go
type Link struct {
    ID     *string
    Values []*Link
}
```

Represents a link in Lino notation. A link can be:
- A reference (ID only, no values)
- A link with ID and values
- A link with only values (no ID)

#### FormatConfig

```go
type FormatConfig struct {
    LessParentheses  bool   // Omit parentheses when safe
    IndentString     string // String for indentation (default: "  ")
    PreferInline     bool   // Prefer inline over indented format
    IndentByRefCount int    // Indent when ref count >= this value
    IndentByLength   int    // Indent when line length > this value
    GroupConsecutive bool   // Group consecutive links with same ID
}
```

### Functions

#### Parse

```go
func Parse(input string) ([]*Link, error)
```

Parses Lino notation text into a slice of Link objects.

#### Format

```go
func Format(links []*Link) string
```

Formats a collection of Links as a multi-line string.

#### FormatWithConfig

```go
func FormatWithConfig(links []*Link, config *FormatConfig) string
```

Formats Links using the specified FormatConfig.

### Link Methods

#### NewRef

```go
func NewRef(id string) *Link
```

Creates a new reference Link (ID only, no values).

#### NewLink

```go
func NewLink(id *string, values []*Link) *Link
```

Creates a new Link with optional ID and values.

#### Link.IsRef

```go
func (l *Link) IsRef() bool
```

Returns true if this Link is a simple reference (ID only).

#### Link.IsLink

```go
func (l *Link) IsLink() bool
```

Returns true if this Link has values.

#### Link.Format

```go
func (l *Link) Format(lessParentheses bool) string
```

Formats the link as a string.

#### Link.Equal

```go
func (l *Link) Equal(other *Link) bool
```

Checks equality with another Link.

## Examples

### Basic Parsing

```go
// Parse a simple link
links, _ := lino.Parse("(papa has car)")

// Parse with ID and values
links, _ := lino.Parse("(address: source target)")

// Parse multiple links
links, _ := lino.Parse(`(papa has car)
(mama has house)`)
```

### Quoted References

```go
// References with spaces need quotes
links, _ := lino.Parse(`("New York": city state)`)

// Special characters
links, _ := lino.Parse(`('key:with:colons': 'value')`)
```

### Indented Syntax

```go
// Indented format is equivalent to inline
indented := `id:
  value1
  value2`

inline := "(id: value1 value2)"

// Both produce the same result
indentedLinks, _ := lino.Parse(indented)
inlineLinks, _ := lino.Parse(inline)
```

### Nested Links

```go
links, _ := lino.Parse("(outer: (inner: value))")

// Deep nesting
links, _ := lino.Parse("(a: (b: (c: (d: value))))")
```

### Custom Formatting

```go
id := "id"
link := lino.NewLink(&id, []*lino.Link{
    lino.NewRef("value1"),
    lino.NewRef("value2"),
})

// Less parentheses mode
output := link.Format(true) // "id: value1 value2"

// Using FormatConfig
config := lino.DefaultFormatConfig().
    WithLessParentheses(true).
    WithIndentByRefCount(3)
output = link.FormatWithConfig(config)
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

```go
document := `value (
  id "1"
  label "one"
)`

links, _ := lino.Parse(document)
fmt.Println(lino.Format(links)) // (value ((id 1) (label one)))
```

## Testing

```bash
cd go
go test -v
```

## License

[Unlicense](../LICENSE)
