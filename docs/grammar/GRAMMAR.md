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

Exact Unicode references can use [version 1 UTF-8 hex literals](../protocol/reference-literals.md),
introduced in 0.24.0. The prefix `~[0-9]+{` is reserved at reference
boundaries; quote an existing reference with that spelling.

## EBNF Grammar

The following EBNF grammar formally defines the Links Notation syntax:

```ebnf
(* Links Notation (Lino) Grammar - EBNF *)
(* Version: 0.24.0 *)

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

(* A "#" opens a comment at the start of a line, after any indentation; later
   on a line it opens one after a space or a tab when no character that could
   continue a bare reference follows it, so "tag #release" holds the value
   "#release" while "a: b # why" holds a comment *)
comment_start       = ? start of a line ?, horizontal_whitespace, "#"
                    | horizontal_whitespace_char, "#", comment_follower ;

comment_follower    = whitespace_char | "(" | ":" | ")" | ? end of document ? ;

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

reference           = reference_literal
                    | delimited_reference
                    | simple_reference ;

(* A simple reference cannot start with the reserved prefix ~[0-9]+{. It may
   hold colons between its characters (12:30, std::string, https://a/b), but
   never starts or ends with one *)
simple_reference    = reference_symbol, { reference_symbol | inner_colons } ;

(* Colons stay inside a simple reference when a character that could start
   one follows them: not whitespace, a parenthesis, a colon, a delimiter, or
   the reserved prefix ~[0-9]+{. So "a:b: c" is the link of "a:b" to "c",
   while "a: b", "a:(b)", 'a:"b"' and "a:~1{62}" still name a link *)
inner_colons        = ":", { ":" }, ? followed by a reference_symbol other
                      than a delimiter, and not by ~[0-9]+{ ? ;

(* Decode the hex as strict UTF-8; reject malformed or unknown versions. *)
reference_literal   = "~1{", { hex_digit, hex_digit }, "}" ;
hex_digit           = "0".."9" | "a".."f" | "A".."F" ;

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
   run of the same delimiter that does not open an n-quoted reference. An even
   run followed by whitespace never reaches past its line: when nothing closes
   it before a line break, it is the empty reference whatever later lines
   hold *)
empty_reference     = delimiter, delimiter, { delimiter, delimiter } ;

(* === Terminal Symbols === *)
reference_symbol    = any_char - whitespace_char - "(" - ":" - ")" ;

whitespace_char     = " " | "\t" | "\n" | "\r" ;

horizontal_whitespace = { horizontal_whitespace_char } ;

horizontal_whitespace_char = " " | "\t" ;

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
      (sequence start_of_line horizontal_whitespace "#")
      (sequence horizontal_whitespace_char "#" comment_follower))

  comment_follower:
    (alternative whitespace_char "(" ":" ")" EOF)

  simple_reference:
    (sequence reference_symbol
      (zero_or_more (alternative reference_symbol inner_colons)))

  inner_colons:
    (sequence (one_or_more ":")
      (lookahead (sequence (not reference_literal_prefix)
        (not (alternative delimiter EOF)) reference_symbol)))

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
    (zero_or_more horizontal_whitespace_char)

  horizontal_whitespace_char:
    (alternative " " "\t")

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

- Valid: Letters, digits, `-`, `_`, `.`, `!`, `?`, `@`, `#`, `# Links Notation (Lino) Grammar Specification

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

Exact Unicode references can use [version 1 UTF-8 hex literals](../protocol/reference-literals.md),
introduced in 0.24.0. The prefix `~[0-9]+{` is reserved at reference
boundaries; quote an existing reference with that spelling.

## EBNF Grammar

The following EBNF grammar formally defines the Links Notation syntax:

