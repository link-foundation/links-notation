# CI/CD comparison: link-foundation pipeline templates vs. links-notation defects

Snapshot taken 2026-10-06 (shallow clones, `--depth 1`). SHAs are in `SHAS.txt`:

| Template | HEAD sha |
|---|---|
| rust | e7d4a5bceb152f76d9fde77bae6751b835b9cdcd |
| js | 4c8644fb457b65933fcb19b033e60e7d0338f2ad |
| csharp | 22e53c87d87274415eb11c291702597c4021c50d |
| python | 1e2f475cb411e857f83f769f13887ae2df0656b2 |
| php | 73c1ba102da6bd7740c6b4a79ab5ea1d09559986 |
| java | b3c7ce9a0a4ecd8db796a4fe660031d9fa4acbab |
| go | 9709ce189b0afc27dfc1223f9fec139109ba6060 |

Only `.github/`, `scripts/` and top-level config files were kept; `.git` was removed.
Nothing from the clones was executed. All paths below are relative to
`dev/log/issues/330/pulls/331/templates/`.

Summary of defects found (Y = has the defect):

| Q | rust | js | csharp | python | php | java | go |
|---|---|---|---|---|---|---|---|
| Q1 too-short registry wait (<4 min) | no (300 s) | no (930 s) | no (960 s) | **Y** (~100 s + installs) | no (300 s, non-fatal) | n/a (no registry) | no (300 s) |
| Q2 no release backfill | no | **Y** | no | **Y** (worse: republish fails) | no | **Y** | **Y** |
| Q3 no GitHub release existence check | no (per-run check) | **Y** | no (per-run check) | **Y** | no (per-run check) | **Y** | **Y** |
| Q4 lychee: no host rate limits / 429 not tolerated | **Y** (429 final) | partial (no host config; recheck retries 429) | **Y** (429 final) | partial (no host config; recheck retries 429) | **Y** (429 final) | no link check at all | no link check at all |
| Q5 setup-go cache w/o cache-dependency-path | - | - | - | - | - | - | no (cache: false, go.mod at root) |
| Q6 setup-java deprecated server-*/gpg-passphrase | - | no | - | - | - | no | - |
| Q7 pdflatex/LaTeX | no | no | no | no | no | no | no |
| Q8 trufflehog present | no | no | no | no | no | no | no |
| Q8 clearly outdated pins | minor | minor | minor | minor | **Y** | **Y** | **Y** |
| Q9 CodeQL without paths-ignore/config | **Y** | **Y** | **Y** | **Y** | n/a (actions only) | no CodeQL | no CodeQL |
| Q10 PyPI token vs trusted publishing | - | - | - | trusted (OIDC) | - | - | - |

---

## Q1. Registry propagation wait after publish

| Template | Registry | Poll? | Window | Fails on exhaustion? | ~4 min lag => red? |
|---|---|---|---|---|---|
| rust | crates.io (sparse index + API) | yes | 30 x 10 s = 300 s | yes (`exit(1)`) | no, but only ~60 s margin |
| js | npm | yes (2 layers) | publish verify 34 checks, backoff 2 s -> 30 s cap = 930 s; Docker pre-wait 92 x 10 s = 920 s | yes | no |
| csharp | NuGet flat-container | yes | 8 x 120 s = 960 s | yes | no |
| python | PyPI | only indirectly via smoke-test `pip install` retries | 6 attempts, 5 x 20 s sleep = 100 s (+ install time) | yes | **yes** |
| php | Packagist | yes | 300 s timeout, 10 s interval | **no** (warning, continue) | no |
| java | none (GitHub release assets only, no Maven Central) | n/a | n/a | n/a | n/a |
| go | proxy.golang.org | yes | 30 x 10 s = 300 s | yes | no, ~60 s margin |

Evidence:

- rust `scripts/wait-for-crate.rs:284-285`
  ```
  let max_attempts = parse_count_arg("max-attempts", 30);
  let sleep_seconds = parse_count_arg("sleep-seconds", 10);
  ```
  `scripts/wait-for-crate.rs:348` `exit(1);`; invoked at `.github/workflows/release.yml:817` and `:967`.
