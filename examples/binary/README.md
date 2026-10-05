# Binary links notation

From the repository root, with Rust and .NET 10 installed:

```sh
bash examples/binary/run-interop.sh
```

Both programs encode six documents with all twelve combinations of external
references, arity (`2`, `2..3`, `1..`) and packed widths. Each decodes its bytes
and checks that the original document survived. The script compares the bytes
and decoded text across languages, covering empty documents, names, Unicode,
large numbers, comment characters and groups.

Run either program alone to inspect the tab-separated hexadecimal bytes and
text. See the [shared specification](../../docs/protocol/binary-links-notation.md)
for the wire format and APIs. Tests in both ports consume the same 96 golden
vectors from `docs/protocol/binary-links-notation-vectors.txt`.
