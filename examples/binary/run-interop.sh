#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
evidence_dir=$(mktemp -d)
trap 'rm -rf "$evidence_dir"' EXIT
cargo run --quiet --manifest-path rust/Cargo.toml -p links-notation --example binary_lino > "$evidence_dir/rust.tsv"
dotnet build examples/binary/csharp/BinaryExample.csproj -c Release > "$evidence_dir/csharp-build.log" 2>&1 || {
  cat "$evidence_dir/csharp-build.log"
  exit 1
}
dotnet run --no-build --project examples/binary/csharp/BinaryExample.csproj -c Release > "$evidence_dir/csharp.tsv"
languages=(csharp)
if [ "${1:-}" != "--rust-csharp-only" ]; then
  PYTHONPATH=python python3 examples/binary/python.py > "$evidence_dir/python.tsv"
  node examples/binary/js.mjs > "$evidence_dir/js.tsv"
  php examples/binary/php.php > "$evidence_dir/php.tsv"
  (cd go && go run ./examples/binary) > "$evidence_dir/go.tsv"
  "${MAVEN_COMMAND:-mvn}" -q -f java/pom.xml compile > "$evidence_dir/java-build.log" 2>&1 || {
    cat "$evidence_dir/java-build.log"
    exit 1
  }
  java -cp java/target/classes examples/binary/java/BinaryExample.java > "$evidence_dir/java.tsv"
  languages+=(python js php go java)
fi
for language in "${languages[@]}"; do
  diff -u "$evidence_dir/rust.tsv" "$evidence_dir/$language.tsv"
done
echo "Rust and ${languages[*]} produced identical bytes and decoded text for all $(wc -l < "$evidence_dir/rust.tsv") cases."
