# Experiments for issue #209

## `bare_reference_probe`

Which strings the notation's own parser accepts as a single bare reference. The
minimal-quoting encoder in the benchmark may only leave a value unquoted when
the answer is yes, and this probe is how that set was established rather than
guessed.

```sh
cargo run --manifest-path rust/Cargo.toml -p links-notation-benchmark --example bare_reference_probe
```

It lives in the crate, at
[`rust/links-notation-benchmark/examples/bare_reference_probe.rs`](../../rust/links-notation-benchmark/examples/bare_reference_probe.rs),
so it keeps compiling against the parser it probes.

The finding: a bare reference ends at whitespace, `(`, `)` or `:` - see
`is_reference_char` in `rust/links-notation/src/parser.rs`. A timestamp such as
`2026-01-01T00:00:00Z` therefore has to be quoted even though nothing about it
would be misread as another type.
