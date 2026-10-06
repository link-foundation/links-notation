Found while fixing CI false negatives in link-foundation/links-notation ([issue #330](https://github.com/link-foundation/links-notation/issues/330), [PR #331](https://github.com/link-foundation/links-notation/pull/331)). Checked against this repository at `1e2f475cb411e857f83f769f13887ae2df0656b2`.

## 1. A PyPI lag longer than about 100 s leaves the release permanently red

There is no dedicated wait for PyPI. "Smoke test published package" (`.github/workflows/release.yml:671-675`) is the only thing that waits. It makes 6 `pip install` attempts with 20 s between them (`scripts/smoke_test_published_package.py:23-24`, loop at `:216-223`), so it gives up after about 100 s plus install time.

In links-notation, PyPI served 0.23.0 only on the 5th poll, about 75 s after upload ([run log](https://github.com/link-foundation/links-notation/actions/runs/37486124196)), which is already three quarters of that window. npm took 4m09s for the same release. PyPI's CDN has no documented propagation bound.

What happens when the smoke test runs out:

1. "Create GitHub Release" is skipped, so the tag is never created. `create_github_release.py` makes the tag through `gh release create`.
2. The next push to `main` reaches "Check if version changed" (`release.yml:652-657`), which only checks `git rev-parse "$TAG"`. It finds no tag and sets `should_release=true` again.
3. "Publish to PyPI" (`release.yml:667-669`) has no `skip-existing: true`, so PyPI rejects the duplicate upload with `400 File already exists`.

From then on every push to `main` fails. The version is live on PyPI, but the tag and the GitHub release never appear.

**Reproduce:** run the release with `--install-attempts 1` (or point `--index-url` at an index that doesn't have the version yet), then push another commit to `main` and watch the publish step fail on the duplicate file.

**Workaround:** `gh release create vX --title X --notes ...` by hand. This creates the tag and unblocks the gate.

**Suggested fix:**
- Add `skip-existing: true` to `pypa/gh-action-pypi-publish`, so that re-entering the release after a partial success is idempotent.
- Wait for PyPI explicitly before the smoke test. Poll `https://pypi.org/pypi/<name>/<version>/json` until it returns 200, for about 10 minutes (links-notation uses 40 × 15 s), and fail with a message that says the upload itself succeeded.
- Decide whether to release from the artifacts, not from the tag, the way the rust/csharp/php templates do: release when the version is missing on PyPI *or* has no GitHub release.

## 2. CodeQL has no path filter

`.github/workflows/security.yml:54-56` initialises CodeQL with `languages` only. There is no `config-file`, `paths` or `paths-ignore`. In derived repositories, `experiments/` (which the contributor guidelines tell agents to use for throwaway scripts) is analysed as if it shipped. Suggested fix: add `.github/codeql/codeql-config.yml` with `paths-ignore: [experiments]` and pass it via `config-file:`.

## 3. The link checker points at a `.lycheeignore` that does not exist

`.github/workflows/links.yml:105` tells the reader to "add a known false positive to .lycheeignore", but the template ships no `.lycheeignore`. The other templates have one. Suggested fix: add an empty, commented `.lycheeignore`.

Related: lychee's `--max-retries` still ends with a hard failure when github.com's secondary rate limit answers 429 to a burst of badge links. links-notation fixed this with a `lychee.toml`:

```toml
accept = ["200..=299", "429"]
[hosts."github.com"]
concurrency = 2
request_interval = "1s"
```

This template already rechecks 429/5xx in `recheck_broken_links.py`, so only the host limit applies here. It keeps the burst from happening in the first place.
