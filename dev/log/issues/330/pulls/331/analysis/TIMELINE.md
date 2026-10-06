# Timeline

All times UTC. Run IDs link to `https://github.com/link-foundation/links-notation/actions/runs/<id>`;
the full logs are in `../ci-logs/<workflow>-<id>.log`.

## Before the issue

| When | What | Evidence |
| --- | --- | --- |
| 2026-09-29 00:01 | `7cbc162` (merge of PR #319) becomes the tip of `main`; it stays the tip for a week. | `git log` |
| 2026-09-29 23:45 | GitHub publishes three advisories against `brace-expansion` 4.0.0–5.0.11: GHSA-qhr7-859c-m2p7 (high), GHSA-6j4f-fj2g-mc7p (high), GHSA-q2hr-2g5m-vwhr (medium). | `gh api /advisories/<id>` |
| 2026-10-05 14:15 | Scheduled **security** run 37323195458 fails: `npm audit --package-lock-only --audit-level=high` in `js` and `docs/website`. Nothing in the repository changed; the advisory did. | `security-37323195458.log` |
| 2026-10-05 14:58 | Scheduled **links** run 37329071552 fails: 2068 links, 7 errors. Three come from `github.com/.../actions?workflow=...` badge links (one 429, two 502), and four are `503`s from codefactor.io badges. lychee itself prints the hint to add a `[hosts."github.com"]` section. It never retried the 5xx answers. | `links-37329071552.log` |
| 2026-10-05 17:39 | trufflehog v3.98.0 released. | GitHub releases API |
| 2026-10-05 22:44–22:45 | Dependabot PRs #327 (eslint) and #328 (`brace-expansion` 5.0.12 in `docs/website`) merged. | `gh pr list --state merged` |
| 2026-10-06 11:57 | trufflehog v3.98.1 released. | GitHub releases API |

## The push that the issue reports (`b5af650`, merge of PR #326)

| When | What | Evidence |
| --- | --- | --- |
| 15:16:49 | 17 workflows start on `b5af650`. | `recent-runs-main.json` |
| ~15:17 | **dependency freshness** 37486124184 fails: `OUTDATED .github/workflows/security.yml: trufflesecurity/trufflehog v3.98.0 -> v3.98.1`. | `dependency-freshness-37486124184.log` |
| 15:18:54–15:19:54 | **python** publishes 0.23.0; PyPI serves it on the 5th of 10 polls (~75 s into a 150 s window). Green, but with half the margin gone. | `python-37486124196.log` |
| 15:18:59 | **js** publishes `links-notation@0.23.0` (`+ links-notation@0.23.0`). | `js-37486124040.log` |
| 15:19:00–15:21:17 | The js verify loop polls npm 10 × 15 s, gets 404 every time and fails the job: `links-notation@0.23.0 on npm was not visible ... after 10 attempts`. `publishRelease` is skipped, so no `js_0.23.0` GitHub release. | `js-37486124040.log` |
| 15:19:32 | **csharp** pushes `Link.Foundation.Links.Notation.0.23.0.nupkg`. | `csharp-37486124083.log` |
| 15:20:55 | **csharp** `generatePdfWithCode` fails: `! LaTeX Error: Unicode character 😀 (U+1F600)`, followed by the same error for `世` (U+4E16) from a CJK test string. | `csharp-37486124083.log` |
| 15:23:08 | npm's packument records `0.23.0` as published, 4 min 9 s after the upload. | `https://registry.npmjs.org/links-notation` → `time["0.23.0"]` |
| 15:26:34 | NuGet serves 0.23.0 on attempt 15 of 20 (7 min 1 s into a 10 min window). Green, with 30 % margin. | `csharp-37486124083.log` |
| post steps | **rust** `publishToCratesIO` succeeds, then rust-cache's post step prints four `##[error]ENOENT ... tests/target / tests/trybuild` lines on the green job. | `rust-37486124161.log` |
| — | Green runs carry warnings: PEG0021/PEG0022 from the C# grammar, three setup-java deprecations, setup-go "Restore cache failed", CodeQL extraction noise from `experiments/`, `dev/log/` and `benchmarks/java`. | `annotations.txt`, `warnings.txt` |
| 17:44 | trufflehog v3.99.0 released. | GitHub releases API |

## The push the issue was generated from (`0585fcf`, merge of PR #329)

| When | What | Evidence |
| --- | --- | --- |
| 20:54:10 | Dependabot PR #329 (`brace-expansion` 5.0.12 in `js`) merged; together with #328 this clears the npm audit failure. | `gh pr list --state merged` |
| 20:54:13 | **dependency freshness** 37529950144 fails again: `trufflehog v3.98.0 -> v3.99.0`. **release-audit** 37529950165 passes, although `js_0.23.0` has no GitHub release (false negative). | `dependency-freshness-37529950144.log`, `release-audit-37529950165.log` |
| 20:55:17 | Issue #330 opened from the run table of these two pushes (19 runs, 3 not passing). | `../issue/issue-330.json` |

## This pull request

| Commit | Change |
| --- | --- |
| `ed6272d` | trufflehog action and scanner `version:` pinned to 3.99.0; the checker now also compares `version:` inputs. |
| `8790d23` | C# code PDF escapes characters pdfLaTeX cannot typeset. |
| `9a02947` | lychee: per-host limit for `github.com`, 429 accepted after retries. |
| `5187c7e` | npm/PyPI/NuGet verify windows sized from measured delays; release jobs also run on `published=skipped`, so a missing GitHub release is backfilled. |
| `f2165be` | release-audit warns when a published version has no GitHub release. |
| `a3a3a58` | setup-java `*-env-var` inputs; setup-go cache off where there is no `go.mod` at the root. |
| `c3504d8` | C# grammar fallback rewritten so Pegasus no longer reports PEG0021/PEG0022. |
| `bf9ccdc` | All runners pinned to `ubuntu-24.04`, with a guard against `-latest`. |
| `bb1b7fe` | CodeQL configuration excluding `experiments/`, `dev/log/`, `benchmarks/java`. |
| `1ebcb5c` | rust publish job deletes `target/package` before rust-cache saves, removing the four ENOENT error annotations. |
| `91fb37c` | This case study. |
| `c04967e` | links: when lychee fails, wait 120 s and check again, because lychee never retries a 5xx answer. |

The CI runs on `bb1b7fe` confirm the CodeQL change: the Rust "no manifest found" warnings and the
Java "POM ... is missing" warning are gone, and the C# extractor restores 7 projects instead of 18
(`../ci-logs/security-37534592831-bb1b7fe.log`). The release audit on the same commit now reports
`js: 0.23.0 is on npm, but the GitHub release js_0.23.0 is missing`
(`../ci-logs/release-audit-37534592929-bb1b7fe.log`).
