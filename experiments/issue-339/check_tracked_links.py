"""Run the existing link policy on tracked Markdown, excluding local installs."""

import argparse
import subprocess

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lychee", default="lychee")
    args = parser.parse_args()
    files = (
        subprocess.check_output(["git", "ls-files", "-z", "*.md"]).decode().split("\0")
    )
    files = [
        path
        for path in files
        if path and not path.startswith(("docs/case-studies/", "docs/website/dist/"))
    ]
    result = subprocess.run(
        [
            args.lychee,
            "--no-progress",
            "--cache",
            "--max-cache-age",
            "1d",
            "--max-retries",
            "3",
            *files,
        ]
    )
    raise SystemExit(result.returncode)
