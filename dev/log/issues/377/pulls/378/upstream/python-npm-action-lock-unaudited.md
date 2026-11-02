# The npm lock of `.github/actions/artifact` is never audited; two open advisories ship in the action bundle

Target repository: link-foundation/python-ai-driven-development-pipeline-template (checked at HEAD 67cfe05). There were no open issues when this was drafted. Related closed issues:

- #58 added continuous auditing for the resolved Python dependencies
- #68 refined `audit_dependencies.py`

Neither covers npm.

## Problem

The template ships a JavaScript action with a committed `package-lock.json`. The action's `dist` bundle, built by `ncc`, runs in every artifact upload and download step.

The Security workflow audits only the Python surfaces, so an advisory against that lock is invisible to every scheduled run (CI/CD best practices, principle 15). Dependabot does see it, but the template has no `dependabot.yml` to turn the alert into a PR.

## Reproducible example

```yaml
# .github/workflows/security.yml:19-37
  dependency-audit:
    name: Audit Resolved Python Dependencies
    ...
      - name: Audit pyproject.toml and docs/requirements.txt
        run: python scripts/audit_dependencies.py
```

```python
# scripts/audit_dependencies.py:20
DEPENDENCY_SURFACES = ("pyproject.toml", "docs/requirements.txt")
```

```json
// .github/actions/artifact/package.json
"dependencies": { "@actions/artifact": "6.3.1", "@actions/core": "3.0.1", "@actions/glob": "0.7.0" },
"overrides": { "archiver-utils": { "glob": "13.0.6" } }
```

The action is used by `links.yml:127`, `security.yml:81`, `docs.yml:74,90`, `release.yml:431,615,905,933` and `workflows.yml:176,184,196,204`.

Open Dependabot alerts on `main`, created 2026-11-01:

- #2 minimatch in `.github/actions/artifact/package-lock.json`, GHSA-g3hv-75wg-m249 (medium), fixed in 11.0.1
- #1 glob in `.github/actions/artifact/package-lock.json`, GHSA-3g3m-2fjr-6pw4 (medium), fixed in 14.0.2. The `glob` override pins 13.0.6, inside the vulnerable range `>= 9.0.0, <= 14.0.1`.

The next scheduled Security run, https://github.com/link-foundation/python-ai-driven-development-pipeline-template/actions/runs/41461412029 (2026-11-02), was green.

links-notation has the same blind spot class: an npm lock with an open GHSA-g3hv-75wg-m249 alert next to a green audit (link-foundation/links-notation#377).

Steps to reproduce: `cd .github/actions/artifact && npm audit --package-lock-only` lists both advisories. No workflow runs that command.

## Workaround

Bump the override to `glob` 14.0.2 or later, update `minimatch`, run `npm run build`, and commit `dist`. The `workflows.yml:161-166` check requires a matching bundle.

## Suggested fix

```diff
   dependency-audit:
     ...
       - name: Audit pyproject.toml and docs/requirements.txt
         run: python scripts/audit_dependencies.py
+
+      - name: Setup Node.js
+        uses: actions/setup-node@v7
+        with:
+          node-version: 24
+
+      - name: Audit the artifact action's npm lock
+        working-directory: .github/actions/artifact
+        run: npm audit --package-lock-only --audit-level=moderate
```

The level here can be `moderate`: the lock is small and fully under the template's control. Also add a `.github/dependabot.yml` with `npm` for `/.github/actions/artifact` and `github-actions` for `/`, using the weekly schedule and `cooldown: default-days: 7` that the cpp and csharp templates use.

Note: a Dependabot npm PR for this directory will fail `workflows.yml:161-166` ("Verify committed action bundle") until `dist` is rebuilt, because Dependabot does not run `npm run build`. Either regenerate `dist` in a follow-up commit on Dependabot PRs (push with a non-`GITHUB_TOKEN` actor so CI reruns), or document that those PRs need a manual `npm run build` commit. links-notation hit exactly this with its generated parser (#377, D6).

## Found in

This was found while fixing https://github.com/link-foundation/links-notation/issues/377. The links-notation counterpart is in https://github.com/link-foundation/links-notation/pull/378: `.github/workflows/security.yml` (npm audit at `--audit-level=moderate` for every committed lockfile) and `scripts/ci/audit-yarn-lock.mjs`.
