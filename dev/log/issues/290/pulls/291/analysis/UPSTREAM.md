# Upstream work — other repositories and human-only actions

Issue #290 asks: *"if the same issue is found in template report issue also in templates"*, and the
task brief asks for upstream reports with reproducible examples, workarounds and code fixes. This
file records both the reports and the things **only a repository administrator can do**, because
several requirements cannot be closed from inside a pull request.

---

## Part 1 — Actions required from a maintainer (blockers for R1)

None of these can be performed by CI or by this pull request. Until they are done, the corresponding
publish job will correctly report **skipped** with a warning instead of failing (which is itself the
fix for R3.1), but no artifact will be published.

| # | Action | Why | Blocks |
|---|---|---|---|
| M1 | On npmjs.com, add a **trusted publisher** for `links-notation`: owner `link-foundation`, repository `links-notation`, workflow `js.yml`. | `NPM_TOKEN` does not exist (root cause A1). Trusted publishing needs no stored secret and enables provenance automatically. | js 0.14.0 and 0.15.0 |
| M1-alt | *Or* create an npm automation token and add it as the `NPM_TOKEN` repository secret. | Bootstrap path if a trusted publisher cannot be registered — npm requires the package to exist, which it does (0.13.0 is published), so M1 should work directly. | as above |
| M2 | Rotate the NuGet.org API key and update the `NUGET_TOKEN` repository secret, **or** re-scope the existing organisation secret `NUGET_API_KEY` to cover `Link.Foundation.Links.Notation`. | The current key returns `403 (The specified API key is invalid, has expired, or does not have permission…)` (root cause A2). NuGet.org keys expire after at most 365 days and the last successful push was 2025-12-01. | csharp 0.14.0 and 0.15.0 |
| M3 | Decide whether Java should be published at all. If yes, create `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY`, `GPG_PASSPHRASE`. If no, remove `publishToMavenCentral`. | The job has been green for months while Maven Central has **zero** artifacts for this group (root cause A3). | java 0.3.0 |
| M4 | Decide whether PHP should be published at all. If yes, submit the repository to Packagist once (Packagist requires an initial manual submission) and create `PACKAGIST_USERNAME` / `PACKAGIST_TOKEN`. | `repo.packagist.org` returns *"404 not found, no packages here"* (root cause A4). The API token only triggers a re-crawl; it cannot create the package. | php 0.2.0 |
| M5 | Delete or edit the GitHub release **`[PHP] 0.2.0`**. | Its release notes link to `https://packagist.org/packages/link-foundation/links-notation`, which does not exist. This is the concrete harm caused by A4 and it is already published to users. | R2.5 |
| M6 | Consider registering crates.io trusted publishing for `links-notation` and `links-notation-macro`, and PyPI trusted publishing for `links-notation`. | Both currently work via long-lived tokens (`CARGO_TOKEN`, `PYPI_TOKEN`) — i.e. they are in exactly the state npm/NuGet were in before their tokens rotted. This is preventative, not a fix. | R5.4 (hardening) |
| M7 | Either use `DEPENDABOT_AUTO_MERGE_TOKEN` in `AutoMerge.yml` or delete the secret. | The secret exists and no workflow references it (D11). | D11 |

A machine-readable copy of the credential inventory is in `secrets.txt`.

---

## Part 2 — Issues to report against the pipeline templates

Scope checked: the seven repositories named in issue #290,
`link-foundation/{rust,js,csharp,python,php,java,go}-ai-driven-development-pipeline-template`.
Snapshots of every `.github` tree used for this comparison are under `../templates/`.

### Good news first — defects that are *not* in the templates

The templates are, on the whole, ahead of this repository. Specifically they already do what
`ROOT-CAUSES.md` A6 asks for:

- `csharp` gates release creation on `steps.nuget_publish.outputs.published == 'true'` and then runs
  *Wait for NuGet indexing* + *Smoke-test published NuGet package*.
- `js` runs `scripts/smoke-test-package.mjs` after publishing.
- `python` runs `scripts/smoke_test_published_package.py`.
- `rust` runs *Wait for Crate availability on Crates.io* + `smoke-test-published-crate.rs`.
- `php` runs *Wait for Packagist to import the release*.

So the false-positive class (A3/A4) is a defect of **this repository's** hand-written workflows, not
of the templates, and no issue is warranted for it.

### U1 — `java` and `go` templates: cancellable workflow-level concurrency around release jobs

**Repositories:** `java-ai-driven-development-pipeline-template`,
`go-ai-driven-development-pipeline-template`.

**Evidence.** `java/.github/workflows/release.yml` lines 33–35 and
`go/.github/workflows/release.yml` lines 31–33:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Both workflows contain jobs that write to `main` and to the releases API (`auto-release`,
`manual-release-instant`, `changeset-pr`).

