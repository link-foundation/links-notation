#!/usr/bin/env bash
#
# Check release credentials and distinguish proven access from unknown scope.
#
# Principle 16 of the shared CI/CD best practices ("Prove You Can Publish
# Before You Build"; adapted from
# link-foundation/python-ai-driven-development-pipeline-template, issues #74
# and #77 there). A non-empty secret proves nothing (an expired token is
# non-empty), and a login proves authentication, not authorisation. Each probe
# therefore attempts a write that cannot succeed:
#   - GitHub (always): create a ref pointing at an object that does not
#     exist. 422 means the token passed the contents:write check and only the
#     payload was refused; 403/404 means the release commit, tag and GitHub
#     release would be refused. Nothing is created.
#   - NuGet (NUGET_PUBLISH=true): obtain a verification key, then verify it
#     against an existing package version, then verify the original key's
#     push scope. The temporary key retains owners but replaces the original
#     package glob, so both checks are needed. With NUGET_USER set, trusted publishing
#     takes priority; its OIDC exchange is deferred to the release job and
#     reported as unknown here. Neither path publishes during preflight.
#   - Conan remote (CONAN_REMOTE_URL set): Conan's server API has no dry-run
#     upload, so a successful login is reported as `unknown` -- never as a
#     pass -- and a refused login as a failure.
#
# PREFLIGHT_MODE:
#   release -- push to main / manual instant release. A refused credential
#              fails the run here, before the publishing job spends a minute.
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
GITHUB_API="${GITHUB_API_URL:-https://api.github.com}"
NUGET_GALLERY="${NUGET_GALLERY_URL:-https://www.nuget.org}"
NUGET_FLAT_CONTAINER="${NUGET_FLAT_CONTAINER_URL:-https://api.nuget.org/v3-flatcontainer}"
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
# Prints "body\nstatus"; a network failure yields status 000 (or nothing), which the
# callers treat as unknown.
http() {
  local body
  body=$(curl -sS --max-time "$CURL_TIMEOUT" -o - -w "${NEWLINE}%{http_code}" "$@" 2>/dev/null)
  # Never print headers or response bodies: both can contain credentials.
  if [ "${PREFLIGHT_VERBOSE:-false}" = true ]; then
    printf 'preflight HTTP %s: %s\n' "${body##*"$NEWLINE"}" "${!#}" >&2
  fi
  printf '%s\n%s' "${body%"${NEWLINE}"*}" "${body##*"$NEWLINE"}"
}

CURL_USER_AGENT="release-preflight (github.com/link-foundation/cpp-ai-driven-development-pipeline-template)"

# Python's standard library is already required by the release scripts.
# Parse JSON without logging a potentially secret response on failure.
nuget_json_value() {
  python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    value = data.get(sys.argv[1])
    if sys.argv[1] == "versions":
        if not isinstance(value, list) or not all(isinstance(v, str) and v for v in value):
            sys.exit(1)
        value = value[-1] if value else ""
    if not isinstance(value, str) or any(ord(c) < 32 for c in value):
        sys.exit(1)
    print(value)
except (ValueError, AttributeError):
    sys.exit(1)
' "$1"
}

