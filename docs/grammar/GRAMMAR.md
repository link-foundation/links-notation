# Links Notation (Lino) Grammar Specification

This document provides a formal specification of the Links Notation (Lino)
grammar using Extended Backus-Naur Form (EBNF), detailed explanations, and
syntax diagrams.

## Table of Contents

1. [Overview](#overview)
2. [EBNF Grammar](#ebnf-grammar)
3. [Grammar Explained](#grammar-explained)
4. [Syntax Diagrams](#syntax-diagrams)
5. [Examples](#examples)

## Overview

Links Notation (Lino) is a simple, intuitive format for representing
structured data as links between references. The notation supports:

- **References**: Simple identifiers, or quoted strings
- **Links**: Connections between references with optional identifiers
- **Nesting**: Parenthesized expressions for inline nesting
- **Indentation**: Hierarchical structure through indentation
- **Comments**: `#` hides the rest of the line it stands on

## EBNF Grammar

The following EBNF grammar formally defines the Links Notation syntax:

```ebnf
(* Links Notation (Lino) Grammar - EBNF *)
(* Version: 0.19.0 *)

(* === Document Structure === *)
document            = skip_empty_lines, links, whitespace, EOF
                    | whitespace, EOF ;

skip_empty_lines    = { horizontal_whitespace, newline } ;

links               = first_line, { line } ;

first_line          = SET_BASE_INDENTATION, element ;

line                = skip_empty_lines, CHECK_INDENTATION, element ;

element             = any_link, PUSH_INDENTATION, links
                    | any_link ;

(* === Comments === *)
(* A comment is taken out before the rules above are applied: each of its
   characters is replaced with a space, so what follows keeps the position it
   was written at, and a line that held only a comment becomes whitespace *)
comment             = comment_start, { any_char - newline } ;

(* Only a "#" at the start of the document or after a space, a tab or a line
   break opens a comment *)
comment_start       = ? start of document ?, "#"
                    | whitespace_char, "#" ;

(* === Link Types === *)
any_link            = nested_group, eol
                    | indented_id_link
                    | single_line_any_link ;

single_line_any_link = single_line_link, eol
                     | single_line_value_link, eol ;

(* === Nested Groups (Parenthesized) === *)
(* A group opens a nested context that starts fresh at indentation level
   zero and follows the same rules as the root document *)
nested_group        = "(", ENTER_NESTED_CONTEXT, nested_group_body,
                      EXIT_NESTED_CONTEXT ;

nested_group_body   = skip_empty_lines, links, whitespace, ")"
                    | whitespace, ")" ;

(* === Single Line Links === *)
single_line_link    = horizontal_whitespace, reference,
                      horizontal_whitespace, ":", single_line_values ;

single_line_value_link = single_line_values ;

single_line_values  = { horizontal_whitespace, reference_or_link }- ;

(* === Indented ID Link === *)
indented_id_link    = reference, horizontal_whitespace, ":", eol ;

(* === Reference Types === *)
reference_or_link   = nested_group
                    | reference ;

reference           = delimited_reference
                    | simple_reference ;

simple_reference    = reference_symbol, { reference_symbol } ;

(* The three delimiters behave identically; nothing else delimits *)
delimiter           = '"' | "'" | "`" ;

delimiter_run       = delimiter, { delimiter } ;

(* The n-quoted reading is tried first; when it does not apply, an even run
   of delimiters is the empty reference *)
delimited_reference = n_quoted_reference
                    | empty_reference ;

(* A run of N delimiters, a body, then a run of exactly N of the same
   delimiter. Conditions: both runs use the same delimiter and have the same
   length N; the closing run is not followed by another delimiter; a run of
   2N delimiters in the body stands for N literal delimiters; and when N is
   even the body is substantive, holding at least one non-whitespace
   character with balanced parentheses *)
n_quoted_reference  = delimiter_run, { any_char }, delimiter_run ;

(* A bare delimiter pair is the empty reference, and so is any longer even
   run of the same delimiter that does not open an n-quoted reference *)
empty_reference     = delimiter, delimiter, { delimiter, delimiter } ;

(* === Terminal Symbols === *)
reference_symbol    = any_char - whitespace_char - "(" - ":" - ")" ;

whitespace_char     = " " | "\t" | "\n" | "\r" ;

horizontal_whitespace = { " " | "\t" } ;

whitespace          = { whitespace_char } ;

newline             = "\r\n" | "\n" | "\r" ;

eol                 = horizontal_whitespace, ( newline | EOF )
                    | nested_group_end ;

(* Inside a group the closing parenthesis ends the last line, just like a
   line break does at the root. It is not consumed here. *)
nested_group_end    = ? only inside a nested context ?,
                      horizontal_whitespace, ? lookahead of ")" ? ;

EOF                 = ? end of input ? ;

any_char            = ? any unicode character ? ;

(* === Indentation Control (Semantic Actions) === *)
SET_BASE_INDENTATION = { " " } ;
(* Sets the base indentation level from the first content line *)

PUSH_INDENTATION    = { " " } ;
(* Pushes a new indentation level if greater than current *)
(* Condition: normalized_spaces > current_indentation *)

CHECK_INDENTATION   = { " " } ;
(* Verifies indentation is valid for current context *)
(* Condition: normalized_spaces >= current_indentation *)

ENTER_NESTED_CONTEXT = ;
(* Saves the indentation stack and base indentation, then resets them so
   the group body starts fresh at indentation level zero *)

EXIT_NESTED_CONTEXT = ;
(* Restores the indentation state saved when the group was opened *)
```

### Grammar in Links Notation Format

The grammar can also be expressed using Links Notation itself:

```lino
grammar:
  document:
    (alternative:
      (sequence skip_empty_lines links whitespace EOF)
      (sequence whitespace EOF))

  skip_empty_lines:
    (zero_or_more (sequence horizontal_whitespace newline))

  links:
    (sequence first_line (zero_or_more line))

  first_line:
    (sequence SET_BASE_INDENTATION element)

  line:
    (sequence skip_empty_lines CHECK_INDENTATION element)

  element:
    (alternative:
      (sequence any_link PUSH_INDENTATION links)
      any_link)

  any_link:
    (alternative:
      (sequence nested_group eol)
      indented_id_link
      single_line_any_link)

  single_line_any_link:
    (alternative:
      (sequence single_line_link eol)
      (sequence single_line_value_link eol))

  nested_group:
    (sequence "(" ENTER_NESTED_CONTEXT nested_group_body
      EXIT_NESTED_CONTEXT)

  nested_group_body:
    (alternative:
      (sequence skip_empty_lines links whitespace ")")
      (sequence whitespace ")"))

  single_line_link:
    (sequence horizontal_whitespace reference
      horizontal_whitespace ":" single_line_values)

  single_line_value_link:
    single_line_values

  single_line_values:
    (one_or_more (sequence horizontal_whitespace reference_or_link))

  indented_id_link:
    (sequence reference horizontal_whitespace ":" eol)

  reference_or_link:
    (alternative nested_group reference)

  reference:
    (alternative delimited_reference simple_reference)

  comment:
    (sequence comment_start (zero_or_more (not newline)))

  comment_start:
    (alternative:
      (sequence start_of_document "#")
      (sequence whitespace_char "#"))

  simple_reference:
    (one_or_more reference_symbol)

  delimiter:
    (alternative '"' "'" '`')

  delimiter_run:
    (one_or_more delimiter)

  delimited_reference:
    (alternative n_quoted_reference empty_reference)

  n_quoted_reference:
    (sequence delimiter_run (zero_or_more any_char) delimiter_run)

  empty_reference:
    (one_or_more (sequence delimiter delimiter))

  reference_symbol:
    (not (alternative whitespace_char "(" ":" ")"))

  whitespace_char:
    (alternative " " "\t" "\n" "\r")

  horizontal_whitespace:
    (zero_or_more (alternative " " "\t"))

  whitespace:
    (zero_or_more whitespace_char)

  newline:
    (alternative "\r\n" "\n" "\r")

  eol:
    (alternative:
      (sequence horizontal_whitespace (alternative newline EOF))
      nested_group_end)

  nested_group_end:
    (sequence inside_nested_context horizontal_whitespace
      (lookahead ")"))
```

## Grammar Explained

### Document Structure

A **document** consists of zero or more links. Empty documents (containing
only whitespace) are valid.

```text
Document
├── Skip empty lines at the start
├── Parse links (hierarchical structure)
├── Allow trailing whitespace
└── End of file
```

### References

References are the atomic building blocks of Links Notation. A reference is
either simple or delimited:

| Type      | Syntax       | Example         | Description                         |
|-----------|--------------|-----------------|-------------------------------------|
| Simple    | `identifier` | `papa`, `mama`  | Alphanumeric and special            |
| Delimited | `"text"`     | `"hello world"` | Any text between matching runs      |
| Empty     | `""`         | `("" 1)`        | A bare delimiter pair holds nothing |

**Simple Reference Characters:**

- Valid: Letters, digits, `-`, `_`, `.`, `!`, `?`, `@`, `#`, `$`, `%`, etc.
- Invalid: Space, tab, newline, `(`, `:`, `)`
- A `#` is valid inside a reference (`issue#1047`) but opens a comment where a
  reference could begin, so a reference cannot start with one unless it is
  delimited (`"#"`)

**Delimiters:**

The three delimiters `"`, `'` and `` ` `` behave identically, so `"text"`,
`'text'` and `` `text` `` are the same reference. Nothing else delimits: `«`,
`[`, `|` and the like are ordinary characters of a simple reference.

**N-Quoted References:**

A reference may open with a run of N identical delimiters and close with a run
of exactly N of the same delimiter, which lets the body hold the delimiter
itself:

```lino
(x "" " "")
```

reads as a single reference holding ` " `. Inside the body a run of 2N
delimiters stands for N literal delimiters.

**The Empty Reference:**

The shortest reading wins: a bare delimiter pair is the empty reference, and so
is any longer even run that does not open an n-quoted reference with a
substantive body. A body is substantive when it holds at least one
non-whitespace character and its parentheses are balanced.

| Source        | Reads as                                 |
|---------------|------------------------------------------|
| `(a "" b)`    | `a`, the empty reference, `b`            |
| `(a "" "" b)` | `a`, two empty references, `b`           |
| `(a """" b)`  | `a`, one empty reference, `b`            |
| `(a ""x"" b)` | `a`, `x` written with a 2-quote run, `b` |
| `(a " " b)`   | `a`, a reference holding one space, `b`  |
| `("" ("" 1))` | the empty reference linked to `("" 1)`   |

The empty reference is a reference like any other: it can be a value, an
identifier, and it nests. Formatters write it as `""` so it reads back as
itself instead of disappearing from the document.

### Comments

A `#` hides the rest of the line it stands on:

```lino
# the machines this deploys to
deploy: staging # only staging, for now
```

The document above is the single link `(deploy: staging)`.

A comment opens only where a reference could begin - at the start of the
document or after a space, a tab or a line break - so a `#` inside a token
(`issue#1047`) and a `#` inside a delimited reference (`"#"`) are ordinary
characters.

Comments are taken out before the rest of the grammar is applied, by replacing
each of their characters with a space rather than by cutting them out. Two
things follow. A position reported for a document is the position in the
document as it was written, so a parse error still points at the column it
broke at. And a line that held nothing but a comment becomes a line of
whitespace, which separates links the way an empty line does and does not end
an indented block, so a comment can stand on a line of its own inside one:

```lino
parent
  # what the child is for
  child
```

reads as `parent` with the single child `child`.

Every implementation reads comments by default and can be told to read `#` as
an ordinary character instead, for documents written before comments existed.

### Link Types

#### 1. Single-Line Value Link

A sequence of references on a single line without an explicit identifier:

```lino
papa loves mama
```

This creates an anonymous link with three values: `papa`, `loves`, `mama`.

#### 2. Single-Line Named Link

A link with an explicit identifier, using the `:` separator:

```lino
family: papa mama son daughter
```

This creates a link named `family` with four values.

#### 3. Nested Group (Parenthesized Link)

Links enclosed in parentheses can span multiple lines:

```lino
(family:
  papa
  mama
  son
  daughter)
```

A parenthesized group opens a **nested context**: its body starts fresh at
indentation level zero and follows exactly the same rules as the root
document, so indentation is structural inside parentheses too:

```lino
array (
  a
    b
  c
    d
)
```

The body above produces the same four links the root produces for
`a`/`  b`/`c`/`  d`, nested under `array`.

A group body that produces a single link collapses to that link, so
`(a b c)` stays a single link. The only exception is a body that is itself a
single parenthesized group, which keeps `((a b))` distinct from `(a b)`.

#### 4. Anonymous Nested Group

Anonymous parenthesized links:

```lino
(papa loves mama)
```

#### 5. Indented ID Link

A named link where children are defined by indentation:

```lino
family:
  papa
  mama
  son
```

### Indentation Rules

Indentation is significant in Links Notation for defining hierarchical
structures:

1. **Base Indentation**: The first content line sets the base indentation
2. **Child Elements**: Must be indented more than their parent
3. **Sibling Elements**: Must have the same indentation level
4. **Spaces Only**: Only space characters count for indentation

```text
document
├── first_line (sets base_indentation)
├── line (must be >= base_indentation)
│   └── children (must be > parent indentation)
└── line (sibling, same level)
```

### Nesting

Links can be nested in two ways:

#### Inline Nesting (Parentheses)

```lino
(outer: (inner: value1 value2) value3)
```

Parentheses may also be broken across lines, in which case the indentation
inside them is structural:

```lino
(outer:
  (inner:
    value1
    value2)
  value3)
```

#### Hierarchical Nesting (Indentation)

```lino
outer:
  inner:
    value1
    value2
  value3
```

Both produce equivalent structures.

## Syntax Diagrams

### Document

```text
              ┌─────────────────────┐
──────────────┤  skip_empty_lines   ├──────┬──────────────┐
              └─────────────────────┘      │              │
                                           │              │
              ┌─────────────────────┐      │              │
              │       links         │◄─────┘              │
              └─────────┬───────────┘                     │
                        │                                 │
              ┌─────────▼───────────┐                     │
              │     whitespace      │◄────────────────────┘
              └─────────┬───────────┘
                        │
              ┌─────────▼───────────┐
              │        EOF          │
              └─────────────────────┘
```

### Reference

```text
              ┌─────────────────────────┐
      ┌───────┤  n_quoted_reference     ├───────┐
      │       └─────────────────────────┘       │
      │                                         │
──────┼───────┌─────────────────────────┐───────┼──────▶
      │       │  empty_reference        │       │
      │       └─────────────────────────┘       │
      │                                         │
      │       ┌─────────────────────────┐       │
      └───────┤    simple_reference     ├───────┘
              └─────────────────────────┘
```

### Simple Reference

```text
              ┌─────────────────────┐
──────────────┤  reference_symbol   ├──────┬──────▶
              └─────────────────────┘      │
                        ▲                  │
                        │                  │
                        └──────────────────┘
```

### N-Quoted Reference

```text
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
────────┤ N delimiters ├───┤   any char   ├───┤ N delimiters ├──────▶
        └──────────────┘   └──────┬───────┘   └──────────────┘
                               │     ▲
                               └─────┘
```

Both runs use the same delimiter and the same length N, and the closing run is
not followed by another delimiter. A run of 2N delimiters inside the body
stands for N literal delimiters.

### Empty Reference

```text
              ┌───┐   ┌───┐
──────────────┤ d ├───┤ d ├──────┬──────▶
              └───┘   └───┘      │
                ▲                │
                └────────────────┘
```

An even run of the same delimiter `d` that does not open an n-quoted reference
with a substantive body is the empty reference.

### Any Link

```text
              ┌─────────────────────────┐   ┌─────┐
      ┌───────┤      nested_group       ├───┤ eol ├───┐
      │       └─────────────────────────┘   └─────┘   │
      │                                               │
──────┼───────┌─────────────────────────┐─────────────┼──────▶
      │       │    indented_id_link     │             │
      │       └─────────────────────────┘             │
      │                                               │
      │       ┌─────────────────────────┐             │
      └───────┤  single_line_any_link   ├─────────────┘
              └─────────────────────────┘
```

### Nested Group

```text
              ┌───┐   ┌──────────────────────┐
──────────────┤ ( ├───┤ ENTER_NESTED_CONTEXT ├───┐
              └───┘   └──────────────────────┘   │
                                                 │
      ┌──────────────────────────────────────────┘
      │
      │       ┌───────────────────┐   ┌───────┐   ┌───┐   ┌───┐
      ├───────┤ skip_empty_lines  ├───┤ links ├───┤ _ ├───┤ ) ├───┐
      │       └───────────────────┘   └───────┘   └───┘   └───┘   │
      │                                                           │
      │       ┌───┐   ┌───┐                                       │
      └───────┤ _ ├───┤ ) ├───────────────────────────────────────┤
              └───┘   └───┘                                       │
                                                                  │
              ┌──────────────────────┐                            │
              │ EXIT_NESTED_CONTEXT  │◄───────────────────────────┘
              └──────────┬───────────┘
                         │
                         ▼

                      (_ = whitespace)
```

### Single-Line Link

```text
              ┌────┐   ┌───────────┐   ┌────┐   ┌───┐
──────────────┤ __ ├───┤ reference ├───┤ __ ├───┤ : ├───┐
              └────┘   └───────────┘   └────┘   └───┘   │
                                                         │
              ┌──────────────────────────────────────────┘
              │
              │       ┌─────────────────────┐
              └───────┤ single_line_values  ├──────▶
                      └─────────────────────┘

              (__ = horizontal_whitespace)
```

### Indented ID Link

```text
              ┌───────────┐   ┌────┐   ┌───┐   ┌─────┐
──────────────┤ reference ├───┤ __ ├───┤ : ├───┤ eol ├──────▶
              └───────────┘   └────┘   └───┘   └─────┘
```

### Element with Children

```text
              ┌──────────┐
──────────────┤ any_link ├───┬─────────────────────────────────▶
              └──────────┘   │
                             │
                             │   ┌─────────────────────┐
                             └───┤ PUSH_INDENTATION    ├───┐
                                 └─────────────────────┘   │
                                                           │
                                 ┌─────────────────────┐   │
                                 │       links         │◄──┘
                                 └─────────┬───────────┘
                                           │
                                           ▼
```

## Examples

### Basic Examples

#### Single Reference (Singlet)

```lino
hello
```

**Parse result:** One link with id `"hello"` and no values.

#### Doublet (2-tuple)

```lino
papa loves
```

**Parse result:** Anonymous link with values `["papa", "loves"]`.

#### Triplet (3-tuple)

```lino
papa loves mama
```

**Parse result:** Anonymous link with values `["papa", "loves", "mama"]`.

### Named Links

#### Named Link with Values

```lino
family: papa mama son daughter
```

**Parse result:** Link with id `"family"` and values
`["papa", "mama", "son", "daughter"]`.

#### Parenthesized Named Link

```lino
(family: papa mama son daughter)
```

**Parse result:** Same as above.

### Nested Structures

#### Inline Nesting

```lino
(statement: (subject: I) (verb: love) (object: (you: very much)))
```

#### Indented Nesting

```lino
statement:
  subject:
    I
  verb:
    love
  object:
    you:
      very
      much
```

### Complex Examples

#### Mixed Syntax

```lino
document:
  (metadata: title author date)
  content:
    paragraph1
    (paragraph2: text (with: nested structure))
    paragraph3
```

#### Quoted References

```lino
"full name": "John Doe"
'greeting': 'Hello, World!'
mixed: "can contain 'single' quotes" 'and "double" quotes'
backtick: `also a delimiter`
empty: ""
(nested: ("" ("" 1)))
```

### Real-World Example

```lino
(config:
  (database:
    host localhost
    port 5432
    name myapp)
  (server:
    port 8080
    (ssl:
      enabled true
      cert "/path/to/cert.pem")))
```

## Reference Implementation

The grammar is implemented in multiple languages:

- **JavaScript**: Uses PEG.js parser generator
  ([grammar.pegjs](../../js/src/grammar.pegjs))
- **Python**: Hand-written recursive descent parser
  ([parser.py](../../python/links_notation/parser.py))
- **Rust**: Uses nom parser combinator library
  ([parser.rs](../../rust/links-notation/src/parser.rs))
- **Go**: Hand-written recursive descent parser
  ([parser.go](../../go/parser.go))
- **Java**: Hand-written recursive descent parser
  ([Parser.java](../../java/src/main/java/io/github/linkfoundation/linksnotation/Parser.java))
- **C#**: Uses the Pegasus parser generator
  ([Parser.peg](../../csharp/Link.Foundation.Links.Notation/Parser.peg))

All implementations follow this specification and produce equivalent results
for valid input.

## Version History

| Version | Changes                                                     |
|---------|-------------------------------------------------------------|
| 0.12.0  | Initial formal grammar specification                        |
| 0.14.0  | Parentheses open a nested context: `multiline_link`,        |
|         | `multiline_value_link` and `multiline_values` replaced by   |
|         | `nested_group` and `nested_group_body`; blank lines are     |
|         | skipped between lines of a block                            |
| 0.15.0  | A reference is `delimited_reference` (`n_quoted_reference`  |
|         | or `empty_reference`) or `simple_reference`; a bare         |
|         | delimiter pair is the empty reference, and all three        |
|         | delimiters are documented                                   |
| 0.19.0  | A `#` written where a reference could begin opens a comment |
|         | that runs to the end of its line; comments are blanked      |
|         | before parsing and can be switched off                      |