**Why this is a bug.** The organisation's own
[CI-CD-BEST-PRACTICES.md §10](https://github.com/link-assistant/hive-mind/blob/main/docs/CI-CD-BEST-PRACTICES.md)
says: *"Do not put cancellable concurrency at workflow level when the workflow has write jobs.
Cancelling the workflow would also interrupt a writer that has already started."* The other five
templates comply — `csharp` and `php` use
`cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`, and `python`/`rust` use per-job groups
with a `-main-write` group at `cancel-in-progress: false`.

**Reproducible example.** Push two commits to `main` within a few seconds. The second run's
`concurrency` evaluation cancels the first run *including* `auto-release`, which can be interrupted
between `version-and-commit.mjs` (which pushes a version bump and tag to `main`) and
`Create GitHub Release` / `Upload release artifacts`. The result is a tagged, version-bumped commit
on `main` with no GitHub release and no artifacts — and because the next run sees the bumped version
as already released, it will not retry.

**Workaround.** Merge to `main` one commit at a time, or re-run the cancelled release job manually.

**Suggested fix.** Replace the workflow-level block with per-job concurrency, matching `python`:

```yaml
# workflow level: delete the block entirely, then per job:
  lint:
    concurrency:
      group: check-${{ github.workflow }}-${{ github.ref }}-lint
      cancel-in-progress: true

  auto-release:
    concurrency:
      group: main-writer-${{ github.repository }}-main
      cancel-in-progress: false
      queue: max
```

### U2 — `java` and `go` templates: `always()` where `!cancelled()` is required

**Repositories:** same two.

**Evidence.** `java/.github/workflows/release.yml` line 125:

```yaml
if: always() && (github.event_name == 'push' || github.event_name == 'workflow_dispatch' || needs.changeset-check.result == 'success' || needs.changeset-check.result == 'skipped')
```

and line 163 (`build`). `go` has one occurrence. Counts across the templates —
`java`: 2 × `always()`, 0 × `!cancelled()`; `go`: 1 × `always()`, 0 × `!cancelled()`; whereas
`rust`: 1/14, `python`: 1/8, `js`: 3/8.

**Why this is a bug.** §10 again: *"Use `!cancelled()` instead of `always()` in job conditions so
cancellation propagates correctly through the job graph. A bare `always()` can keep downstream work
running after cancellation."* Combined with U1 this is actively harmful: U1 makes cancellation
routine, and U2 makes `test`/`build` keep running after the user pressed cancel, burning runner
minutes and reporting results for a run that was abandoned.

**Reproducible example.** Start a run, press *Cancel workflow*. `lint` cancels; `test` and `build`
still execute to completion because `always()` is true for a cancelled dependency.

**Workaround.** None from the caller's side.

**Suggested fix.** `if: always() && (…)` → `if: !cancelled() && (…)` at both sites in `java` and the
one site in `go`. No other semantics change, because every existing clause already tests
`needs.*.result` explicitly.

### U3 — `go` template: workflow-level write permissions granted to read-only jobs

**Repository:** `go-ai-driven-development-pipeline-template`.

**Evidence.** `go/.github/workflows/release.yml` lines 35–38:

```yaml
permissions:
  contents: write
  pull-requests: write
```

declared at workflow level, therefore inherited by **every** job, including lint and test.

**Why this is a bug.** Least privilege: only the release job needs `contents: write`. Every other job
runs third-party code (module downloads, linters) with a token that can push to `main`. `csharp`,
`js`, `python`, `rust` and `php` templates all start from `permissions: contents: read` and escalate
per job.

**Reproducible example.** Any dependency in the lint job can read `GITHUB_TOKEN` from the runner
environment and push to the default branch; nothing in the workflow restricts it.

**Workaround.** None for a consumer of the template.

**Suggested fix.**

```yaml
permissions:
  contents: read

jobs:
  # ...
  auto-release:
    permissions:
      contents: write
      pull-requests: write
```

### U4 — `java` and `go` templates: no post-publish verification

**Repositories:** same two.

**Evidence.** Grepping all seven templates for `smoke`, `Wait for`, `Verify published` returns hits
in `csharp`, `js`, `python`, `rust` and `php`, and **nothing** in `java` and `go`.

**Why this matters.** Both templates create a GitHub release announcing a version, but neither
verifies that the version is actually resolvable by a consumer. This is the exact defect (A6/R2.3)
that let `link-foundation/links-notation` publish a `[PHP] 0.2.0` release pointing at a package that
does not exist on Packagist — the failure mode is not theoretical.

**Reproducible example (go).** Release `v1.2.3`. The tag is created and a GitHub release is
published. `GOPROXY` has not fetched the module yet, so
`go get example.com/mod@v1.2.3` fails for anyone who follows the release notes, and if the tag was
malformed (missing `v` prefix, or a `/v2+` module path without the matching directory) it will
*never* resolve, with no CI signal at all.

**Suggested fix (go).** After creating the tag, poll the module proxy — this also warms the proxy
cache for the first consumer:

```yaml
- name: Verify module is resolvable
  run: |
    MODULE=$(go list -m)
    for i in $(seq 1 30); do
      if curl -fsS "https://proxy.golang.org/$(echo "$MODULE" | tr 'A-Z' '!a-z')/@v/${TAG}.info"; then
        echo "resolved"; exit 0
      fi
      sleep 10
    done
    echo "::error::${MODULE}@${TAG} did not become resolvable via proxy.golang.org"
    exit 1
```

**Suggested fix (java).** The template does not publish to Maven Central at all — it only attaches
JARs to the GitHub release. Either document that explicitly in the template README (so downstream
repositories do not assume Maven Central publishing exists — this repository did assume it, which is
root cause A3), or add a `deploy` job plus a
`https://repo1.maven.org/maven2/<group-path>/<artifact>/<version>/` poll.

### Not reported

- **Unpinned action tags.** No template pins `uses:` to a commit SHA, and neither does this
  repository. Given CVE-2025-30066 (where `tj-actions/changed-files` tags `v1`–`v45.0.7` were
  retargeted to a secret-exfiltrating commit) this is worth doing, but it is a deliberate,
  repository-wide policy decision rather than a defect, and Dependabot's `github-actions` ecosystem
  handles the maintenance burden. Raised here for the record instead of as seven separate issues.
- **Outdated action majors** in some templates (`actions/setup-java@v4`, `actions/setup-go@v5`,
  `actions/checkout@v4`). Dependabot already covers these.

---

## Part 3 — Filed

| Issue | Repository | Covers | Link |
|---|---|---|---|
| U1 + U2 + U4 | `java-ai-driven-development-pipeline-template` | concurrency, `always()`, verification | <https://github.com/link-foundation/java-ai-driven-development-pipeline-template/issues/5> |
| U1 + U2 + U3 + U4 | `go-ai-driven-development-pipeline-template` | concurrency, `always()`, permissions, verification | <https://github.com/link-foundation/go-ai-driven-development-pipeline-template/issues/5> |
| U5 | `otac0n/Pegasus` | invalid generated `cref` | <https://github.com/otac0n/Pegasus/issues/137> |

### U5 — `otac0n/Pegasus`: the generated `Parse` documentation contains an invalid `cref`

**Evidence.** `csharp/**/obj/*/Parser.peg.g.cs` line 260:

```csharp
/// <returns>The <see cref="IList{Link{string}}" /> parsed from <paramref name="subject" />.</returns>
```

emitted by `Pegasus/Compiler/CodeGenerator/Grammar.weave` lines 103, 142 and 344:
`{{= type.ToString().Replace("<", "{").Replace(">", "}") }}`.

**Root cause.** The `cref` brace shorthand delimits a type *parameter declaration* list, so every
entry must be a bare identifier. A naive `<`→`{` replacement is therefore only valid for a single,
unqualified, non-keyword identifier.

**Reproduction.** `experiments/cref-repro` (self-contained, three files). Measured on .NET SDK
8.0.128:

| `cref` written | Compiler | XML written |
| --- | --- | --- |
| `IList{Link{string}}` — what Pegasus emits | CS1584 + 2 × CS1658 | `!:IList&lt;Link&lt;string&gt;&gt;` |
| `IList{Link{String}}` | CS1584 + CS1658 | `!:…` |
| `IList{string}` | CS1584 + CS1658 | `!:…` |
| `IList{System.String}` | CS1584 + CS1658 | `!:…` |
| `IList{String}` | clean | binds to the *open* generic `IList\`1` |
| `T:System.Collections.Generic.IList{N.Link{System.String}}` | clean | passed through verbatim |

**Workaround (applied here).** `<NoWarn>$(NoWarn);CS1584;CS1658</NoWarn>` in
`Link.Foundation.Links.Notation.csproj`. This is R4.4: the warning cannot be fixed in this
repository because the text is generated, so the single remaining DocFX `InvalidCref` is expected
until Pegasus is fixed.

**Suggested fix.** Emit the documentation-ID form (`T:Namespace.Type{Namespace.Arg}`) via
`ISymbol.ToDisplayString` with `SymbolDisplayMiscellaneousOptions.None`, or — as a one-line
alternative at each of the five sites — drop the `see cref` in favour of `<c>…</c>`, which loses the
hyperlink but is never invalid.