```ebnf
(* Links Notation (Lino) Grammar - EBNF *)
(* Version: 0.24.0 *)

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

(* A "#" opens a comment at the start of a line, after any indentation; later
   on a line it opens one after a space or a tab when no character that could
   continue a bare reference follows it, so "tag #release" holds the value
   "#release" while "a: b # why" holds a comment *)
comment_start       = ? start of a line ?, horizontal_whitespace, "#"
                    | horizontal_whitespace_char, "#", comment_follower ;

comment_follower    = whitespace_char | "(" | ":" | ")" | ? end of document ? ;

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

reference           = reference_literal
                    | delimited_reference
                    | simple_reference ;

(* A simple reference cannot start with the reserved prefix ~[0-9]+{. It may
   hold colons between its characters (12:30, std::string, https://a/b), but
   never starts or ends with one *)
simple_reference    = reference_symbol, { reference_symbol | inner_colons } ;

(* Colons stay inside a simple reference when a character that could start
   one follows them: not whitespace, a parenthesis, a colon, a delimiter, or
   the reserved prefix ~[0-9]+{. So "a:b: c" is the link of "a:b" to "c",
   while "a: b", "a:(b)", 'a:"b"' and "a:~1{62}" still name a link *)
inner_colons        = ":", { ":" }, ? followed by a reference_symbol other
                      than a delimiter, and not by ~[0-9]+{ ? ;

(* Decode the hex as strict UTF-8; reject malformed or unknown versions. *)
reference_literal   = "~1{", { hex_digit, hex_digit }, "}" ;
hex_digit           = "0".."9" | "a".."f" | "A".."F" ;

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
   run of the same delimiter that does not open an n-quoted reference. An even
   run followed by whitespace never reaches past its line: when nothing closes
   it before a line break, it is the empty reference whatever later lines
   hold *)
empty_reference     = delimiter, delimiter, { delimiter, delimiter } ;

(* === Terminal Symbols === *)
reference_symbol    = any_char - whitespace_char - "(" - ":" - ")" ;

whitespace_char     = " " | "\t" | "\n" | "\r" ;

horizontal_whitespace = { horizontal_whitespace_char } ;

horizontal_whitespace_char = " " | "\t" ;

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
      (sequence start_of_line horizontal_whitespace "#")
      (sequence horizontal_whitespace_char "#" comment_follower))

  comment_follower:
    (alternative whitespace_char "(" ":" ")" EOF)

  simple_reference:
    (sequence reference_symbol
      (zero_or_more (alternative reference_symbol inner_colons)))

  inner_colons:
    (sequence (one_or_more ":")
      (lookahead (sequence (not reference_literal_prefix)
        (not (alternative delimiter EOF)) reference_symbol)))

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
    (zero_or_more horizontal_whitespace_char)

  horizontal_whitespace_char:
    (alternative " " "\t")

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

, `%`, etc.
- Invalid: Space, tab, newline, `(`, `)`
- A colon is valid between two characters of a reference, so `12:30`,
  `std::string` and `https://example.com/a#b` are one reference each. A
  reference never starts or ends with a colon: a colon followed by whitespace,
  a parenthesis, a delimiter, the end of the document or a reference literal
  (`~1{62}`) ends the reference and names a link, so `a: b`, `a:(b c)`,
  `a:"b"` and `a:~1{62}` are links with the ID `a`, and `a:b: c` is the
  link of `a:b` to `c`
- A `#` is valid inside a reference (`issue#1047`), and a reference can start
  with one later on a line (`tag #release`). At the start of a line, and when
  whitespace, a parenthesis, a colon or the end of the document follows it, a
  `#` opens a comment instead (see [Comments](#comments))

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

An even run never reaches past its line when whitespace follows it. If no run
closes it before a line break, it is the empty reference, so each line below
holds its own empty reference whatever the other lines hold:

```lino
a ""
b ""
```

reads as `(a "")` and `(b "")`. The same holds for `""""` and `""""""`. A
reference that spans lines opens with a run followed by its first character
(`""x\ny""`). The shortest way to write the single character `"` is `'"'`.

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

A `#` opens a comment only after whitespace or at the start of the document,
and then only when one of these holds:

- it is the first thing on its line, after any indentation; or
- the character after it is whitespace, `(`, `:`, `)` or the end of the
  document.

Everywhere else a `#` is an ordinary character: inside a token
(`issue#1047`), inside a delimited reference (`"#"`), and at the start of a
value later on a line, so `tag #release` is the link of `tag` and `#release`,
and `colour #ff0000 # a note` keeps `#ff0000` and drops `# a note`.

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

Writing a document follows the same rule from the other side: a reference that
begins with a `#` is written quoted (`'#tag'`), since it may land at the start
of a line, so a document a formatter writes reads back as itself. A `#` that
cannot open a comment needs no quotes, so `issue#1047` is written as it
stands. Every implementation exposes the quoting it uses as `quoteReference`
and `needsQuoting` (named the way its language names functions), so a writer
of Links Notation by hand need not reimplement it.

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

Each line beneath an indented ID becomes one of its values. A named line keeps
its name, so `file: path` is the value `(file: path)`. A nested indented ID
recursively gathers its own lines before it becomes a value.

A bare value may also have indented lines. They form an anonymous nested link
with that value first. For example:

```lino
root:
  child1
  child2
    grandchild
```

is equivalent to `(root: child1 (child2 grandchild))`.

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
                        │  ┌────────────┐  │
                        ├──┤inner_colons├──┤
                        │  └────────────┘  │
                        └──────────────────┘
```

Inner colons are taken only when a character that can start a simple reference
follows them.

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
with a substantive body is the empty reference, and so is an even run followed
by whitespace that nothing closes on its own line.

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

**Parse result:** One anonymous link with a single reference value `"hello"`.

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
| 0.21.0  | A singlet is an anonymous link with one reference value;     |
|         | CR is a line break, and only space, tab, LF and CR are       |
|         | whitespace when parsing a document or an even quote body    |
| 0.21.1  | Names and nested values below indented IDs are preserved;     |
|         | a bare value with indented children forms an anonymous link  |
| 0.32.0  | An even quote run followed by whitespace stays on its line;  |
|         | a `#` later on a line opens a comment only before whitespace, |
|         | a parenthesis, a colon or the end; colons between reference  |
|         | characters belong to the reference (`a:b`, `12:30`)          |
