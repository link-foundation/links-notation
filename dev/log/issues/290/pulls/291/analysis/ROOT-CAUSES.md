# Root-cause inventory

Findings are grouped by class. Every finding names the evidence file that proves it.

Legend for **Signal**: 🔴 false negative (red CI, code is fine) · 🟢 false positive (green CI,
something is actually broken) · ⚠️ warning · 🛡️ hardening.

---

## Class A — Publishing credentials (the two runs the issue reports)

### A1 🔴 `js` / `publishToNpm`: `NPM_TOKEN` does not exist

*Evidence:* `ci-logs/js-33150292364.log` line 1632, `analysis/secrets.txt`.

```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
```

**Root cause.** `.github/workflows/js.yml` writes
`//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}` into `~/.npmrc`. `NPM_TOKEN` is not
defined at repository or organisation level, so the line expands to
`//registry.npmjs.org/:_authToken=` — an empty token. npm treats an empty `_authToken` as *no*
credential and reports `ENEEDAUTH` rather than a 401, which is why the message looks like a
configuration mistake rather than an expiry.

**Fix.** npm OIDC trusted publishing (`permissions: id-token: write` + npm ≥ 11.5.1), which needs no
stored secret at all, with `NODE_AUTH_TOKEN` as an optional bootstrap fallback. This is exactly the
pattern the JS template uses (`templates/js/.github/workflows/release.yml`, the
`Update npm for OIDC trusted publishing` step and the comment at line 521). Until a trusted publisher
is registered, the job must report *"credential missing"* explicitly instead of dying on `npm
publish`.

### A2 🔴 `csharp` / `pushToNuget`: `NUGET_TOKEN` is rejected with 403

*Evidence:* `ci-logs/csharp-33150292349.log` line 1329.

```
Pushing Link.Foundation.Links.Notation.0.15.0.nupkg to 'https://www.nuget.org/api/v2/package'...
  Forbidden https://www.nuget.org/api/v2/package/ 289ms
error: Response status code does not indicate success: 403 (The specified API key is invalid, has
expired, or does not have permission to access the specified package.).
```

**Root cause.** The secret exists and is non-empty (the log shows `NUGETTOKEN: ***`), and it
demonstrably worked in December 2025 because `0.13.0` is on NuGet.org. NuGet.org API keys expire
after at most 365 days, and the last successful push was 2025-12-01 — so the key has expired or its
package-glob no longer covers `Link.Foundation.Links.Notation`.

**Contributing factor.** `analysis/secrets.txt` shows an organisation-level `NUGET_API_KEY` that no
workflow references, while the repository-level `NUGET_TOKEN` that *is* referenced is the failing
one. The workflow should try both.

### A3 🟢 `java` / `publishToMavenCentral`: green for a package that has never existed

*Evidence:* `analysis/job-matrix.txt` (`publishToMavenCentral: success`), `analysis/warnings.txt`
(the `::warning::Skipping Maven Central publishing…` line), `analysis/registry-state.txt`
(Maven Central returns `totalResultCount: 0` and `repo1.maven.org/…/links-notation/maven-metadata.xml`
returns 404), and `gh release list` which contains **no `[Java]` release whatsoever**.

**Root cause.** `java.yml` gates publishing on a `have_creds` check. None of `CENTRAL_USERNAME`,
`CENTRAL_TOKEN`, `GPG_PRIVATE_KEY`, `GPG_PASSPHRASE` exist, so `have_creds=false`, every subsequent
step is skipped, and the job exits 0 → **success**. The `published` output is then `false`, so
`publishRelease` is skipped too.

The intent — *don't fail CI for a missing optional credential* — is right. The defect is that the
outcome is indistinguishable from a real release: a green check, no failed job, and the only trace is
a `::warning::` that nobody reads. Java `0.3.0` has never been released.

### A4 🟢 `php` / `publishToPackagist`: green, and it even creates a GitHub release

*Evidence:* `analysis/registry-state.txt` — `https://repo.packagist.org/p2/link-foundation/links-notation.json`
returns `"404 not found, no packages here"`. `analysis/job-matrix.txt` shows
`publishToPackagist: success` and `publishRelease: success`, and `gh release list` shows
`[PHP] 0.2.0` created 2026-08-28.

