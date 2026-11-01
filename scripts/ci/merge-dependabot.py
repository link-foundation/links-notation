#!/usr/bin/env python3
"""Merge open Dependabot minor and patch pull requests once their CI passes.

Issue #350: `gh pr merge --auto` failed on every Dependabot pull request,
because the repository does not allow auto-merge, and the
DEPENDABOT_AUTO_MERGE_TOKEN secret never reached the job: a `pull_request` run
that Dependabot triggers only receives Dependabot secrets, not Actions ones.
AutoMerge.yml now runs this script after CI finishes (`workflow_run`, which
has a writable GITHUB_TOKEN and the Actions secrets) and on a schedule.

A pull request is merged when
  * Dependabot opened it from a dependabot/ branch and wrote every commit,
  * every update in its commit metadata is a minor or patch update,
  * every status check the base branch's rules require passed on its head,
  * no other check on its head failed or is still running, and
  * it is up to date with the base branch, if the rules require that.

The merge pins the head commit (`--match-head-commit`), so a push after the
checks were read cannot be merged unchecked.

The rules on main require pull requests to be up to date, and Dependabot
only rebases a pull request that conflicts. After a merge, one green pull
request that fell behind is brought up to date per run: with
DEPENDABOT_AUTO_MERGE_TOKEN through `gh pr update-branch --rebase`, otherwise
by asking Dependabot with an `@dependabot rebase` comment. A branch update
made with GITHUB_TOKEN would start CI runs that wait for a maintainer's
approval, so it is never used.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field

DEPENDABOT = "dependabot[bot]"
AUTOMATIC = {"version-update:semver-minor", "version-update:semver-patch"}
PASSED = {"success", "neutral", "skipped"}
REBASE = "@dependabot rebase"


def major(version):
    match = re.match(r"v?(\d+)\.", version)
    return int(match[1]) if match else None


def update_types(message):
    """Update types in the YAML block Dependabot appends to its commits.

    Pre-commit and Docker updates carry no update-type, so for them the
    "from A to B" in the message decides: the same major version (as
    Dependabot counts it, 0.49 -> 0.50 is minor) is a minor update.
    """
    types = re.findall(r"^\s*update-type:\s*([\w:-]+)", message, re.M)
    if types:
        return types
    for old, new in re.findall(r"\bfrom (\S+) to (\S+?)\.?(?:\s|$)", message):
        before, after = major(old), major(new)
        if before is None or after is None:
            types.append("unknown:" + old + "->" + new)
        else:
            types.append(
                "version-update:semver-" + ("minor" if before == after else "major")
            )
    return types


@dataclass
class Pull:
    number: int
    head: str
    branch: str
    author: str
    draft: bool
    commit_authors: list
    message: str
    checks: dict = field(default_factory=dict)
    behind: bool = False
    rebase_requested: bool = False


def ineligible(pull):
    """Why `pull` must not be merged automatically, or None."""
    if pull.author != DEPENDABOT or not pull.branch.startswith("dependabot/"):
        return "not opened by Dependabot"
    if pull.draft:
        return "draft"
    others = sorted({a for a in pull.commit_authors if a != DEPENDABOT})
    if others:
        return "has commits by " + ", ".join(others)
    types = update_types(pull.message)
    if not types:
        return "no version change in the commit message"
    major = sorted(set(types) - AUTOMATIC)
    if major:
        return "needs review: " + ", ".join(major)
    return None


def check_state(checks, required):
    """("passed" | "pending" | "failed", detail) for a head's checks.

    `checks` maps a check or status name to its latest conclusion, or None
    while it runs. A required check that has not reported yet is pending.
    """
    failed = sorted(n for n, c in checks.items() if c is not None and c not in PASSED)
    if failed:
        return "failed", "failed: " + ", ".join(failed)
    missing = sorted(n for n in required if checks.get(n, None) is None)
    running = sorted(n for n, c in checks.items() if c is None)
    if missing or running:
        return "pending", "waiting for: " + ", ".join(sorted(set(missing + running)))
    return "passed", "all checks passed"


def plan(pulls, required, strict):
    """The actions for one run: ("merge" | "rebase" | "skip", pull, reason).

    With `strict` (branches must be up to date) at most one pull request is
    merged, since the merge leaves every other one behind, and at most one
    is brought up to date, after the merge, so that its new checks are not
    outdated again by the time they finish.
    """
    decided = {}
    merged = False
    for pull in sorted(pulls, key=lambda p: p.number):
        reason = ineligible(pull)
        if reason:
            decided[pull.number] = ("skip", pull, reason)
            continue
        state, detail = check_state(pull.checks, required)
        if strict and (pull.behind or merged):
            continue  # decided below
        if state == "passed":
            decided[pull.number] = ("merge", pull, detail)
            merged = True
        else:
            decided[pull.number] = ("skip", pull, detail)
    rebased = False
    for pull in sorted(pulls, key=lambda p: p.number):
        if pull.number in decided:
            continue
        # Updating the branch reruns every check, so only a failed required
        # check (a real problem with the update) or a running one stops it.
        gate, detail = check_state(
            {n: c for n, c in pull.checks.items() if n in required or c is None},
            required,
        )
        if gate != "passed":
            decided[pull.number] = ("skip", pull, "behind; " + detail)
        elif rebased:
            decided[pull.number] = (
                "skip",
                pull,
                "behind; updated after the next merge",
            )
        elif pull.rebase_requested and not merged:
            decided[pull.number] = ("skip", pull, "behind; update already requested")
        else:
            decided[pull.number] = ("rebase", pull, "behind the base branch")
            rebased = True
    order = {"merge": 0, "rebase": 1, "skip": 2}
    return sorted(decided.values(), key=lambda a: (order[a[0]], a[1].number))


class GitHub:
    def __init__(self, repository, token):
        self.repository = repository
        self.token = token

    def run(self, *args, token=None):
        env = dict(os.environ, GH_TOKEN=token or self.token)
        result = subprocess.run(
            ["gh", *args], capture_output=True, text=True, env=env, check=False
        )
        if result.returncode:
            raise RuntimeError(f"gh {args[0]} {args[1]}: {result.stderr.strip()}")
        return result.stdout

    def api(self, path, *args, token=None):
        url = "repos/" + self.repository + ("/" + path if path else "")
        output = self.run("api", url, *args, token=token)
        return json.loads(output) if output.strip() else None

    def rules(self, branch):
        required, strict = set(), False
        for rule in self.api("rules/branches/" + branch):
            if rule["type"] == "required_status_checks":
                parameters = rule["parameters"]
                required.update(
                    c["context"] for c in parameters["required_status_checks"]
                )
                strict = strict or parameters.get(
                    "strict_required_status_checks_policy", False
                )
        return required, strict

    def checks(self, sha):
        latest = {}
        output = self.run(
            "api",
            f"repos/{self.repository}/commits/{sha}/check-runs?per_page=100",
            "--paginate",
            "--jq",
            ".check_runs[] | [.id, .name, .status, .conclusion] | @json",
        )
        for line in output.splitlines():
            identifier, name, status, conclusion = json.loads(line)
            if name not in latest or identifier > latest[name][0]:
                latest[name] = (
                    identifier,
                    conclusion if status == "completed" else None,
                )
        checks = {name: conclusion for name, (_, conclusion) in latest.items()}
        statuses = self.api(f"commits/{sha}/status")["statuses"]
        for status in statuses:
            state = status["state"]
            checks[status["context"]] = None if state == "pending" else state
        return checks

    def pulls(self, base):
        output = self.run(
            "pr", "list", "--repo", self.repository, "--state", "open",
            "--base", base, "--author", "app/dependabot", "--limit", "200",
            "--json", "number,headRefOid,headRefName,author,isDraft",
        )  # fmt: skip
        pulls = []
        for item in json.loads(output):
            # gh names apps app/<slug>; commits carry the bot's login.
            login = item["author"]["login"]
            pulls.append(
                Pull(
                    number=item["number"],
                    head=item["headRefOid"],
                    branch=item["headRefName"],
                    author=DEPENDABOT if login == "app/dependabot" else login,
                    draft=item["isDraft"],
                    commit_authors=[],
                    message="",
                )
            )
        return pulls

    def commits(self, pull):
        """Fill in who wrote `pull`'s commits and its head commit message."""
        commits = self.api(f"pulls/{pull.number}/commits?per_page=100")
        pull.commit_authors = [
            (c.get("author") or {}).get("login") or c["commit"]["author"]["email"]
            for c in commits
        ]
        pull.message = next(
            (c["commit"]["message"] for c in commits if c["sha"] == pull.head), ""
        )

    def behind(self, base, head):
        return self.api(f"compare/{base}...{head}")["behind_by"] > 0

    def rebase_requested(self, pull):
        """Whether an `@dependabot rebase` request is newer than the head."""
        committed = self.api(f"commits/{pull.head}")["commit"]["committer"]["date"]
        comments = self.api(f"issues/{pull.number}/comments?per_page=100")
        return any(
            c["body"].strip() == REBASE and c["created_at"] > committed
            for c in comments
        )