- js `scripts/publish-retry.mjs:15-19`
  ```
  // 34 checks span 15.5 minutes with the backoff below. Recent accepted npm
  // publishes took over five minutes to reach the public read path.
  export const DEFAULT_VERIFY_ATTEMPTS = 34;
  export const DEFAULT_VERIFY_INITIAL_DELAY = 2000;
  export const DEFAULT_VERIFY_MAX_DELAY = 30000;
  ```
  `scripts/publish-retry.mjs:1-12` documents the exact links-notation failure mode (republish after a verification miss). `scripts/wait-for-npm.mjs:18,20` `DEFAULT_MAX_ATTEMPTS = 92` / `DEFAULT_SLEEP_SECONDS = 10` (used before Docker publish, `.github/workflows/release.yml:807`). Publish step budget: `.github/workflows/release.yml:617` `run-with-budget-warning.sh 1200 "npm publish and registry verification"`.
- csharp `scripts/wait-for-nuget.mjs:38-39`
  ```
  export const DEFAULT_MAX_ATTEMPTS = 8;
  export const DEFAULT_SLEEP_SECONDS = 120;
  ```
  invoked at `.github/workflows/release.yml:601-605` and `:795-799`.
- python: no dedicated registry wait. `scripts/smoke_test_published_package.py:23-24`
  ```
  DEFAULT_INSTALL_ATTEMPTS = 6
  DEFAULT_INSTALL_DELAY_SECONDS = 20.0
  ```
  loop at `:216-223` (fixed 20 s sleep, then `raise SmokeTestError`). The smoke test (`.github/workflows/release.yml:671-675`) runs before "Create GitHub Release" (`:677-679`), so a >~2-3 min PyPI CDN lag skips the GitHub release - same failure class as links-notation js.
- php `scripts/wait-for-packagist.php:29-30`
  ```
  $timeout = (int) (Cli::string($options, 'timeout') ?? '300');
  $interval = max(1, (int) (Cli::string($options, 'interval') ?? '10'));
  ```
  `:53-58` on deadline: `Actions::warning(... 'Continuing anyway ...'); exit(0);`
- java: `.github/workflows/release.yml:302-321` only builds jars and uploads them to the GitHub release; no registry publish.
- go `scripts/verify-module-availability.mjs:6-7`
  ```
  const DEFAULT_ATTEMPTS = 30;
  const DEFAULT_INTERVAL_MS = 10_000;
  ```
  failure at `:45` / `process.exit(1)` `:74`; invoked at `.github/workflows/release.yml:281,331,394` before "Create GitHub Release".

## Q2. Release backfill (package published, GitHub release missing)

| Template | Backfills? | Mechanism |
|---|---|---|
| rust | yes | `check-release-needed.rs` checks crates.io + GitHub release (+ Docker) and sets `skip_bump=true` when any is missing |
| js | **no** | only checks npm; "already published" => `should_release=false` |
| csharp | yes | `decide()` has explicit "on NuGet but no GitHub release" branch |
| python | **no (and worse)** | gate is "git tag exists"; publish has no `skip-existing`, so retry republishes and PyPI rejects the duplicate file => permanently red, release never created |
| php | yes | `ReleaseDecider::decide()` self-heals missing GitHub release |
| java | **no** | release only when changesets exist; tag already pushed => `released=false` |
| go | **no** | release only when changesets exist and `version_committed == 'true'` |

Evidence:

- rust `scripts/check-release-needed.rs:203-209`
  ```
  fn release_is_complete(...) -> bool {
      crate_published && (!dockerhub_required || dockerhub_published) && github_release_published
  }
  ```
  `:386-391` `"No changelog fragments but v{} is missing at least one release artifact"` -> `should_release=true`, `skip_bump=true`; `.github/workflows/release.yml:867-871` creates the release when `crate_published == 'true'`.
- js `scripts/check-release-needed.mjs:100-105`
  ```
  if (isPublished) {
    console.log(
      `No changesets and v${currentVersion} already published on npm — no release needed`
    );
    setOutput('should_release', 'false');
  ```
  `.github/workflows/release.yml:603-606` publish (and therefore `:625-626` "Create GitHub Release", gated on `steps.publish.outputs.published`) only runs on `version_committed`, `already_released`, or `should_release && skip_bump`. A plain re-run of the same failed job does recover (publish-to-npm.mjs:254-259 sets `published=true` when already on npm), but the next push to main does not.
