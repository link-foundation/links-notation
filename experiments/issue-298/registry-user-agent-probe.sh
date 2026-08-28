#!/usr/bin/env bash
# Reproduces the root cause of https://github.com/link-foundation/links-notation/issues/298
#
# crates.io rejects requests that carry curl's default `User-Agent: curl/8.x`
# with HTTP 403. Every other registry used by this repository answers 200.
#
# `rust.yml` verified a freshly published crate with a bare `curl -fsS ...`,
# so the verification could never succeed: the crate was published, the poll
# 403'd twenty times in a row, and the `rust` workflow reported a failure for a
# release that had actually gone out. A false negative.
#
# Usage: experiments/issue-298/registry-user-agent-probe.sh
set -uo pipefail

UA='links-notation-ci (https://github.com/link-foundation/links-notation)'

probe() {
  local label="$1" url="$2"
  local bare with
  bare=$(curl -sS -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo 'ERR')
  with=$(curl -sS -o /dev/null -w '%{http_code}' -H "User-Agent: ${UA}" "$url" 2>/dev/null || echo 'ERR')
  printf '%-12s default-UA=%-4s explicit-UA=%-4s %s\n' "$label" "$bare" "$with" \
    "$([ "$bare" = "$with" ] && echo 'same' || echo '<-- DIFFERS')"
}

echo 'Registry reachability with curl'"'"'s default User-Agent vs an explicit one:'
echo
probe crates.io "https://crates.io/api/v1/crates/links-notation/0.16.0"
probe npm       "https://registry.npmjs.org/links-notation"
probe pypi      "https://pypi.org/pypi/links-notation/json"
probe nuget     "https://api.nuget.org/v3-flatcontainer/link.foundation.links.notation/index.json"
probe goproxy   "https://proxy.golang.org/github.com/link-foundation/links-notation/go/@v/list"
probe packagist "https://repo.packagist.org/p2/link-foundation/links-notation.json"
echo
echo 'Expected: only crates.io differs (403 without a User-Agent, 200 with one).'