**Root cause.** The `Notify Packagist about the new version` step contains:

```bash
if [ -z "$PACKAGIST_TOKEN" ] || [ -z "$PACKAGIST_USERNAME" ]; then
  echo "PACKAGIST_USERNAME/PACKAGIST_TOKEN are not configured, skipping Packagist update"
  exit 0
fi
```

Neither secret exists, so the step exits 0 without even a `::warning::`. Worse than A3: because
`publishRelease` is gated on `needs.publishToPackagist.result == 'success'` (job *result*) rather
than on whether anything was published, a GitHub release was created whose notes link to
`https://packagist.org/packages/link-foundation/links-notation` — a package that is not on Packagist.
**The pipeline published a link to a non-existent artifact.**

### A5 🟢 The masking mechanism that hid A1–A4 for eight months

*Evidence:* `analysis/run-history.txt` + run `31445576471`
(`Version 0.13.0 already exists on NPM`, conclusion **success**).

**Root cause.** Every publish job's first step asks *"does this version already exist in the
registry?"* and skips publishing if it does. That is correct for idempotency, but it means the
credential is only ever exercised on a version-bump run. Between 2025-12-09 and 2026-08-20 there were
several green `js`/`csharp` runs that never touched the dead credential.

**Fix.** Separate the two questions. "Is this version already published?" decides whether to *push*.
"Are the credentials usable?" must be validated on **every** run (a cheap authenticated whoami /
metadata call), so credential rot surfaces the day it happens rather than at the next release.

### A6 🟢 No post-publish verification anywhere

*Evidence:* none of the seven publish jobs re-reads the registry after pushing. A3 and A4 would have
been caught on day one by such a check.

**Fix.** After a publish is claimed, poll the registry for the version and fail if it does not
appear. `templates/js/.github/workflows/release.yml` already does this
(`Smoke-test published npm package`, `scripts/smoke-test-package.mjs`). The best-practices document
states the same rule under §13: *"Assert what you shipped."*

---

## Class B — Build and packaging warnings

### B1 ⚠️ C#: 56 nullable-reference warnings

*Evidence:* `analysis/warnings.txt` — `56 Warning(s)` in `ci-logs/csharp-33150292349.log` line 970's
neighbourhood; CS8602/CS8604 across `LinkFormatExtensions.cs` (4) and the test project (52).

The project sets `<Nullable>enable</Nullable>` but the code was never made null-clean, and CI does
not treat warnings as errors, so the count silently grows. The best-practices table for C# says
*".NET analyzers (warnings as errors)"*.

### B2 ⚠️ C#: `NU5048` — `PackageIconUrl` is deprecated

*Evidence:* `analysis/warnings.txt`.
`csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj` uses
`<PackageIconUrl>`; NuGet wants `<PackageIcon>` with the file packed into the `.nupkg`.

### B3 ⚠️ C#: stale `Platform.*` identifiers left over from the rename

*Evidence:* `analysis/other-warnings.txt`:

```
csharp/toc.yml(0,1): warning InvalidFileLink: Invalid file link:(~/api/Platform.links-notation.html).
```

and `ci-logs/csharp-33150292349.log`:

```
The NuGet package does not exist at https://globalcdn.nuget.org/packages/platform.links-notation.0.15.0.nupkg
```

The repository was renamed from `Platform.Protocols.Lino` to `Link.Foundation.Links.Notation`, but
three artefacts still carry the old name: the DocFX `toc.yml` link, the package-existence probe
inside the external publish script, and `<Description>Link.Foundation's Platform.Protocols.Lino Class
Library</Description>` in the `.csproj`.

### B4 ⚠️ C#: `InvalidCref` in generated parser documentation

*Evidence:* `analysis/other-warnings.txt` —
`warning: InvalidCref: Invalid cref value "!:IList<Link<string>>"` from the Pegasus-generated
`Parser.peg.g.cs`. Generated files should be excluded from documentation analysis.

### B5 ⚠️ Python: `MANIFEST.in` points at a directory that no longer exists

*Evidence:* `analysis/other-warnings.txt`:

```
warning: no files found matching '*.py' under directory 'platform_lino'
warning: no files found matching 'LICENSE'
```

