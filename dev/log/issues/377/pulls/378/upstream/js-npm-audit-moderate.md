# npm-audit is green while four moderate advisories are open: `--audit-level=high` hides them, and nothing reports them

Target repository: link-foundation/js-ai-driven-development-pipeline-template (checked at HEAD c2463c7). There were no open issues when this was drafted. Related closed issues:

- #246 reported the same blind spot for `sprintf-js`. It was fixed with an override, and the level was left at `high`.
- #134 added the fail-closed audit for every lock.

This issue is the recurrence, and it asks for the reporting gap to be closed rather than for one more override.

## Problem

The scheduled audit exists to catch advisories published after the code stopped changing (CI/CD best practices, principle 15). It runs at `--audit-level=high`, so a moderate advisory produces no failure, no warning and no annotation. The only signal is the Dependabot alerts tab, which nobody reads from a green run.

## Reproducible example

```yaml
# .github/workflows/security.yml:3-9
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '0 6 * * 1'
# .github/workflows/security.yml:131-144
    strategy:
      fail-fast: false
      matrix:
        directory:
          ['.', examples/universal-app, .github/actions/artifact-transport]
    steps:
      ...
      - name: Audit current lock
        working-directory: ${{ matrix.directory }}
        run: npm audit --package-lock-only --audit-level=high
```

`dependency-review` (`security.yml:116-118`) also uses `fail-on-severity: high`.

Open Dependabot alerts on `main`, all created 2026-11-01:

| alert | package | lock | advisory | fixed in |
|---|---|---|---|---|
| #136 | minimatch | `package-lock.json` | GHSA-g3hv-75wg-m249 (medium) | 11.0.1 |
| #135 | minimatch | `examples/universal-app/package-lock.json` | GHSA-g3hv-75wg-m249 (medium) | 11.0.1 |
| #133 | minimatch | `.github/actions/artifact-transport/package-lock.json` | GHSA-g3hv-75wg-m249 (medium) | 11.0.1 |
| #132 | glob | `.github/actions/artifact-transport/package-lock.json` | GHSA-3g3m-2fjr-6pw4 (medium) | 14.0.2 |

The next scheduled Security run, https://github.com/link-foundation/js-ai-driven-development-pipeline-template/actions/runs/41467994351 (2026-11-02), was green and contained no mention of them.

links-notation has the identical configuration, `npm audit --package-lock-only --audit-level=high` in its `security.yml`. It had the same GHSA-g3hv-75wg-m249 alert open in `js/package-lock.json` while its audit was green (link-foundation/links-notation#377).

Steps to reproduce: `npm audit --package-lock-only` in any of the three directories lists the moderate advisories. Adding `--audit-level=high` exits 0.

## Workaround

Read the Dependabot alerts tab, or run `npm audit --package-lock-only` locally, and update the transitive packages with `npm update minimatch glob` or an `overrides` entry, as #246 did.

## Suggested fix

Keep the hard gate at `high`, so a moderate advisory with no patched release cannot block every PR. Report everything else as an annotation, so the green run says what it accepted:

```diff
       - name: Audit current lock
         working-directory: ${{ matrix.directory }}
-        run: npm audit --package-lock-only --audit-level=high
+        env:
+          AUDIT_DIR: ${{ matrix.directory }}
+        run: |
+          # Report every advisory; fail only at high (principle 15: set the level explicitly, and say what it hides).
+          if ! npm audit --package-lock-only --audit-level=low > audit-all.txt; then
+            count="$(grep -c 'Severity: ' audit-all.txt || true)"
+            echo "::warning title=npm audit (${AUDIT_DIR})::${count} advisory(ies) reported; only 'high' and above fail this job. See the step summary."
+            { echo "### npm audit: ${AUDIT_DIR}"; echo '```'; cat audit-all.txt; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
+            cat audit-all.txt
+          fi
+          npm audit --package-lock-only --audit-level=high
```

Optionally, make the weekly `schedule` run fail at `moderate`:

```yaml
--audit-level=${{ github.event_name == 'schedule' && 'moderate' || 'high' }}
```

This reproduces the "something needs attention" signal without blocking contributors' PRs.

## Found in

This was found while fixing https://github.com/link-foundation/links-notation/issues/377. The links-notation counterpart is in https://github.com/link-foundation/links-notation/pull/378: `.github/workflows/security.yml` (npm audit at `--audit-level=moderate` for every committed lockfile) and `scripts/ci/audit-yarn-lock.mjs`.
