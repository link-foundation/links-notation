#!/usr/bin/env bash
# Regression tests for scripts/ci/registry-probe.sh.
#
# The bug these guard against (issue #298): crates.io answers 403 to curl's
# default `User-Agent: curl/8.x`, so `curl -fsS https://crates.io/api/...`
# could never confirm a crate that had just been published. The rust workflow
# published 0.16.0 successfully and then failed itself for 5 minutes straight.
#
# The tests run against a local server that reproduces exactly that behaviour,
# so they need no network access and cannot go flaky.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=scripts/ci/registry-probe.sh
. ./registry-probe.sh

PASS=0
FAIL=0

ok() { PASS=$((PASS + 1)); echo "  ok - $1"; }
no() { FAIL=$((FAIL + 1)); echo "  NOT OK - $1"; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else no "$1 (expected '$3', got '$2')"; fi; }

# A stand-in for crates.io: rejects HTTP-library user agents the way crates.io
# does, serves a crates.io-shaped index document otherwise.
SERVER_DIR=$(mktemp -d)
trap 'kill "${SERVER_PID:-}" 2>/dev/null || true; rm -rf "$SERVER_DIR"' EXIT

cat > "$SERVER_DIR/server.py" <<'PYEOF'
import http.server

INDEX = (
    b'{"name":"links-notation","vers":"0.15.0","deps":[]}\n'
    b'{"name":"links-notation","vers":"0.16.0","deps":[]}\n'
)


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def respond(self, code, body=b""):
        self.send_response(code)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_GET(self):
        agent = self.headers.get("User-Agent", "")
        # This is the crates.io behaviour under test.
        if agent.startswith("curl/") or agent.startswith("python-requests/"):
            return self.respond(403, b'{"errors":[{"detail":"forbidden"}]}')
        if self.path == "/index":
            return self.respond(200, INDEX)
        if self.path == "/ok":
            return self.respond(200, b'{"ok":true}')
        return self.respond(404, b'{"errors":[{"detail":"not found"}]}')

    do_HEAD = do_GET


server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
print(server.server_address[1], flush=True)
server.serve_forever()
PYEOF

python3 "$SERVER_DIR/server.py" > "$SERVER_DIR/port" &
SERVER_PID=$!
for _ in $(seq 1 50); do
  PORT=$(cat "$SERVER_DIR/port" 2>/dev/null || true)
  [ -n "$PORT" ] && break
  sleep 0.1
done
[ -n "${PORT:-}" ] || { echo "the test server did not start"; exit 1; }
BASE="http://127.0.0.1:${PORT}"

echo "# the server reproduces the crates.io behaviour"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/ok")
check "a default curl User-Agent is rejected with 403" "$STATUS" "403"

echo "# probe_registry sends an identifying User-Agent (issue #298)"
if probe_registry "${BASE}/ok"; then ok "probe_registry succeeds where a bare curl gets 403"
else no "probe_registry got HTTP ${REGISTRY_PROBE_STATUS}, so it is not sending a real User-Agent"; fi
check "the status code is recorded" "$REGISTRY_PROBE_STATUS" "200"

echo "# probe_registry reports failure without masking the cause"
if probe_registry "${BASE}/missing"; then no "a 404 must not count as success"
else ok "a 404 is reported as failure"; fi
check "the failing status code is preserved" "$REGISTRY_PROBE_STATUS" "404"

echo "# fetch_registry returns the body on stdout only"
BODY=$(fetch_registry "${BASE}/ok")
check "the body is returned verbatim" "$BODY" '{"ok":true}'
BODY=$(CI_VERBOSE=true fetch_registry "${BASE}/ok" 2>/dev/null)
check "verbose diagnostics do not corrupt the body" "$BODY" '{"ok":true}'

echo "# wait_for_registry gives up with an actionable message"
OUT=$(wait_for_registry "widget@1.0.0" "${BASE}/missing" 2 0 2>&1) && RC=0 || RC=$?
check "a missing package fails the step" "$RC" "1"
if printf '%s' "$OUT" | grep -q 'last status: HTTP 404'; then
  ok "the final status code reaches the log"
else
  no "the final status code is missing from: $OUT"
fi
if printf '%s' "$OUT" | grep -q '::error::'; then ok "the failure is annotated"
else no "the failure is not annotated"; fi

echo "# wait_for_registry_match inspects the body, not just the status"
if wait_for_registry_match "index" "${BASE}/index" '"vers":"0.16.0"' 1 0 > /dev/null; then
  ok "a version present in the body is found"
else
  no "a version present in the body was not found"
fi
if wait_for_registry_match "index" "${BASE}/index" '"vers":"9.9.9"' 1 0 > /dev/null 2>&1; then
  no "a 200 with the wrong body must not count as success"
else
  ok "a 200 without the version is a failure"
fi

echo "# CI_VERBOSE is off by default"
OUT=$(probe_registry "${BASE}/ok" 2>&1)
check "nothing is printed unless asked" "$OUT" ""
OUT=$(CI_VERBOSE=true probe_registry "${BASE}/ok" 2>&1)
if printf '%s' "$OUT" | grep -q 'HTTP 200'; then ok "CI_VERBOSE=true prints the status code"
else no "CI_VERBOSE=true printed nothing useful: $OUT"; fi

echo "# crates.io sparse-index paths follow the cargo layout"
check "1-character crate" "$(crates_index_url a)" "https://index.crates.io/1/a"
check "2-character crate" "$(crates_index_url ab)" "https://index.crates.io/2/ab"
check "3-character crate" "$(crates_index_url abc)" "https://index.crates.io/3/a/abc"
check "longer crate" "$(crates_index_url links-notation)" "https://index.crates.io/li/nk/links-notation"

echo
echo "passed: ${PASS}, failed: ${FAIL}"
[ "$FAIL" -eq 0 ]