`python/MANIFEST.in` contains `recursive-include platform_lino *.py`, but the package directory is
`python/links_notation`. `include LICENSE` also fails because `LICENSE` lives at the repository root,
not in `python/`. Same rename debris as B3.

### B6 ⚠️ Python: deprecated `pyproject.toml` license metadata, removal dated 2027-02-18

*Evidence:* `analysis/other-warnings.txt`:

```
SetuptoolsDeprecationWarning: `project.license` as a TOML table is deprecated
SetuptoolsDeprecationWarning: License classifiers are deprecated.
By 2027-Feb-18, you need to update your project and remove deprecated calls
```

`python/pyproject.toml` has `license = {text = "Unlicense"}` and a
`"License :: Public Domain"` classifier. PEP 639 replaces both with `license = "Unlicense"`.
This is a dated future build break, not just noise.

### B7 ⚠️ Java: `system modules path not set in conjunction with -source 11`

*Evidence:* `analysis/other-warnings.txt` (`[WARNING] system modules path not set…`).
`java/pom.xml` sets `maven.compiler.source`/`target` to 11 while building on a newer JDK. The
supported form is `maven.compiler.release`, which also guarantees the produced bytecode really is
JDK-11 compatible instead of merely claiming to be.

### B8 ⚠️ Java: illegal reflective access from google-java-format

*Evidence:* `analysis/other-warnings.txt` — `WARNING: An illegal reflective access operation has
occurred … com.google.googlejavaformat`. Spotless runs `google-java-format` 1.19.2 on JDK 11; the
formatter needs `--add-exports` JVM flags on modern JDKs.

### B9 ⚠️ Rust: `cargo publish --token` is deprecated

*Evidence:* `analysis/other-warnings.txt` —
``warning: `cargo publish --token` is deprecated in favor of using `cargo login` and environment
variables``. Passing the token on the command line also risks it appearing in process listings.
Use the `CARGO_REGISTRY_TOKEN` environment variable.

### B10 ⚠️ JS: Prettier is downloaded at CI time instead of being pinned

*Evidence:* `analysis/other-warnings.txt` —
`npm warn exec The following package was not found and will be installed: prettier@3.9.6`.

`js.yml` runs `npx prettier --check .`, but `js/package.json` has **no `prettier` dependency and no
`format` script** — so CI resolves whatever the latest Prettier is, at the moment the job runs. A
Prettier release that changes formatting turns the `format` job red on a commit that changed nothing,
and there is no local command a contributor can run to reproduce the check. This is a
false-negative generator by construction.

---

## Class C — Caching defects

### C1 ⚠️ Rust: the build cache is never saved

*Evidence:* `analysis/other-warnings.txt` (`Path Validation Error: Path(s) specified in the action
for caching do(es) not exist`) and `ci-logs/rust-33150292344.log`, where only
`Linux-cargo-registry-…` appears in a `Cache saved with key:` line — `Linux-cargo-build-target-…`
never does.

**Root cause.** `defaults.run.working-directory: rust` applies only to `run:` steps, **not** to
action inputs. `actions/cache` is given `path: target`, which resolves against the workspace root, so
it looks for `<workspace>/target` while Cargo actually builds into `<workspace>/rust/target`. Every
Rust CI run therefore compiles all dependencies from scratch.

### C2 ⚠️ Rust: the Cargo-index cache saves nothing and warns every run

`path: ~/.cargo/git` only exists when there are git dependencies; there are none. The step exists
only to produce a warning.

### C3 ⚠️ Cache keys have no `restore-keys`

All three Rust caches key on `hashFiles('**/Cargo.lock')` with no fallback, so any dependency change
discards the entire cache instead of restoring the nearest one.

---

## Class D — Workflow-structure and best-practice gaps

Measured against `analysis/CI-CD-BEST-PRACTICES.md`.

### D1 🛡️ No `permissions:` block on 8 of 10 workflows

*Evidence:* the audit in this folder's `job-matrix.txt` generation step; only `AutoMerge.yml` and
`pages.yml` declare `permissions`. Every other workflow runs with the repository-default token scope.
Best practice §9/§11 and every template start from `permissions: contents: read` and escalate
per-job.

