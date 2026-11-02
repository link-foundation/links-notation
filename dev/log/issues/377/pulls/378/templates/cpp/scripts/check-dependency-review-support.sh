#!/usr/bin/env bash
#
# Decide whether actions/dependency-review-action can run on this repository.
#
# The action reads the dependency graph comparison API, which answers 403
# while the dependency graph is disabled (Settings -> Advanced Security ->
# Dependency graph). That is a repository setting, not a defect of the pull
# request, and a repository freshly created from this template starts with it
# off; failing every pull request until someone flips it would make the
# template red out of the box. The same request the action makes is probed
# here first:
#   200       -> supported=true, the review runs.
#   403       -> supported=false, the review is skipped with a warning that
#                names the setting to enable.
#   otherwise -> supported=true: a timeout, a 5xx or a 404 has not proven the
#                graph is off, so the action runs and reports the real error.
#
# Inputs: GITHUB_TOKEN, GITHUB_REPOSITORY, BASE_SHA, HEAD_SHA and optionally
# GITHUB_API_URL. Output: `supported=true|false` appended to GITHUB_OUTPUT
# (stdout when unset).

set -euo pipefail

for name in GITHUB_TOKEN GITHUB_REPOSITORY BASE_SHA HEAD_SHA; do
  if [[ -z "${!name:-}" ]]; then
    echo "$name must be set" >&2
    exit 2
  fi
done

GITHUB_API="${GITHUB_API_URL:-https://api.github.com}"
CURL_TIMEOUT="${DEPENDENCY_REVIEW_CURL_TIMEOUT:-15}"
OUTPUT="${GITHUB_OUTPUT:-/dev/stdout}"
URL="$GITHUB_API/repos/$GITHUB_REPOSITORY/dependency-graph/compare/$BASE_SHA...$HEAD_SHA"

status="$(
  curl --silent --output /dev/null --write-out '%{http_code}' \
    --max-time "$CURL_TIMEOUT" \
    --header "Authorization: Bearer $GITHUB_TOKEN" \
    --header 'Accept: application/vnd.github+json' \
    --header 'X-GitHub-Api-Version: 2022-11-28' \
    "$URL" || true
)"

case "$status" in
  403)
    echo "::warning title=Dependency review skipped::The dependency graph is disabled on $GITHUB_REPOSITORY. Enable it in Settings -> Advanced Security -> Dependency graph to review dependency changes."
    echo "supported=false" >> "$OUTPUT"
    ;;
  200)
    echo "Dependency graph is enabled; running the dependency review."
    echo "supported=true" >> "$OUTPUT"
    ;;
  *)
    echo "The dependency graph probe answered '${status:-no response}'; running the dependency review to report the real error."
    echo "supported=true" >> "$OUTPUT"
    ;;
esac
