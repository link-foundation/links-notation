Found while fixing CI false negatives in link-foundation/links-notation ([issue #330](https://github.com/link-foundation/links-notation/issues/330), [PR #331](https://github.com/link-foundation/links-notation/pull/331)). Checked against this repository at `73c1ba102da6bd7740c6b4a79ab5ea1d09559986`.

## Rate-limited link checks fail the build as "broken links"

`links.yml` runs lychee with `--max-retries 3` and lychee's default per-host limits (10 parallel requests, 50 ms apart). Afterwards, the "Re-check links that never got an answer" step treats any failure that carries a status code as final (`.github/workflows/links.yml:68-73`, "stays final (issue #12)"). A 429 from github.com's secondary rate limit says "slow down", not "this page does not exist", but here it ends the run red.

This is what happened to links-notation's scheduled run on 2026-10-05 ([run 37329071552](https://github.com/link-foundation/links-notation/actions/runs/37329071552)). Of 2068 links, 7 failed, all of them `github.com/<org>/<repo>/actions?workflow=...` badge targets, with `429 Too Many Requests` and `502 Bad Gateway`. lychee itself printed:

> Hint: Encountered rate limit responses. You might be able to work around this by adding `[hosts."github.com"]` to the TOML config to adjust the `concurrency` and `request_interval` values.

**Reproduce:** have a repository whose Markdown links to a few dozen `github.com/.../actions?...` pages (one badge per workflow per README and translation is enough), then run the workflow a few times in a row, or on the shared scheduled minute.

**Workaround:** add the URLs to `.lycheeignore`. That hides genuinely dead links too.

**Suggested fix:** add a `lychee.toml` (lychee reads it from the working directory automatically) and include it in the workflow's `paths:` filter:

```toml
# A 429 says "slow down", not "this page does not exist". lychee still retries it with backoff first.
accept = ["200..=299", "429"]

[hosts."github.com"]
concurrency = 2
request_interval = "1s"
```

links-notation's next run with this config passed (link-foundation/links-notation#331). Alternatively, follow the js and python templates and make the recheck script retry 429 and 5xx with backoff.

## Hosted runners use `-latest` aliases

21 jobs use `ubuntu-latest` (`release.yml`, `security.yml`, `docs.yml`, `links.yml`; none use `ubuntu-24.04`). `ubuntu-latest` moves to a new Ubuntu release without any diff in the repository, so a toolchain break then looks like flaky CI. The js, csharp and python templates already pin `ubuntu-24.04` (link-foundation/js-ai-driven-development-pipeline-template#193, link-foundation/csharp-ai-driven-development-pipeline-template#63, link-foundation/python-ai-driven-development-pipeline-template#89), and rust tracks the same change in link-foundation/rust-ai-driven-development-pipeline-template#180.

**Suggested fix:** replace `ubuntu-latest` with `ubuntu-24.04` (and `macos-latest`/`windows-latest` with explicit images), and add a guard to `workflows.yml` so the alias cannot come back:

```bash
if grep -nE '^\s*(runs-on:|os:|-)\s.*(ubuntu|windows|macos)-latest' .github/workflows/*.yml; then
  echo "::error::Pin hosted runners to an explicit image such as ubuntu-24.04 instead of a -latest alias"; exit 1
fi
```


## Outdated and mixed action pins

`workflows.yml:34,67,121` use `actions/checkout@v7`, but the other workflows still use `actions/checkout@v4` 17 times (e.g. `release.yml:51,90,149`, `security.yml:29,68,92,117`, `docs.yml:41,103`, `links.yml:36,123`). `docs.yml` uses `upload-artifact@v4` (`:56`), `configure-pages@v5` (`:64`), `upload-pages-artifact@v3` (`:68`) and `deploy-pages@v4` (`:87`). The latest releases as of 2026-10-06 are checkout v7.0.1, upload-artifact v7.0.1, configure-pages v6.0.0, upload-pages-artifact v5.0.0 and deploy-pages v5.0.1. `ramsey/composer-install@v3` is behind 4.0.0. Older majors of these actions run on Node 20, which GitHub runners are retiring, and print deprecation annotations on every run.

**Suggested fix:** bump them together, and add a freshness gate that compares every `uses:` ref against the action's latest release, so drift becomes a red check instead of a silent annotation. links-notation does this in `scripts/ci/check-dependencies.py`, which also covers tool versions passed as action inputs, such as trufflehog's `version:`.
