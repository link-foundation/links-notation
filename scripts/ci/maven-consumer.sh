#!/usr/bin/env bash
set -euo pipefail
binding=${1:?Expected java or kotlin}
version=${2:?Expected an exact public version}
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Expected a numeric semantic version' >&2
  exit 1
fi
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
temp=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/lino-consumer.XXXXXX")
trap 'rm -rf "$temp"' EXIT
case "$binding" in
  java)
    curl --fail --silent --show-error --location \
      --user-agent 'links-notation-public-consumer' \
      "https://repo1.maven.org/maven2/io/github/link-foundation/links-notation/${version}/links-notation-${version}.jar" \
      --output "$temp/links-notation.jar"
    javac -cp "$temp/links-notation.jar" -d "$temp" "$root/examples/maven/java/Consumer.java"
    java -cp "$temp:$temp/links-notation.jar" Consumer
    ;;
  kotlin)
    cp -R "$root/examples/maven/kotlin" "$temp/project"
    # A fresh Gradle cache proves public resolution rather than a local install.
    "$root/kotlin/gradlew" --project-dir "$temp/project" \
      --gradle-user-home "$temp/gradle" --no-daemon --console=plain \
      --no-configuration-cache --max-workers=1 "-PnotationVersion=$version" run
    ;;
  *) echo 'Expected java or kotlin' >&2; exit 1 ;;
esac
