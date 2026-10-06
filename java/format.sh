#!/usr/bin/env bash
# Keep the current formatter despite the Spotless Style.valueOf adapter break.
set -euo pipefail
project_dir=$(cd "$(dirname "$0")" && pwd)
mode=${1:---check}
source_dir=${2:-"$project_dir/src"}
case "$mode" in
  --check) flags=(--dry-run --set-exit-if-changed) ;;
  --write) flags=(--replace) ;;
  *) echo 'Usage: format.sh [--check|--write] [source-directory]' >&2; exit 2 ;;
esac
format_evidence=$(mktemp -d)
trap 'rm -rf "$format_evidence"' EXIT
"${MAVEN_COMMAND:-mvn}" -q -f "$project_dir/pom.xml" -Pformat dependency:build-classpath \
  -Dmdep.outputFile="$format_evidence/classpath" > "$format_evidence/maven.log" 2>&1 || {
  cat "$format_evidence/maven.log"
  exit 1
}
mapfile -d '' sources < <(find "$source_dir" -name '*.java' -type f -print0)
if [ "${#sources[@]}" -eq 0 ]; then exit 0; fi
java \
  --add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
  --add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED \
  --add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED \
  --add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED \
  --add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED \
  --add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED \
  -cp "$(cat "$format_evidence/classpath")" \
  com.google.googlejavaformat.java.Main "${flags[@]}" "${sources[@]}"
