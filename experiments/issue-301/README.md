# What every implementation does with a `#`

Written for [#301](https://github.com/link-foundation/links-notation/issues/301),
which starts from a document that reads like a comment but is not one:

```sh
parse_lino("# a b")    # parses, as the link (# a b)
parse_lino("# a: b")   # fails on the colon
```

`run.sh` asks every implementation about the same six documents and prints the
answers next to each other:

| document | what it is meant to ask |
| --- | --- |
| `# a b\n` | prose on a line of its own |
| `# a: b\n` | the same prose, holding a colon |
| `a: b # note\n` | prose after a link |
| `a#b\n` | a `#` inside a token |
| `"#" a\n` | a `#` inside a delimited reference |
| `parent\n  # what the child is for\n  child\n` | prose inside an indented block |

The list lives in `docs.mjs`; the probe for each language repeats it, so each
probe can be run on its own.

Run it from anywhere:

```sh
./experiments/issue-301/run.sh
```

Toolchains that are not installed are reported as skipped, so the script is
useful on a machine that has only some of them. The Java probe needs the
classes built first (`mvn -f java/pom.xml compile`).

## Before: three answers to the same document

Run against `main` at `a842f22`, the implementations disagree about the two
documents that the issue is about:

| document | Rust, JavaScript, C# | Python, Go, Java, PHP |
| --- | --- | --- |
| `# a b\n` | `(# a b)` | `(# a b)` |
| `# a: b\n` | syntax error at line 1, column 4 | `('# a': b)` |
| `a: b # note\n` | `(a: b # note)` | `(a: b # note)` |
| `a#b\n` | `a#b` | `(a#b)` |
| `"#" a\n` | `(# a)` | `(# a)` |
| `parent\n  # …\n  child\n` | `parent` with two children | `parent` with two children |

So the prose was never skipped: it was read as references, which is why adding
a colon to it either breaks the document (Rust, JavaScript, C#) or silently
turns the whole comment into a link identifier (Python, Go, Java, PHP). The
comment inside the indented block became a second child of `parent`.

## After: one answer, in all seven

| document | every implementation |
| --- | --- |
| `# a b\n` | no links |
| `# a: b\n` | no links |
| `a: b # note\n` | `(a: b)` |
| `a#b\n` | `a#b` |
| `"#" a\n` | `(# a)` |
| `parent\n  # …\n  child\n` | `parent` with the single child `child` |

The last three rows are what the change is careful about: a `#` that is part of
a token (`a#b`, `issue#1047`) and a `#` inside a delimited reference (`"#"`) are
still ordinary characters, and a comment line inside an indented block does not
end that block.

The renderings differ in ways that predate this work and are not about
comments: Rust prints a lone top-level reference unwrapped (`a#b`) where the
other six wrap it (`(a#b)`), and the four hand-written parsers quote an
identifier that holds a space, which is how `# a` showed up as `'# a'` in the
before table.

## Turning comments off

Documents written before comments existed can still be read by asking for a
parser that treats `#` as an ordinary character:
`ParserConfig::without_comments()` in Rust, `new Parser({ comments: false })` in
JavaScript, `Parser(comments=False)` in Python, `NewParser()` with
`parser.Comments = false` in Go, `new Parser(false)` in Java,
`new Parser(comments: false)` in C#, and
`new Parser(10 * 1024 * 1024, 1000, false)` in PHP. `rust/links-notation/examples/comments.rs`
shows both settings on one document.

## Why comments are blanked instead of removed

Each implementation replaces the characters of a comment with spaces rather
than cutting them out, so every character that follows keeps the offset, line
and column it was written at. That is what keeps the positions from
[#302](https://github.com/link-foundation/links-notation/issues/302) honest: in
`# a comment\nstage: rust: nextest\n` the error is still reported at line 2,
column 12, with the offending line quoted under a caret.
