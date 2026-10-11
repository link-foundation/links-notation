"""Compare the 13 distinct CI failures with their equivalent raw content URLs.

The final missing-file control must remain a 404. This finite live probe does
not accept GitHub HTML outages as evidence that a file exists.
"""

import json
import subprocess

URLS = [
    "https://github.com/Swatinem/rust-cache/blob/master/src/cleanup.ts",
    "https://github.com/actions/setup-java/blob/main/docs/advanced-usage.md",
    "https://github.com/link-assistant/hive-mind/blob/main/docs/BEST-PRACTICES.md",
    "https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.hi.md",
    "https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.md",
    "https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.ru.md",
    "https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.zh.md",
    "https://github.com/link-assistant/hive-mind/blob/main/docs/CONTRIBUTING.md",
    "https://github.com/link-foundation/links-queue/blob/main/docs/BINARY-NOTATION-SPEC.md",
    "https://github.com/lycheeverse/lychee/blob/master/lychee-bin/src/cache.rs",
    "https://github.com/lycheeverse/lychee/blob/master/lychee-lib/src/retry.rs",
    "https://github.com/lycheeverse/lychee/blob/master/lychee.example.toml",
    "https://github.com/otac0n/Pegasus/blob/master/Pegasus/Compiler/CodeGenerator/Grammar.weave",
    "https://github.com/link-foundation/links-notation/blob/main/issue-339-does-not-exist.md",
]


def content_url(url):
    return url.replace(
        "https://github.com/", "https://raw.githubusercontent.com/", 1
    ).replace("/blob/", "/", 1)


if __name__ == "__main__":
    for original in URLS:
        for endpoint in (original, content_url(original)):
            status = subprocess.check_output(
                [
                    "curl",
                    "--silent",
                    "--show-error",
                    "--location",
                    "--output",
                    "/dev/null",
                    "--write-out",
                    "%{http_code}",
                    endpoint,
                ],
                text=True,
            )
            print(
                json.dumps(
                    {"original": original, "checked": endpoint, "status": status}
                ),
                flush=True,
            )