### D2 🛡️ No concurrency control on 9 of 10 workflows (best practice §10)

Only `pages.yml` has a `concurrency` block. Nothing prevents two overlapping pushes to `main` from
racing two `publishRelease` jobs, and nothing cancels superseded PR checks. §10 requires
cancellable `check-…` groups for read-only jobs and a shared non-cancellable
`main-writer-…` group for every job that writes to `main` or an external registry.

### D3 🛡️ `csharp.yml` executes unpinned remote shell scripts

*Evidence:* `ci-logs/csharp-33150292349.log`:

```
wget "$SCRIPTS_BASE_URL/push-csharp-nuget.sh"
--2026-08-28 07:08:27--  https://raw.githubusercontent.com/linksplatform/Scripts/main/MultiProjectRepository/push-csharp-nuget.sh
bash ./push-csharp-nuget.sh
```

Four such scripts are fetched from the **`main` branch** of a different repository at run time, with
no pinning and no checksum, and then executed with the NuGet key in the environment. Whoever can push
to `linksplatform/Scripts` can exfiltrate this repository's publishing credentials. This is also the
source of the wrong `platform.links-notation` package name in B3 — the repository cannot fix that bug
without either patching the script with `sed` (which `csharp.yml` already does twice, itself a smell)
or vendoring it.

### D4 🛡️ Secrets interpolated directly into shell script bodies

`java.yml` contains `if [ -n "${{ secrets.CENTRAL_USERNAME }}" ]`. Template expansion happens before
the shell sees the text, so a secret containing a quote or `$(…)` becomes shell code. Secrets must be
passed via `env:` and referenced as `"$VAR"`.

### D5 🛡️ Jobs without `timeout-minutes`

`AutoMerge.yml/auto-merge`, `csharp.yml/{publishRelease,generatePdfWithCode,publishDocumentation}`,
and all three `pages.yml` jobs have no timeout. Best practice §5 requires one on every job.

### D6 ⚠️ `if:` conditions reference jobs that are not in `needs:`

Three `csharp.yml` jobs (`pushToNuget`, `generatePdfWithCode`, `publishDocumentation`) test
`needs.findChangedCsFiles.outputs.isCsFilesChanged` while listing only `needs: [test]`. It happens to
work because the value is reachable transitively, but the `needs` context is documented in terms of
direct dependencies; the condition is one refactor away from silently evaluating to `false` and
skipping every publish job — which, given A5, would look exactly like success.

### D7 ⚠️ `pages.yml` cannot be run manually

`workflow_dispatch` is declared, but `build`/`deploy` are gated on
`isDocsFilesChanged`, computed by `tj-actions/changed-files` against the previous commit. A manual
dispatch on an unchanged tree skips both jobs and reports success without deploying anything —
another green-but-did-nothing outcome.

### D8 ⚠️ `pages.yml` uses an artifact action that still targets Node 20

*Evidence:* `analysis/warnings.txt` — `Node.js 20 is deprecated. The following actions target Node.js
20 but are being forced to run on Node.js 24: actions/upload-artifact@ea165f8d…`, reached through
`actions/upload-pages-artifact@v4`.

### D9 ⚠️ `php.yml` reads the version from `composer.json`

