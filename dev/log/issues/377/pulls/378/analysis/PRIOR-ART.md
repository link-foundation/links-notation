# Prior art: existing components and documentation

This file answers the task's request to "check online for known existing components/libraries that
solve a similar problem or can help". Each row gives the existing solution and whether this pull
request uses it.

Earlier rounds covered other topics, which are not repeated here:

- `../../../../290/pulls/291/analysis/PRIOR-ART.md`: trusted publishing, changesets,
  release-please, action pinning;
- `../../../../330/pulls/331/analysis/PRIOR-ART.md`: registry propagation, lychee, CodeQL scoping.

## Merges with `GITHUB_TOKEN` (C7)

| Source | What it says | Use here |
| --- | --- | --- |
| [GitHub docs: using the `GITHUB_TOKEN` in a workflow](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow) | "events triggered by the `GITHUB_TOKEN`, with the exception of `workflow_dispatch` and `repository_dispatch`, will not create a new workflow run." | **Adopted**: dispatch the push workflows (`cf7c90c`). |
| [`actions/create-github-app-token`](https://github.com/actions/create-github-app-token) | A GitHub App token does trigger workflows, and it does not expire the way a PAT does. | A durable alternative to `DEPENDABOT_AUTO_MERGE_TOKEN` (B2). It needs an App installed by an organisation owner, so the dispatch fallback is kept regardless. |
| js and rust templates | Both already dispatch CI after an automated merge (COMPARISON D2). | Same approach. |

## Hosted runner acquisition (A6)

| Source | What it says | Use here |
| --- | --- | --- |
| GitHub Actions | There is no built-in retry for jobs that were never acquired. `gh run rerun <id> --failed` re-runs the failed jobs of a completed run. | **Adopted**: `rerun-unacquired.yml` calls it once, only for jobs with no steps and no runner. |
| [GitHub status: macOS capacity notices](https://www.githubstatus.com/) | The "Due to capacity constraints …" annotation is GitHub's own status message. | Informational (W5). |

## Lockfiles that Dependabot and `npm audit` cannot read (A5, C6)

| Source | What it says | Use here |
| --- | --- | --- |
| npm registry bulk advisory endpoint, `POST /-/npm/v1/security/advisories/bulk` | The source that `npm audit` itself queries. It takes `{name: [versions]}`. | **Adopted** in `scripts/ci/audit-yarn-lock.mjs`, so the results match `npm audit` on the other locks. |
| [google/osv-scanner](https://github.com/google/osv-scanner) | `osv-scanner scan --lockfile yarn.lock` audits a lock with no manifest, against OSV. | A valid alternative. Not adopted, because it would add a binary and a second advisory source whose results differ from `npm audit`. |
| `yarn audit` (Yarn 1) | Needs a `package.json` next to the lock. | Not applicable. |
| [Kotlin docs: JavaScript dependency version locking](https://kotlinlang.org/docs/js-project-setup.html#version-locking-via-kotlin-js-store) and `YarnRootExtension.resolution(...)` | `kotlin-js-store/yarn.lock` and how to pin transitive versions. | **Adopted** (`3c113f8`). The documented `kotlinUpgradeYarnLock` alone leaves the lock unchanged; see the blocked KT report in `UPSTREAM.md`. |
| [Renovate](https://docs.renovatebot.com/) | It also needs a manifest for the npm manager. | Would not help. |

## Maven floor (A4, C8)

| Source | What it says | Use here |
| --- | --- | --- |
| [Maven version range specification](https://maven.apache.org/enforcer/enforcer-rules/versionRanges.html) | `[3.6.3,)` means "3.6.3 or later", the same as the bare `3.6.3` for `requireMavenVersion`. | **Adopted** (`07e6f64`). |
| java template | It already wrote the floor as a range (COMPARISON D4). | Same approach. |

## JDK 25 launcher warnings (W1, W2)

| Source | What it says | Use here |
| --- | --- | --- |
| [JEP 472: Prepare to restrict the use of JNI](https://openjdk.org/jeps/472) | `--enable-native-access=ALL-UNNAMED` silences the restricted-method warning. | **Adopted** in the `maven-floor` job only (`6596ad8`). |
| [JEP 498: Warn upon use of memory-access methods in `sun.misc.Unsafe`](https://openjdk.org/jeps/498) | `--sun-misc-unsafe-memory-access=allow` silences the warning. | **Adopted** there too. The ktlint worker cannot receive JVM flags (W2), so the fix belongs upstream. |

## NuGet credentials (B1)

| Source | What it says | Use here |
| --- | --- | --- |
| [NuGet.org trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing) and [`NuGet/login`](https://github.com/NuGet/login) | A GitHub OIDC token is exchanged for a short-lived API key. It needs `id-token: write` and the nuget.org user name. | **Adopted** (`0f37907`), with the secret as a fallback. |

## Gating on external state (C2)

| Source | What it says | Use here |
| --- | --- | --- |
| hive-mind best practice 17 | "Gate external state on pull requests; on push, warn." | **Adopted** (`0b8992a`). |
| [Dependabot `cooldown`](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference#cooldown-) | Delays update PRs for new releases. | Not adopted: the repository chose daily updates with no cooldown, and with C2 a new release no longer turns `main` red. |

## Gradle 10 deprecation from KGP (W3)

| Source | What it says | Use here |
| --- | --- | --- |
| KT-89265, commit `95e8bdcc84` in JetBrains/kotlin | `KotlinNativeBundleArtifactsTypes` becomes `Named`. It ships in 2.5.0-Beta2. | It will be adopted when 2.5.0 is stable; the repository uses stable releases only. Reproduction: `experiments/issue-377/kgp-named-enum`. |
