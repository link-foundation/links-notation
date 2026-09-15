# Links Notation Syntax Diagrams

This document provides visual syntax diagrams (railroad diagrams) for the
Links Notation grammar.

## Document

A document consists of links separated by whitespace. Comments are blanked
before any of the rules below apply, so no diagram here ever sees a `#`
comment.

```text
                          ┌───────────────────┐
Document ─────┬───────────┤ skip_empty_lines  ├───┬─────────────────────────▶
              │           └───────────────────┘   │
              │                                   │
              │           ┌───────────────────┐   │
              │           │      links        │◀──┘
              │           └─────────┬─────────┘
              │                     │
              │           ┌─────────▼─────────┐
              │           │   whitespace      │
              │           └─────────┬─────────┘
              │                     │
              │           ┌─────────▼─────────┐
              └──────────▶│       EOF         │
                          └───────────────────┘
```

## Comments

A `#` written where a reference could begin hides the rest of the line it
stands on.

```text
              ┌───────────────┐     ┌─────────────────────────────┐
comment ──────┤ comment_start ├──┬──┤ any character but a newline ├──┬──▶
              └───────────────┘  │  └─────────────────────────────┘  │
                                 │                 ▲                 │
                                 │                 └─────────────────┘
                                 │
                                 └──────────────────────────────────────▶
```

A `#` opens a comment only at the start of the document or after a space, a
tab or a newline, so a `#` inside a token (`issue#1047`) stays an ordinary
character, as does a `#` inside a delimited reference (`"#"`).

```text
                      ┌─────────────────────┐   ┌─────┐
comment_start ───┬────┤  start of document  ├───┤  #  ├───┬───▶
                 │    └─────────────────────┘   └─────┘   │
                 │    ┌─────────────────────┐   ┌─────┐   │
                 └────┤  space, tab or a    ├───┤  #  ├───┘
                      │  newline (\n, \r)   │   └─────┘
                      └─────────────────────┘
```

A comment is blanked rather than removed: each of its characters becomes a
space, so everything written after it keeps the offset, line and column it was
written at, and a parse error still points at the right character.

```text
    Written:  stage: rust # the toolchain this job pins
    Read:     stage: rust
                          ^ from here to the end of the line: spaces
```

A line left holding nothing but spaces separates links the way an empty line
does, and does not end an indented block, so a comment can stand between the
children of a link.


## Links Block

```text
         ┌────────────────┐       ┌────────────────┐
links ───┤   first_line   ├───┬───┤     line       ├───┬───▶
         └────────────────┘   │   └────────────────┘   │
                              │           ▲            │
                              │           └────────────┘
                              │
                              └────────────────────────────▶
```

## Element

An element is a link, optionally followed by indented children.

```text
           ┌────────────┐
element ───┤  any_link  ├───┬──────────────────────────────────────▶
           └────────────┘   │
                            │
                            │   ┌───────────────────────┐
                            └───┤  PUSH_INDENTATION     ├────┐
                                └───────────────────────┘    │
                                                             │
                                ┌───────────────────────┐    │
                                │       links           │◀───┘
                                └───────────┬───────────┘
                                            │
                                            ▼
```

## Any Link

```text
             ┌───────────────────────┐   ┌───────┐
    ┌────────┤     nested_group      ├───┤  eol  ├────────┐
    │        └───────────────────────┘   └───────┘        │
    │                                                     │
────┼────────┌───────────────────────┐────────────────────┼───────▶
    │        │  indented_id_link     │                    │
    │        └───────────────────────┘                    │
    │                                                     │
    │        ┌───────────────────────┐                    │
    └────────┤ single_line_any_link  ├────────────────────┘
             └───────────────────────┘
```

## Reference

A reference is either delimited or simple.

```text
              ┌────────────────────────────┐
     ┌────────┤    n_quoted_reference      ├────────┐
     │        └────────────────────────────┘        │
     │                                              │
─────┼────────┌────────────────────────────┐────────┼────▶
     │        │      empty_reference       │        │
     │        └────────────────────────────┘        │
     │                                              │
     │        ┌────────────────────────────┐        │
     └────────┤     simple_reference       ├────────┘
              └────────────────────────────┘
```

The three delimiters `"`, `'` and `` ` `` behave identically, and the n-quoted
reading is tried before the empty one.

## Simple Reference

One or more reference symbols (non-whitespace, non-special characters).

```text
                   ┌──────────────────────┐
simple_reference ──┤   reference_symbol   ├────┬─────▶
                   └──────────────────────┘    │
                              ▲                │
                              │                │
                              └────────────────┘
