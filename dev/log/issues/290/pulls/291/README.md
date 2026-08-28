# Investigation log — issue #290 / pull request #291

Evidence and analysis collected while working on
[link-foundation/links-notation#290](https://github.com/link-foundation/links-notation/issues/290).

`dev/log/` is gitignored (`.gitignore` line 25, `[Ll]og/`), so the raw material stays local and only
the written analysis is committed, with `git add -f`:

| Path | Committed? | Contents |
| --- | --- | --- |
| `analysis/*.md`, `analysis/*.txt`, `analysis/*.json` | yes | the analysis below |
| `ci-logs/` | no (3.3 MB) | full logs of every run examined, downloaded with `gh run view --log` |
| `templates/` | no (376 KB) | snapshots of the `.github` tree of all seven pipeline templates |

## Reading order

1. [`analysis/TIMELINE.md`](analysis/TIMELINE.md) — what happened, in order, and why eight months of
   green builds hid it.
2. [`analysis/ROOT-CAUSES.md`](analysis/ROOT-CAUSES.md) — every finding, grouped by class, each
   naming the evidence file that proves it.
3. [`analysis/REQUIREMENTS.md`](analysis/REQUIREMENTS.md) — every requirement stated in the issue,
   mapped to a root cause, a plan and a status.
4. [`analysis/BEST-PRACTICES-COMPLIANCE.md`](analysis/BEST-PRACTICES-COMPLIANCE.md) — this
   repository against the thirteen principles of the hive-mind CI/CD document.
5. [`analysis/UPSTREAM.md`](analysis/UPSTREAM.md) — what was reported to other repositories, and
   what only a maintainer of this one can do.
6. [`analysis/PRIOR-ART.md`](analysis/PRIOR-ART.md) — existing tools and actions surveyed before
   writing anything by hand.

## Supporting evidence

| File | What it is |
| --- | --- |
| `analysis/CI-CD-BEST-PRACTICES.md` | local copy of the hive-mind document the issue points at |
| `analysis/run-history.txt` | `gh run list` output for the runs examined |
| `analysis/warnings.txt`, `analysis/other-warnings.txt` | every warning extracted from the logs |
| `analysis/secrets.txt` | inventory of configured secret **names** (never values) |
| `analysis/registry-state.txt`, `analysis/npm-versions.txt`, `analysis/nuget-versions.json` | what each registry actually holds, versus what the repository declares |
