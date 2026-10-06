# Prior art: existing components and documentation

Researched on 2026-10-06, for the task's request to "check online for known existing
components/libraries that solve a similar problem or can help". For each finding, the existing
solution, and whether this pull request uses it. The previous round of research, for issue #290,
is in `../../../../290/pulls/291/analysis/PRIOR-ART.md`. That round covers trusted publishing,
changesets, release-please, action pinning and harden-runner, which are not repeated here.

## Registry propagation (E5)

| Source | What it says | Use here |
| --- | --- | --- |
| [GitHub changelog, 2026-07-28: npm publish-time malware scanning](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/) | "This introduces a short delay between publishing and availability, typically around five minutes. It may take longer, up to 15 minutes or more, at peak times". `npm dist-tag` works while scanning is pending; `npm deprecate` and `npm unpublish` do not. | The npm window is now 20 min, which covers the documented worst case with margin. The measured delay for 0.23.0 was 4 min 9 s. |
| js template `scripts/publish-retry.mjs` and `scripts/wait-for-npm.mjs` | Never republish after a verification miss. Exponential backoff up to 930 s, and a separate 920 s wait before Docker publishing. | Same principle: `published=skipped` and the release backfill (N1). The existing fixed-interval loops were kept and lengthened, rather than replaced. |
| [`pypa/gh-action-pypi-publish`](https://github.com/pypa/gh-action-pypi-publish) `skip-existing` input | Makes a re-run after a partial publish succeed instead of failing on the duplicate file. | Not needed: `python.yml` already checks PyPI before uploading and reports `skipped`. The python template lacks both and was reported (python#96). |

## Link checking (E2)

| Source | What it says | Use here |
| --- | --- | --- |
| lychee's own hint in the failing run | "You might be able to work around this by adding `[hosts."github.com"]` to the TOML config to adjust the `concurrency` and `request_interval` values." | **Adopted** in `lychee.toml`. |
| [`lychee.example.toml`](https://github.com/lycheeverse/lychee/blob/master/lychee.example.toml) | Documents the per-host `[hosts."<name>"]` tables and `accept` status ranges. | `concurrency = 2`, `request_interval = "1s"` for github.com, and `accept = ["200..=299", "429"]`. |
| [`lychee-lib/src/retry.rs`](https://github.com/lycheeverse/lychee/blob/master/lychee-lib/src/retry.rs) | `ErrorKind::should_retry` matches only `RejectedStatusCode(429)`, so a 5xx answer is never retried. Diagnosed independently in a comment on [lycheeverse/lychee#2193](https://github.com/lycheeverse/lychee/issues/2193), which is open. | Workaround in `links.yml`; see the next two rows. |
| [`lychee-bin/src/cache.rs`](https://github.com/lycheeverse/lychee/blob/master/lychee-bin/src/cache.rs) | "Do not serialize errors to disk. We always want to recheck failing links." | A second `--cache` run in the same job only re-requests the failures. |
| js and python templates `recheck-broken-links.*` | A second pass that retries 429s and 5xx with backoff. | **Adopted** as a second lychee run after 120 s (`c04967e`). It needs no script, because of the cache behaviour above. |

## Static analysis scoping (W4)

| Source | What it says | Use here |
| --- | --- | --- |
| [Customizing your advanced setup for code scanning](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning) | A `config-file` with `paths-ignore` excludes directories from analysis. | **Adopted**: `.github/codeql/codeql-config.yml`. On run 37534592831 the excluded paths were not extracted either: C# restored 7 projects instead of 18, and the Rust and Java warnings were gone. |
| [github/codeql#22766](https://github.com/github/codeql/issues/22766) | The `No NuGet feeds are reachable` warning when no `nuget.config` exists. | Upstream; nothing to adopt. |

## CI tooling bugs (P1, W2, W3, W6, W7)

| Source | What it says | Use here |
| --- | --- | --- |
| [`Swatinem/rust-cache` `src/cleanup.ts`](https://github.com/Swatinem/rust-cache/blob/master/src/cleanup.ts) | The un-awaited `cleanTargetDir` probes of `tests/target` and `tests/trybuild`. Tracked in Swatinem/rust-cache#193; fix proposed in Swatinem/rust-cache#387. | Workaround: delete `target/package` after publishing. |
| [setup-java advanced usage](https://github.com/actions/setup-java/blob/main/docs/advanced-usage.md) | `server-username-env-var`, `server-password-env-var` and `gpg-passphrase-env-var` replace the deprecated inputs. | **Adopted** in `java.yml`. |
| `actions/setup-go` `cache` input | Caching defaults to on and looks for `go.mod` at the root unless `cache-dependency-path` is set: `Restore cache failed: Dependencies file is not found ... Supported file pattern: go.mod`. | `cache: false` where the module has no dependencies, as `go.yml` already did. |
| `actions/download-artifact`, `actions/deploy-pages` | Already at their latest releases. The deprecations come from transitive dependencies, which are tracked upstream. | Nothing to adopt; see `UPSTREAM.md`. |

## Workflow linting and runner pinning (W9)

| Source | What it says | Use here |
| --- | --- | --- |
| hive-mind CI/CD best practices, "Pin hosted runner operating systems" | `-latest` labels move without a diff in the repository. | **Adopted**: 67 jobs pinned to `ubuntu-24.04`. |
| [actionlint](https://github.com/rhysd/actionlint), [zizmor](https://github.com/zizmorcore/zizmor) | Workflow linting and security audit. Neither flags `ubuntu-latest`. | Both already run in `workflows.yml`. A grep guard was added there for the runner pin, because neither tool checks it. |

## C# PDF (E4)

| Option | Trade-off | Decision |
| --- | --- | --- |
| Escape non-typesettable characters as C# `\uXXXX` and `\UXXXXXXXX` | The listing stays valid C#, and no new TeX packages are needed. Emoji and CJK show as escapes in print. | **Adopted** (`csharp/scripts/format-files.py`). |
| XeLaTeX or LuaLaTeX with `fontspec` and a CJK and emoji font | Renders the characters, but needs a different engine, extra system fonts on the runner, and a rewrite of the preamble. | Rejected for a listing PDF; the escapes are enough. |
| `listings` `literate` replacements | Per-character table that would need to list every code point used. | Rejected; it does not scale to arbitrary test strings. |

## C# grammar (W1)

| Source | What it says | Use here |
| --- | --- | --- |
| [Pegasus](https://github.com/otac0n/Pegasus) `ReportZeroWidthRepetitionPass` | Emits PEG0021 and PEG0022 when a repeated expression may match without consuming input. | The fallback alternative now ends with `.`, so Pegasus can prove it consumes input. The parse result is unchanged. |
