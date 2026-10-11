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
      release conditions, and queued per-branch concurrency.
- [x] Audit every other workflow (security, binary interop, benchmarks, docs)
      for non-JS execution and gate applicable jobs.
- [x] Add a validated feature manifest, shared parser/formatter fixtures, all
      seven language runners, and explicit documented exceptions for existing
      JS-only APIs.
- [ ] Correct Java Central publishing and registry audits; verify public
      versions or record concrete credential/namespace blockers and visible
      failed release behavior.
- [x] Review PRs 204, 185, 170, 167, 80, and 76 thoroughly; document and execute
      evidence-based disposition without losing unique features.
- [x] Add contributor/agent docs, changelog fragments, release/version triggers,
      and JS-first/local resource rules.
- [x] Run all relevant local checks, keep bounded Rust build settings, commit
      useful atomic steps on the prepared branch, and preserve test/experiment
      scripts.
- [ ] Configure and verify main's required-check ruleset after final check names
      are concrete.
- [ ] Wait for active runs before pushing; push only `issue-339-12b617cefd5b`;
      collect every failure from the latest SHA before any subsequent push.
- [ ] Download and inspect fresh failing CI logs, fix actual failures, and wait
      for completed checks.
- [ ] Record before/after run counts, runner minutes, time to first green,
      per-language results, and limitations without invented measurements.
- [ ] Merge current default branch into the PR branch if needed, review the
      complete PR diff for regressions, update PR title/body, mark PR 341 ready,
      and verify clean git status.

All work is tracked in PR
<https://github.com/link-foundation/links-notation/pull/341>.