- csharp `scripts/check-release-needed.mjs:252-259`
  ```
  if (!githubReleaseExists) {
    return { shouldRelease: true, skipBump: true, ...
      reason: `v${currentVersion} on NuGet but no GitHub release — self-healing release creation`,
  ```
  NuGet push is idempotent (`--skip-duplicate`, `.github/workflows/release.yml:582`).
- python `.github/workflows/release.yml:652-657`
  ```
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Tag $TAG already exists, skipping release"
    echo "should_release=false" >> "$GITHUB_OUTPUT"
  else
    echo "New version detected: $CURRENT_VERSION ($TAG)"
    echo "should_release=true" >> "$GITHUB_OUTPUT"
  ```
  `:667-669` `uses: pypa/gh-action-pypi-publish@dc37677... # v1.14.2` with no `skip-existing: true` (no `skip-existing` anywhere in the template). The tag is only created by `create_github_release.py`, so after a failure past PyPI upload every subsequent push re-uploads and fails.
- php `scripts/src/ReleaseDecider.php:40-41`
  ```
  if (!$githubReleaseExists) {
      return new ReleaseDecision(true, true, 'Self-heal: GitHub release is missing for the current version.');
  ```
  `.github/workflows/release.yml:366-375` runs `version-and-commit.php --skip-bump` in that case.
- java `.github/workflows/release.yml:295-307` (`if: steps.changesets.outputs.has_changesets == 'true'`, then `if: steps.release.outputs.released == 'true'`); `scripts/version-and-commit.mjs:294-299`
  ```
  if (tagExists(tag)) {
    console.log(`Tag ${tag} already exists. Skipping release.`);
    setOutput('released', 'false');
    setOutput('already_released', 'true');
  ```
- go `.github/workflows/release.yml:270-288` (`Verify module availability` / `Create GitHub Release` gated on `has_changesets == 'true' && version_committed == 'true'`); `scripts/version-and-commit.mjs:262-265` `"No changesets found. Nothing to release."` ; the tag is pushed at `:323-327` before verification/release.

## Q3. Release audit / consistency check for GitHub releases

No template has a standalone release-audit job (links-notation has `.github/workflows/release-audit.yml` + `scripts/release-audit.mjs`). rust, csharp and php check the GitHub release for the *current* version on every main push as part of the release decision; js, python, java and go do not check it at all.

| Template | Checks GitHub release exists? | Where |
|---|---|---|
| rust | yes (current version) | `scripts/check-release-needed.rs:169-194` `GET .../releases/tags/{prefix}{version}`; `GITHUB_TOKEN` passed at `.github/workflows/release.yml:780` |
| js | no | `scripts/check-release-needed.mjs` only queries npm (`:97`). `scripts/format-github-release.mjs:96` reads the release only to format notes |
| csharp | yes (current version) | `scripts/check-release-needed.mjs:161-178` `/repos/${repository}/releases/tags/...`, output `github_release_exists` `:329` |
| python | no | tag-only check `.github/workflows/release.yml:652` |
| php | yes (current version) | `scripts/src/GitHub.php:30-35` `gh release view $tag`; used by `scripts/src/ReleaseDecider.php:70` |
| java | no (only idempotency inside `create-github-release.mjs:88`) | |
| go | no | |

## Q4. lychee / link checking

| Template | lychee | lychee.toml | `[hosts."github.com"]` limits | `--accept 429` | 429 retry outside lychee |
|---|---|---|---|---|---|
| rust | `lycheeverse/lychee-action@v2` | no | no | no | **no** - recheck only for unanswered (no status) failures; 429 is final |
| js | `@v2` | no | no | no | yes (`recheck-broken-links.mjs` retries 429/5xx) |
| csharp | `@v2` | no | no | no | **no** (429 final) |
| python | `@v2` | no | no | no | yes (`recheck_broken_links.py` retries 429/5xx) |
| php | `@v2` | no | no | no | **no** (429 final) |
| java | none | - | - | - | - |
| go | none | - | - | - | - |

