# Requirements of issue #377

Sources:

- the issue body (`../issue/issue-377.json`);
- its one comment (konard, 2026-11-02 16:50, `../issue/issue-377-comments.json`);
- the instructions given with the task.

The pull request had no review comments when this was written (`../pr/`).

| # | Requirement | Where it comes from | Done | Evidence |
| --- | --- | --- | --- | --- |
| R1 | Find every false positive, false negative, warning and error in the CI/CD runs on `main` | issue title, run table, comment | Yes | `ROOT-CAUSES.md` sections A, B, C and W; `../ci-logs/annotations-main-runs.tsv` (all 79 annotations in 7 runs); `warnings.txt` |
| R2 | Fix them all | issue title | Yes, except the items below | A1–A6, C1–C8, W1 and W9 are fixed. W2–W4 are upstream, with no stable fix to adopt. B1–B4 need a maintainer, and each now fails or warns with the remedy. |
| R3 | Compare the full file trees of the eight templates and reuse their best practices | issue body | Yes | `../templates/` (snapshots and `SHAS.txt`), `../templates/COMPARISON.md` (D1–D9), and the adoption table in `BEST-PRACTICES-COMPLIANCE.md` |
| R4 | If a template has the same problem, report it there | issue body | Yes | 12 issues in 8 templates, listed in `UPSTREAM.md` |
| R5 | Follow the hive-mind CI/CD best practices | issue body | Yes, with two documented gaps | `BEST-PRACTICES-COMPLIANCE.md`. P15 and P17 are fixed here; P2 and P16 are gaps, each with its reason. |
| R6 | Do everything in this one pull request | issue body | Yes | PR #378 |
| R7 | Download the logs and data into `./dev/log/issues/377/pulls/378` | task | Yes | `../ci-logs/` (50 files), `../issue/`, `../pr/`, `../templates/`, `../reference/` |
| R8 | Deep analysis: timeline, requirements, root causes, solutions | task | Yes | `TIMELINE.md`, this file, `ROOT-CAUSES.md` |
| R9 | Look for existing components that solve the problems | task | Yes | `PRIOR-ART.md` |
| R10 | Add debug output, off by default, where the root cause is unclear | task | Not needed: every root cause was found from existing logs | The CI, language, publish and release workflows already have a `verbose` input that is off by default. `experiments/issue-377/collect-annotations.sh` re-collects the annotations of any run. `experiments/issue-377/kgp-named-enum` reproduces W3 with `--warning-mode all`. |
| R11 | Report upstream problems, each with a reproduction, a workaround and a code fix | task | Yes, except one that is blocked | dependabot-core#16797 and #16798, gradle#39685, a comment on ktlint-gradle#944, and download-artifact#484 (already reported). **Blocked:** the Kotlin YouTrack report (see `UPSTREAM.md`). |
| R12 | Apply each fix everywhere the same problem occurs | task | Yes | A1 and A2 in all ten bindings. The Maven range in both `pom.xml` files. Audits over every npm lock plus the yarn lock. The release-audit fix covers all ten registries. |
| R13 | A check that needs a human must pass on the PR and fail on `main` with an explicit message | task | Yes | B1: the publish jobs run only on `main`, and each fails with the remedy. B2–B4 are warnings or notices that name the remedy. |

## Left for a maintainer

These cannot be done from a pull request:

1. NuGet: set up trusted publishing for `publish-csharp.yml` and set the variable `NUGET_USER`, or
   renew `NUGET_API_KEY`.
2. Maven Central (Java and Kotlin): add `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY` and
   `GPG_PASSPHRASE`.
3. Packagist: submit the package, then add `PACKAGIST_USERNAME` and `PACKAGIST_TOKEN`.
4. Renew `DEPENDABOT_AUTO_MERGE_TOKEN`.
5. Optional: a PyPI trusted publisher with `PYPI_TRUSTED_PUBLISHING=true`, and `CODECOV_TOKEN`.
6. File the Kotlin YouTrack issue from the draft in `../upstream/third-party/`.
