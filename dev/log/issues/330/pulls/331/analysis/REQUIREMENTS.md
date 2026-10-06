# Requirements

Every requirement in [issue #330](https://github.com/link-foundation/links-notation/issues/330) and
in the task that accompanied it, with its status. The issue has no comments. The pull request had
no comments or reviews at the time of writing.

## From the issue

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| R1 | Find **all errors** in CI/CD. | Done. Every red run on `main` since `7cbc162` traced and fixed: E1–E5. | `ROOT-CAUSES.md` |
| R2 | Find **all false positives**. | Done. lychee 429s (E2), npm verify timeout on a successful publish (E5), rust-cache ENOENT errors on a green job (P1). | `ROOT-CAUSES.md` |
| R3 | Find **all false negatives**. | Done. Unread trufflehog `version:` pin (E3); PDF job only on `main` (E4/N2); release never backfilled and audit reporting "in sync" (N1). | `ROOT-CAUSES.md` |
| R4 | Find **all warnings**. | Done. Every annotation in `annotations.txt` and every log warning in `warnings.txt` is either fixed (W1–W4, W9), tracked upstream (W5–W7), informational (W8), or needs a maintainer. | `ROOT-CAUSES.md` |
| R5 | Fix them all. | Done for everything this repository controls. What remains needs an upstream release or account access. | `UPSTREAM.md` |
| R6 | Compare the full file tree of all seven pipeline templates and reuse their best practices. | Done. `.github/`, `scripts/` and top-level config of all seven templates snapshotted and compared on ten questions. Practices adopted: per-host lychee limits, release backfill, `*-env-var` setup-java inputs, `cache: false` without `go.mod`. Practices not adopted are listed with reasons. | `../templates/COMPARISON.md`, `BEST-PRACTICES-COMPLIANCE.md` |
| R7 | Where a template has the same issue, report it there. | Done. Seven issues filed, one per template. | `UPSTREAM.md`, `../upstream/` |
| R8 | Follow the hive-mind CI/CD best practices. | Done. Checked against all sixteen principles; four gaps remain, each with a reason. | `BEST-PRACTICES-COMPLIANCE.md` |
| R9 | Do everything in this single pull request. | Done: PR #331. | |

## From the accompanying task

| # | Requirement | Status |
| --- | --- | --- |
| T1 | Download all logs and data into `dev/log/issues/330/pulls/331`. | Done. 30 logs, issue and PR JSON, template snapshots. |
| T2 | Deep analysis with online research. | Done. Advisory dates, registry timestamps, upstream source code (rust-cache `cleanup.ts`), npm's malware-scan announcement, existing upstream issues. |
| T3 | Reconstruct the timeline. | `TIMELINE.md` |
| T4 | List every requirement. | This file. |
| T5 | Root cause of each problem. | `ROOT-CAUSES.md` |
| T6 | Solutions and solution plans. | Implemented fixes are in `ROOT-CAUSES.md`. Deferred plans are in `BEST-PRACTICES-COMPLIANCE.md`. |
| T7 | Existing components and libraries. | `PRIOR-ART.md` |
| T8 | Add debug output or a verbose mode where data is insufficient, off by default. | Not needed for a new root cause: every problem here was diagnosable from the existing logs. The language workflows already have a `verbose` dispatch input and `CI_VERBOSE` (default `false`). The PDF job now also repeats LaTeX errors as annotations, so the next failure is visible without opening the log. |
| T9 | Report issues to other projects, with a reproduction, a workaround and a code fix. | Done for the templates. Third-party problems were already reported upstream; they are linked rather than duplicated. |
| T10 | Apply each fix everywhere it applies. | Done. Backfill in all six publishing workflows. Registry windows for every registry with a measured delay. Runner pin across all 67 jobs, with a guard. CodeQL config for all languages. setup-go cache in every workflow that uses setup-go. |
| T11 | Experiments in `./experiments`, examples in `./examples`. | `experiments/issue-330/test_pdf_unicode.py`, `experiments/issue-330/rust-cache-enoent.sh`, plus extended `experiments/issue-325/test_dependency_check.py`. No new user-facing example: nothing in the library's behaviour changed. |
| T12 | Bump the version if a release is triggered. | Not needed. No library source changed behaviour. The only source edit is the C# grammar's never-matching fallback (`c3504d8`), whose parse result is unchanged. Merging re-runs all seven language workflows, because their workflow files changed. They find 0.23.0 already published wherever it was published before: csharp, go, python and rust already have their releases, java and php still lack credentials or registration. Thanks to the backfill, js creates the missing `js_0.23.0` release. |