All five use the same args: `--cache --max-cache-age 1d --max-retries 3 --timeout 30` and pass `GITHUB_TOKEN` (rust `.github/workflows/links.yml:73-91`, js `:71-90`, csharp `:57-75`, python `:50-64`, php `:52-66`). `.lycheeignore` exists in rust, js, csharp, php; python references `.lycheeignore` in its failure message (`links.yml:105`) but ships none. All post-process failures with `check-web-archive` + `recheck-broken-links`.

Evidence for "429 stays final":
- rust `.github/workflows/links.yml:97-98` `# outside lychee. A failure carrying a status code is a host's` / `# answer and stays final.`; `scripts/recheck-broken-links.mjs:13-15` "a failure carrying a status code means a host answered, and that answer is final".
- csharp `.github/workflows/links.yml:81-82` `... A failure carrying a status code` / `# is a host's answer and stays final (issue #58).`
- php `.github/workflows/links.yml:72-73` `... A failure carrying a status code is a host's` / `# answer and stays final (issue #12).`

Evidence for retrying 429:
- js `.github/workflows/links.yml:93` `# Retry transport errors, 429, and 5xx within a shared budget.`; `scripts/recheck-broken-links.mjs:150` `return status === 429 || (status >= 500 && status <= 599);`
- python `.github/workflows/links.yml:67` `# Retry transport failures and 429/5xx responses with backoff.`; `scripts/recheck_broken_links.py:144-145`.

## Q5. actions/setup-go cache without cache-dependency-path

Only the go template uses setup-go; cache is disabled and `go.mod` is at the repo root, so no warning.
- go `.github/workflows/release.yml:120-123` (same at `:175-178`, `:214-217`)
  ```
  uses: actions/setup-go@v5
  with:
    go-version: '1.21'
    cache: false
  ```
  Side notes: setup-go@v5 is two majors behind (v7.0.0), Go 1.21 is EOL, and caching is disabled entirely rather than configured with `cache-dependency-path`.

## Q6. actions/setup-java deprecated inputs

No template uses `server-username`, `server-password`, `server-id`, `gpg-private-key` or `gpg-passphrase` (grep over all files: no hits). java uses only `java-version`/`distribution`/`cache: maven` (`.github/workflows/release.yml:99-103`, also `:153`, `:193`, `:267`, `:361`, `:440`) because it never publishes to Maven Central. js uses `actions/setup-java@v5` for the Android example only.

## Q7. PDF / LaTeX generation

None. A grep for `pdflatex|xelatex|lualatex|pandoc|latex` over the full clones (before pruning) returned no matches in any template.

## Q8. trufflehog and outdated action pins

No template uses trufflehog (secret scanning is `npx secretlint` in rust `release.yml:241`, js `release.yml:261`, python `release.yml:197`; csharp/php/java/go have no secret scan). Latest releases as of 2026-10-06 (`gh api repos/<r>/releases/latest`): checkout v7.0.1, setup-java v6.0.1, setup-go v7.0.0, setup-node v7.0.0, setup-python v7.0.0, setup-dotnet v6.0.0, cache v6.1.0, upload-artifact v7.0.1, download-artifact v8.0.1, upload-pages-artifact v5.0.0, deploy-pages v5.0.1, configure-pages v6.0.0, create-pull-request v8.1.1, lychee-action v2.9.0, zizmor-action v0.6.4, ramsey/composer-install 4.0.0, codecov-action v7.1.1, trufflehog v3.99.0.