```

## N-Quoted Reference

A run of N identical delimiters, a body, then a run of exactly N of the same
delimiter that is not followed by another one. A run of 2N delimiters inside
the body stands for N literal delimiters.

```text
                      ┌──────────────┐   ┌─────────────────┐   ┌──────────────┐
n_quoted_ref ─────────┤ N delimiters ├───┤    any char     ├───┤ N delimiters ├───▶
                      └──────────────┘   └────────┬────────┘   └──────────────┘
                                                  │      ▲
                                                  └──────┘
```

When N is even the body must be substantive: it holds at least one
non-whitespace character and its parentheses are balanced. Otherwise the run
reads as empty references instead.

## Empty Reference

An even run of the same delimiter that does not open an n-quoted reference:
`""` is one empty reference, `"" ""` is two of them.

```text
                      ┌─────┐   ┌─────┐
empty_reference ──────┤  d  ├───┤  d  ├──────┬─────▶
                      └─────┘   └─────┘      │
                         ▲                   │
                         └───────────────────┘
```

## Nested Group (Parenthesized)

A parenthesized group opens a nested context: the body starts fresh at
indentation level zero and is parsed by `links`, exactly like the root
document.

```text
               ┌───┐   ┌──────────────────────┐
nested_group ──┤ ( ├───┤ ENTER_NESTED_CONTEXT ├───┐
               └───┘   └──────────────────────┘   │
                                                  │
    ┌─────────────────────────────────────────────┘
    │
    │   ┌───────────────────┐   ┌───────┐   ┌─────┐   ┌───┐
    ├───┤ skip_empty_lines  ├───┤ links ├───┤  _  ├───┤ ) ├───┐
    │   └───────────────────┘   └───────┘   └─────┘   └───┘   │
    │                                                         │
    │   ┌─────┐   ┌───┐                                       │
    └───┤  _  ├───┤ ) ├───────────────────────────────────────┤
        └─────┘   └───┘                                       │
                                                              │
        ┌──────────────────────┐                              │
        │ EXIT_NESTED_CONTEXT  │◄─────────────────────────────┘
        └───────────┬──────────┘
                    │
                    ▼

               (_ = whitespace, may include newlines)
```

## Nested Group Collapse

The body of a group is flattened the same way the root document is. A body
that yields a single link collapses to that link, unless the body is itself
a single parenthesized group.

```text
    (a b c)          ─▶  one link with values a, b, c
    (a: b c)         ─▶  link a with values b, c
    ((a b))          ─▶  a link whose single value is the link (a b)
    (                ─▶  one link holding the four links the same
      a                  four lines produce at the root:
        b                (a), (a b), (c), (c d)
      c
        d
    )
```

## Single-Line Link (Named)

```text
                  ┌──────┐   ┌───────────┐   ┌──────┐   ┌───┐
single_line ──────┤  __  ├───┤ reference ├───┤  __  ├───┤ : ├───┐
link              └──────┘   └───────────┘   └──────┘   └───┘   │
                                                                 │
                  ┌──────────────────────────────────────────────┘
                  │
                  │  ┌───────────────────────┐
                  └──┤  single_line_values   ├────────────────────────▶
                     └───────────────────────┘

                  (__ = horizontal whitespace only)
```

## Single-Line Value Link (Anonymous)

```text
                        ┌───────────────────────┐
single_line ────────────┤  single_line_values   ├────────────────────▶
value_link              └───────────────────────┘
```

## Single-Line Values

```text
                   ┌──────┐   ┌───────────────────┐
single_line ───────┤  __  ├───┤ reference_or_link ├───┬───────────────▶
values             └──────┘   └───────────────────┘   │
                       ▲                              │
                       │                              │
                       └──────────────────────────────┘
                                 (one or more)
```

## Indented ID Link

A named link marker with children defined by indentation.

```text
                    ┌───────────┐   ┌──────┐   ┌───┐   ┌───────┐
indented_id ────────┤ reference ├───┤  __  ├───┤ : ├───┤  eol  ├───────▶
link                └───────────┘   └──────┘   └───┘   └───────┘
```

## Reference or Link

```text
                    ┌───────────────────────┐
     ┌──────────────┤     nested_group      ├──────────────┐
     │              └───────────────────────┘              │
─────┤                                                     ├────────▶
     │              ┌───────────────────────┐              │
     └──────────────┤      reference        ├──────────────┘
                    └───────────────────────┘
