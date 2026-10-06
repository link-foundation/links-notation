#!/usr/bin/env bash
#
# Prove the release credentials can write before any expensive job runs.
#
# Principle 16 of the shared CI/CD best practices ("Prove You Can Publish
# Before You Build", issues #163 and #167). A non-empty secret proves nothing
# (an expired token is non-empty), and a login -- or a registry token
# endpoint -- proves authentication, not authorisation: auth.docker.io
# answers an anonymous pull,push request with 200 and silently narrows the
# grant to pull. The only form of the check that is not a guess is an
# attempted write: POST /v2/<repo>/blobs/uploads/ -> 202 opens an upload
# session, DELETE cancels it, nothing is stored and no tag moves.
#
# PREFLIGHT_MODE:
#   release -- push to main / manual instant release. A refused credential
#              fails the run here, before the matrix spends a minute.
#   report  -- pull requests, where a fork legitimately has no publishing
#              secrets. The same probes run and annotate, but never block.
#
# Rules each caller depends on (each is a defect if dropped):
#   1. Report every failure, not the first -- no probe aborts the script.
#   2. Report `unknown`, never a guess: a timeout or a 429 has not said the
#      credential is broken. But a release-mode run that verified nothing is
#      not a pass.
#   3. Probe with a write, not a login.
#
# No set -e on purpose: rule 1 means one failed probe must not hide the rest.

set -u

MODE="${PREFLIGHT_MODE:-report}"
CRATES_API="${CRATES_API:-https://crates.io}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-https://registry-1.docker.io}"
DOCKER_AUTH="${DOCKER_AUTH:-https://auth.docker.io}"
CURL_TIMEOUT="${PREFLIGHT_CURL_TIMEOUT:-15}"
NEWLINE=$'\n'

verified=0
n_fail=0
n_unknown=0
failures=''
unknowns=''

ok() {
  verified=$((verified + 1))
  printf '  PASS: %s\n' "$*"
}

bad() {
  n_fail=$((n_fail + 1))
  failures="${failures}${failures:+${NEWLINE}}$1"
  printf '  FAIL: %s\n' "$*"
}

unknown() {
  n_unknown=$((n_unknown + 1))
  unknowns="${unknowns}${unknowns:+${NEWLINE}}$1"
  printf '  UNKNOWN: %s\n' "$*"
}

# curl that separates the HTTP status from the body without temp files.
# Prints "body\nstatus"; a network failure yields an empty status, which the
# callers treat as unknown.
http() {
  local body
  body=$(curl -sS --max-time "$CURL_TIMEOUT" -o - -w "${NEWLINE}%{http_code}" "$@" 2>/dev/null)
  printf '%s\n%s' "${body%"${NEWLINE}"*}" "${body##*"$NEWLINE"}"
}

# crates.io answers 403 to API calls without a User-Agent.
CURL_USER_AGENT="release-preflight (github.com/link-foundation/rust-ai-driven-development-pipeline-template)"

# First `login` in a JSON payload -- enough for crates.io's flat responses
# (`{"user":{"login":...}}`, `{"users":[{"login":...},...]}`) and free of
# jq/node dependencies this template does not otherwise have.
first_login() {
  printf '%s' "$1" | sed -n 's/.*"login" *: *"\([^"]*\)".*/\1/p' | head -n 1
}

lowercase() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

