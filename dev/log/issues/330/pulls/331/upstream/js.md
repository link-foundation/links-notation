Found while fixing CI false negatives in link-foundation/links-notation ([issue #330](https://github.com/link-foundation/links-notation/issues/330), [PR #331](https://github.com/link-foundation/links-notation/pull/331)). Checked against this repository at `4c8644fb457b65933fcb19b033e60e7d0338f2ad`.

## 1. A version that reached npm but has no GitHub release is never repaired

`scripts/check-release-needed.mjs:100-105` only asks npm:

```js
if (isPublished) {
  console.log(
    `No changesets and v${currentVersion} already published on npm — no release needed`
  );
  setOutput('should_release', 'false');
```

If the run that published to npm dies before "Create GitHub Release" (post-publish verification timing out, a runner loss, a cancelled job), every later push to `main` sees "already on npm" and skips the release for good. A re-run of that exact failed job recovers it, but nothing tells anyone to do so.

This happened for real in links-notation: `js_0.21.0` and `js_0.23.0` are on npm, but neither has a GitHub release. For 0.23.0, npm took 4m09s to serve the new version, while our verification window was 150 s ([run log](https://github.com/link-foundation/links-notation/actions/runs/37486124040)).

**Reproduce**
1. Publish version X with the release workflow, and cancel the job after `npm publish` succeeds but before "Create GitHub Release".
2. Push any unrelated commit to `main` with no changeset.
3. `check-release-needed.mjs` prints "already published on npm — no release needed", so `gh release view vX` stays 404 indefinitely.

**Workaround:** `gh release create vX --title X --notes-from-tag`, or re-run the original failed job.

**Suggested fix:** do what the csharp template already does (`scripts/check-release-needed.mjs:252-259` there) and the rust/php templates do too. Check the GitHub release as well:

```js
const releaseExists = await githubReleaseExists(`v${currentVersion}`); // GET /repos/{repo}/releases/tags/{tag}, 404 => false
if (isPublished && releaseExists) { setOutput('should_release', 'false'); ... }
else if (isPublished) {
  console.log(`v${currentVersion} is on npm but has no GitHub release — self-healing release creation`);
  setOutput('should_release', 'true');
  setOutput('skip_bump', 'true');   // publish-to-npm.mjs already reports published=true for an existing version
}
```

Treat a failed lookup (5xx or network) as "unknown": log it and don't release. link-foundation/links-notation#331 also makes its scheduled release audit (`scripts/release-audit.mjs`) warn when a registry version has no GitHub release. That catches this class of problem independently of the release path.

## 2. CodeQL scans `experiments/` and `examples/`

`.github/workflows/security.yml:45-47` initialises CodeQL with only `languages`. There is no `config-file`, `paths` or `paths-ignore`, and there is no `.github/codeql/` config. `experiments/` holds throwaway scripts that are never shipped. Alerts raised there are noise, and in compiled languages the buildless extractor also tries to restore and resolve their projects. In links-notation this produced restore warnings for a dozen experiment projects and a missing-jar warning on every run.

**Suggested fix:** add `.github/codeql/codeql-config.yml`:

```yaml
paths-ignore:
  - experiments
```

and pass `config-file: ./.github/codeql/codeql-config.yml` to `github/codeql-action/init`. This works for interpreted languages and for compiled languages in `build-mode: none` ([docs](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning)).

## 3. Floating runner labels remain

`.github/workflows/release.yml:308` and `.github/workflows/example-app.yml:114` use `[ubuntu-24.04, macos-latest, windows-latest]`, and `example-app.yml:205` uses `runs-on: macos-latest`. #193 pinned Ubuntu only. The same reasoning applies to the other two images. Suggested fix: pin them (e.g. `macos-15`, `windows-2025`) and add a grep guard so a new `-latest` cannot slip back in. links-notation uses:

```bash
if grep -nE '^\s*(runs-on:|os:|-)\s.*(ubuntu|windows|macos)-latest' .github/workflows/*.yml; then
  echo "::error::Pin hosted runners to an explicit image instead of a -latest alias"; exit 1
fi
```