Packagist derives versions from git tags and
[explicitly recommends against](https://getcomposer.org/doc/04-schema.md#version) a `version` field in
`composer.json`. The repository has one (`0.2.0`), so the PHP version is maintained in a place
Packagist ignores.

### D10 ⚠️ Version drift across languages

`analysis/registry-state.txt`: js/csharp/rust/python/go are all at `0.15.0`, while `java/pom.xml` is
at `0.3.0` and `php/composer.json` at `0.2.0`. Nothing in CI notices or reports this.

### D11 🛡️ `DEPENDABOT_AUTO_MERGE_TOKEN` is configured but unused

`AutoMerge.yml` uses `secrets.GITHUB_TOKEN`. A token created for this purpose sits unused, and
`gh pr merge --auto` with `GITHUB_TOKEN` cannot trigger the downstream workflows that a real merge
would — so Dependabot auto-merges may not be validated.

---

## Class E — Documentation and dependency defects found while auditing the pipeline

These were not in the issue body, but the issue asks for "all false positives, false negatives,
warnings and errors in CI/CD". Each of the four is a check that no workflow performed, so nothing
ever reported them.

### E1 🟢 The C# API reference is published, and unreachable

*Evidence:*

- `gh api repos/link-foundation/links-notation/pages` → `"build_type": "workflow"`.
- `gh api repos/link-foundation/links-notation/contents/csharp/api?ref=gh-pages` lists
  `Link.Foundation.Links.Notation.html` and its siblings, and the branch tip is
  `Deploy to GitHub Pages: 4958f3c…` (2026-08-28), so publishing genuinely happens.
- `https://link-foundation.github.io/links-notation/` → 200,
  `https://link-foundation.github.io/links-notation/csharp/api/Link.Foundation.Links.Notation.html`
  → **404**.

**Root cause.** The site has two publishers and only one wins. `csharp/scripts/publish-docs.sh`
pushes the DocFX output to the `gh-pages` branch, which is how Pages worked when the site was
branch-served. `pages.yml` later started uploading the Docusaurus build as a Pages *artifact*, which
switched the deployment source to `build_type: workflow` — from that moment the `gh-pages` branch
stopped being served at all. The C# job stayed green because pushing to a branch always succeeds; a
push is not evidence of a reachable page.

**Fix (in this PR, `7f1312f`).** `pages.yml` overlays the `gh-pages` branch content onto
`docs/website/dist` before uploading, so one artifact carries both the website and the API
reference, and a `workflow_run` trigger on the `csharp` workflow rebuilds the site when the branch
changes. The overlay warns rather than fails when the branch or `csharp/index.html` is absent.

### E2 🟢 The pre-commit generator has been dead since the Rust workspace restructure

*Evidence:* `node scripts/create-test-case-comparison.mjs` →
`Error: ENOENT: no such file or directory, scandir '…/rust/tests'`.

**Root cause.** The Rust code moved into a Cargo workspace (`rust/links-notation/tests`), but the
generator still scanned `rust/tests`. `.githooks/pre-commit` runs the generator and fails the commit
when it fails — so the hook was failing for anyone who had installed it, and
`TEST_CASE_COMPARISON.md` silently stopped being regenerated. No CI job runs the generator, so
nothing reported the rot.

**Fix (`5da368d`).** Point the generator at the workspace path. Regenerating changed the recorded
counts from 137/138/138/140 to Python 146, JavaScript 204, Rust 283, C# 196 — the document had been
under-reporting the test suite by roughly a third.

### E3 🟢 Every link in `TEST_CASE_COMPARISON.md`, and several in the READMEs, was dead

*Evidence:* lychee over the tracked Markdown reported 566 "File not found" errors before the fix and
`827 Total … 827 OK 🚫 0 Errors` after it.

**Root cause.** Three independent instances of the same class — a link written to a target that does
not exist, with no link checker to notice:

1. The generator emitted `path/to/file.rs:88`. GitHub treats the `:88` as part of the path, so all
   827 links 404'd. The anchor GitHub understands is `#L88`.
2. `README.md` and `README.ru.md` pointed at `rust/README.md`, which moved to
   `rust/links-notation/README.md` in the same workspace restructure as E2.
3. `CHANGELOG.md` linked to `v0.11.2`/`v0.11.0` tags and a `compare/v0.11.2...HEAD` range. This
   repository has never tagged a unified `vX.Y.Z`; every release carries a per-language tag, so all
   three URLs 404'd. They now use `0.11.2_rust`/`0.11.0_rust`, verified 200.

**Fix (`a659d1e`).** All three corrected, plus `.github/workflows/links.yml` so the class cannot
recur, plus `.lycheeignore` for the two hosts that reject data-centre IPs (npmjs.com,
stackoverflow.com) — verified false positives, not broken links.

### E4 🟢 A live high-severity advisory sat in `js/package-lock.json`

*Evidence:* `npm audit --package-lock-only --audit-level=high` in `js/` reported
GHSA-mh99-v99m-4gvg / GHSA-rgw5-rvv9-x895 (`brace-expansion` ReDoS) against `brace-expansion@5.0.8`.

**Root cause.** No workflow ran `npm audit`, `dependency-review`, CodeQL or any secret scanner, so a
known advisory could sit in the lockfile indefinitely. `js/bun.lock` already carried the fixed
`5.0.9`, which is why the bun-based test jobs were unaffected — the two lockfiles had drifted.

**Fix (`262237a`, `1cc62db`).** `npm audit fix --package-lock-only` (now `found 0 vulnerabilities`),
plus `security.yml`: CodeQL across all seven languages that have an extractor, dependency review on
pull requests, TruffleHog over the full history with `--results=verified`, and `npm audit` over both
`js` and `docs/website`.

---

## Class F — Found by the checks this pull request added, on their own first runs

The `workflows` and `security` jobs did not exist before this branch. Their first run on the branch
failed, and the `php` matrix defect below had been hiding in plain sight on `main` for as long as
the matrix has existed. This class is the evidence that the new checks earn their place.

### F1 🔴 62 shellcheck findings across every workflow, and the local check that missed them

*Evidence:* run [33157275428](https://github.com/link-foundation/links-notation/actions/runs/33157275428),
job `actionlint`.

The very first run of the new `workflows` job reported 62 findings, dominated by **SC2086**
(`echo "x=1" >> $GITHUB_OUTPUT` — an unquoted expansion that word-splits if the path ever contains a
space), plus **SC2129** (a run of individual `>>` redirects that should be one `{ … } >> file`
block in `java.yml`) and **SC2028** (`echo` in `bom-check.yml` printing `\xEF\xBB\xBF`, which `echo`
is permitted to expand, so the hint it prints to the user could differ from the command they need
to run).

**Root cause of the finding:** never linted. Nothing in this repository had ever run shellcheck over
a `run:` block.

**Root cause of the false negative:** before pushing, a native `actionlint` binary was run locally
over the same tree and exited `0`. actionlint does not implement shell linting itself — it shells
out to `shellcheck`, and when `shellcheck` is not on `PATH` it **silently skips every shell check
and exits clean**. There is no warning and no non-zero exit; a local check that looks identical to
the CI job is simply not the same check. The CI job uses `docker://rhysd/actionlint:1.7.7`, whose
image bundles shellcheck and pyflakes, which is why it saw all 62.

**Fix (`0145b58`).** All 62 findings fixed — 56 quoted env-file redirects (`>> "$GITHUB_OUTPUT"`
and the same for `$GITHUB_PATH`, `$GITHUB_ENV`, `$GITHUB_STEP_SUMMARY`), the `java.yml` block
redirect, and `printf '%s\n'` in `bom-check.yml`. The trap itself is documented in a comment above
the actionlint step in `workflows.yml`, so the next person who reproduces locally knows to put
shellcheck on `PATH` first.

### F2 🔴 The secret scan aborted before reading a single commit

*Evidence:* run [33157275365](https://github.com/link-foundation/links-notation/actions/runs/33157275365),
job `Secret scan`: `trufflehog: error: flag 'no-update' cannot be repeated, try --help`.

**Root cause.** `trufflesecurity/trufflehog` is a composite action that already appends
`--no-update`, `--fail` and `--github-actions` to the command line it builds. Passing `--no-update`
again through `extra_args` produced a duplicate flag, and the trufflehog CLI rejects a repeated flag
outright rather than ignoring it. The job failed in the CLI's argument parser, having scanned
nothing.

A second, quieter defect sat next to it: the action's `version` input defaults to `latest`, so the
pinned action ref pinned the *wrapper* while the *scanner* floated. The obvious pin, `v3.97.1`, does
not exist — the ghcr image tags carry no `v` prefix (`docker run ghcr.io/trufflesecurity/trufflehog:v3.97.1`
answers `manifest unknown`), unlike the action ref of the same release.

**Fix (`189a653`).** `extra_args` reduced to `--results=verified`, `version: 3.97.1` added, both
with comments recording why. Verified afterwards on a real run: `chunks: 6381, bytes: 13768140,
verified_secrets: 0`, exit 0.

### F3 🟢 `php` reported on one version while claiming to test four

*Evidence:* run [33157275418](https://github.com/link-foundation/links-notation/actions/runs/33157275418).
Jobs `test (8.1)`, `test (8.2)` and `test (8.3)` were all cancelled at `2026-08-28T08:56:17Z` — the
same second they started, having executed no steps — while `test (8.4)` ran to completion. The
workflow was green.

**Root cause.** The job-level concurrency group was matrix-blind:

```yaml
group: ${{ github.workflow }}-${{ github.ref }}-test
```

Every leg of the matrix evaluates that expression to the *same* string, so the four legs contend for
one concurrency group and, with `cancel-in-progress` true off `main`, each new leg cancels the ones
already running. Whichever leg starts last survives. Because a cancelled job does not fail its
workflow, the run stays green and the summary still lists four legs — so the repository has been
testing one PHP version, not four, for as long as this group has been in place.

**Fix (`31ec6aa`).** `-${{ matrix.php-version }}` appended to the group. An `awk` sweep over every
job in every workflow confirmed `php.yml` was the only place a matrix job shared one group; the
matrix jobs in `security.yml` (`codeql`, `npmAudit`) already keyed on their matrix value.
Verified on the next run: 8.1, 8.2, 8.3 and 8.4 all completed.

### F4 🟢 Coverage has never been uploaded, and the step reported success anyway

*Evidence:* `go` run 33157870713, step `Upload coverage`:

```
info  -- Upload queued for processing complete
error -- Upload queued for processing failed: {"message":"Token required - not valid tokenless upload"}
##[end-action ...;outcome=success;conclusion=success]
```

**Root cause.** Codecov requires an upload token; `gh api repos/link-foundation/links-notation/actions/secrets`
lists only `DEPENDABOT_AUTO_MERGE_TOKEN`, `NUGET_TOKEN` and `PYPI_TOKEN`, so `CODECOV_TOKEN` does
not exist and the upload cannot succeed. The step carried `fail_ci_if_error: false`, which turns
that permanent failure into a green step. This is the same shape as A1–A4: a credential that is
absent, and a job that reports success regardless.

**Fix.** The step now runs only when the secret is configured (`if: env.CODECOV_TOKEN != ''`, with
the secret exposed as job-level env because a step `if:` cannot read the `secrets` context), passes
the token explicitly, and uses `fail_ci_if_error: true` so a genuine upload failure is visible. When
the secret is absent the job emits `::notice::CODECOV_TOKEN is not configured, so coverage was not
uploaded` instead of a failure it ignores. Adding the secret is a repository-settings action outside
a pull request's reach; until it is added, the state is now stated rather than hidden.

### F5 ⚠️ Codecov uploaded an unrelated experiment file under the `go` flag

*Evidence:* the same step: `Found 2 coverage files to report` →
`experiments/test_coverage_data.json` and `go/coverage.out`.

**Root cause.** `files:` narrows what the action passes as `--file`, but it does not disable the
CLI's workspace search, so anything that looks like a coverage report is picked up as well.
`experiments/test_coverage_data.json` is a hand-written analysis artefact, not coverage, and it was
being reported against the `go` flag.

**Fix.** `disable_search: true`.

### F6 ⚠️ The website build warned on every run

*Evidence:* `pages` run 33157870661, step `Build website`:
`(!) Your Vite config uses features that are unsupported by 'configLoader: native' … ESM syntax in a
file loaded as CommonJS (vite.config.js:1:1)`.

**Root cause.** `docs/website/vite.config.js` is ESM (`import { defineConfig } from "vite"`), but
`docs/website/package.json` declared no `"type"`, so Node treats a `.js` file as CommonJS. Vite
currently falls back to bundling the config, and warns that the loader it plans to make the default
will not.

**Fix.** `"type": "module"` in `docs/website/package.json`. The only other `.js` file in that
directory, `script.js`, is already loaded by the browser as `<script type="module">` and uses no
`require()`, so nothing else changes. `npm ci && npm run build` reproduces the warning before and
builds clean after.

---

## The single sentence version

Six publish jobs were written independently, so the same condition — *"the credential for this
registry is missing or dead"* — is handled six different ways: two hard-fail the build (🔴 js,
csharp), two silently succeed (🟢 java, php), and none of the six verifies afterwards that the
artifact actually reached the registry (🟢 A6). On top of that, all six only exercise the credential
on a version-bump run (🟢 A5), which is why eight months of green builds hid the problem.