url_segment() {
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

# The release job pushes `chore: release <tag>` to main, pushes the tag and
# creates the GitHub release with GITHUB_TOKEN (contents: write). Creating a
# ref at a SHA that cannot exist is authorised first and validated second, so
# 422 proves the write permission without creating anything.
check_github() {
  local token="${GITHUB_TOKEN:-}" repository="${GITHUB_REPOSITORY:-}" response status

  printf 'GitHub:\n'

  if [ -z "$repository" ]; then
    unknown 'GITHUB_REPOSITORY is not set -- cannot probe the release write permission'
    return 0
  fi
  if [ -z "$token" ]; then
    bad 'GITHUB_TOKEN is not set -- the release commit, tag and GitHub release would be refused'
    return 0
  fi

  response=$(http -A "$CURL_USER_AGENT" -X POST \
    -H "Authorization: Bearer ${token}" \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    -d '{"ref":"refs/tags/release-preflight-probe","sha":"0000000000000000000000000000000000000000"}' \
    "${GITHUB_API}/repos/${repository}/git/refs")
  status="${response##*"$NEWLINE"}"

  case "$status" in
    422)
      ok "GitHub accepted a contents:write request for ${repository} (422 on a deliberately invalid ref; nothing created)"
      ;;
    201)
      bad "GitHub created the probe ref in ${repository} -- delete refs/tags/release-preflight-probe; this should be impossible with an all-zero SHA"
      ;;
    401 | 403 | 404)
      bad "GitHub refused the contents:write probe for ${repository} (${status}) -- the release job needs 'permissions: contents: write' (and a ruleset that lets github-actions[bot] push to main, or use release_mode=changelog-pr)"
      ;;
    '' | 000)
      unknown 'the GitHub API was unreachable during the write probe'
      ;;
    *)
      unknown "the GitHub API answered ${status} to the write probe (no verdict on the token)"
      ;;
  esac

  return 0
}

check_nuget() {
  local publish="${NUGET_PUBLISH:-false}" key="${NUGET_API_KEY:-}" package_id="${NUGET_PACKAGE_ID:-}"
  local user="${NUGET_USER:-}" response status verification_key version encoded_id verification_url

  printf 'NuGet:\n'

  if [ "$publish" != 'true' ]; then
    printf '  SKIP: NUGET_PUBLISH is not true -- NuGet publishing is disabled (the release workflow uses the same condition)\n'
    return 0
  fi
  if [ -z "$package_id" ]; then
    bad 'NUGET_PUBLISH is true but NUGET_PACKAGE_ID is empty -- set the repository variable to the package id'
    return 0
  fi
  if [ -n "$user" ]; then
    printf '  MODE: NuGet trusted publishing (NUGET_USER is set)\n'
    unknown "NuGet trusted publishing for ${package_id} will exchange OIDC credentials in the release job; package scope is not verified by preflight"
    return 0
  fi
  printf '  MODE: NuGet API key (NUGET_API_KEY secret fallback)\n'
  if [ -z "$key" ]; then
    bad "NUGET_PUBLISH is true but NUGET_API_KEY is missing -- configure NUGET_USER for trusted publishing or an API key for ${package_id}"
    return 0
  fi

  # The NuGet client uses this verification-key flow before pushing symbols.
  # The POST checks validity and general push scope, not the id or owner.
  encoded_id=$(url_segment "$package_id")
  response=$(http -A "$CURL_USER_AGENT" -X POST -H "X-NuGet-ApiKey: ${key}" \
    -H 'Content-Length: 0' \
    "${NUGET_GALLERY%/}/api/v2/package/create-verification-key/${encoded_id}")
  status="${response##*"$NEWLINE"}"

  case "$status" in
    200)
      verification_key=$(printf '%s' "${response%"${NEWLINE}"*}" | nuget_json_value Key)
      if [ -z "$verification_key" ]; then
        unknown 'NuGet returned no usable verification key -- package scope is unknown'
        return 0
      fi
      ;;
    401 | 403)
      bad "NuGet refused the API key for ${package_id} (${status}) -- the key is invalid, expired, or lacks push scope"
      return 0
      ;;
    '' | 000)
      unknown 'NuGet was unreachable during the verification-key probe'
      return 0
      ;;
    *)
      unknown "NuGet answered ${status} to the verification-key probe (no verdict on the API key)"
      return 0
      ;;
  esac

  # The public index lists published versions, including unlisted versions.
  # It receives no credentials. A first push has no version to verify against.
  response=$(http -A "$CURL_USER_AGENT" \
    "${NUGET_FLAT_CONTAINER%/}/$(url_segment "${package_id,,}")/index.json")
  status="${response##*"$NEWLINE"}"
  case "$status" in
    200)
      if ! version=$(printf '%s' "${response%"${NEWLINE}"*}" | nuget_json_value versions); then
        unknown 'NuGet returned a malformed version index -- package scope is unknown'
        return 0
      fi
      if [ -z "$version" ]; then
        unknown "NuGet has no published version of ${package_id} -- package scope for a first push cannot be verified"
        return 0
      fi
      ;;
    404)
      unknown "NuGet has no published version of ${package_id} -- package scope for a first push cannot be verified"
      return 0
      ;;
    *)
      unknown "NuGet version lookup answered ${status:-000} -- package scope is unknown"
      return 0
      ;;
  esac

  # Consume the one-time key to check its owner scope. CredentialBuilder
  # replaces the original package glob with the requested ID on this key,
  # so this check alone cannot prove that the publishing key may push it.
  verification_url="${NUGET_GALLERY%/}/api/v2/verifykey/${encoded_id}/$(url_segment "$version")"
  response=$(http -A "$CURL_USER_AGENT" -H "X-NuGet-ApiKey: ${verification_key}" \
    "$verification_url")
  status="${response##*"$NEWLINE"}"
  case "$status" in
    200)
      ;;
    401 | 403)
      bad "NuGet refused push scope for ${package_id} (${status}) -- check the API key's package id / glob and owner"
      return 0
      ;;
    404)
      unknown "NuGet could not find ${package_id} ${version} during verification -- package scope is unknown"
      return 0
      ;;
    *)
      unknown "NuGet package verification answered ${status:-000} -- package scope is unknown"
      return 0
      ;;
  esac

  # VerifyPackageKeyInternalAsync accepts ordinary push keys too. With the
  # original key it evaluates PackagePush/PackagePushVersion and the actual
  # package glob and owner, without replacing the scopes or consuming it.
  response=$(http -A "$CURL_USER_AGENT" -H "X-NuGet-ApiKey: ${key}" "$verification_url")
  status="${response##*"$NEWLINE"}"
  case "$status" in
    200)
      ok "NuGet verified push scope for ${package_id} against published version ${version}"
      ;;
    401 | 403)
      bad "NuGet refused push scope for ${package_id} (${status}) -- check the API key's package id / glob and owner"
      ;;
    404)
      unknown "NuGet could not find ${package_id} ${version} during verification -- package scope is unknown"
      ;;
    *)
      unknown "NuGet package verification answered ${status:-000} -- package scope is unknown"
      ;;
  esac

  return 0
}

