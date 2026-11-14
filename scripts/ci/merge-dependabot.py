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
request that fell behind is brought up to date per run with
DEPENDABOT_AUTO_MERGE_TOKEN through `gh pr update-branch --rebase`. A branch
update made with GITHUB_TOKEN would start CI runs that wait for a
maintainer's approval, so it is never used. Without a usable token the
behind pull requests are named in a warning instead (issue #410): an
`@dependabot rebase` comment posted with GITHUB_TOKEN comes from
github-actions[bot], and Dependabot rejects it with "Sorry, only users with
push access can use that command." A request a maintainer posted, and that
Dependabot did not reject, is waited for.

A Dependabot pull request that the base branch has overtaken, because the
base already has every version it sets or a newer one (issue #410: #396 and
#407 stayed open after #408 had moved main past them), is closed with a
comment that names the versions. Anything that cannot be compared keeps it
open, so a pull request is never closed on a guess.

A merge made with GITHUB_TOKEN starts no push workflow on the base branch
(issue #377: main went unchecked after such merges). After one, the script
dispatches the workflows that push would have started, honouring their
`paths` filters, which workflow_dispatch ignores. CI's release job runs only
on a push, so a dispatched run checks main without publishing; Dependabot
updates change no package version, so there is nothing new to publish.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from urllib.parse import quote

DEPENDABOT = "dependabot[bot]"
AUTOMATIC = {"version-update:semver-minor", "version-update:semver-patch"}
PASSED = {"success", "neutral", "skipped"}
REBASE = "@dependabot rebase"
# Comments that ask Dependabot to bring its branch up to date.
UPDATE_COMMANDS = {REBASE, "@dependabot recreate"}
# Dependabot's answer to a command from someone without push access.
REJECTED = "only users with push access"
# GITHUB_TOKEN comments come from this account, which has no push access.
ACTIONS_BOT = "github-actions[bot]"

# The workflows a push to the base branch starts, with their push `paths`
# filters (None: every push). The tests compare this with .github/workflows.
PUSH_WORKFLOWS = {
    "js.yml": None,
    "dependencies.yml": None,
    "bom-check.yml": None,
    "workflows.yml": [
        ".github/**",
        "scripts/ci/**",
        "experiments/issue-350/**",
        "experiments/issue-410/**",
        "experiments/issue-192/**",
        "experiments/issue-377/test_rerun_unacquired.py",
        "experiments/issue-377/test_nuget_publish.py",
    ],
    "links.yml": [
        "**.md",
        ".lycheeignore",
        "lychee.toml",
        ".github/workflows/links.yml",
        "experiments/issue-339/test_github_blob_remap.py",
    ],
    "pages.yml": ["docs/**", ".github/workflows/pages.yml"],
}


def matches(path, pattern):
    """GitHub's paths filter: `**` crosses directories, `*` and `?` do not."""
    expression = ""
    for token in re.findall(r"\*\*|\*|\?|[^*?]+", pattern):
        expression += {"**": ".*", "*": "[^/]*", "?": "[^/]"}.get(
            token, re.escape(token)
        )
    return re.fullmatch(expression, path) is not None


def dispatches(files):
    """The push workflows that changing `files` on the base branch starts."""
    return [
        name
        for name, paths in PUSH_WORKFLOWS.items()
        if paths is None or any(matches(f, p) for f in files for p in paths)
    ]


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


# Lockfiles are regenerated with the manifest a pull request bumps, and most
# of their changed lines (hashes, resolved URLs, transitive entries) name no
# version the base branch could be compared with, so the manifest decides.
LOCKFILE = re.compile(
    r"(^|/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml"
    r"|bun\.lockb?|Cargo\.lock|uv\.lock|poetry\.lock|Pipfile\.lock|pdm\.lock"
    r"|composer\.lock|Gemfile\.lock|go\.sum|Package\.resolved|packages\.lock\.json"
    r"|gradle\.lockfile|[^/]*\.lockfile)$"
)
# Commit SHAs and checksums change with a version but do not order versions.
DIGEST = re.compile(r"\b[0-9a-fA-F]{32,}\b")
NUMBER = re.compile(r"\d+(?:\.\d+)*")


def shape(line):
    """(`line` with its versions blanked out, its versions as int tuples).

    `- uses: a/b@v6.1.0` and `uses: a/b@v6.2.0` share a shape, as do the
    last and the other entries of a JSON object (`"x": "1.0",`).
    """
    text = re.sub(r"^-\s+", "", line.strip()).rstrip(",").rstrip()
    text = DIGEST.sub("\x01", text)
    versions = [tuple(int(p) for p in n.split(".")) for n in NUMBER.findall(text)]
    return NUMBER.sub("\x00", text), versions


def at_least(have, want):
    """Whether every version in `have` is the one in `want` or newer."""
    for a, b in zip(have, want):
        width = max(len(a), len(b))
        if a + (0,) * (width - len(a)) < b + (0,) * (width - len(b)):
            return False
    return True


def added_lines(patch):
    """The lines a unified diff hunk (the API's `patch`) adds."""
    return [
        line[1:]
        for line in patch.splitlines()
        if line.startswith("+") and not line.startswith("+++")
    ]


def superseded(changes, contents):
    """(True, reason) when the base branch already has every version a pull
    request sets, or a newer one; (False, why not) otherwise.

    `changes` are the pull request's files, as the API lists them
    (`filename`, `status`, `patch`), and `contents` maps each compared
    file to its text on the base branch, None when it is not there. Every
    line the pull request adds outside its lockfiles must appear on the base
    branch in the same shape, with the same or newer versions on each such
    line there (one action pinned in several jobs: the oldest pin decides).
    A file without a patch, a line the base does not have, or a pull request
    that changes no version is not superseded.
    """
    compared, found = 0, {}
    for change in changes:
        path = change["filename"]
        if LOCKFILE.search(path):
            continue
        if change.get("patch") is None:
            return False, f"no diff for {path}"
        content = contents.get(path)
        if content is None:
            return False, f"{path} is not on the base branch"
        base = {}
        for line in content.splitlines():
            template, versions = shape(line)
            base.setdefault(template, []).append((versions, line.strip()))
        for line in added_lines(change["patch"]):
            if not line.strip():
                continue
            template, versions = shape(line)
            candidates = base.get(template)
            if not candidates:
                return False, f"{path} has no line like `{line.strip()}`"
            older = [text for have, text in candidates if not at_least(have, versions)]
            if older:
                return False, f"{path} still has `{older[0]}`"
            if versions:
                compared += 1
                oldest = min(candidates)[1]
                found.setdefault((oldest, line.strip()), []).append(path)
    if not compared:
        return False, "no version change to compare"
    parts = []
    for (have, want), paths in found.items():
        where = ", ".join(sorted(set(paths)))
        parts.append(
            f"`{have}`" + ("" if have == want else f" for `{want}`") + f" in {where}"
        )
    return True, "the base branch already has " + "; ".join(parts)


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
    rebase_rejected: bool = False
    superseded: str = ""


def foreign(pull):
    """Why `pull` is not Dependabot's alone to manage, or None."""
    if pull.author != DEPENDABOT or not pull.branch.startswith("dependabot/"):
        return "not opened by Dependabot"
    if pull.draft:
        return "draft"
    others = sorted({a for a in pull.commit_authors if a != DEPENDABOT})
    if others:
        return "has commits by " + ", ".join(others)
    return None


def ineligible(pull):
    """Why `pull` must not be merged automatically, or None."""
    reason = foreign(pull)
    if reason:
        return reason
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


BEHIND_NO_TOKEN = "behind; cannot be updated without DEPENDABOT_AUTO_MERGE_TOKEN"


def plan(pulls, required, strict, update=True):
    """The actions for one run:
    ("close" | "merge" | "rebase" | "skip", pull, reason).

    A superseded pull request is closed whatever its checks or update type.
    With `strict` (branches must be up to date) at most one pull request is
    merged, since the merge leaves every other one behind, and at most one
    is brought up to date, after the merge, so that its new checks are not
    outdated again by the time they finish. Without `update` (no token that
    can update a branch) behind pull requests are only reported.
    """
    decided = {}
    merged = False
    for pull in sorted(pulls, key=lambda p: p.number):
        if pull.superseded and not foreign(pull):
            decided[pull.number] = ("close", pull, pull.superseded)
            continue
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
        elif pull.rebase_requested and not merged:
            decided[pull.number] = ("skip", pull, "behind; update already requested")
        elif not update:
            decided[pull.number] = ("skip", pull, BEHIND_NO_TOKEN)
        elif rebased:
            decided[pull.number] = (
                "skip",
                pull,
                "behind; updated after the next merge",
            )
        else:
            decided[pull.number] = ("rebase", pull, "behind the base branch")
            rebased = True
    order = {"close": 0, "merge": 1, "rebase": 2, "skip": 3}
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

    def files(self, pull):
        output = self.run(
            "api", f"repos/{self.repository}/pulls/{pull.number}/files?per_page=100",
            "--paginate", "--jq", ".[].filename",
        )  # fmt: skip
        return output.splitlines()

    def behind(self, base, head):
        return self.api(f"compare/{base}...{head}")["behind_by"] > 0

    def update_request(self, pull):
        """`update_request` for `pull`'s comments since its head commit."""
        committed = self.api(f"commits/{pull.head}")["commit"]["committer"]["date"]
        output = self.run(
            "api", f"repos/{self.repository}/issues/{pull.number}/comments?per_page=100",
            "--paginate", "--jq", ".[] | @json",
        )  # fmt: skip
        comments = [json.loads(line) for line in output.splitlines()]
        return update_request(comments, committed)

    def changes(self, pull):
        """`pull`'s changed files: filename, status and patch."""
        output = self.run(
            "api", f"repos/{self.repository}/pulls/{pull.number}/files?per_page=100",
            "--paginate", "--jq", ".[] | {filename, status, patch} | @json",
        )  # fmt: skip
        return [json.loads(line) for line in output.splitlines()]

    def content(self, path, ref):
        """The text of `path` on `ref`, or None when it is not there."""
        try:
            return self.run(
                "api", f"repos/{self.repository}/contents/{quote(path)}?ref={quote(ref)}",
                "-H", "Accept: application/vnd.github.raw",
            )  # fmt: skip
        except RuntimeError as error:
            if "404" in str(error) or "Not Found" in str(error):
                return None
            raise

    def supersession(self, pull, base):
        """`superseded` for `pull` against `base`, read through the API."""
        changes = self.changes(pull)
        contents = {
            c["filename"]: self.content(c["filename"], base)
            for c in changes
            if not LOCKFILE.search(c["filename"]) and c.get("patch") is not None
        }
        return superseded(changes, contents)


def update_request(comments, since):
    """ "requested", "rejected" or None: the latest `@dependabot rebase` (or
    `recreate`) comment newer than `since`, and whether it can work.

    Dependabot answers a command from someone without push access with
    "Sorry, only users with push access can use that command." and does
    nothing; github-actions[bot] (GITHUB_TOKEN) never has push access, and
    Dependabot does not always answer it (issue #410), so its requests count
    as rejected either way.
    """
    state = None
    for comment in sorted(comments, key=lambda c: c["created_at"]):
        if comment["created_at"] <= since:
            continue
        login = (comment.get("user") or {}).get("login")
        body = comment["body"].strip()
        if body in UPDATE_COMMANDS:
            state = "rejected" if login == ACTIONS_BOT else "requested"
        elif login == DEPENDABOT and REJECTED in body and state == "requested":
            state = "rejected"
    return state


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
            "GITHUB_TOKEN, which cannot bring behind pull requests up to date."
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
        if foreign(pull):
            continue
        try:
            done, why = github.supersession(pull, args.base)
        except RuntimeError as error:
            done, why = False, f"could not compare with {args.base}: {error}"
            print(f"::warning::#{pull.number}: {why}")
        if done:
            pull.superseded = why
            continue
        if ineligible(pull):
            continue
        pull.checks = github.checks(pull.head)
        if strict:
            pull.behind = github.behind(args.base, pull.head)
            if pull.behind and not pat:
                request = github.update_request(pull)
                pull.rebase_requested = request == "requested"
                pull.rebase_rejected = request == "rejected"
    if not pulls:
        print("No open Dependabot pull requests.")
    failures = 0
    merged = []
    actions = plan(pulls, required, strict, update=bool(pat))
    for action, pull, reason in actions:
        print(f"#{pull.number} {action}: {reason}")
        if args.dry_run or action == "skip":
            continue
        try:
            if action == "close":
                github.run(
                    "pr", "close", str(pull.number), "--repo", github.repository,
                    "--comment", closing_comment(args.base, reason),
                )  # fmt: skip
            elif action == "merge":
                github.run(
                    "pr", "merge", str(pull.number), "--repo", github.repository,
                    "--merge", "--match-head-commit", pull.head, token=pat or None,
                )  # fmt: skip
                merged.append(pull)
            else:
                github.run(
                    "pr", "update-branch", str(pull.number),
                    "--repo", github.repository, "--rebase", token=pat,
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
    behind = [p for _, p, reason in actions if reason == BEHIND_NO_TOKEN]
    if behind:
        print(not_updated(args.base, behind))
    if merged and not pat:
        failures += dispatch(github, args.base, merged)
    return 1 if failures else 0


def closing_comment(base, reason):
    return (
        f"Closing as superseded: {reason}, so `{base}` already has every "
        "version this pull request sets, or a newer one.\n\n"
        "Closed by the auto-merge workflow (`scripts/ci/merge-dependabot.py`, "
        "issue #410). Reopen it if that is wrong."
    )


def not_updated(base, pulls):
    """The warning for green pull requests that stay behind without a token.

    An `@dependabot rebase` comment is not posted for them: with GITHUB_TOKEN
    it comes from github-actions[bot], which Dependabot always rejects.
    """
    numbers = ", ".join(f"#{p.number}" for p in pulls)
    rejected = [f"#{p.number}" for p in pulls if p.rebase_rejected]
    return (
        f"::warning::{numbers} {'is' if len(pulls) == 1 else 'are'} behind "
        f"{base}, which requires up-to-date branches, and cannot be brought up "
        "to date: DEPENDABOT_AUTO_MERGE_TOKEN is not set or cannot push. "
        "Dependabot rejects an `@dependabot rebase` comment from GITHUB_TOKEN "
        '("Sorry, only users with push access can use that command."), so none '
        "is posted"
        + (f" (rejected before on {', '.join(rejected)})" if rejected else "")
        + ". Store a token with the repo and workflow scopes in the "
        "DEPENDABOT_AUTO_MERGE_TOKEN Actions secret, or comment "
        "`@dependabot rebase` on them as a maintainer with push access."
    )


def dispatch(github, base, merged):
    """Start the push workflows the GITHUB_TOKEN merges of `merged` did not."""
    workflows, failures = [], 0
    try:
        for pull in merged:
            for name in dispatches(github.files(pull)):
                if name not in workflows:
                    workflows.append(name)
    except RuntimeError as error:
        # Dispatching too much is safer than leaving main unchecked.
        print(f"::warning::Listing the merged files failed ({error}); dispatching all.")
        workflows = list(PUSH_WORKFLOWS)
    print(
        f"::notice::GITHUB_TOKEN merges start no push workflows; dispatching "
        f"{', '.join(workflows)} on {base}."
    )
    for name in workflows:
        try:
            github.run(
                "workflow", "run", name, "--repo", github.repository, "--ref", base
            )
        except RuntimeError as error:
            print(
                f"::error::Dispatching {name} on {base} failed: {error}. Run "
                f"`gh workflow run {name} --ref {base}` by hand, or store a token "
                "with the repo and workflow scopes in DEPENDABOT_AUTO_MERGE_TOKEN."
            )
            failures += 1
    return failures


if __name__ == "__main__":
    sys.exit(main())
