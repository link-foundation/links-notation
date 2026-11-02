# Template comparison for issue #377 (snapshot 2026-11-02)

Compared: `link-foundation/<lang>-ai-driven-development-pipeline-template` (snapshots in
`templates/<lang>/`) against this repo's `.github/workflows/*.yml`,
`.github/dependabot.yml`, `scripts/` and `scripts/ci/`. Line numbers refer to the
snapshot files in this directory (= template HEAD below).

## SHAs and changes since the previous snapshot (dev/log/issues/330/pulls/331/templates/SHAS.txt)

| lang | old | new (HEAD) | commits / files | headline changes |
|---|---|---|---|---|
| js | 4c8644f | c2463c7 | 59 / 225 | artifact-transport action, CodeQL config, javascript-first gate, release recovery, `release-preflight`, `push-main-with-rebase-retry.mjs` |
| rust | e7d4a5b | 097e262 | 31 / 115 | "close all eleven CI and release defects", crates-publish preflight, `check-workflow-tools.rs`, `check-dependency-graph.sh` |
| python | 1e2f475 | 67cfe05 | 34 / 76 | local artifact action with committed `dist` bundle, `check_release.py`, preflight, pypi-publish v1.14.3 pin |
| csharp | 22e53c8 | 202d08e | 33 / 119 | **added dependabot.yml (cooldown 7d)**, action pins, `audit-dependencies.mjs`, `pipeline-gate.mjs`, `git-push.mjs`, NuGet auth preflight, .NET 10 |
| cpp | (none) | d8e67b4 | new | first snapshot; dependabot.yml (cooldown 7d) + zizmor.yml |
| php | 73c1ba1 | 976d67f | 4 / 18 | `check-workflow-dependencies.php`, link-check retry, pinned runner images |
| java | b3c7ce9 | f7d89a3 | 4 / 13 | new `workflows.yml` + `check-ci-dependencies.mjs` (freshness gate), `github-release-state.mjs` (recover missing releases) |
| go | 9709ce1 | b87a03d | 5 / 12 | `check-release-needed.mjs`, release recovery, CI pins |

All 8 template repos had 0 open issues at snapshot time. Related closed issues: js#171 / rust#159
(GITHUB_TOKEN-pushed commit never tested), js#246 (`--audit-level=high` hides an advisory; fixed by
override, level unchanged), cpp#15 / csharp#81 (scheduled security lacked full audit), php#7, go#11, java#12.

## Matrix (S = same defect, F = has a fix/best practice to adopt, - = n/a)

| | js | rust | python | csharp | cpp | php | java | go |
|---|---|---|---|---|---|---|---|---|
| D1 hosted-runner acquisition, no auto-rerun | S | S (observed) | - | S | S | - | S | S |
| D2 GITHUB_TOKEN auto-merge, no push CI | F | F | - | - | - | - | - | - |
| D3 audit misdiagnoses skipped release | F | F | F | F | F | F | - | - |
| D4 shared version literal in pom | - | - | - | - | - | - | F | - |
| D5 yarn.lock without package.json | - | - | - | - | - | - | - | - |
| D6 generated artifact drift on Dependabot PRs | F (partial) | - | latent | - | - | - | - | - |
| D7 freshness gate fails on push/schedule | - | - | - | - | - | S | S | S |
| D8 audit level / scheduled audit | S | F | S | F | F | F | S (no audit) | - (no deps) |

## D1 - macOS hosted-runner capacity ("not acquired by Runner of type hosted")

Here: `.github/workflows/kotlin.yml:134` `runs-on: macos-26` (iOS); run 41477660740 job
`kotlin / ios` cancelled with no steps, empty `runner_name`, annotation "The job was not acquired by
Runner of type hosted even after multiple attempts"; release gate failed.

No template auto-reruns failed jobs or recognises runner-acquisition failures (grep for `rerun`,
`run_attempt`, `not acquired`, `continue-on-error` on matrix jobs: nothing). Release gates that
depend on a macOS matrix leg:
- js `release.yml:328` `os: [ubuntu-24.04, macos-15, windows-2025]`; `release` (:526-558) requires `needs.test.result == 'success'`.
- rust `release.yml:504` `os: [ubuntu-24.04, macos-26, windows-2025]`; `auto-release` (:726-745) needs `test` and rejects `cancelled`. `desktop-release.yml:67` `macos-arm64, runner: macos-15`.
  **Observed**: rust run 40954664492 (Desktop Release, 2026-10-29) job "Build macos-arm64" (macos-14) cancelled, `runner_name` empty, annotation "The job was not acquired by Runner of type hosted even after multiple attempts"; Pipeline Status reported "Pipeline failed: Failing jobs: build"; `run_attempt=1` (never rerun).
