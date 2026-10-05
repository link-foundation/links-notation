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
diff -u "$evidence_dir/rust.tsv" "$evidence_dir/csharp.tsv"
echo "Rust and C# produced identical bytes and decoded text for all 72 cases."
