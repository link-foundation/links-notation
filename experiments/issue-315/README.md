# Issue #315: deeply nested input overflows the stack

Every parser recursed once per parenthesized group and once per indentation
level, and nothing bounded it. These probes reproduce the overflow and measure
how much stack a level costs, which is what the shared default limit of 64 is
chosen from.

## Rust

```sh
cd rust-probe
cargo run -- abort 100000          # parsed inside catch_unwind; used to abort
cargo run -- probe values 2        # deepest nesting that fits a 2 MiB thread
cargo run --release -- probe parens 8
```

`probe` parses with the limit switched off, in child processes, and bisects on
whether the child survived. Shapes: `parens` `((((a))))`, `values`
`(a (a (a b)))`, `named` `(x: a (x: a b))`, `indent` (one more space per line),
and `mixed` (a group on every indented line).

| Build   | Shape             | Stack | Deepest that fits | Per level |
| ------- | ----------------- | ----- | ----------------- | --------- |
| debug   | `values`, `named` | 2 MiB | 86                | ~24 KB    |
| debug   | `parens`          | 2 MiB | 227               | ~9.2 KB   |
| debug   | `indent`          | 2 MiB | 682               | ~3 KB     |
| debug   | `parens`          | 8 MiB | 923               | ~9.1 KB   |
| release | `values`, `named` | 2 MiB | 1135              | ~1.8 KB   |
| release | `parens`          | 2 MiB | 1892              | ~1.1 KB   |
| release | `parens`          | 8 MiB | 7591              | ~1.1 KB   |

The worst case, a debug build reading groups written as values on a spawned
thread's 2 MiB, fits 86 levels, so the default of 64 leaves headroom there and
everywhere else.

## C#

```sh
cd csharp-probe
dotnet build -c Release
dotnet bin/Release/net10.0/Probe.dll parens 100000   # "Stack overflow." before the fix
```

Before the fix, on the 8 MiB main thread, `parens` died at 100 000 levels and
`values` at 10 000, with `Stack overflow.` and no way for the caller to catch it.

## JavaScript

```sh
node js-depth.mjs
```

Before the fix `new Parser().parse('('.repeat(10000) + 'a' + ')'.repeat(10000))`
threw `Parse error: Maximum call stack size exceeded`, even though the parser
stored `maxDepth: 1000`. After it, the same document is refused in
milliseconds with
`Nesting too deep at line 1, column 65: nesting depth exceeds the maximum of 64`.

## Python

Before the fix, `(` or `(a ` repeated 200 times raised an uncaught
`RecursionError` (128 still parsed), not the parser's `ParseError`.

## Go

```sh
cd go-probe
go run . parens 100000                        # refused at the default limit
go run . parens 20000 1000000000 1000000      # no limit, 1 MB goroutine stack
```

With the limit switched off a deep enough document ends the process with
`runtime: goroutine stack exceeds 1000000-byte limit`, which `recover` cannot
catch. With the default limit, `(` repeated 100 000 times is refused in
about 0.2 s at line 1, column 65.

## Java

```sh
cd ../../java && mvn -q compile
java -cp target/classes ../experiments/issue-315/java-depth.java
```

The deepest nesting that fits a 512 KiB thread with no limit, before and after
the JIT compiles the parser:

| Round | `parens` | `values` | indentation |
| ----- | -------- | -------- | ----------- |
| 1     | 353      | 264      | 2047        |
| 2, 3  | 1191     | 1191     | 2183        |

## PHP

```sh
php php-depth.php                   # every shape, each in a child process
php php-depth.php values 100000     # one shape and depth, optionally a maxDepth
php php-scan-cost.php 100000        # the cost of each per-line scan
```

PHP has no stack limit of its own, so before the fix a deep document ran into
`Allowed memory size ... exhausted`, a fatal error no caller can catch. After
it, `(` repeated 100 000 times is refused in about 0.07 s. `(a ` repeated
100 000 times takes about 6 s to refuse: every level up to the limit scans the
rest of its line about six times (roughly 100 ms per level at that length, as
`php-scan-cost.php` shows), so refusing costs the limit times the length of
the line. That is linear in the document, where the parser before the fix ran
out of memory, but reading each line once would need the matching parentheses
of the whole document found in one pass.