```

## End of Line

```text
         ┌──────────────────────┐       ┌─────────────┐
 eol ────┤ horizontal_whitespace├───┬───┤   newline   ├───┬────────▶
     │   └──────────────────────┘   │   └─────────────┘   │
     │                              │                     │
     │                              │   ┌─────────────┐   │
     │                              └───┤     EOF     ├───┤
     │                                  └─────────────┘   │
     │   ┌──────────────────────┐                         │
     └───┤   nested_group_end   ├─────────────────────────┘
         └──────────────────────┘
```

Inside a parenthesized group the closing parenthesis ends the last line,
just as a line break does at the root:

```text
                          ╔════════════════════════════════════╗
                          ║ only while a group is open         ║
nested_group_end ─────────╟────────────────────────────────────╢────▶
                          ║ horizontal_whitespace, then ")"    ║
                          ║ (the ")" is not consumed here)     ║
                          ╚════════════════════════════════════╝
```

## Newline

```text
            ┌────────────┐
    ┌───────┤   \r\n     ├───────┐
    │       └────────────┘       │
────┼───────┌────────────┐───────┼────────▶
    │       │    \n      │       │
    │       └────────────┘       │
    │       ┌────────────┐       │
    └───────┤    \r      ├───────┘
            └────────────┘
```

## Reference Symbol

Valid characters for simple (unquoted) references:

```text
                  ╔═══════════════════════════════════════╗
                  ║  Any character EXCEPT:                ║
reference ────────╟───────────────────────────────────────╢────▶
symbol            ║  • Space ( )                          ║
                  ║  • Tab (\t)                           ║
                  ║  • Newline (\n, \r)                   ║
                  ║  • Open parenthesis ( ( )             ║
                  ║  • Colon ( : )                        ║
                  ║  • Close parenthesis ( ) )            ║
                  ╚═══════════════════════════════════════╝
```

A `#` is a valid reference symbol - `issue#1047` is one reference - but a `#`
written where a reference could begin opens a comment instead.

## Indentation State Machine

```text
    ┌───────────────────────────────────────────────────────────────┐
    │                    Indentation State Machine                   │
    ├───────────────────────────────────────────────────────────────┤
    │                                                                │
    │   Start                                                        │
    │     │                                                          │
    │     ▼                                                          │
    │  ┌─────────────────────┐                                       │
    │  │ base_indent = null  │                                       │
    │  │ stack = [0]         │                                       │
    │  └──────────┬──────────┘                                       │
    │             │  ▲                                               │
    │             │  └── ENTER_NESTED_CONTEXT saves the current      │
    │             │      state and restarts here; the matching       │
    │             │      EXIT_NESTED_CONTEXT restores it             │
    │             │                                                  │
    │             ▼                                                  │
    │  ┌─────────────────────┐     ┌─────────────────────┐           │
    │  │ SET_BASE_INDENTATION├────▶│ base_indent = n     │           │
    │  │ (first content line)│     │ (n = leading spaces)│           │
    │  └─────────────────────┘     └──────────┬──────────┘           │
    │                                         │                      │
    │                                         ▼                      │
    │                           ┌─────────────────────────┐          │
    │                           │   Parse element         │          │
    │                           └─────────────┬───────────┘          │
    │                                         │                      │
    │                    ┌────────────────────┴────────────────────┐ │
    │                    │                                         │ │
    │                    ▼                                         ▼ │
    │   ┌───────────────────────────────┐   ┌────────────────────┐   │
    │   │ PUSH_INDENTATION              │   │ No children        │   │
    │   │ (next_indent > current)       │   │ (continue at same  │   │
    │   │ stack.push(next_indent)       │   │  or lower level)   │   │
    │   └───────────────┬───────────────┘   └────────────────────┘   │
    │                   │                                            │
    │                   ▼                                            │
    │   ┌───────────────────────────────┐                            │
    │   │ Parse child links             │                            │
    │   │ (recursive)                   │                            │
    │   └───────────────┬───────────────┘                            │
    │                   │                                            │
    │                   ▼                                            │
    │   ┌───────────────────────────────┐                            │
    │   │ POP_INDENTATION               │                            │
    │   │ stack.pop()                   │                            │
    │   └───────────────────────────────┘                            │
    │                                                                │
    └────────────────────────────────────────────────────────────────┘
```

## Complete Parse Flow