check_conan() {
  local url="${CONAN_REMOTE_URL:-}" user="${CONAN_LOGIN_USERNAME:-}" password="${CONAN_PASSWORD:-}"
  local response status

  printf 'Conan remote:\n'

  if [ -z "$url" ]; then
    printf '  SKIP: CONAN_REMOTE_URL is not set -- Conan upload is disabled (the release workflow uses the same condition)\n'
    return 0
  fi
  if [ -z "$user" ] || [ -z "$password" ]; then
    bad "CONAN_REMOTE_URL is set (${url}) but CONAN_LOGIN_USERNAME or CONAN_PASSWORD is missing -- conan upload would fail"
    return 0
  fi

  response=$(http -A "$CURL_USER_AGENT" -u "${user}:${password}" "${url%/}/v2/users/authenticate")
  status="${response##*"$NEWLINE"}"

  case "$status" in
    200)
      unknown "the Conan remote accepted the login for ${user}; its API has no dry-run upload, so write permission is proven only by the upload itself"
      ;;
    401 | 403)
      bad "the Conan remote refused the login for ${user} (${status}) -- conan upload would fail"
      ;;
    '' | 000)
      unknown 'the Conan remote was unreachable during the login probe'
      ;;
    *)
      unknown "the Conan remote answered ${status} to the login probe (no verdict on the credential)"
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
    printf 'Verdict: **%s**\n\n' "$verdict"
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

check_github
check_nuget
check_conan

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
