#!/usr/bin/env bash
# Regression tests for scripts/ci/cpp-release-archive.sh.
#
# The bug these guard against: publish-cpp.yml ran
# `git archive ... HEAD:cpp` with `working-directory: cpp`. git archive limits
# a tree to the caller's subdirectory, so it archived cpp/cpp: the cpp_0.26.0
# release asset is a 125-byte archive holding only its top directory, and the
# release job failed with "does not contain a CMakeLists.txt file".
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
version=$(tr -d '[:space:]' < "$root/cpp/VERSION")
asset="links-notation-cpp-$version.tar.gz"
expected=$(git -C "$root" ls-tree -r --name-only HEAD:cpp | sed "s|^|links-notation-cpp-$version/|" | sort)

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); echo "  ok - $1"; }
no() { FAIL=$((FAIL + 1)); echo "  NOT OK - $1"; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

for dir in . cpp cpp/tests; do
  out="$work/$dir"
  (cd "$root/$dir" && bash "$root/scripts/ci/cpp-release-archive.sh" "$out" > /dev/null)
  files=$(tar -tzf "$out/$asset" | grep -v '/$' | sort)
  if [ "$files" = "$expected" ]; then
    ok "run from $dir: the archive holds every tracked file of cpp/"
  else
    no "run from $dir: the archive differs from git ls-tree HEAD:cpp"
  fi
  if (cd "$out" && sha256sum --check --quiet "$asset.sha256"); then
    ok "run from $dir: the .sha256 file matches the archive"
  else
    no "run from $dir: the .sha256 file does not match the archive"
  fi
done

# The command the workflow used to run, for the record: from cpp/ it is empty.
old=$(cd "$root/cpp" && git archive --format=tar --prefix=p/ HEAD:cpp | tar -t | grep -vc '/$' || true)
if [ "$old" = "0" ]; then
  ok "the old command, run from cpp/, still archives no files (the bug is understood)"
else
  no "the old command archived $old files from cpp/; the comment in cpp-release-archive.sh is stale"
fi

echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
