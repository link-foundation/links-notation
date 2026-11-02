# A macOS job that never gets a hosted runner fails the release gate and is never retried

Target repository: link-foundation/js-ai-driven-development-pipeline-template (checked at HEAD c2463c7). There were no open issues when this was drafted. Closed issues on related topics: none.

## Problem

GitHub sometimes cannot hand out a hosted macOS runner. macOS arm64 is the usual case, and these runs carry the notice "Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times". When that happens, GitHub gives up on the job with:

> The job was not acquired by Runner of type hosted even after multiple attempts

The job ends as `cancelled` (sometimes `failure`), with no steps and an empty `runner_name`. No code ran, but the template treats the result like a test failure:

- the release gate below refuses to release
- the terminal status gate reports a failing or overrun job
- nothing reruns the job, so on a push to `main` the release is skipped until someone notices and clicks "Re-run failed jobs"

## Reproducible example

The template's macOS matrix leg:

```yaml
# .github/workflows/release.yml:325-329
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, macos-15, windows-2025]
        runtime: [node, bun, deno]
# .github/workflows/example-app.yml:254-254
    runs-on: macos-15
```

The release gate that needs every leg to succeed:

```yaml
# .github/workflows/release.yml:548-558
    # Use !cancelled() instead of always() so cancellation propagates correctly (hive-mind issue #1278)
    # This is needed because lint/test jobs have a transitive dependency on changeset-check
    if: |
      !cancelled() &&
      github.ref == 'refs/heads/main' &&
      github.event_name == 'push' &&
      needs.release-preflight.result == 'success' &&
      needs.lint.result == 'success' &&
      needs.test.result == 'success' &&
      !contains(needs.*.result, 'failure') &&
      !contains(needs.*.result, 'cancelled')
```

`scripts/check-pipeline-status.sh` classifies a non-success result only as a failure, or a cancellation only as `supersede` or `overrun` ("No supersede accounts for these cancellations; timeout-minutes would otherwise leave the run grey"). An infrastructure failure is therefore reported as if the code were at fault.

Nothing in `.github/workflows/` reruns failed jobs: a grep for `rerun`, `run_attempt`, `not acquired` and `workflow_run` returns nothing.

Evidence:

- links-notation run https://github.com/link-foundation/links-notation/actions/runs/41477660740, job `kotlin / ios` (`runs-on: macos-26`):
  - conclusion `cancelled`, 0 steps, `runner_name: ""`
  - it waited from 16:07:31 to 16:44:51
  - annotation "The job was not acquired by Runner of type hosted even after multiple attempts"
  - the push to `main` therefore produced no release
- The template's own runs carry the capacity notice. For example, Example app run https://github.com/link-foundation/js-ai-driven-development-pipeline-template/actions/runs/41351093333 annotates "Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times."

Steps to reproduce: push to `main` while macOS hosted capacity is constrained. Alternatively, simulate it by pointing one matrix leg at an unavailable label for a test branch. The gate turns red and stays red until someone reruns it by hand.

## Workaround

Open the run and choose "Re-run failed jobs", or run `gh run rerun <run-id> --failed --repo link-foundation/js-ai-driven-development-pipeline-template`. Because `--failed` also reruns dependent jobs, the release and status gates are re-evaluated.

## Suggested fix

1. Rerun only infrastructure failures automatically, at most twice. A job that ran steps and failed is never rerun.

```diff
+++ .github/workflows/rerun-infrastructure-failures.yml
+name: Rerun infrastructure failures
+
+on:
+  workflow_run:  # zizmor: ignore[dangerous-triggers] -- no checkout, reads only numeric run ids
+    workflows: ["Checks and release", "Example app"]
+    types: [completed]
+
+permissions:
+  actions: write
+
+jobs:
+  rerun:
+    if: github.event.workflow_run.conclusion == 'failure' && github.event.workflow_run.run_attempt < 3
+    runs-on: ubuntu-24.04
+    timeout-minutes: 5
+    concurrency:
+      group: rerun-${{ github.event.workflow_run.id }}
+      cancel-in-progress: false
+    steps:
+      - name: Rerun jobs that never got a runner
+        env:
+          GH_TOKEN: ${{ github.token }}
+          REPO: ${{ github.repository }}
+          RUN_ID: ${{ github.event.workflow_run.id }}
+          ATTEMPT: ${{ github.event.workflow_run.run_attempt }}
+        run: |
+          set -euo pipefail
+          # A job that was never acquired has no runner and no steps; a real failure has both.
+          stuck="$(gh api "repos/$REPO/actions/runs/$RUN_ID/attempts/$ATTEMPT/jobs?per_page=100" --paginate \
+            --jq '.jobs[] | select((.conclusion == "cancelled" or .conclusion == "failure")
+                    and (.runner_name // "") == "" and ((.steps // []) | length) == 0) | .name')"
+          if [ -z "$stuck" ]; then
+            echo "No runner-acquisition failures in attempt $ATTEMPT; leaving the run as it is."
+            exit 0
+          fi
+          echo "::warning title=Hosted runner not acquired::$(echo "$stuck" | paste -sd, -) (attempt $ATTEMPT); rerunning failed jobs"
+          gh run rerun "$RUN_ID" --failed --repo "$REPO"
```

2. Make the status gate name the cause. It should stay red, because nothing was tested, but say why:

```diff
+# Jobs GitHub never started (no runner, no steps) are infrastructure, not code.
+report_unacquired_jobs() {
+  [ -n "${GH_TOKEN:-}" ] && [ -n "${GITHUB_RUN_ID:-}" ] || return 0
+  local names
+  names="$(gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT:-1}/jobs?per_page=100" --paginate \
+    --jq '.jobs[] | select((.conclusion == "cancelled" or .conclusion == "failure") and (.runner_name // "") == "" and ((.steps // []) | length) == 0) | .name' 2>/dev/null || true)"
+  [ -z "${names}" ] && return 0
+  echo "::error title=Hosted runner not acquired::$(join_names "${names}"). GitHub could not provide a runner; no code ran. rerun-infrastructure-failures.yml reruns these automatically."
+}
+report_unacquired_jobs
```

Pass `GH_TOKEN: ${{ github.token }}` to the pipeline-status step, and add `actions: read` to that job's `permissions:`. The workflow-level default is `contents: read` only.

3. Optional: if macOS coverage is not needed to release, run the macOS leg as a non-blocking signal. One way is `continue-on-error: ${{ matrix.os == 'macos-15' }}` on the test job. The trade-off is that `needs.test.result` then reports success even when that leg fails, so the leg needs its own visible annotation.

## Found in

This was found while fixing https://github.com/link-foundation/links-notation/issues/377. The links-notation counterpart is in https://github.com/link-foundation/links-notation/pull/378: `.github/workflows/rerun-unacquired.yml` and `scripts/ci/rerun-unacquired.py`, tested offline by `experiments/issue-377/test_rerun_unacquired.py`.
