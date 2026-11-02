# Dependency-freshness gate keeps main red when upstream publishes a release; it should fail PRs and warn on push and schedule

Target repository: link-foundation/go-ai-driven-development-pipeline-template (checked at HEAD b87a03d). There were no open issues when this was drafted. Closed #11 fixed outdated pins once by hand; it did not change how the gate reacts to new releases.

## Problem

The workflow-dependency freshness check fails whenever any pinned action or tool has a newer upstream release. It behaves the same on every event.

"A newer version was published" is a fact about the world, not about the commit, as the CI/CD best practices put it (principle 17: "Gate external state on pull requests; on push, warn"). So `main` turns red without any change to the repository. Every later push that triggers the workflow is red for a reason the pushed commit did not cause.

The template has no `.github/dependabot.yml`, so nothing proposes the bump either. The red run stays red until a human edits the pin.

## Reproducible example

```yaml
# .github/workflows/workflows.yml:3-15
on:
  push:
    branches: [main]
    paths:
      - '.github/**'
      - 'scripts/**'
  pull_request:
    paths:
      - '.github/**'
      - 'scripts/**'
  workflow_dispatch:
  schedule:
    - cron: '0 8 * * 1'
# .github/workflows/workflows.yml:50-52
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bun scripts/ci/check-dependencies.mjs
```

```
// scripts/ci/check-dependencies.mjs:143-147
      if (dependency.version !== current) {
        errors.push(
          `${dependency.location}: ${dependency.name} pins ${dependency.version}; latest stable is ${current}`
        );
        continue;
// scripts/ci/check-dependencies.mjs:172-178
  const errors = await checkDependencies(dependencies);
  if (errors.length) {
    console.error("::error::CI dependencies need attention");
    for (const error of errors)
      printUntrusted(error, { stream: process.stderr });
    process.exitCode = 1;
  } else {
```

Evidence on `main`, with no commits in between:

- scheduled runs 38285766720 (2026-10-12), 39278127853 (2026-10-19) and https://github.com/link-foundation/go-ai-driven-development-pipeline-template/actions/runs/40345557010 (2026-10-26) all failed at the same SHA b87a03d
- the message was "oven-sh/bun pins 1.4.2; latest stable is 1.4.4"
- push run 37587941545 at that SHA was green
- the next push touching `.github/**` or `scripts/**` will fail for the same reason

links-notation hit the same failure mode: its `dependencies.yml` gate failed on push to `main` for upstream releases (run https://github.com/link-foundation/links-notation/actions/runs/41477659797). Issue link-foundation/links-notation#377 changes it to fail on pull requests and warn on push and schedule.

Steps to reproduce: wait for any pinned dependency to publish a release (or lower one pin on a branch), then push to `main` or run the workflow from the schedule. The job exits 1.

## Workaround

Bump the reported pins by hand in a PR. Until then, treat the red scheduled "Workflow checks" run on `main` as noise.

## Suggested fix

Fail only where a contributor can act (`pull_request`). On `push`, `schedule` and `workflow_dispatch`, emit `::warning` annotations plus a step summary. Add Dependabot so that the scheduled warning turns into a PR.

```diff
--- scripts/ci/check-dependencies.mjs
+++ scripts/ci/check-dependencies.mjs
@@
   const errors = await checkDependencies(dependencies);
-  if (errors.length) {
-    console.error("::error::CI dependencies need attention");
-    for (const error of errors)
+  // A newer upstream release is external state: gate it on pull requests, warn elsewhere.
+  // Pin-integrity and lookup errors still fail on every event.
+  const isStale = (error) => /; latest stable is /.test(error);
+  const gate = process.env.GITHUB_EVENT_NAME === "pull_request";
+  const failing = errors.filter((error) => gate || !isStale(error));
+  const warnings = errors.filter((error) => !failing.includes(error));
+  if (warnings.length) {
+    console.log("::warning::Newer upstream releases are available (not gating outside pull requests)");
+    for (const error of warnings) printUntrusted(error, { stream: process.stdout });
+  }
+  if (failing.length) {
+    console.error("::error::CI dependencies need attention");
+    for (const error of failing)
       printUntrusted(error, { stream: process.stderr });
     process.exitCode = 1;
-  } else {
+  } else if (!warnings.length) {
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