- csharp `release.yml:202` macos-15; `release` (:398) requires `needs.test.result == 'success'`.
- cpp `release.yml:370-371` `macos-appleclang` / `macos-15`; `build` (:580-581) requires test success; `auto-release` (:650-662) requires build success.
- java `release.yml:146` macos-26; `build` (:182-187) requires test success; `auto-release` (:251) `needs: [build]`.
- go `release.yml:169` macos-15; `build` (:208) `needs: [lint, test]`; `auto-release` (:235) `needs: [lint, test, build]`.
- python, php: Linux-only matrices.

`scripts/check-pipeline-status.sh` (js, rust, python, cpp, php; csharp `pipeline-gate.mjs`) classifies
cancellations only as `supersede` vs `overrun` (js :71-126); an acquisition failure is reported as
an overrun/failure, i.e. as a code problem. Drafts: `upstream/<lang>-runner-acquisition-rerun.md`.

## D2 - GITHUB_TOKEN merge commits get no push CI

Here: `AutoMerge.yml` + `scripts/ci/merge-dependabot.py` fall back to `GITHUB_TOKEN`; PR #376 was
merged by app/github-actions as 7a55d33 and no push workflow ran. No template auto-merges Dependabot
PRs (n/a everywhere). Best practice to adopt:
- js `release.yml:1025-1028`, rust `release.yml:1208-1211`, `:1239`: dedicated `RELEASE_PR_TOKEN`
  ("The built-in token suppresses pull_request workflows; use the same dedicated automation actor").
- js `example-app.yml:357-390`: pushes generated commits with `RELEASE_PR_TOKEN || GITHUB_TOKEN` via
  `scripts/push-main-with-rebase-retry.mjs`.
- js#171 / rust#159: validate the exact commit before pushing it with a token that triggers nothing.
For us: use a PAT/App token, or `gh workflow run <wf> --ref main` after merging (workflow_dispatch
is exempt from the GITHUB_TOKEN no-trigger rule).

## D3 - audit says "absent from registry, configure secret" when release was skipped

No template has a post-release registry audit (n/a). What they do instead (principle 16):
- `release-preflight` job (js `release.yml:490-524` + `scripts/preflight-credentials.sh`,
  `PREFLIGHT_MODE` release/report; rust :135; csharp :339; cpp; php; python) and every publisher
  gates on `needs.release-preflight.result == 'success'`. A credential problem is therefore
  reported once, by name, before build; a skipped publish can never be blamed on credentials.
- `check-release-needed` (go, js, rust) self-heals: publishes when the version is missing from the
  registry. go/java: no preflight.
Adopt: make `release-audit.mjs` read the publish job's `result` and say "skipped because <upstream>
failed" instead of "configure NPM_TOKEN" when the publisher never ran.

## D4 - shared literal in pom.xml

Here: `java/pom.xml:67` enforcer `<version>3.6.3</version>` and `:77` `requireMavenVersion
<version>3.6.3</version>`; PR #363. java template avoids it: `pom.xml:53`
`<maven-enforcer.version>3.4.1</maven-enforcer.version>`, `:244` `<version>${maven-enforcer.version}</version>`,
`:253-255` `<requireMavenVersion><version>[3.8.0,)</version>` (property + range). No Gradle in any
template. (java has no dependabot.yml, so it would not hit D4 anyway.)

## D5 - yarn.lock without package.json

No template has a yarn.lock or Kotlin/JS store. n/a.

## D6 - generated artifact drift on Dependabot PRs

No template regenerates on Dependabot PRs. python `workflows.yml:161-166` runs `npm run build` +
`git diff --exit-code -- dist` for `.github/actions/artifact` (latent: python has no dependabot.yml;
adding one would reproduce our D6). js `example-app.yml:334-421` regenerates on main and commits the
drift back with `RELEASE_PR_TOKEN` - the pattern to copy for a Dependabot-PR regen job.

