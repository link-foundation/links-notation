#!/usr/bin/env bash
# Issue #330: lychee does not retry a 5xx answer, so one short outage of a
# badge host (codefactor.io 503, github.com 502) fails the scheduled run.
#
# This script shows, against a local server that counts requests per path:
#   1. lychee requests a link that answers 503 only once, whatever
#      --max-retries says, and reports it as broken;
#   2. with --cache, a second lychee run in the same directory skips the link
#      that passed and re-requests both failures: lychee never caches an
#      error (lychee-bin/src/cache.rs). The recovered link now passes, and the
#      real 404 still fails the rerun.
# That second run is what .github/workflows/links.yml now does after a pause.
#
# Needs docker and python3. Usage: experiments/issue-330/lychee-5xx-retry.sh
set -euo pipefail

image=${LYCHEE_IMAGE:-lycheeverse/lychee:0.24.2}
work=$(mktemp -d)
trap 'kill "${server_pid:-0}" 2>/dev/null || true; rm -rf "$work"' EXIT

port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -I - "$port" "$work/hits.log" <<'PY' &
import http.server, sys
port, log = int(sys.argv[1]), sys.argv[2]
class H(http.server.BaseHTTPRequestHandler):
    seen = {}
    def _answer(self):
        with open(log, "a") as f:
            f.write(self.path + "\n")
        H.seen[self.path] = H.seen.get(self.path, 0) + 1
        # /flaky is a short outage: 503 on the first request, 200 afterwards.
        if self.path == "/flaky":
            code = 503 if H.seen[self.path] == 1 else 200
        else:
            code = {"/ok": 200, "/gone": 404}.get(self.path, 404)
        self.send_response(code)
        self.end_headers()
    do_GET = do_HEAD = _answer
    def log_message(self, *args):
        pass
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
PY
server_pid=$!
sleep 1

base="http://127.0.0.1:$port"
printf '[ok](%s/ok) [gone](%s/gone) [flaky](%s/flaky)\n' "$base" "$base" "$base" > "$work/links.md"

run_lychee() {
  docker run --rm --network host -v "$work:/w" -w /w "$image" \
    --no-progress --cache \
    --max-retries 3 links.md >"$work/run$1.txt" 2>&1 && echo 0 || echo $?
}

hits() { grep -c "^$1\$" "$work/hits.log" || true; }

code1=$(run_lychee 1)
echo "run 1: exit $code1; requests: ok=$(hits /ok) gone=$(hits /gone) flaky=$(hits /flaky)"
: >"$work/hits.log"
code2=$(run_lychee 2)
echo "run 2: exit $code2; requests: ok=$(hits /ok) gone=$(hits /gone) flaky=$(hits /flaky)"
echo "run 2 output:"
sed 's/^/  /' "$work/run2.txt"
