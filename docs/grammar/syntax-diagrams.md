# Links Notation Syntax Diagrams

This document provides visual syntax diagrams (railroad diagrams) for the
Links Notation grammar.

## Document

A document consists of links separated by whitespace.

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
    ┌────────┤ multiline_any_link    ├───┤  eol  ├────────┐
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

A reference can be quoted or unquoted.

```text
              ┌────────────────────────────┐
     ┌────────┤  double_quoted_reference   ├────────┐
     │        └────────────────────────────┘        │
     │                                              │
─────┼────────┌────────────────────────────┐────────┼────▶
     │        │  single_quoted_reference   │        │
     │        └────────────────────────────┘        │
     │                                              │
     │        ┌────────────────────────────┐        │
     └────────┤     simple_reference       ├────────┘
              └────────────────────────────┘
```

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

## Double-Quoted Reference

```text
                      ┌─────┐   ┌─────────────────┐   ┌─────┐
double_quoted_ref ────┤  "  ├───┤  any char ≠ "   ├───┤  "  ├───▶
                      └─────┘   └────────┬────────┘   └─────┘
                                         │      ▲
                                         └──────┘
```

## Single-Quoted Reference

```text
                      ┌─────┐   ┌─────────────────┐   ┌─────┐
single_quoted_ref ────┤  '  ├───┤  any char ≠ '   ├───┤  '  ├───▶
                      └─────┘   └────────┬────────┘   └─────┘
                                         │      ▲
                                         └──────┘
```

## Multiline Link (Named)

```text
               ┌───┐   ┌─────┐   ┌───────────┐   ┌─────┐   ┌───┐
multiline ─────┤ ( ├───┤  _  ├───┤ reference ├───┤  _  ├───┤ : ├───┐
link           └───┘   └─────┘   └───────────┘   └─────┘   └───┘   │
                                                                    │
               ┌────────────────────────────────────────────────────┘
               │
               │  ┌─────────────────────┐   ┌─────┐   ┌───┐
               └──┤  multiline_values   ├───┤  _  ├───┤ ) ├────────▶
                  └─────────────────────┘   └─────┘   └───┘

               (_ = whitespace, may include newlines)
```

## Multiline Value Link (Anonymous)

```text
                    ┌───┐   ┌─────────────────────┐   ┌─────┐   ┌───┐
multiline ──────────┤ ( ├───┤  multiline_values   ├───┤  _  ├───┤ ) ├───▶
value_link          └───┘   └─────────────────────┘   └─────┘   └───┘
```

## Multiline Values

```text
                   ┌─────┐       ┌───────────────────┐   ┌─────┐
multiline ─────────┤  _  ├───┬───┤ reference_or_link ├───┤  _  ├───┬───▶
values             └─────┘   │   └───────────────────┘   └─────┘   │
                             │             ▲                       │
                             │             └───────────────────────┘
                             │
                             └─────────────────────────────────────────▶
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
     ┌──────────────┤  multiline_any_link   ├──────────────┐
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
         └──────────────────────┘   │   └─────────────┘   │
                                    │                     │
                                    │   ┌─────────────┐   │
                                    └───┤     EOF     ├───┘
                                        └─────────────┘
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
│  │  ␣  - Space (value separator, indentation)                         ││
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
