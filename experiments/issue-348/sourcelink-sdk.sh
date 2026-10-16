#!/usr/bin/env bash
# Issue #348: the .NET 8+ SDK ships Source Link for GitHub, so the
# Microsoft.SourceLink.GitHub package reference became a duplicate.
# Packs the library and prints the nuspec <repository> element and the PDB
# Source Link map; compare the output with and without the package reference.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
out=$(mktemp -d)
dotnet pack "$root/csharp/Link.Foundation.Links.Notation" -c Release -o "$out" -v q >/dev/null
cd "$out"
unzip -q ./*[0-9].nupkg -d nupkg
unzip -q ./*.snupkg -d snupkg
grep -o '<repository[^>]*>' nupkg/*.nuspec
python3 - <<'PY'
import glob, re
for pdb in glob.glob("snupkg/**/*.pdb", recursive=True):
    match = re.search(rb'\{"documents":\{[^}]*\}\}', open(pdb, "rb").read())
    print(pdb, match.group(0).decode() if match else "NO SOURCE LINK")
PY
