"""Collect complete branch run/job timing evidence and reproducible CI metrics.

Runner minutes are summed job wall time, not GitHub billed minutes. First green
is measured from the first branch PR run to completion of one all-green commit;
unavailable or missing workflows never count as green.
"""

import argparse
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

ROOT = Path("docs/case-studies/issue-339/data")
REPO = "link-foundation/links-notation"
LANGUAGES = {"js", "rust", "python", "java", "go", "csharp", "php"}


def gh_api(endpoint):
    output = subprocess.check_output(
        ["gh", "api", f"repos/{REPO}/{endpoint}", "--paginate", "--slurp"], text=True
    )
    return json.loads(output)


def stamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def jobs(run):
    pages = gh_api(f"actions/runs/{run['id']}/jobs?filter=all&per_page=100")
    result = [job for page in pages for job in page["jobs"]]
    (ROOT / f"run-{run['id']}-jobs.json").write_text(
        json.dumps(result, indent=2) + "\n"
    )
    return result


def collect(number, branch):
    pages = gh_api(f"actions/runs?branch={branch}&per_page=100")
    runs = [run for page in pages for run in page["workflow_runs"]]
    (ROOT / f"pr-{number}-runs.json").write_text(json.dumps(runs, indent=2) + "\n")
    with ThreadPoolExecutor(max_workers=3) as pool:
        all_jobs = list(pool.map(jobs, runs))
    jobs_by_run = {run["id"]: group for run, group in zip(runs, all_jobs)}
    minutes = sum(
        max(0, (stamp(job["completed_at"]) - stamp(job["started_at"])).total_seconds())
        / 60
        for group in all_jobs
        for job in group
        if job.get("started_at")
        and job.get("completed_at")
        and job["conclusion"] != "skipped"
    )
    commits = {}
    for run in runs:
        if run["event"] == "pull_request":
            commits.setdefault(run["head_sha"], []).append(run)
    greens = []
    for sha, group in commits.items():
        native = [
            run for run in group if run["name"] in LANGUAGES or run["name"] == "CI"
        ]
        covered = {run["name"] for run in native}
        summaries = {"JavaScript", "Rust", "Python", "Java", "Go", "CSharp", "PHP"}
        unified = any(
            summaries <= {job["name"] for job in jobs_by_run[run["id"]]}
            for run in native
        )
        legacy_tested = LANGUAGES <= covered and all(
            any(
                "test" in job["name"].lower() and job["conclusion"] == "success"
                for job in jobs_by_run[run["id"]]
            )
            for run in native
        )
        # GitHub can display a workflow's old default-branch name until merge.
        if (unified or legacy_tested) and all(
            run["conclusion"] == "success" for run in native
        ):
            greens.append((max(stamp(run["updated_at"]) for run in native), sha))
    first = min(
        (stamp(run["created_at"]) for run in runs if run["event"] == "pull_request"),
        default=None,
    )
    first_green = min(greens, default=None)
    result = {
        "pr": number,
        "branch": branch,
        "runs": len(runs),
        "pull_request_commits": len(commits),
        "native_workflow_runs": sum(
            run["name"] in LANGUAGES or run["name"] == "CI" for run in runs
        ),
        "runner_wall_minutes": round(minutes, 3),
        "first_run": first.isoformat() if first else None,
        "first_green": first_green[0].isoformat() if first_green else None,
        "first_green_sha": first_green[1] if first_green else None,
        "time_to_first_green_minutes": (
            round((first_green[0] - first).total_seconds() / 60, 3)
            if first_green and first
            else None
        ),
        "conclusions": {
            value: sum((run["conclusion"] or "pending") == value for run in runs)
            for value in sorted({run["conclusion"] or "pending" for run in runs})
        },
    }
    (ROOT / f"pr-{number}-metrics.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("number", type=int)
    parser.add_argument("branch")
    args = parser.parse_args()
    collect(args.number, args.branch)
