# Investigation log: issue #377 and pull request #378

This folder holds the evidence and analysis for
[link-foundation/links-notation#377](https://github.com/link-foundation/links-notation/issues/377),
"Check for all false positives, false negatives, warnings and errors in CI/CD and fix them all". The
work was done in [pull request #378](https://github.com/link-foundation/links-notation/pull/378).

`.gitignore` re-includes `dev/log/**` (`!dev/log/**`), so everything here is committed.

| Path | Contents |
| --- | --- |
| `analysis/` | The written analysis (reading order below) and data extracted from the logs. |
| `ci-logs/` | Logs and job JSON for every run examined, downloaded with `gh run view --log` and `gh api`. `recent-runs-main.json` and `ci-main-history.tsv` list the runs on `main`. `annotations-main-runs.tsv` holds every annotation. |
| `templates/` | Snapshots of `.github/`, `scripts/` and the top-level config of the eight pipeline templates, at the commits in `SHAS.txt`, plus `COMPARISON.md`. |
| `upstream/` | The bodies of the issues filed against the templates. `third-party/` holds the reports to other projects. `URLS.txt` says where each one landed. |
| `reference/` | The hive-mind `CI-CD-BEST-PRACTICES.md` at the commit that was assessed. |
| `issue/`, `pr/` | The issue, its comments, and the pull request (comments, reviews), as JSON at the time of the investigation. |

Nothing under `templates/` or `ci-logs/` was executed: it was only read. The two lychee fixtures in
the snapshots were renamed to `lychee-report.md.txt`, as in issue #330, because they list
deliberately dead links and this repository's link checker scans every `*.md` file.

## Reading order

1. [`analysis/TIMELINE.md`](analysis/TIMELINE.md): what failed on `main`, and in what order, and
   the commits that fixed it.
2. [`analysis/ROOT-CAUSES.md`](analysis/ROOT-CAUSES.md): every error (A), item that needs a
   maintainer (B), false positive or false negative (C), and warning (W), each with its evidence,
   root cause and fix.
3. [`analysis/REQUIREMENTS.md`](analysis/REQUIREMENTS.md): every requirement of the issue and the
   task, mapped to the evidence, plus what is left for a maintainer.
4. [`analysis/BEST-PRACTICES-COMPLIANCE.md`](analysis/BEST-PRACTICES-COMPLIANCE.md): this repository
   against the seventeen hive-mind principles, and which template practices were adopted.
5. [`templates/COMPARISON.md`](templates/COMPARISON.md): the eight templates compared against the
   defects found here (D1–D9).
6. [`analysis/UPSTREAM.md`](analysis/UPSTREAM.md): what was reported where, what was already known
   upstream, and what is blocked.
7. [`analysis/PRIOR-ART.md`](analysis/PRIOR-ART.md): existing tools and documentation consulted.

## Supporting data

| File | What it is |
| --- | --- |
| `analysis/warnings.txt` | Annotation counts by level and message, and warnings grepped from the logs (deprecations, JDK launcher warnings). |
| `analysis/run-history.txt` | The last 40 runs on `main`. |
| `ci-logs/annotations-main-runs.tsv` | All 79 annotations of the 7 examined `main` runs. Re-collect with `experiments/issue-377/collect-annotations.sh <run-id>…`. |
| `ci-logs/dependabot-alerts-open.tsv` | The Dependabot alerts that were open when the investigation started. |
