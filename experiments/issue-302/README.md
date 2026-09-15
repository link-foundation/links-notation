# What every implementation says when a document does not parse

Written for [#302](https://github.com/link-foundation/links-notation/issues/302),
where the Rust parser answered a broken document with the raw `nom` error:

```
Syntax error: Error(Error { input: "<the whole rest of the document>", code: Eof })
```

`run.sh` asks every implementation about the same five documents and prints the
answers next to each other. Four of the five do not parse:

| document | what is wrong |
| --- | --- |
| `# ok line\n# break: two\nci_gate x\n` | second colon on line 2 |
| `a: b: c` | second colon |
| `a (b\n` | group is never closed |
| `a b)\n` | closing parenthesis with nothing open |
| `:` | a colon on its own |

Run it from anywhere:

```sh
./experiments/issue-302/run.sh
```

Toolchains that are not installed are reported as skipped, so the script is
useful on a machine that has only some of them. The Java probe needs the
classes built first (`mvn -f java/pom.xml compile`).

## What the run says

Rust, JavaScript and C# refuse all four broken documents and agree on where
each one breaks, to the offset:

| document | offset | line:column |
| --- | --- | --- |
| `# ok line\n# break: two\n...` | 17 | 2:8 |
| `a: b: c` | 4 | 1:5 |
| `a (b\n` | 5 | 2:1 |
| `a b)\n` | 3 | 1:4 |
| `:` | 0 | 1:1 |

Each of the three quotes the offending line with a caret under it, so the
message says where the document stopped making sense without carrying the rest
of the document with it.

Python, Go, Java and PHP accept all five. They are hand-written parsers that
treat anything they do not recognise as part of a reference, so
`a: b: c` becomes a link whose first value is the reference `b:`, and `a (b`
becomes two references, one of which is `(b`. Each of the four declares a parse error type,
but none of those types is ever raised for malformed syntax: Go never
constructs `ParseError`, PHP never throws `ParseException`, Java names
`ParseException` in `throws` clauses without throwing it, and Python raises
`ParseError` only to wrap an unexpected internal exception.

That is a difference in what the parsers accept, not in what they say when they
fail, so it belongs to the syntax parity work in
[#138](https://github.com/link-foundation/links-notation/issues/138) rather than
to #302: there is no diagnostic to improve until there is a failure to report.
