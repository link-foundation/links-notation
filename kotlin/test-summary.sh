#!/bin/sh
# Prints the number of tests each Kotlin target ran, from the JUnit XML
# reports Gradle writes under build/test-results/. CI runs it after the tests
# so the log shows every target really ran the parity cases.
set -eu

found=0
for dir in build/test-results/*/; do
  set -- "$dir"*.xml
  [ -f "$1" ] || continue
  found=1
  awk -v target="$(basename "$dir")" '
    match($0, /<testsuite [^>]*>/) {
      suite = substr($0, RSTART, RLENGTH)
      split("tests failures errors skipped", keys, " ")
      for (i = 1; i <= 4; i++) {
        if (match(suite, keys[i] "=\"[0-9]+\"")) {
          total[keys[i]] += substr(suite, RSTART + length(keys[i]) + 2, RLENGTH - length(keys[i]) - 3)
        }
      }
    }
    END {
      printf "%s: %d tests, %d failures, %d errors, %d skipped\n",
        target, total["tests"], total["failures"], total["errors"], total["skipped"]
    }' "$@"
done
if [ "$found" = 0 ]; then
  echo "No test results under build/test-results" >&2
  exit 1
fi
