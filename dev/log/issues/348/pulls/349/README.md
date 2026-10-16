# Investigation log — issue #348 / pull request #349

Evidence and analysis collected while working on
[link-foundation/links-notation#348](https://github.com/link-foundation/links-notation/issues/348)
("Update all dependencies in all languages to their latest versions").

`dev/log/**` is re-included by `.gitignore` (`!dev/log/**`), so everything here is committed.

| Path | Contents |
| --- | --- |
| `analysis/` | the written analysis (reading order below) |
| `data/before/`, `data/after/` | every declared dependency with its registry version, before and after the update, written by `experiments/issue-348/inventory.py` |
| `data/changes.md` | the two inventories joined, per ecosystem, written by `experiments/issue-348/changes.py` |
| `data/toolchains/` | endoflife.date answers for every toolchain and runner image, and the runner-images READMEs |
| `ci-logs/deps/` | local build, test, lint and gate logs of the update |
| `ci-logs/audit/` | the security audit of every ecosystem after the update |
| `upstream/` | the bodies of the reports filed upstream; [`upstream/README.md`](upstream/README.md) indexes every report |
| `reference/` | the hive-mind dependency-update practices the issue asks to follow, at the commit in `.sha` |
| `issue/`, `pr/` | the issue and pull request as JSON at the start of the work |

The copies of third-party documents end in `.md.txt`: they link to files that only exist in their
own repositories, and the links workflow checks every `*.md` file.

## Reading order

1. [`analysis/REQUIREMENTS.md`](analysis/REQUIREMENTS.md) — every requirement in the issue, and what
   was done for it.
2. [`data/changes.md`](data/changes.md) — every declared dependency, before, after and on its
   registry.
3. [`analysis/TOOLCHAINS.md`](analysis/TOOLCHAINS.md) — language, runtime and runner versions:
   floors, tested versions and why.
4. [`analysis/TRANSITIVE.md`](analysis/TRANSITIVE.md) — lockfile entries still behind their latest
   release, and the upstream range that holds each one back.
5. [`analysis/AUDITS.md`](analysis/AUDITS.md) — security advisories for the tree as it stands
   after the update.
6. [`analysis/DEFECTS.md`](analysis/DEFECTS.md) — defects the update uncovered in this repository.
7. [`upstream/README.md`](upstream/README.md) — what was reported where.
8. [`analysis/PRIOR-ART.md`](analysis/PRIOR-ART.md) — tools that solve parts of this problem, and
   why each was or was not used.

## Reproducing

```bash
# Inventory: every declared dependency against its registry (needs GH_TOKEN for GitHub releases).
GH_TOKEN=$(gh auth token) python3 experiments/issue-348/inventory.py /tmp/inventory
python3 experiments/issue-348/changes.py dev/log/issues/348/pulls/349/data

# The CI gates this pull request adds or extends.
GH_TOKEN=$(gh auth token) python3 scripts/ci/check-dependencies.py
python3 scripts/ci/check-dependabot.py
python3 experiments/issue-325/test_dependency_check.py
python3 experiments/issue-348/test_dependabot_check.py
```