## D7 - freshness gate fails on push (principle 17: gate on PRs, warn on push)

Here: `dependencies.yml` fails on push and schedule. Same defect in:
- java `workflows.yml:3-10` (push to main, no path filter; schedule `0 8 * * 1`), `:30-31` runs
  `node scripts/check-ci-dependencies.mjs`; `:68-71` `errors.push(... is outdated; latest stable is ...)`,
  `:90` `process.exitCode = 1` regardless of event. Red scheduled runs on main: 40342529984,
  39275834710, 38282817820 ("actions/setup-java v6.0.1 is outdated", "actions/upload-artifact v7.0.1 is outdated").
- go `workflows.yml:3-15` (push paths `.github/**`, `scripts/**`; schedule), `:50-52`
  `bun scripts/ci/check-dependencies.mjs`; `:174-177` `::error::CI dependencies need attention` +
  `process.exitCode = 1`. Red: 40345557010, 39278127853, 38285766720 ("oven-sh/bun pins 1.4.2; latest stable is 1.4.4").
- php `workflows.yml:3-21` (push paths, schedule `17 6 * * 1`), `:53`
  `php scripts/check-workflow-dependencies.php`; script `:23-27` `exit(1)`. Red: 41478683663, 40328797053,
  39260742183, 38271747055 ("shivammathur/setup-php@2.37.2 must use the latest stable release 2.40.0").
None of the three has a dependabot.yml, so nothing ever proposes the bump: the schedule stays red
until a human edits the pin. Drafts: `upstream/{java,go,php}-freshness-gate-on-push.md`.

## D8 - audit level and scheduled audit (principle 15)

Here: `security.yml:138` `npm audit --package-lock-only --audit-level=high`, weekly via js.yml;
open medium minimatch alerts are not reported.
- js `security.yml:3-9` weekly `0 6 * * 1`; `:131-144` same `--audit-level=high` over `.`,
  `examples/universal-app`, `.github/actions/artifact-transport`. Same blind spot: open Dependabot
  alerts #136/#135/#133 minimatch (GHSA-g3hv-75wg-m249, our advisory) and #132 glob are all medium.
- python `security.yml:36-37` audits only `pyproject.toml` + `docs/requirements.txt`
  (`scripts/audit_dependencies.py:20`); `.github/actions/artifact/package-lock.json` is never
  audited, open alerts #2 minimatch, #1 glob (medium).
- java: no security workflow, no audit of `pom.xml` (junit + Maven plugins). Gap, low severity.
- go: no audit, but `go.mod` has no third-party requirements - n/a (optional `govulncheck` for stdlib).
- Full-severity audits worth copying: rust `cargo audit --deny warnings`; php `composer audit --locked
  --abandoned=fail`; csharp `NuGetAuditLevel=low` + `scripts/audit-dependencies.mjs`; cpp `pip-audit` +
  `audit_native_dependencies`. All on weekly `0 6 * * 1`.

## D9 - other practices

Adopt:
- Job-level concurrency with `main-writer-*` groups, `cancel-in-progress: false`, `queue: max`
  (js `release.yml:545-547`, rust :732-735, go/java auto-release).
- `!cancelled()` instead of `always()` (js `release.yml:548-551` comment, hive-mind #1278). Here
  `js.yml:142,150,162,174` still use `always()`.
- Terminal `pipeline-status` gate turning timeouts/cancellations red (all but go/java).
- `zizmor` (cpp `.github/zizmor.yml`), actionlint (python `.github/actionlint.yaml`).
- Dependabot `cooldown: default-days: 7` + weekly (cpp, csharp `dependabot.yml`); ours is daily, no cooldown.
- Release preflight with attempted-write probes (principle 16), see D3.
Template weaknesses (not ours to fix, noted only): csharp `release.yml:295`, `:398` `always() && ...`
without `!cancelled()`; php `release.yml:26-28` workflow-level concurrency; go/java release.yml have
0 `timeout-minutes` and no preflight. python uses `uses: $/.github/actions/artifact` (e.g.
`links.yml:127`, `release.yml:431`); unusual but it works (step "Upload artifacts" succeeded in
run 41351625272). That run is red only because `release-preflight` correctly refuses: PyPI trusted
publisher not configured for the template repo.
