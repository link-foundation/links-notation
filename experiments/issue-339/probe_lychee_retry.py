"""Finite reproduction of an HTTP 503 bypassing Lychee's retry budget.

Three invocations against localhost: a 503/200 file twice, and a persistent
404 control. This requires a local Lychee binary, without Docker or network.
"""

import argparse
import http.server
import json
import subprocess
import tempfile
import threading
from pathlib import Path


class RetryHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        counts = self.server.counts
        counts[self.path] = counts.get(self.path, 0) + 1
        if self.path == "/flaky":
            status = 503 if counts[self.path] == 1 else 200
        else:
            status = 404
        self.send_response(status)
        self.end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lychee", default="lychee")
    args = parser.parse_args()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), RetryHandler)
    server.counts = {}
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            base = f"http://127.0.0.1:{server.server_port}"
            for path in ("/flaky", "/flaky", "/gone"):
                root.joinpath("links.txt").write_text(base + path + "\n")
                result = subprocess.run(
                    [
                        args.lychee,
                        "--no-progress",
                        "--max-retries",
                        "3",
                        "--format",
                        "json",
                        "links.txt",
                    ],
                    cwd=root,
                    text=True,
                    capture_output=True,
                    check=False,
                )
                report = json.loads(result.stdout)
                print(
                    json.dumps(
                        {
                            "path": path,
                            "exit_code": result.returncode,
                            "cumulative_requests": server.counts[path],
                            "successful": report["successful"],
                            "errors": report["errors"],
                        }
                    )
                )
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