# The [package].name from Cargo.toml, parsed section-aware the same way
# scripts/rust-paths.rs reads manifests: a `name` under `[dependencies]` or
# any other table must never be mistaken for the package name.
crate_name_from_manifest() {
  [ -f Cargo.toml ] || return 1
  awk '
    /^\[/ { in_package = ($0 ~ /^\[package\][ \t]*(#.*)?$/) }
    in_package && $1 == "name" && $2 == "=" {
      gsub(/^[ \t]*name[ \t]*=[ \t]*"/, ""); gsub(/".*$/, ""); print; exit
    }
  ' Cargo.toml
}

check_crates_io() {
  # The publish steps use `secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN`
  # (auto-release and manual-release); mirror that fallback exactly.
  local token="${CARGO_REGISTRY_TOKEN:-${CARGO_TOKEN:-}}"
  local crate_name login response status payload owners_status owners_payload owner is_owner

  printf 'crates.io:\n'

  if [ -z "$token" ]; then
    bad 'crates.io has no publish credential: neither CARGO_REGISTRY_TOKEN nor CARGO_TOKEN is set -- cargo publish would fail with 401'
    return 0
  fi

  response=$(http -A "$CURL_USER_AGENT" -H "Authorization: ${token}" "$CRATES_API/api/v1/me")
  status="${response##*"$NEWLINE"}"
  payload="${response%"${NEWLINE}"*}"

  case "$status" in
    200)
      login=$(first_login "$payload")
      if [ -z "$login" ]; then
        ok 'crates.io accepted the publish token (200 from /api/v1/me)'
        return 0
      fi
      ok "crates.io accepted the publish token (logged in as ${login})"
      ;;
    401 | 403)
      bad "crates.io rejected the publish token (${status}) -- the token is missing, invalid or expired; a 403 is what crates.io answers to a bad token on /api/v1/me"
      return 0
      ;;
    '')
      unknown 'crates.io unreachable during the /api/v1/me probe'
      return 0
      ;;
    *)
      unknown "crates.io answered ${status} to the /api/v1/me probe (no verdict on the token)"
      return 0
      ;;
  esac

  # A valid token belonging to an account that is not an owner of this crate
  # passes /api/v1/me and still fails `cargo publish`. The owners endpoint is
  # public, so this second probe is free.
  crate_name=$(crate_name_from_manifest) || crate_name=''
  if [ -z "$crate_name" ]; then
    printf '  SKIP: no Cargo.toml in the working directory -- the ownership probe needs the crate name\n'
    return 0
  fi

  response=$(http -A "$CURL_USER_AGENT" "$CRATES_API/api/v1/crates/${crate_name}/owners")
  owners_status="${response##*"$NEWLINE"}"
  owners_payload="${response%"${NEWLINE}"*}"

  case "$owners_status" in
    200)
      is_owner=0
      while IFS= read -r owner; do
        [ -z "$owner" ] && continue
        if [ "$(lowercase "$owner")" = "$(lowercase "$login")" ]; then
          is_owner=1
          break
        fi
      done <<OWNERS
$(printf '%s' "$owners_payload" | grep -o '"login" *: *"[^"]*"' | sed 's/.*"login" *: *"//;s/"$//')
OWNERS
      if [ "$is_owner" -eq 1 ]; then
        ok "${login} is an owner of ${crate_name}"
      else
        bad "crates.io accepted the token, but account '${login}' is not an owner of ${crate_name} -- the publish would fail"
      fi
      ;;
    404)
      # A crate name that has never been published has no owner list; the
      # first publish creates it. /api/v1/me is the credential proof here.
      printf "  SKIP: ${crate_name} is not on crates.io yet (404 from owners) -- the ownership probe starts with the first publish\n"
      ;;
    '')
      unknown 'crates.io unreachable during the ownership probe'
      ;;
    *)
      unknown "crates.io answered ${owners_status} to the ownership probe (no verdict on ownership)"
      ;;
  esac

  return 0
}

