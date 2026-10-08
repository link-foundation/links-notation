# Binary links notation

From the repository root, install Rust, .NET 10, Node 22 or newer, Python,
Go, Java 21 with Maven, and PHP 8.4 with mbstring and Composer, then run:

```sh
composer install --working-dir=php --no-dev
bash examples/binary/run-interop.sh
```

All seven programs encode 116 documents from `corpus.txt` with all twelve combinations of external
references, arity (`2`, `2..3`, `1..`) and packed widths. Each decodes its bytes
and checks the original document, then reparses its canonical text. The script compares all 1,392 hexadecimal packets
and their decoded text across languages, covering empty documents, names,
Unicode whitespace and parser-specific separators, unsigned 64-bit numbers, comments, indentation, mixed quotes,
empty identifiers and groups. The additional 91 documents exercise the shared
[exact-reference corpus](../../docs/protocol/reference-literals.txt), including
all three quote kinds, controls, multiline strings and reserved literal prefixes.

The default run requires all seven runtimes. `--rust-csharp-only` runs the
original two-language check. `MAVEN_COMMAND` may name an alternative Maven
executable. Each program can also be run separately to inspect its output:

```sh
cargo run --manifest-path rust/Cargo.toml -p links-notation --example binary_lino
dotnet run --project examples/binary/csharp/BinaryExample.csproj -c Release
PYTHONPATH=python python3 examples/binary/python.py
node examples/binary/js.mjs
bun run examples/binary/typescript.ts # Optional typed example
php examples/binary/php.php
(cd go && go run ./examples/binary)
mvn -q -f java/pom.xml compile
java -cp java/target/classes examples/binary/java/BinaryExample.java
```

See the [shared specification](../../docs/protocol/binary-links-notation.md)
for packet APIs, independent encoding options and resource limits. Unit tests
in every port consume the same 96 golden vectors, exercise native text models,
and reject malformed input. The binary interoperability workflow runs this
example in CI whenever a codec, shared fixture or example changes.
