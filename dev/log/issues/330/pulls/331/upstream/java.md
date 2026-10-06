Found while fixing CI false negatives in link-foundation/links-notation ([issue #330](https://github.com/link-foundation/links-notation/issues/330), [PR #331](https://github.com/link-foundation/links-notation/pull/331)). Checked against this repository at `b3c7ce9a0a4ecd8db796a4fe660031d9fa4acbab`.

## A failed release is never retried: the tag is pushed before the GitHub release exists

The release only runs when changesets exist, and the version script pushes the tag before the GitHub release is created (`.github/workflows/release.yml:295-307` gates everything on `has_changesets == 'true'` and then `released == 'true'`; `scripts/version-and-commit.mjs:294-299` returns `released=false` once the tag exists). If anything between the tag push and "Create GitHub Release" fails (`mvn package source:jar javadoc:jar`, a runner loss, a cancelled job), the changesets are already consumed and the tag already exists. The next push to `main` then has no changesets and does nothing, so the version ships without a GitHub release and nothing reports it.

The rust, csharp and php templates self-heal this. They check whether the GitHub release for the current version exists and, if it doesn't, set `skip_bump` and create it (csharp `scripts/check-release-needed.mjs:252-259`, php `scripts/src/ReleaseDecider.php:40-41`). links-notation lost `js_0.21.0` and `js_0.23.0` GitHub releases to this class of bug and added the same self-healing plus an audit (link-foundation/links-notation#331).

**Reproduce:** add a changeset and merge. While "Create GitHub Release" is running, cancel the job, or make it fail by revoking `contents: write`. Then push another commit to `main`. The tag exists, `gh release view <tag>` is 404, and the second run reports nothing to release.

**Workaround:** `gh release create <tag> --notes-file <changelog section>`.

**Suggested fix:** when there are no changesets, read the current version, check `gh release view "<tag>"`, and when it is missing (exit code 1 with "release not found"), run `create-github-release.mjs` for that version. Treat other errors as unknown and only warn. Moving the release step's `if:` off `has_changesets == 'true'` is enough to make this run.

## Hosted runners use `-latest` aliases

9 jobs use `ubuntu-latest` (e.g. `release.yml:43,81`, and the test matrix `release.yml:146` `[ubuntu-latest, macos-latest, windows-latest]`). `ubuntu-latest` moves to a new Ubuntu release without any diff in the repository, so a toolchain break then looks like flaky CI. The js, csharp and python templates already pin `ubuntu-24.04` (link-foundation/js-ai-driven-development-pipeline-template#193, link-foundation/csharp-ai-driven-development-pipeline-template#63, link-foundation/python-ai-driven-development-pipeline-template#89), and rust tracks the same change in link-foundation/rust-ai-driven-development-pipeline-template#180.

**Suggested fix:** replace `ubuntu-latest` with `ubuntu-24.04` (and `macos-latest`/`windows-latest` with explicit images), and add a guard to `workflows.yml` so the alias cannot come back:

```bash
if grep -nE '^\s*(runs-on:|os:|-)\s.*(ubuntu|windows|macos)-latest' .github/workflows/*.yml; then
  echo "::error::Pin hosted runners to an explicit image such as ubuntu-24.04 instead of a -latest alias"; exit 1
fi
```


## Outdated pins

`actions/checkout@v4` appears 9 times (latest v7.0.1), `actions/setup-java@v4` 6 times (latest v6.0.1), plus `actions/upload-artifact@v4` (`release.yml:209`, latest v7.0.1) and `peter-evans/create-pull-request@v6` (`:534`, latest v8.1.1). `oven-sh/setup-bun@v2` installs `bun-version: latest` (`:64,108,238`), so the toolchain changes without a diff, which is the same problem as the runner aliases. `docker://rhysd/actionlint:1.7.12` is pinned by a mutable tag. Suggested fix: bump them, pin `bun-version`, and add a freshness check (links-notation: `scripts/ci/check-dependencies.py`).