```text
    Input: "family:\n  papa\n  mama"

    ┌────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │  1. Document Start                                              │
    │     └─▶ skip_empty_lines (none)                                 │
    │         └─▶ links                                               │
    │                                                                 │
    │  2. First Line: "family:"                                       │
    │     └─▶ SET_BASE_INDENTATION (base = 0)                         │
    │         └─▶ element                                             │
    │             └─▶ any_link                                        │
    │                 └─▶ indented_id_link                            │
    │                     ├─▶ reference: "family"                     │
    │                     ├─▶ ":"                                     │
    │                     └─▶ eol                                     │
    │                                                                 │
    │  3. Check Children (indent = 2 > current = 0)                   │
    │     └─▶ PUSH_INDENTATION (stack = [0, 2])                       │
    │         └─▶ links (at indent 2)                                 │
    │                                                                 │
    │  4. Child Line: "  papa"                                        │
    │     └─▶ first_line                                              │
    │         └─▶ single_line_value_link                              │
    │             └─▶ reference: "papa"                               │
    │                                                                 │
    │  5. Sibling Line: "  mama"                                      │
    │     └─▶ CHECK_INDENTATION (2 >= 2)                              │
    │         └─▶ single_line_value_link                              │
    │             └─▶ reference: "mama"                               │
    │                                                                 │
    │  6. End of Input                                                │
    │     └─▶ POP_INDENTATION (stack = [0])                           │
    │         └─▶ EOF                                                 │
    │                                                                 │
    │  Result:                                                        │
    │  Link {                                                         │
    │    id: "family",                                                │
    │    values: [],                                                  │
    │    children: [                                                  │
    │      Link { id: "papa" },                                       │
    │      Link { id: "mama" }                                        │
    │    ]                                                            │
    │  }                                                              │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘
```

## Visual Grammar Summary

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     LINKS NOTATION GRAMMAR OVERVIEW                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  REFERENCES (atomic values)                                             │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  simple:     hello  world  foo123  my-var  _private                ││
│  │  double:     "hello world"  "with spaces"  "special: chars"        ││
│  │  single:     'hello world'  'with spaces'  'special: chars'        ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  LINKS (connect references)                                             │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                     ││
│  │  Anonymous:  papa loves mama         (single line, 3 values)       ││
│  │              (papa loves mama)       (parenthesized, same meaning) ││
│  │              (                       (parenthesized, structural    ││
│  │                papa                   indentation: holds the four  ││
│  │                  loves                links (papa), (papa loves),  ││
│  │                mama                   (mama), (mama hates))        ││
│  │                  hates                                             ││
│  │              )                                                     ││
│  │                                                                     ││
│  │  Named:      family: papa mama       (id + values)                 ││
│  │              (family: papa mama)     (parenthesized, same meaning) ││
│  │                                                                     ││
│  │  Indented:   family:                 (children by indentation)     ││
│  │                papa                                                 ││
│  │                mama                                                 ││
│  │                                                                     ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  NESTING (hierarchical structures)                                      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                     ││
│  │  Inline:     (outer: (inner: a b) c d)                             ││
│  │                                                                     ││
│  │  In group:   value (                 (records stay separate)       ││
│  │                id "1" label "one"                                   ││
│  │                id "2" label "two"                                   ││
│  │              )                                                      ││
│  │              ─▶ (value ((id 1 label one) (id 2 label two)))         ││
│  │                                                                     ││
│  │  Indented:   outer:                                                 ││
│  │                inner:                                               ││
│  │                  a                                                  ││
│  │                  b                                                  ││
│  │                c                                                    ││
│  │                d                                                    ││
│  │                                                                     ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  SPECIAL CHARACTERS                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  (  - Start nested link or grouping                                ││
│  │  )  - End nested link or grouping                                  ││
│  │  :  - Separator between id and values                              ││
│  │  "  - Double quote delimiter                                       ││
│  │  '  - Single quote delimiter                                       ││
│  │  `  - Backtick delimiter                                           ││
│  │  "" - The empty reference (a bare delimiter pair)                  ││
│  │  ␣  - Space (value separator, indentation)                         ││
│  │  #  - Comment, until the end of the line it stands on              ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Interactive Diagram Generator

For interactive, zoomable syntax diagrams, you can use tools like:

- [Railroad Diagram Generator](https://www.bottlecaps.de/rr/ui) -
  Paste the EBNF from `links-notation.ebnf`
- [GrammKit](https://dundalek.com/grammkit/) -
  Supports PEG.js format (use `grammar.pegjs`)
- [EBNF Visualizer](https://jacquev6.github.io/DrawGrammar/) -
  Draw from EBNF

These tools can generate SVG diagrams from the grammar specification.
