# Issue 197: streaming parser parity

This experiment runs the focused streaming contract in every maintained
implementation. Each suite feeds the same document both one symbol at a time
and one line at a time, and compares the result with its canonical parser. The
tests also cover indented children, multiline quotes and parentheses, callbacks
or events, lazy adapters, final records without a newline, position tracking,
reset/drain behavior, and the unresolved-record buffer limit.

Run all locally available toolchains from the repository root:

```sh
./experiments/issue-197/run.sh
```