check_docker_hub() {
  local image="${DOCKERHUB_IMAGE:-}"
  local username="${DOCKERHUB_USERNAME:-}"
  local token="${DOCKERHUB_TOKEN:-}"

  printf 'Docker Hub:\n'

  if [ -z "$image" ]; then
    printf '  SKIP: DOCKERHUB_IMAGE is not set -- Docker publishing is disabled (the release workflow disables it with the same condition)\n'
    return 0
  fi

  if [ -z "$username" ] || [ -z "$token" ]; then
    bad "DOCKERHUB_IMAGE is set (${image}) but DOCKERHUB_USERNAME or DOCKERHUB_TOKEN is missing -- docker-publish would fail at login"
    return 0
  fi

  # The token request below is only a means to the write probe: as measured in
  # issue #167 the endpoint hands out 200 + a token for any scope without
  # proving the scope can be granted, so its answer proves nothing.
  local auth_body payload registry_token
  auth_body=$(http -u "$username:$token" \
    "$DOCKER_AUTH/token?service=registry.docker.io&scope=repository:${image}:pull,push")
  payload="${auth_body%"${NEWLINE}"*}"
  registry_token=$(printf '%s' "$payload" | sed -n 's/.*"token" *: *"\([^"]*\)".*/\1/p')
  if [ -z "$registry_token" ]; then
    unknown 'Docker Hub auth endpoint did not return a usable token'
    return 0
  fi

  local headers status location
  headers=$(curl -sS --max-time "$CURL_TIMEOUT" -D - -o /dev/null \
    -X POST -H "Authorization: Bearer $registry_token" \
    "$DOCKER_REGISTRY/v2/${image}/blobs/uploads/" 2>/dev/null)
  if [ -z "$headers" ]; then
    unknown 'Docker Hub registry unreachable during the write probe'
    return 0
  fi
  status=$(printf '%s\n' "$headers" | awk 'NR==1{gsub(/\r/,"");print $2}')
  location=$(printf '%s\n' "$headers" | awk 'tolower($1)=="location:"{gsub(/\r/,"");print $2; exit}')

  case "$status" in
    202)
      # Cancel the opened upload session so nothing is stored.
      if [ -n "$location" ]; then
        curl -sS --max-time "$CURL_TIMEOUT" -o /dev/null -X DELETE \
          -H "Authorization: Bearer $registry_token" "$location" 2>/dev/null || true
      fi
      ok "Docker Hub accepted a blob-upload write for ${image} (202; upload session cancelled)"
      ;;
    401 | 403)
      bad "Docker Hub refused the write for ${image} (${status}) -- the token cannot push this repository; the login the publishing jobs run would still have succeeded"
      ;;
    404)
      bad "Docker Hub reports ${image} as unknown (404) -- check DOCKERHUB_IMAGE and DOCKERHUB_USERNAME"
      ;;
    429)
      unknown 'Docker Hub rate-limited the write probe (429)'
      ;;
    *)
      unknown "Docker Hub answered ${status:-no status} to the write probe (no verdict on the credential)"
      ;;
  esac

  return 0
}

emit_annotations() {
  local level="$1" list="$2"
  [ -n "$list" ] || return 0
  printf '%s\n' "$list" | while IFS= read -r line; do
    [ -n "$line" ] && printf '::%s::release-preflight: %s\n' "$level" "$line"
  done
}

append_summary() {
  local verdict="$1" list
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] || return 0
  {
    printf '### Release preflight (%s mode)\n\n' "$MODE"
    printf '| verdict | count |\n| --- | --- |\n'
    printf '| verified | %d |\n' "$verified"
    printf '| failed | %d |\n' "$n_fail"
    printf '| unknown | %d |\n' "$n_unknown"
    for list in "$failures" "$unknowns"; do
      [ -n "$list" ] || continue
      printf '%s\n' "$list" | while IFS= read -r line; do
        [ -n "$line" ] && printf -- '- %s\n' "$line"
      done
    done
  } >> "$GITHUB_STEP_SUMMARY"
}

check_crates_io
check_docker_hub

printf '\nRelease preflight: %d verified, %d failed, %d unknown\n' \
  "$verified" "$n_fail" "$n_unknown"

if [ "$n_fail" -gt 0 ]; then
  if [ "$MODE" = 'release' ]; then
    emit_annotations error "$failures"
    append_summary failed
    printf '::error::release-preflight: refusing to release with %d refused credential(s)\n' "$n_fail"
    exit 1
  fi
  emit_annotations warning "$failures"
  append_summary failed
  printf 'Report mode: the failures above are advisory -- pull requests may come from forks without publishing secrets.\n'
  exit 0
fi

if [ "$verified" -eq 0 ]; then
  # Rule 2, second half: every probe came back unknown (or there was nothing
  # to probe). That is not a pass in release mode -- a release would run on
  # pure hope.
  if [ "$MODE" = 'release' ]; then
    emit_annotations warning "$unknowns"
    append_summary unverified
    printf '::error::release-preflight: verified nothing (%d unknown) -- refusing to release on an unproven credential set\n' "$n_unknown"
    exit 1
  fi
  emit_annotations warning "$unknowns"
  append_summary unverified
  printf 'Report mode: nothing was verified -- advisory only.\n'
  exit 0
fi

append_summary passed
exit 0
