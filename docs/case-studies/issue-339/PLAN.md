# Issue 339 work plan

- [x] Read issue 339, router issue 759, all PR 341 comment types, recent related
      PRs, and repository CI/release conventions.
- [x] Preserve issue/PR metadata, recent main/branch runs, completed CI logs,
      registry responses, and branch protection state under this case study;
      keep command logs in `ci-logs/`.
- [x] Reconstruct the timeline, enumerate every requirement/finding, identify
      causes, and compare supported orchestration/publishing components using
      primary documentation.
- [x] Add failing regression tests for ungated workflows, skipped Java
      publishing, missing parity evidence, and shared fixture validation before
      implementing fixes.
- [x] Introduce a single CI entry workflow with unconditional JS
      lint/test/parity, same-commit reusable language workflows, protected
      release conditions, an all-seven-native publication barrier, and queued
      per-branch concurrency.
- [x] Audit every other workflow (security, binary interop, benchmarks, docs)
      for non-JS execution and gate applicable jobs.
- [x] Add a validated feature manifest, shared parser/formatter fixtures, all
      seven language runners, and explicit documented exceptions for existing
      JS-only APIs.
- [x] Correct Java Central publishing and registry audits; verify public
      versions or record concrete credential/namespace blockers and visible
      failed release behavior.
- [x] Review PRs 204, 185, 170, 167, 80, and 76 thoroughly; document and execute
      evidence-based disposition without losing unique features.
- [x] Add contributor/agent docs, changelog fragments, release/version triggers,
      and JS-first/local resource rules.
- [x] Run all relevant local checks, keep bounded Rust build settings, commit
      useful atomic steps on the prepared branch, and preserve test/experiment
      scripts.
- [x] Configure and verify main's required-check ruleset after final check names
      are concrete.
- [x] Wait for active runs before pushing; push only `issue-339-12b617cefd5b`;
      collect every failure from the latest SHA before any subsequent push.
- [x] Download and inspect fresh failing CI logs, fix actual failures, and wait
      for completed checks.
- [x] Preserve optional Go coverage credentials, reproduce GitHub HTML 503s
      with bounded probes, validate the raw-content remap, and contribute the
      finite retry reproduction to the existing upstream discussion.
- [x] Reproduce PHP distribution discovery failure, add root Composer metadata
      and same-commit version tags, and verify actual offline installation and
      autoloading with regression coverage.
- [x] Record before/after run counts, runner minutes, time to first green,
      per-language results, and limitations without invented measurements.
- [x] Confirm current default branch is included, review the complete PR diff
      for regressions, update the reviewable PR title/body, and commit all work.

The final head must finish CI before PR 341 is marked ready. That last status
change and final clean-tree verification are recorded on the linked PR; the
measurement snapshot stops at the first fully green implementation commit.

All work is tracked in PR
<https://github.com/link-foundation/links-notation/pull/341>.
