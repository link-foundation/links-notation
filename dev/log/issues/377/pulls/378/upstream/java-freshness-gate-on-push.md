# Dependency-freshness gate keeps main red when upstream publishes a release; it should fail PRs and warn on push and schedule

Target repository: link-foundation/java-ai-driven-development-pipeline-template (checked at HEAD f7d89a3). There were no open issues when this was drafted. Closed #12 fixed outdated pins once by hand; it did not change how the gate reacts to new releases.

## Problem

The workflow-dependency freshness check fails whenever any pinned action or tool has a newer upstream release. It behaves the same on every event.

"A newer version was published" is a fact about the world, not about the commit, as the CI/CD best practices put it (principle 17: "Gate external state on pull requests; on push, warn"). So `main` turns red without any change to the repository. Every later push that triggers the workflow is red for a reason the pushed commit did not cause.

The template has no `.github/dependabot.yml`, so nothing proposes the bump either. The red run stays red until a human edits the pin.

## Reproducible example

```yaml
# .github/workflows/workflows.yml:3-10
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
  schedule:
    - cron: '0 8 * * 1'
# .github/workflows/workflows.yml:30-31
      - name: Check latest stable CI dependencies
        run: node scripts/check-ci-dependencies.mjs
```

```
// scripts/check-ci-dependencies.mjs:66-71
    const { path, repo, version } = dependency;
    if (!releases.has(repo)) releases.set(repo, await latest(repo));
    const current = releases.get(repo);
    if (version !== current) {
      errors.push(`${path}: ${repo} ${version} is outdated; latest stable is ${current}`);
    }
// scripts/check-ci-dependencies.mjs:82-91
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const dependencies = collectDependencies(resolve(import.meta.dirname, '..', '.github', 'workflows'));
    const errors = await checkDependencies(dependencies);
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`All ${dependencies.length} CI dependency declarations match their latest stable releases.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
```

Evidence on `main`, with no commits in between:

- scheduled run https://github.com/link-foundation/java-ai-driven-development-pipeline-template/actions/runs/38282817820 (2026-10-12) failed
- so did 39275834710 (2026-10-19) and 40342529984 (2026-10-26), all at the same SHA f7d89a3
- the messages were "actions/setup-java v6.0.1 is outdated" and "actions/upload-artifact v7.0.1 is outdated"
- the last push run, 37586096683 at the same SHA, was green
- the workflow runs on every push to `main` with no path filter, so the next merge of any kind will be red as well

links-notation hit the same failure mode: its `dependencies.yml` gate failed on push to `main` for upstream releases (run https://github.com/link-foundation/links-notation/actions/runs/41477659797). Issue link-foundation/links-notation#377 changes it to fail on pull requests and warn on push and schedule.

Steps to reproduce: wait for any pinned dependency to publish a release (or lower one pin on a branch), then push to `main` or run the workflow from the schedule. The job exits 1.

## Workaround

Bump the reported pins by hand in a PR. Until then, treat the red scheduled "Workflow Policy" run on `main` as noise.

## Suggested fix

Fail only where a contributor can act (`pull_request`). On `push`, `schedule` and `workflow_dispatch`, emit `::warning` annotations plus a step summary. Add Dependabot so that the scheduled warning turns into a PR.

```diff
--- scripts/check-ci-dependencies.mjs
+++ scripts/check-ci-dependencies.mjs
@@
     const dependencies = collectDependencies(resolve(import.meta.dirname, '..', '.github', 'workflows'));
     const errors = await checkDependencies(dependencies);
-    if (errors.length) throw new Error(errors.join('\n'));
-    console.log(`All ${dependencies.length} CI dependency declarations match their latest stable releases.`);
+    // A newer upstream release is external state: gate it on pull requests, warn elsewhere.
+    // Digest mismatches and lookup errors still fail on every event.
+    const stale = errors.filter((error) => error.includes(' is outdated; latest stable is '));
+    const broken = errors.filter((error) => !stale.includes(error));
+    if (broken.length) throw new Error(broken.join('\n'));
+    const gate = process.env.GITHUB_EVENT_NAME === 'pull_request';
+    for (const error of stale) console.log(`::${gate ? 'error' : 'warning'}::${error}`);
+    if (stale.length && gate) process.exitCode = 1;
+    if (!stale.length) console.log(`All ${dependencies.length} CI dependency declarations match their latest stable releases.`);
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
