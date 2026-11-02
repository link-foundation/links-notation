#!/usr/bin/env python3
"""Re-run the jobs of a CI run that no hosted runner ever picked up.

Issue #377: on main, `kotlin / ios` (runs-on: macos-26) waited 37 minutes and
was then cancelled with "The job was not acquired by Runner of type hosted
even after multiple attempts" while GitHub reported "Due to capacity
constraints, jobs targeting macOS arm64 runners may experience longer queue
times" (run 41477660740). The job never ran a step, yet the run failed, the
release job was skipped, and nothing was published.

Such a job says nothing about the code, so it is re-run with
`gh run rerun --failed`, which also re-runs the jobs that were skipped
because of it (the release among them). Only runs whose failure includes a
job with that annotation are re-run, at most until MAX_ATTEMPTS attempts. A
job that failed for any other reason is never the trigger. When the attempts
are used up the script fails with the command a maintainer can run later.
"""

import argparse
import json
import os
import subprocess
import sys

NOT_ACQUIRED = "was not acquired by Runner"
MAX_ATTEMPTS = 3


def unacquired(jobs, annotations):
    """Names of the jobs that were cancelled before any runner took them.

    `annotations` maps a job id to the messages of its check-run annotations.
    """
    return [
        job["name"]
        for job in jobs
        if job.get("conclusion") == "cancelled"
        and not job.get("steps")
        and any(NOT_ACQUIRED in message for message in annotations.get(job["id"], []))
    ]


def decide(names, attempt, max_attempts=MAX_ATTEMPTS):
    """Return "rerun", "give-up" or "nothing" for the run's latest attempt."""
    if not names:
        return "nothing"
    return "rerun" if attempt < max_attempts else "give-up"


def gh(*args):
    result = subprocess.run(["gh", *args], capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"gh {' '.join(args[:2])}: {result.stderr.strip()}")
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repository", required=True)
    parser.add_argument("--run-id", required=True, type=int)
    parser.add_argument("--attempt", required=True, type=int)
    parser.add_argument("--max-attempts", type=int, default=MAX_ATTEMPTS)
    parser.add_argument("--dry-run", action="store_true")
    options = parser.parse_args()
    verbose = os.environ.get("CI_VERBOSE") == "true"
    run = f"repos/{options.repository}/actions/runs/{options.run_id}"

    pages = json.loads(
        gh("api", "--paginate", "--slurp", f"{run}/attempts/{options.attempt}/jobs?per_page=100")
    )
    jobs = [job for page in pages for job in page["jobs"]]
    annotations = {}
    for job in jobs:
        if job.get("conclusion") == "cancelled" and not job.get("steps"):
            found = json.loads(
                gh("api", f"repos/{options.repository}/check-runs/{job['id']}/annotations")
            )
            annotations[job["id"]] = [item.get("message", "") for item in found]
            if verbose:
                print(f"{job['name']}: {annotations[job['id']]}")

    names = unacquired(jobs, annotations)
    verdict = decide(names, options.attempt, options.max_attempts)
    listed = ", ".join(names)
    if verdict == "nothing":
        print(f"Attempt {options.attempt}: every job reached a runner; nothing to re-run.")
    elif verdict == "give-up":
        print(
            f"::error::{listed} found no hosted runner in {options.attempt} attempts. "
            "GitHub's runner capacity is outside this repository: re-run it later with "
            f"`gh run rerun {options.run_id} --failed --repo {options.repository}`."
        )
        return 1
    else:
        print(
            f"::notice::{listed} found no hosted runner in attempt {options.attempt}; "
            "re-running the failed jobs and the jobs that waited for them."
        )
        if not options.dry_run:
            gh("run", "rerun", str(options.run_id), "--failed", "--repo", options.repository)
    return 0


if __name__ == "__main__":
    sys.exit(main())
