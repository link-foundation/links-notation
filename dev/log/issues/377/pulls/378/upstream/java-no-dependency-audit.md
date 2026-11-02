# No dependency audit or Dependabot for pom.xml: Maven dependencies and plugins are never checked for advisories or updates

Target repository: link-foundation/java-ai-driven-development-pipeline-template (checked at HEAD f7d89a3). There were no open issues when this was drafted, and no earlier issue mentions auditing. Severity: low.

## Problem

CI/CD best practices, principle 15, says code scanning does not audit dependencies, and the audit has to run on a schedule. The java template has neither part.

- There is no `security.yml` and no audit step.
- There is no `.github/dependabot.yml`.
- `dependabot_security_updates` is disabled in the repository settings.
- The only scheduled job, `workflows.yml` (`cron: '0 8 * * 1'`), checks GitHub Action pins. It does not check `pom.xml`.

An advisory against a pinned Maven dependency or build plugin would never surface. All the other templates with a security workflow run a full-severity scheduled audit:

| template | audit |
|---|---|
| rust | `cargo audit --deny warnings` |
| php | `composer audit --locked --abandoned=fail` |
| csharp | `NuGetAuditLevel=low` plus `scripts/audit-dependencies.mjs` |
| cpp | `pip-audit` |

## Reproducible example

```xml
<!-- pom.xml:42-53 -->
        <junit.version>5.10.2</junit.version>
        <spotless.version>2.43.0</spotless.version>
        <checkstyle.version>10.12.7</checkstyle.version>
        <spotbugs.version>4.8.3.1</spotbugs.version>
        <jacoco.version>0.8.11</jacoco.version>
        <maven-surefire.version>3.2.5</maven-surefire.version>
        <maven-compiler.version>3.12.1</maven-compiler.version>
        <maven-jar.version>3.3.0</maven-jar.version>
        <maven-source.version>3.3.0</maven-source.version>
        <maven-javadoc.version>3.6.3</maven-javadoc.version>
        <maven-enforcer.version>3.4.1</maven-enforcer.version>
```

`ls .github/workflows` gives only `release.yml` and `workflows.yml`. `grep -rniE 'audit|osv|dependency-check|dependency-review' .github scripts` finds only the action-pin regression test (`workflows.yml:27`).

Most of these versions date from early 2024. Nothing in CI reports that, or any advisory published against them.

## Workaround

Run an audit locally: `osv-scanner scan source -r .`, or `mvn org.owasp:dependency-check-maven:check`. Run `mvn versions:display-dependency-updates versions:display-plugin-updates` for freshness.

## Suggested fix

```diff
+++ .github/workflows/security.yml
+name: Security
+on:
+  push:
+    branches: [main]
+  pull_request:
+    types: [opened, synchronize, reopened]
+  schedule:
+    - cron: '0 6 * * 1'
+  workflow_dispatch:
+permissions:
+  contents: read
+jobs:
+  dependency-audit:
+    name: Audit Maven dependencies (OSV)
+    runs-on: ubuntu-24.04
+    timeout-minutes: 10
+    concurrency:
+      group: check-${{ github.workflow }}-${{ github.ref }}-dependency-audit
+      cancel-in-progress: true
+    steps:
+      - uses: actions/checkout@v7.0.1
+        with:
+          persist-credentials: false
+      - name: Audit pom.xml dependency tree (all severities)
+        env:
+          OSV_SCANNER_VERSION: vX.Y.Z  # pin, and let check-ci-dependencies.mjs track it
+        run: |
+          curl -fsSL -o osv-scanner "https://github.com/google/osv-scanner/releases/download/${OSV_SCANNER_VERSION}/osv-scanner_linux_amd64"
+          chmod +x osv-scanner
+          # OSV-Scanner resolves transitive Maven dependencies from pom.xml itself.
+          ./osv-scanner scan source -L pom.xml
```

```diff
+++ .github/dependabot.yml
+version: 2
+updates:
+  - package-ecosystem: maven
+    directory: /
+    schedule:
+      interval: weekly
+    cooldown:
+      default-days: 7
+  - package-ecosystem: github-actions
+    directory: /
+    schedule:
+      interval: weekly
+    cooldown:
+      default-days: 7
```

The template already keeps every plugin version in a property, and `requireMavenVersion` uses a range (`pom.xml:253-255`, `[3.8.0,)`). Dependabot can therefore bump plugins safely. links-notation's `java/pom.xml` used one literal `3.6.3` for both the enforcer plugin and `requireMavenVersion`, and a Dependabot bump changed both (link-foundation/links-notation PR #363). The template's layout avoids that. Keep it.

Replace `vX.Y.Z` with the current OSV-Scanner release at implementation time, and verify its checksum, as the other workflow tools do.

## Found in

This was found while fixing https://github.com/link-foundation/links-notation/issues/377. The links-notation counterpart is in https://github.com/link-foundation/links-notation/pull/378, whose CI already covers it: the `maven` ecosystem in `.github/dependabot.yml` and the dependency review in `.github/workflows/security.yml`.
