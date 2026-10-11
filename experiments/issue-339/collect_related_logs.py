"""Archive linked draft traces and all stale-PR branch run metadata/logs.

Expired Actions logs are recorded as unavailable, never treated as green.
Provider token patterns are redacted from old draft traces before archiving.
"""

import gzip
import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path("docs/case-studies/issue-339/data")
REPO = "link-foundation/links-notation"


def gh(*args):
    result = subprocess.run(["gh", *args], text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result.stdout


def archive_gist(identifier):
    try:
        content = gh("gist", "view", identifier, "--allow-escape-sequences")
        content, redactions = re.subn(
            r"\b(?:github_pat_|gh[pousr]_|npm_|pypi-|sk-(?:proj-)?)[A-Za-z0-9_-]{20,}",
            "<redacted-provider-token>",
            content,
        )
        with gzip.open(ROOT / f"gist-{identifier}.txt.gz", "wt") as target:
            target.write(content)
        return {"gist": identifier, "bytes": len(content), "redactions": redactions}
    except RuntimeError as error:
        return {"gist": identifier, "unavailable": str(error)}


def archive_branch(number):
    pr = json.loads((ROOT / f"pr-{number}.json").read_text())
    branch = pr["headRefName"]
    pages = json.loads(
        gh(
            "api",
            f"repos/{REPO}/actions/runs?branch={branch}&per_page=100",
            "--paginate",
            "--slurp",
        )
    )
    runs = [run for page in pages for run in page["workflow_runs"]]
    (ROOT / f"pr-{number}-runs.json").write_text(json.dumps(runs, indent=2) + "\n")
    availability = []
    for run in runs:
        identifier = run["id"]
        path = ROOT / f"run-{identifier}.log.gz"
        if path.exists():
            continue
        if run["status"] != "completed":
            availability.append({"run": identifier, "status": run["status"]})
            continue
        try:
            content = gh("run", "view", str(identifier), "--repo", REPO, "--log")
            with gzip.open(path, "wt") as target:
                target.write(content)
            availability.append({"run": identifier, "bytes": len(content)})
        except RuntimeError as error:
            availability.append({"run": identifier, "unavailable": str(error)})
    (ROOT / f"pr-{number}-log-availability.json").write_text(
        json.dumps(availability, indent=2) + "\n"
    )
    print(f"PR {number}: preserved {len(runs)} run records", flush=True)


if __name__ == "__main__":
    identifiers = set()
    for path in ROOT.glob("*.json"):
        identifiers.update(
            re.findall(
                r"gist(?:\.githubusercontent|\.github)\.com/[^/]+/([a-f0-9]+)",
                path.read_text(),
            )
        )
    with ThreadPoolExecutor(max_workers=3) as pool:
        gists = list(pool.map(archive_gist, sorted(identifiers)))
        (ROOT / "gist-availability.json").write_text(json.dumps(gists, indent=2) + "\n")
        list(pool.map(archive_branch, [204, 185, 170, 167, 80, 76]))
