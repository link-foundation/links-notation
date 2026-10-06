# Investigation log — issue #330 / pull request #331

Evidence and analysis collected while working on
[link-foundation/links-notation#330](https://github.com/link-foundation/links-notation/issues/330)
("Check for all false positives, false negatives, warnings and errors in CI/CD and fix them all").

`dev/log/**` is re-included by `.gitignore` (`!dev/log/**`), so everything here is committed.

| Path | Contents |
| --- | --- |
| `analysis/` | the written analysis (reading order below), plus extracted data |
| `ci-logs/` | full logs of every run examined, downloaded with `gh run view --log`; `ids.txt` and `recent-runs-main.json` list them |
| `templates/` | snapshots of `.github/`, `scripts/` and top-level config of the seven pipeline templates, and `COMPARISON.md` |
| `upstream/` | the bodies of the issues filed against the templates, and `URLS.txt` with where they landed |
| `issue/`, `pr/` | the issue and pull request as JSON at the time of the investigation |

Nothing under `templates/` was executed. The two lychee fixtures there were renamed to
`lychee-report.md.txt`, because they contain deliberately broken links and this repository's link
checker scans every `*.md` file.

## Reading order

1. [`analysis/TIMELINE.md`](analysis/TIMELINE.md) — what failed on `main`, in order.
2. [`analysis/ROOT-CAUSES.md`](analysis/ROOT-CAUSES.md) — every error, warning, false positive and
   false negative found, each with its evidence, root cause and fix.
3. [`analysis/REQUIREMENTS.md`](analysis/REQUIREMENTS.md) — every requirement in the issue, mapped to
   what was done.
4. [`analysis/BEST-PRACTICES-COMPLIANCE.md`](analysis/BEST-PRACTICES-COMPLIANCE.md) — this repository
   against the sixteen principles of the hive-mind CI/CD document.
5. [`templates/COMPARISON.md`](templates/COMPARISON.md) — the seven templates compared question by
   question against the defects found here.
6. [`analysis/UPSTREAM.md`](analysis/UPSTREAM.md) — what was reported where, what was already known
   upstream, and what only a maintainer can do.
7. [`analysis/PRIOR-ART.md`](analysis/PRIOR-ART.md) — existing tools and documentation consulted.

## Supporting data

| File | What it is |
| --- | --- |
| `analysis/annotations.txt` | every `##[error]`, `##[warning]` and `##[notice]` annotation in the examined `main` runs, counted |
| `analysis/warnings.txt` | non-annotation warnings (deprecations, extractor noise) grepped from the same logs |
| `analysis/run-history.txt` | the last 40 runs on `main` |
