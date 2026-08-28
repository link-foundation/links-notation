# Reconstructed timeline

Every claim below is backed by a file in this folder. Run IDs link to the raw log in `../ci-logs/`.

## Phase 1 — everything works (until 2025-12-09)

`analysis/run-history.txt` shows `js` and `csharp` green on every default-branch run up to
`2025-12-09`. `analysis/npm-versions.txt` and `analysis/nuget-versions.json` confirm the last
successful publications:

| Registry | Last published version | Date |
| --- | --- | --- |
| npm `links-notation` | `0.13.0` | 2025-12-01 |
| NuGet `Link.Foundation.Links.Notation` | `0.13.0` | 2025-12-01 |

`gh release list` agrees: `[JS] 0.13.0` and `[C#] 0.13.0` are the newest JS/C# releases, both dated
2025-12-01.

## Phase 2 — credentials rot silently (2025-12-09 → 2026-08-20)

At some point in this window the npm and NuGet credentials stopped working. **Nothing turned red.**

The masking mechanism is the `Check if version already published` step that every publish job runs
first. From run `31445576471` (2026-08-11, `js`, conclusion **success**):

```
Version 0.13.0 already exists on NPM
```

Because the version in `js/package.json` had not been bumped past the last successful publish, the
publish step was skipped by `if: steps.version-check.outputs.should_publish == 'true'`, the job
reported success, and the dead credential was never exercised. The same applies to `csharp`.

This is the single most important finding: **the pipeline can only detect broken publishing
credentials on the exact run that also bumps the version.** On every other run the failure is
invisible.

## Phase 3 — the version bump exposes the rot (2026-08-20)

Commit `b5b8e5c5` bumped the versions to `0.14.0`. Both publish jobs finally executed and failed.

`ci-logs/js-32333201175-first-failure.log`:

```
Version 0.14.0 does not exist on NPM
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
```

`ci-logs/csharp-32333201146-first-failure.log` fails the same way with NuGet.

Rust, Python and Go published `0.14.0` normally on the same day (`gh release list` shows
`rust_0.14.0`, `python_0.14.0`, `go/v0.14.0`, all 2026-08-20). npm and NuGet were left behind.

## Phase 4 — the state the issue reports (2026-08-28, commit `4958f3c`)

Versions were bumped to `0.15.0`. `analysis/job-matrix.txt`:

| Workflow | Conclusion | Failing job | Cause |
| --- | --- | --- | --- |
| `csharp` | failure | `pushToNuget` | `403 (The specified API key is invalid, has expired, or does not have permission…)` |
| `js` | failure | `publishToNpm` | `npm error code ENEEDAUTH` |

Everything else is green — but two of those greens are false.

## The credential inventory that explains all of it

`analysis/secrets.txt` lists every secret the workflows can actually see:

```
repo: DEPENDABOT_AUTO_MERGE_TOKEN
repo: NUGET_TOKEN
repo: PYPI_TOKEN
org:  CARGO_TOKEN
org:  DOCKERHUB_TOKEN
org:  NUGET_API_KEY
```

Cross-referencing with what the workflows reference:

| Workflow | Secret referenced | Exists? | Consequence |
| --- | --- | --- | --- |
| `python.yml` | `PYPI_TOKEN` | yes | PyPI `0.15.0` published ✅ |
| `rust.yml` | `CARGO_TOKEN` | yes (org) | crates.io `0.15.0` published ✅ |
| `csharp.yml` | `NUGET_TOKEN` | yes, but rejected with 403 | **red CI**, NuGet stuck at `0.13.0` |
| `js.yml` | `NPM_TOKEN` | **no** | **red CI**, npm stuck at `0.13.0` |
| `java.yml` | `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY`, `GPG_PASSPHRASE` | **none** | **green CI**, never published at all |
| `php.yml` | `PACKAGIST_USERNAME`, `PACKAGIST_TOKEN` | **none** | **green CI**, never published at all |

Note `NUGET_API_KEY` exists at organisation level and is never referenced by any workflow, while the
repository-level `NUGET_TOKEN` that *is* referenced is the one returning 403.

## The two symmetric failure modes

The same missing-credential condition produces opposite — and both wrong — signals, purely because
the six publish jobs were each written independently:

- **False negative (red for the wrong reason).** `js` and `csharp` hard-fail the whole workflow on a
  credential problem. Nothing is wrong with the code; every test passed
  (`Passed! - Failed: 0, Passed: 196` for C#, `0 fail` for JS). The red mark blocks merges and
  misdirects both humans and AI solvers to look for a code defect that does not exist.
- **False positive (green while shipping nothing).** `java` and `php` detect the missing credential,
  emit a warning and `exit 0`. `java`'s `publishToMavenCentral` is **success** on every run, yet
  `analysis/registry-state.txt` shows Maven Central has **zero** artifacts for
  `io.github.link-foundation:links-notation`, and `gh release list` contains **no `[Java]` release at
  all**. Packagist returns `404 not found, no packages here` for
  `link-foundation/links-notation`, yet `publishToPackagist` is **success** and a `[PHP] 0.2.0`
  GitHub release was created announcing a package that does not exist.

The `java` case is the most severe: a green check mark has been reporting a successful release
pipeline for a package that has never existed, since the workflow was introduced.

## A second sequence, found while auditing: the documentation site

The publishing failures in the issue are one strand; auditing the rest of the pipeline surfaced a
second, older one with the same shape — a step that succeeds while the thing it exists to do stops
happening.

| When | Event | Consequence |
| --- | --- | --- |
| early | `csharp/scripts/publish-docs.sh` pushes the DocFX site to the `gh-pages` branch | The API reference is served, because Pages is branch-served |
| later | `pages.yml` starts uploading the Docusaurus build with `upload-pages-artifact` | The Pages deployment source flips to `build_type: workflow`; the `gh-pages` branch stops being served entirely |
| every run since | The C# job pushes to `gh-pages` and reports success | Every `/csharp/` URL advertised by the READMEs returns 404, and nothing reports it (E1) |
| the Rust workspace restructure | `rust/tests` becomes `rust/links-notation/tests` | `scripts/create-test-case-comparison.mjs` starts failing with `ENOENT`, taking `.githooks/pre-commit` down with it (E2); `TEST_CASE_COMPARISON.md` freezes with 827 links that 404 (E3) |
| the same restructure | `rust/README.md` moves under `rust/links-notation/` | Both root READMEs keep linking to the old path (E3) |
| unknown | `brace-expansion` advisory published | `js/package-lock.json` keeps the vulnerable version while `js/bun.lock` gets the fix; no audit job exists to notice (E4) |

The common factor with the publishing strand is the same one named in the summary above: **the check
that would have caught it did not exist**. A push to a branch was treated as evidence of a reachable
page, a generator failure was invisible because nothing in CI ran the generator, and a dependency
advisory was invisible because nothing in CI ran an audit. This PR adds the missing checks —
`links.yml`, `security.yml`, `workflows.yml` and the post-publish registry verification — so each of
these classes fails loudly the next time it happens.
