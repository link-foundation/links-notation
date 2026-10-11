"""Preserve complete executed-job logs without gh's per-job API fan-out.

Download the authenticated Actions ZIP to ci-logs and archive each whole job
losslessly. Match completed runs to their expected commit before collecting.
"""

import argparse
import gzip
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path

REPO = "link-foundation/links-notation"
ROOT = Path("docs/case-studies/issue-339/data")


def collect(run_id, expected_sha):
    raw = subprocess.check_output(
        [
            "gh",
            "run",
            "view",
            str(run_id),
            "--repo",
            REPO,
            "--json",
            "databaseId,headSha,status,conclusion,createdAt,updatedAt,jobs,url",
        ],
        text=True,
    )
    metadata = json.loads(raw)
    if metadata["status"] != "completed" or metadata["headSha"] != expected_sha:
        raise SystemExit("Run is incomplete or belongs to a different commit")
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / f"run-{run_id}-completed.json").write_text(raw.rstrip() + "\n")
    archive = Path("ci-logs") / f"run-{run_id}-logs.zip"
    archive.parent.mkdir(exist_ok=True)
    with archive.open("wb") as output:
        subprocess.run(
            ["gh", "api", f"repos/{REPO}/actions/runs/{run_id}/logs"],
            stdout=output,
            check=True,
        )
    entries = []
    with zipfile.ZipFile(archive) as logs:
        for entry in logs.infolist():
            # ZIP also contains individual step logs. Whole-job logs are at
            # its root, avoiding duplication without dropping executed jobs.
            if "/" in entry.filename or not entry.filename.endswith(".txt"):
                continue
            data = logs.read(entry)
            name = re.sub(r"[^a-zA-Z0-9_.()-]+", "_", Path(entry.filename).stem)
            target = ROOT / f"run-{run_id}-{name}.log.gz"
            compressed = gzip.compress(data, mtime=0)
            if len(compressed) >= 1_024_000:
                raise SystemExit(f"Split the oversized log before committing: {name}")
            target.write_bytes(compressed)
            assert gzip.decompress(target.read_bytes()) == data
            entries.append(
                {
                    "zip_entry": entry.filename,
                    "file": target.name,
                    "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                }
            )
    index = {"run": run_id, "sha": expected_sha, "logs": entries}
    (ROOT / f"run-{run_id}-log-index.json").write_text(
        json.dumps(index, indent=2) + "\n"
    )
    print(f"Run {run_id}: preserved {len(entries)} complete job logs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run_id", type=int)
    parser.add_argument("expected_sha")
    arguments = parser.parse_args()
    collect(arguments.run_id, arguments.expected_sha)
