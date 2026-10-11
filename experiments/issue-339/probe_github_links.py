"""Bounded live reproduction: user-agent rejection versus actual missing files."""

import json
import subprocess

URLS = [
    "https://github.com/link-assistant/hive-mind/blob/main/docs/BEST-PRACTICES.md",
    "https://github.com/link-foundation/links-notation/blob/main/README.md",
    "https://github.com/link-foundation/links-notation/blob/main/issue-339-does-not-exist.md",
]

if __name__ == "__main__":
    for url in URLS:
        for agent in ("lychee/0.24.2", "curl/8.4.0"):
            status = subprocess.check_output(
                [
                    "curl",
                    "--silent",
                    "--show-error",
                    "--location",
                    "--user-agent",
                    agent,
                    "--output",
                    "/dev/null",
                    "--write-out",
                    "%{http_code}",
                    url,
                ],
                text=True,
            )
            print(json.dumps({"url": url, "user_agent": agent, "status": status}))
