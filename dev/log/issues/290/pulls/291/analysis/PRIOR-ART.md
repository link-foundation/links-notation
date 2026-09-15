# Prior art — existing components that solve these problems

Researched 2026-08-28 in response to *"check online for known existing components/libraries that
solve a similar problem or can help"*. Each entry says what it replaces here and whether this PR
adopts it.

## 1. Credential-free publishing (fixes A1, A2 and prevents recurrence)

The whole failure class in this repository is *long-lived registry tokens rotting silently*. The
industry answer is **OIDC trusted publishing**: the workflow proves its identity to the registry with
a short-lived GitHub-issued token, so there is no secret to expire.

| Registry | Component | Status here |
|---|---|---|
| npm | Built into the npm CLI ≥ **11.5.1**; needs `permissions: id-token: write` and a trusted publisher configured on npmjs.com (org/user, repo, workflow filename, environment). Provenance attestations are then published automatically — `--provenance` is no longer needed. GA since 2025-07-31. | **Adopted** in `js.yml`, with `NODE_AUTH_TOKEN` bootstrap fallback. Requires a one-time maintainer action (see `UPSTREAM.md`). |
| crates.io | [`rust-lang/crates-io-auth-action`](https://github.com/rust-lang/crates-io-auth-action) — exchanges the OIDC token for a 30-minute crates.io token, exposed as `steps.auth.outputs.token`, auto-revoked in the post step. RFC 3691. Requires one manual publish first, then linking the repo in the crates.io UI. | **Adopted** in `rust.yml`, falling back to `CARGO_REGISTRY_TOKEN`/`CARGO_TOKEN`. Also removes the deprecated `cargo publish --token` (B9). |
| PyPI | [`pypa/gh-action-pypi-publish`](https://github.com/pypa/gh-action-pypi-publish) — the reference trusted-publishing action; used by the Python template (`templates/python/.github/workflows/release.yml`). | **Adopted** in `python.yml`, keeping `PYPI_TOKEN` as fallback. Python currently *works*, so this is hardening, not a fix. |
| NuGet | NuGet.org has **no** OIDC trusted publishing for the public gallery as of this writing; API keys are the only mechanism, and they expire after at most 365 days — which is precisely how A2 happened. | Not available. Mitigated instead by validating the key on every run (R2.4) and by trying both `NUGET_API_KEY` and `NUGET_TOKEN`. |
| Maven Central | Sonatype Central supports user tokens + GPG only. | Not available. Mitigated by the uniform publish gate. |
| Packagist | Webhook/API-token only. | Not available. Same mitigation. |

## 2. Post-publish verification (fixes A6, R2.3)

There is no off-the-shelf action for "assert the artifact actually reached the registry"; the JS
template solves it with a repo-local script (`scripts/smoke-test-package.mjs`, invoked by the
`Smoke-test published npm package` step). That approach — poll the registry's public metadata
endpoint for the exact version, with retries for CDN propagation — is what this PR generalises into
one shell helper used by all seven languages, because each registry's metadata endpoint is a
one-line `curl`:

- npm — `https://registry.npmjs.org/<pkg>/<version>`
- NuGet — `https://api.nuget.org/v3-flatcontainer/<id-lower>/index.json`
- crates.io — `https://crates.io/api/v1/crates/<crate>/<version>`
- PyPI — `https://pypi.org/pypi/<pkg>/<version>/json`
- Packagist — `https://repo.packagist.org/p2/<vendor>/<pkg>.json`
- Maven Central — `https://repo1.maven.org/maven2/<group-path>/<artifact>/<version>/`
- Go — `https://proxy.golang.org/<module>/@v/<version>.info`

Writing this ourselves is 20 lines and removes a third-party dependency from the most
security-sensitive job, so no external component is adopted here.

## 3. Workflow static analysis (would have caught D4, D5, D6)

| Tool | What it catches |
|---|---|
| [`rhysd/actionlint`](https://github.com/rhysd/actionlint) | Expression type errors, **`needs` context references to jobs not listed in `needs:`** (exactly D6), shellcheck over every `run:` block, unknown keys, matrix mistakes. |
| [`zizmor`](https://github.com/zizmorcore/zizmor) | Security audit for workflows: template-injection of secrets/untrusted input into `run:` (exactly D4), overbroad `permissions`, unpinned actions, `pull_request_target` misuse. |
| [`ratchet`](https://github.com/sethvargo/ratchet) / [`pinact`](https://github.com/suzuki-shunsuke/pinact) | Rewrite `uses: org/action@v1` to a pinned commit SHA with the tag in a comment, and update them later. |

**Adopted:** a `workflows` job running `actionlint` + `zizmor` so this class of defect fails CI
instead of being found by a human eight months later. This is the single highest-leverage item in
this PR — it converts "we compared files against seven templates by hand" into a check that runs on
every change.

## 4. Action pinning and the supply-chain precedent (D3, D12)

In March 2025 an attacker compromised `tj-actions/changed-files` and **retargeted the existing tags
`v1`–`v45.0.7`** to a malicious commit that dumped runner memory — including secrets — into the
publicly readable build log (CVE-2025-30066, ~23 000 repositories affected; CISA issued an alert).
Tags are mutable, so `@v47` is a promise, not a guarantee.

This repository uses `tj-actions/changed-files@v47` — well past the patched `46.0.1`, so it is **not
vulnerable today** — but it references 18 distinct actions and pins **none** of them to a SHA, and
`csharp.yml` additionally `wget`s four shell scripts from the `main` branch of
`linksplatform/Scripts` and executes them with the NuGet key in scope (D3). The `wget` case is
strictly worse than a mutable action tag: there is not even a version to audit.

Relevant alternatives:
- [`dorny/paths-filter`](https://github.com/dorny/paths-filter) — a smaller, path-glob-based
  substitute for `changed-files`; matches what these workflows actually need (*"did anything under
  `js/` change?"*), which GitHub's own `on.push.paths` already answers.
- [`step-security/harden-runner`](https://github.com/step-security/harden-runner) — egress filtering
  and audit for runners; would have flagged the exfiltration attempt in CVE-2025-30066.

**Adopted:** the four remote scripts are replaced by inline `dotnet pack` / `dotnet nuget push
--skip-duplicate` (removing the credential-exposure path and fixing the wrong-package-id bug B3).
Recorded as a follow-up: SHA-pinning all actions, best done by Dependabot's `github-actions`
ecosystem, which is already enabled in `.github/dependabot.yml` and keeps SHA pins updated
automatically.

## 5. Release coordination (D10 — version drift)

- [`changesets`](https://github.com/changesets/changesets) — used by the JS template; per-change
  version intent files, aggregated into a release PR.
- [`release-please`](https://github.com/googleapis/release-please) — the closest fit for *this* repo,
  because it natively supports **manifest mode over a monorepo**: one config lists `js/`, `csharp/`,
  `python/`, `rust/`, `php/`, `java/`, `go/` as separate release units with independent versions and
  per-package tags, which is exactly the structure that has drifted to 0.15.0/0.3.0/0.2.0.
- [`semantic-release`](https://github.com/semantic-release/semantic-release) — powerful but assumes
  one package per repository.

**Not adopted in this PR.** Replacing the release mechanism for seven languages is a much larger
change than the issue asks for, and it would obscure the credential fixes. Instead this PR adds a
cheap `release-audit` job that prints declared version vs. published version for every language and
annotates drift — which surfaces D10 continuously and makes a later `release-please` migration an
informed decision rather than a guess.

## 6. Caching (C1–C3)

[`Swatinem/rust-cache`](https://github.com/Swatinem/rust-cache) is the standard answer to the three
Rust cache bugs: it locates the workspace itself (so C1's `working-directory` trap cannot happen),
skips non-existent paths (C2), computes sensible fallback keys (C3), and prunes stale artifacts.
**Adopted** in `rust.yml`, replacing three hand-written `actions/cache` steps.

## 7. Things deliberately *not* adopted

- **`nektos/act` for local workflow runs** — useful, but it does not model `permissions`, OIDC, or
  concurrency, which is where the bugs are.
- **Self-hosted secret rotation (e.g. Vault)** — disproportionate; OIDC removes the secrets entirely
  for three of the six registries and the other three are low-frequency.
- **Replacing DocFX** — B3/B4 are content bugs, not tool bugs.

## Sources

- [npm trusted publishing with OIDC is generally available — GitHub Changelog](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [Trusted publishing for npm packages — npm Docs](https://docs.npmjs.com/trusted-publishers/)
- [crates.io — Trusted Publishing](https://crates.io/docs/trusted-publishing)
- [rust-lang/crates-io-auth-action](https://github.com/rust-lang/crates-io-auth-action)
- [RFC 3691 — Trusted Publishing for crates.io](https://rust-lang.github.io/rfcs/3691-trusted-publishing-cratesio.html)
- [CISA alert — supply chain compromise of tj-actions/changed-files (CVE-2025-30066)](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction)
- [GHSA-mrrh-fwg8-r2c3 — CVE-2025-30066](https://github.com/advisories/ghsa-mrrh-fwg8-r2c3)
- [Wiz — GitHub Action tj-actions/changed-files supply chain attack](https://www.wiz.io/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066)
- [pypa/gh-action-pypi-publish](https://github.com/pypa/gh-action-pypi-publish)
- [GitHub docs — Control workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