def usable(github, token):
    """Whether `token` can push to the repository (an expired PAT cannot)."""
    try:
        return bool(
            github.api("", "--jq", "{push: .permissions.push}", token=token)["push"]
        )
    except (RuntimeError, TypeError, KeyError):
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default="main")
    parser.add_argument(
        "--dry-run", action="store_true", help="print the plan, change nothing"
    )
    args = parser.parse_args()
    github = GitHub(os.environ["GITHUB_REPOSITORY"], os.environ["GITHUB_TOKEN"])
    pat = os.environ.get("DEPENDABOT_AUTO_MERGE_TOKEN", "")
    if pat and not usable(github, pat):
        print(
            "::warning::DEPENDABOT_AUTO_MERGE_TOKEN cannot push to this repository "
            "(expired or missing the repo scope); merging with GITHUB_TOKEN instead. "
            "Merges by GITHUB_TOKEN do not start the push workflows on main."
        )
        pat = ""
    elif not pat:
        print(
            "::notice::DEPENDABOT_AUTO_MERGE_TOKEN is not set: merging with "
            "GITHUB_TOKEN and asking Dependabot to rebase behind pull requests."
        )
    required, strict = github.rules(args.base)
    print(
        f"{args.base} requires {', '.join(sorted(required)) or 'no checks'}"
        + (" on an up-to-date branch." if strict else ".")
    )
    pulls = github.pulls(args.base)
    for pull in pulls:
        if pull.author == DEPENDABOT:
            github.commits(pull)
        if ineligible(pull):
            continue
        pull.checks = github.checks(pull.head)
        if strict:
            pull.behind = github.behind(args.base, pull.head)
            if pull.behind and not pat:
                pull.rebase_requested = github.rebase_requested(pull)
    if not pulls:
        print("No open Dependabot pull requests.")
    failures = 0
    for action, pull, reason in plan(pulls, required, strict):
        print(f"#{pull.number} {action}: {reason}")
        if args.dry_run or action == "skip":
            continue
        try:
            if action == "merge":
                github.run(
                    "pr", "merge", str(pull.number), "--repo", github.repository,
                    "--merge", "--match-head-commit", pull.head, token=pat or None,
                )  # fmt: skip
            elif pat:
                github.run(
                    "pr", "update-branch", str(pull.number),
                    "--repo", github.repository, "--rebase", token=pat,
                )  # fmt: skip
            else:
                github.run(
                    "pr", "comment", str(pull.number),
                    "--repo", github.repository, "--body", REBASE,
                )  # fmt: skip
        except RuntimeError as error:
            # Another run, or a person, may have merged or pushed meanwhile.
            print(f"::error::#{pull.number} {action} failed: {error}")
            if "workflow" in str(error) and not pat:
                print(
                    "GITHUB_TOKEN cannot change .github/workflows. Store a token "
                    "with the repo and workflow scopes in the "
                    "DEPENDABOT_AUTO_MERGE_TOKEN Actions secret, or merge "
                    f"#{pull.number} by hand."
                )
            failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
