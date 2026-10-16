#!/usr/bin/env bash
# Issue #348: build every archived C# experiment and case-study project.
set -u
root=$(cd "$(dirname "$0")/../.." && pwd)
# Expected to fail, kept as recorded history:
# - case study 01 documents Pegasus' PEG0011 error as its result;
# - experiments/debug_test.csproj (moved here by issue #158) globs every .cs
#   file under experiments/ and uses the retired Platform.Protocols.Lino API.
expected="docs/case-studies/csharp-peg-simplification/solutions/01-parse-expression/project/TestParseExpression.csproj
experiments/debug_test.csproj"
status=0
for project in $(git -C "$root" ls-files '*.csproj' | grep -E '^(experiments|docs/case-studies|examples)/'); do
  echo "=== $project"
  if grep -qxF "$project" <<<"$expected"; then echo "skip: expected failure"; continue; fi
  dotnet build "$root/$project" -v q -nologo -p:LinksNotationRoot="$root" || { echo "FAIL: $project"; status=1; }
done
exit $status