| Template | Clearly outdated pins |
|---|---|
| rust | `actions/upload-artifact@v6` (`release.yml:1083`) and `actions/download-artifact@v7` (`:1105`) while the rest of the file uses v7/v8; `actions/cache@v5` x7 (`:270,420,512,523,591,640,704`); checkout@v6 (latest v7); zizmor-action@v0.6.2 |
| js | checkout@v6, setup-node@v6, setup-java@v5 (one major behind each); zizmor-action@v0.6.2 |
| csharp | checkout@v6, setup-dotnet@v5, `peter-evans/create-pull-request@v8` unpinned tag; zizmor-action@v0.6.2 |
| python | checkout@v6, setup-python@v6; codecov pinned to v7.0.0 SHA (latest v7.1.1); zizmor-action@v0.6.2 |
| php | **mixed** `actions/checkout@v4` x17 (e.g. `release.yml:51,90,149,...`, `security.yml:29,68,92,117`, `docs.yml:41,103`, `links.yml:36,123`) vs `checkout@v7` in `workflows.yml:34,67,121`; `docs.yml:56` upload-artifact@v4, `:64` configure-pages@v5, `:68` upload-pages-artifact@v3, `:87` deploy-pages@v4; `ramsey/composer-install@v3` (latest 4.0.0) |
| java | `actions/checkout@v4` x9, `actions/setup-java@v4` x6 (latest v6), `actions/upload-artifact@v4` (`release.yml:209`), `peter-evans/create-pull-request@v6` (`:534`, latest v8), `oven-sh/setup-bun@v2` with `bun-version: latest` (`:64,108,238`), `docker://rhysd/actionlint:1.7.12` by mutable tag (`:123`, others pin by digest) |
| go | `actions/checkout@v4` x9, `actions/setup-go@v5` x3 (latest v7), `bun-version: latest` (`release.yml:59,88,128,247,312,362`, `workflows.yml:34`), actionlint by tag (`workflows.yml:43`) |

## Q9. CodeQL scope

No template has `paths-ignore`, `paths`, `config-file` or `config:` on `github/codeql-action/init@v4`, and no `.github/codeql/` config exists. rust, js and csharp ship `experiments/` (and all have `examples/`) at the repo root (seen in the clone before pruning), so CodeQL scans them.
- rust `.github/workflows/security.yml:52,58-60` `language: [rust, actions]` / `uses: github/codeql-action/init@v4` / `languages: ${{ matrix.language }}`
- js `.github/workflows/security.yml:38,45-47` `[javascript-typescript, actions]`
- csharp `.github/workflows/security.yml:27,32-34` `[csharp, actions]`
- python `.github/workflows/security.yml:47,54-56` `[python, actions]`
- php `.github/workflows/security.yml:66` `language: [actions]` (no PHP analyser; workflow-only, so experiments/ is moot)
- java, go: no security.yml / no CodeQL at all.

## Q10. PyPI publishing

python uses trusted publishing (OIDC), no password/token:
- `.github/workflows/release.yml:586-588` `permissions: contents: write / id-token: write`; `:667-669` `uses: pypa/gh-action-pypi-publish@dc37677b2e1c63e2034f94d8a5b11f265b73ba33  # v1.14.2 @ 2026-07-29` with no `password:`; manual release `:715`, `:791-795` (`with: packages-dir:` only). Release preflight also mints the OIDC token (`:244-246`).

## Good practices in templates that links-notation lacks

- **Publish/verify separation** - js `scripts/publish-retry.mjs` (never republish after a verification miss; long exponential backoff) and per-registry wait scripts with tests (csharp `wait-for-nuget.mjs` + `.test.mjs`, rust `wait-for-crate.rs`, go `verify-module-availability.mjs` + test).
- **Release self-healing via artifact checks, not tags** - rust `scripts/check-release-needed.rs`, csharp `scripts/check-release-needed.mjs` (`decide()` pure + unit tested), php `scripts/src/ReleaseDecider.php`.
- **Smoke test of the published package** before creating the GitHub release - js `smoke-test-package.mjs`, rust `smoke-test-published-crate.rs`, csharp `smoke-test-nuget-package.mjs`, python `smoke_test_published_package.py`.
- **Release preflight** that probes all credentials before spending build minutes - `preflight-credentials.*` (rust/js/csharp/python/php).
- **Link-check post-processing** - `recheck-broken-links.*` (js/python retry 429/5xx; others retry connection resets) and `check-web-archive.*` fallback.
- **Pipeline status gate** that turns cancelled/timeout jobs into a red run - `check-pipeline-status.sh`, js `check-status-gate-covers-all-jobs.mjs`.
- **Step budgets** - `run-with-budget-warning.sh` wrapping long steps.
- **Resilient buildx setup** - `.github/actions/setup-buildx-resilient` (retry + mirror.gcr.io fallback) in rust/js.
- **Changesets / changelog fragments** per package (`.changeset/` in js/csharp/java/go, `changelog.d/` in rust/python/php) with validation scripts and multi-changeset merging.
- **Push retry** - js `push-main-with-rebase-retry.mjs` / `push-failure-classifier.mjs`; `simulate-fresh-merge.sh`.
