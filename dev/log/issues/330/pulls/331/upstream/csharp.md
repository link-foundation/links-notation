Found while fixing CI false negatives in link-foundation/links-notation ([issue #330](https://github.com/link-foundation/links-notation/issues/330), [PR #331](https://github.com/link-foundation/links-notation/pull/331)). Checked against this repository at `22e53c87d87274415eb11c291702597c4021c50d`.

## Rate-limited link checks fail the build as "broken links"

`links.yml` runs lychee with `--max-retries 3` and lychee's default per-host limits (10 parallel requests, 50 ms apart). Afterwards, the "Re-check links that never got an answer" step treats any failure that carries a status code as final (`.github/workflows/links.yml:77-82`, "stays final (issue #58)"). A 429 from github.com's secondary rate limit says "slow down", not "this page does not exist", but here it ends the run red.

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
