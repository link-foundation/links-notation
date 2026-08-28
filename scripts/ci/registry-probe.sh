#!/usr/bin/env bash
# Shared registry HTTP probe for the publish workflows.
#
# Every language workflow polls its package registry to confirm that a release
# really landed. Those polls used to be bare `curl -fsS "$URL" >/dev/null 2>&1`
# calls, which had two defects:
#
#   1. crates.io answers 403 to curl's default `User-Agent: curl/8.x`, so the
#      rust workflow could never verify a crate it had just published
#      successfully. See https://github.com/link-foundation/links-notation/issues/298
#      and https://github.com/rust-lang/crates.io/issues/13482.
#   2. `>/dev/null 2>&1` discarded the status code, so twenty identical
#      "Not visible yet" lines were the only evidence in the log and the real
#      cause (403, not 404) was invisible.
#
# Both are fixed here, once, so the individual workflows cannot drift apart
# again.
#
#   probe_registry <url>                    -> 0 when the URL answers 2xx
#   wait_for_registry <label> <url> [tries] [delay]
#
# Set CI_VERBOSE=true to log the status code of every attempt. The default is
# off; the status code of the *final* failing attempt is always reported.
set -uo pipefail

# crates.io asks that clients identify themselves rather than report their HTTP
# library, and includes contact information so it can reach the operator.
# https://crates.io/data-access
: "${REGISTRY_USER_AGENT:=links-notation-ci (+https://github.com/link-foundation/links-notation)}"

# Overridable so the tests can point the index lookups at a local server.
: "${CRATES_INDEX_BASE:=https://index.crates.io}"

# Last status code observed by probe_registry, for callers that report it.
REGISTRY_PROBE_STATUS=''

probe_registry() {
  local url="$1"
  REGISTRY_PROBE_STATUS=$(
    curl --silent --show-error --location \
      --max-time 30 --retry 3 --retry-connrefused \
      --user-agent "$REGISTRY_USER_AGENT" \
      --output /dev/null --write-out '%{http_code}' \
      "$url" 2>/dev/null
  ) || REGISTRY_PROBE_STATUS='000'

  if [ "${CI_VERBOSE:-false}" = "true" ]; then
    echo "  probe ${url} -> HTTP ${REGISTRY_PROBE_STATUS}"
  fi

  case "$REGISTRY_PROBE_STATUS" in
    2??) return 0 ;;
    *) return 1 ;;
  esac
}

# Prints the response body on stdout and returns non-zero for anything that is
# not 2xx, for callers that have to inspect the document rather than just its
# status. Diagnostics go to stderr so they cannot corrupt the body.
fetch_registry() {
  local url="$1" tmp status
  tmp=$(mktemp)
  status=$(
    curl --silent --show-error --location \
      --max-time 30 --retry 3 --retry-connrefused \
      --user-agent "$REGISTRY_USER_AGENT" \
      --output "$tmp" --write-out '%{http_code}' \
      "$url" 2>/dev/null
  ) || status='000'
  REGISTRY_PROBE_STATUS="$status"

  if [ "${CI_VERBOSE:-false}" = "true" ]; then
    echo "  fetch ${url} -> HTTP ${status}" >&2
  fi

  case "$status" in
    2??) cat "$tmp"; rm -f "$tmp"; return 0 ;;
    *) rm -f "$tmp"; return 1 ;;
  esac
}

# crates.io sparse-index lookup. `cargo` resolves dependencies against the
# index rather than the JSON API, so "is the dependency usable yet?" has to be
# asked here. The index answers 200 for every version of a crate that already
# exists, so the version has to be matched inside the body.
crates_index_url() {
  local name="$1"
  case ${#name} in
    1) echo "${CRATES_INDEX_BASE}/1/${name}" ;;
    2) echo "${CRATES_INDEX_BASE}/2/${name}" ;;
    3) echo "${CRATES_INDEX_BASE}/3/${name:0:1}/${name}" ;;
    *) echo "${CRATES_INDEX_BASE}/${name:0:2}/${name:2:2}/${name}" ;;
  esac
}

# A single index lookup: 0 when the exact version is listed. Used both to skip
# a publish that would fail with "already exists" and as one attempt of the
# wait loop below.
crate_version_published() {
  local name="$1" version="$2" url body
  url=$(crates_index_url "$name")
  body=$(
    curl --silent --show-error --location --max-time 30 \
      --retry 3 --retry-connrefused \
      --user-agent "$REGISTRY_USER_AGENT" "$url" 2>/dev/null
  ) || body=''
  if [ "${CI_VERBOSE:-false}" = "true" ]; then
    echo "  index ${url} has: $(printf '%s' "$body" | grep -o '"vers":"[^"]*"' | tr '\n' ' ')"
  fi
  printf '%s' "$body" | grep -qF "\"vers\":\"${version}\""
}

wait_for_crate_version() {
  local name="$1" version="$2" tries="${3:-20}" delay="${4:-15}"
  local attempt
  for attempt in $(seq 1 "$tries"); do
    if crate_version_published "$name" "$version"; then
      echo "Verified ${name}@${version} in the crates.io index (attempt ${attempt}/${tries})"
      return 0
    fi
    if [ "$attempt" -lt "$tries" ]; then
      echo "Not in the index yet (attempt ${attempt}/${tries}); retrying in ${delay}s"
      sleep "$delay"
    fi
  done
  echo "::error::${name}@${version} did not appear in the crates.io index ($(crates_index_url "$name")) after ${tries} attempts"
  return 1
}

# Some registries expose a single "all versions" document instead of a
# per-version URL, so a 200 alone proves nothing and the body has to be
# matched. `needle` is a fixed string, not a pattern.
wait_for_registry_match() {
  local label="$1" url="$2" needle="$3" tries="${4:-20}" delay="${5:-15}"
  local body attempt
  for attempt in $(seq 1 "$tries"); do
    body=$(
      curl --silent --show-error --location --max-time 30 \
        --retry 3 --retry-connrefused \
        --user-agent "$REGISTRY_USER_AGENT" "$url" 2>/dev/null
    ) || body=''
    if printf '%s' "$body" | grep -qF "$needle"; then
      echo "Verified ${label} (attempt ${attempt}/${tries})"
      return 0
    fi
    if [ "${CI_VERBOSE:-false}" = "true" ]; then
      echo "  ${url} returned ${#body} bytes without '${needle}'"
    fi
    if [ "$attempt" -lt "$tries" ]; then
      echo "Not indexed yet (attempt ${attempt}/${tries}); retrying in ${delay}s"
      sleep "$delay"
    fi
  done
  echo "::error::${label} was not found at ${url} after ${tries} attempts"
  return 1
}

wait_for_registry() {
  local label="$1" url="$2" tries="${3:-20}" delay="${4:-15}"
  local attempt
  for attempt in $(seq 1 "$tries"); do
    if probe_registry "$url"; then
      echo "Verified ${label} (attempt ${attempt}/${tries})"
      return 0
    fi
    if [ "$attempt" -lt "$tries" ]; then
      echo "Not visible yet (attempt ${attempt}/${tries}, HTTP ${REGISTRY_PROBE_STATUS}); retrying in ${delay}s"
      sleep "$delay"
    fi
  done
  # The status code turns "it never showed up" into an actionable message: 404
  # means indexing lag, anything else means the probe itself is broken.
  echo "::error::${label} was not visible at ${url} after ${tries} attempts (last status: HTTP ${REGISTRY_PROBE_STATUS})"
  return 1
}
