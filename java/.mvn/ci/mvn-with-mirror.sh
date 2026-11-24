#!/usr/bin/env bash
# Run Maven; if it fails (e.g. Maven Central answering HTTP 429 to a CI burst,
# run 45504069647, issue #437), retry once through Google's Maven Central
# mirror. The mirror serves the same artifacts and checksums as Central.
# Usage: mvn-with-mirror.sh <maven-executable> [maven args...]
set -uo pipefail
mvn="$1"; shift
"$mvn" "$@" && exit 0
status=$?
settings="${RUNNER_TEMP:-/tmp}/maven-central-mirror-settings.xml"
cat > "$settings" <<'XML'
<settings>
  <mirrors>
    <mirror>
      <id>google-maven-central</id>
      <name>Google Maven Central mirror</name>
      <url>https://maven-central.storage-download.googleapis.com/maven2/</url>
      <mirrorOf>central</mirrorOf>
    </mirror>
  </mirrors>
</settings>
XML
echo "::warning::Maven exited with $status; retrying through the Google Maven Central mirror (Central may be rate-limiting this runner)."
exec "$mvn" -s "$settings" "$@"
