# Dependency-freshness gate keeps main red when upstream publishes a release; it should fail PRs and warn on push and schedule

Target repository: link-foundation/php-ai-driven-development-pipeline-template (checked at HEAD 976d67f). There were no open issues when this was drafted. Closed #18 bumped outdated pins once by hand; it did not change how the gate reacts to new releases.

## Problem

The workflow-dependency freshness check fails whenever any pinned action or tool has a newer upstream release. It behaves the same on every event.

"A newer version was published" is a fact about the world, not about the commit, as the CI/CD best practices put it (principle 17: "Gate external state on pull requests; on push, warn"). So `main` turns red without any change to the repository. Every later push that triggers the workflow is red for a reason the pushed commit did not cause.

The template has no `.github/dependabot.yml`, so nothing proposes the bump either. The red run stays red until a human edits the pin.

## Reproducible example

```yaml
# .github/workflows/workflows.yml:3-21
on:
  push:
    branches:
      - main
    paths:
      - '.github/**'
      - 'scripts/check-workflow-dependencies.php'
      - 'scripts/src/WorkflowDependencies.php'
      - 'tests/Pipeline/WorkflowDependenciesTest.php'
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - '.github/**'
      - 'scripts/check-workflow-dependencies.php'
      - 'scripts/src/WorkflowDependencies.php'
      - 'tests/Pipeline/WorkflowDependenciesTest.php'
  schedule:
    - cron: '17 6 * * 1'
  workflow_dispatch:
# .github/workflows/workflows.yml:48-53

      - name: Check runner images and action/tool releases
        timeout-minutes: 5
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: php scripts/check-workflow-dependencies.php
```

```
// scripts/check-workflow-dependencies.php:22-28
    $errors = (new WorkflowDependencies())->check($workflows);
    foreach ($errors as $error) {
        Actions::error($error);
    }
    if ($errors !== []) {
        exit(1);
    }
// scripts/src/WorkflowDependencies.php:146-149
                    $latest = $releases[$repository];
                    if (ltrim($dependency['reference'], 'v') !== ltrim($latest, 'v')) {
                        $errors[] = "{$location}: {$repository}@{$dependency['reference']} must use the latest stable release {$latest}";
                    }
```

Evidence on `main`, with no commits in between:

- scheduled runs 38271747055 (2026-10-12), 39260742183 (2026-10-19), 40328797053 (2026-10-26) and https://github.com/link-foundation/php-ai-driven-development-pipeline-template/actions/runs/41478683663 (2026-11-02) all failed at the same SHA 976d67f
- the message was "shivammathur/setup-php@2.37.2 must use the latest stable release 2.40.0"
- push run 37743150922 at that SHA was green
- `main` has now been red for four consecutive weeks with no commit

links-notation hit the same failure mode: its `dependencies.yml` gate failed on push to `main` for upstream releases (run https://github.com/link-foundation/links-notation/actions/runs/41477659797). Issue link-foundation/links-notation#377 changes it to fail on pull requests and warn on push and schedule.

Steps to reproduce: wait for any pinned dependency to publish a release (or lower one pin on a branch), then push to `main` or run the workflow from the schedule. The job exits 1.

## Workaround

Bump the reported pins by hand in a PR. Until then, treat the red scheduled "Workflows" run on `main` as noise.

## Suggested fix

Fail only where a contributor can act (`pull_request`). On `push`, `schedule` and `workflow_dispatch`, emit `::warning` annotations plus a step summary. Add Dependabot so that the scheduled warning turns into a PR.

```diff
--- scripts/check-workflow-dependencies.php
+++ scripts/check-workflow-dependencies.php
@@
     $errors = (new WorkflowDependencies())->check($workflows);
-    foreach ($errors as $error) {
-        Actions::error($error);
-    }
-    if ($errors !== []) {
+    // A newer upstream release is external state: gate it on pull requests, warn elsewhere.
+    // Unpinned runner images and lookup failures still fail on every event.
+    $gate = getenv('GITHUB_EVENT_NAME') === 'pull_request';
+    $failing = [];
+    foreach ($errors as $error) {
+        if (!$gate && str_contains($error, ' must use the latest stable release ')) {
+            Actions::warning($error);
+            continue;
+        }
+        Actions::error($error);
+        $failing[] = $error;
+    }
+    if ($failing !== []) {
         exit(1);
     }
+    if ($errors !== []) {
+        exit(0);
+    }
```

```diff
+++ .github/dependabot.yml
+version: 2
+updates:
+  - package-ecosystem: github-actions
+    directory: /
+    schedule:
+      interval: weekly
+    cooldown:
+      default-days: 7
+    groups:
+      actions:
+        patterns: ['*']
```

Tool pins that Dependabot cannot see stay with the scheduled warning. For example, `bun-version`, `php-version` and runner images.

Keep a test asserting that the script still exits 1 on a stale pin when `GITHUB_EVENT_NAME=pull_request`, and 0 with a warning otherwise.

## Found in

This was found while fixing https://github.com/link-foundation/links-notation/issues/377. The links-notation counterpart is in https://github.com/link-foundation/links-notation/pull/378: `.github/workflows/dependencies.yml`, which reports outdated floors on `main` and opens update pull requests rather than failing every push.
