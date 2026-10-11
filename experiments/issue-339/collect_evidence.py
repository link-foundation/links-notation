"""Preserve authenticated GitHub evidence without collecting secret values."""

import gzip
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = "link-foundation/links-notation"
ROOT = Path("docs/case-studies/issue-339/data")
ROOT.mkdir(parents=True, exist_ok=True)


def gh(*args):
    return subprocess.check_output(["gh", *args], text=True)


def save(name, *args):
    data = gh(*args)
    (ROOT / name).write_text(data)
    return json.loads(data)


def collect_pr(number):
    save(
        f"pr-{number}.json",
        "pr",
        "view",
        str(number),
        "--repo",
        REPO,
        "--json",
        "number,title,body,state,createdAt,updatedAt,mergedAt,headRefName,baseRefName,mergeable,commits,files,url",
    )
    for endpoint in (
        f"pulls/{number}/comments",
        f"issues/{number}/comments",
        f"pulls/{number}/reviews",
    ):
        kind = "inline" if endpoint.startswith("pulls") else "conversation"
        save(
            f"pr-{number}-{endpoint.split('/')[-1]}-{kind}.json",
            "api",
            f"repos/{REPO}/{endpoint}",
            "--paginate",
        )
    try:
        (ROOT / f"pr-{number}.diff").write_text(
            gh("pr", "diff", str(number), "--repo", REPO)
        )
    except subprocess.CalledProcessError as error:
        (ROOT / f"pr-{number}-diff-unavailable.txt").write_text(str(error))
    print(f"Preserved PR {number}", flush=True)


def collect_run(run):
    number = str(run["databaseId"])
    save(
        f"run-{number}.json",
        "run",
        "view",
        number,
        "--repo",
        REPO,
        "--json",
        "jobs,headSha,createdAt,updatedAt,startedAt,conclusion,event,workflowName,url",
    )
    if run["status"] == "completed":
        try:
            log = gh("run", "view", number, "--repo", REPO, "--log")
            with gzip.open(ROOT / f"run-{number}.log.gz", "wt") as target:
                target.write(log)
            findings = [
                f"{i}: {line}"
                for i, line in enumerate(log.splitlines(), 1)
                if any(
                    term in line.lower()
                    for term in (
                        "##[error]",
                        "##[warning]",
                        "skipping maven",
                        "published=failed",
                        "outdated ",
                    )
                )
            ]
            (ROOT / f"run-{number}-findings.txt").write_text("\n".join(findings) + "\n")
        except subprocess.CalledProcessError as error:
            (ROOT / f"run-{number}-log-unavailable.txt").write_text(str(error))
    print(
        f"Preserved run {number}: {run['workflowName']} {run['conclusion']}", flush=True
    )


if __name__ == "__main__":
    fields = "databaseId,workflowName,status,conclusion,createdAt,updatedAt,headSha,event,url"
    main = save(
        "main-runs-before.json",
        "run",
        "list",
        "--repo",
        REPO,
        "--branch",
        "main",
        "--limit",
        "100",
        "--json",
        fields,
    )
    branch = save(
        "branch-runs-before.json",
        "run",
        "list",
        "--repo",
        REPO,
        "--branch",
        "issue-339-12b617cefd5b",
        "--limit",
        "100",
        "--json",
        fields,
    )
    save("releases-before.json", "api", f"repos/{REPO}/releases", "--paginate")
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(
            pool.map(collect_pr, [204, 185, 170, 167, 80, 76, 331, 335, 336, 337, 341])
        )
        latest = {}
        for run in main:
            latest.setdefault(run["workflowName"], run)
        list(pool.map(collect_run, [*latest.values(), *branch]))
