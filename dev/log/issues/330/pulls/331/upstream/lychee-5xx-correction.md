Correction and addendum to the report above, after re-reading the run log.

**Correction.** Of the 7 failures in links-notation's run 37329071552, only 3 came from github.com: one `429` and two `502 Bad Gateway`. The other 4 were `503 Service Unavailable` from `www.codefactor.io` badge links. All of them were working again minutes later.

**Addendum: lychee never retries a 5xx response, at any `--max-retries`.** A rejected status code reaches the retry loop as `Status::Error(ErrorKind::RejectedStatusCode(code))`, and `ErrorKind::should_retry` (`lychee-lib/src/retry.rs`) returns true only for `429`. The `is_server_error()` branch is only used for transport-level `reqwest` errors. So `--max-retries 3` does nothing for a 502 or 503: one request, then a failure. The same cause was measured in lycheeverse/lychee#2193 ([comment](https://github.com/lycheeverse/lychee/issues/2193#issuecomment-4939349025)). This template's recheck treats every failure that carries a status code as final, so nothing retries a 5xx anywhere, and one short outage of any linked host fails the run.

**Reproduction** (lychee 0.24.2, local server, no network): [`experiments/issue-330/lychee-5xx-retry.sh`](https://github.com/link-foundation/links-notation/blob/issue-330-9a9f62f53865/experiments/issue-330/lychee-5xx-retry.sh). It serves one link that answers 503 once and then 200:

```
run 1: exit 2; requests: ok=1 gone=1 flaky=1    <- --max-retries 3, yet a single request
run 2: exit 2; requests: ok=0 gone=1 flaky=1    <- the recovered link passes; the real 404 still fails
```

**Workaround / suggested fix.** Either treat 5xx as transient in the recheck script (as the js and python templates do), or run lychee a second time after a pause when the first run fails. lychee never caches an error (`lychee-bin/src/cache.rs`: "We always want to recheck failing links"), so with `--cache` the second pass re-requests only the failed links, and a real 404 still fails. This is what links-notation now does ([`links.yml`](https://github.com/link-foundation/links-notation/blob/issue-330-9a9f62f53865/.github/workflows/links.yml)):

```yaml
      - name: Check links with lychee
        id: lychee
        uses: lycheeverse/lychee-action@v2.9.0
        with:
          args: ${{ env.LYCHEE_ARGS }}   # includes --cache
          fail: false
      - name: Wait before re-checking the failed links
        if: steps.lychee.outputs.exit_code != '0'
        run: sleep 120
      - name: Re-check the failed links
        if: steps.lychee.outputs.exit_code != '0'
        uses: lycheeverse/lychee-action@v2.9.0
        with:
          args: ${{ env.LYCHEE_ARGS }}
          fail: true
```
