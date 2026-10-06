# Upstream reports and maintainer actions

## Issues filed against the pipeline templates

The issue asks that a defect also present in a template be reported there. Every template had at
least one, so each got one issue. Each report has the evidence from this repository, a minimal
reproduction, a workaround and a proposed code change. The bodies are in `../upstream/`, and
`../upstream/URLS.txt` lists where they landed.

| Template | Issue | Defects reported |
| --- | --- | --- |
| js | [js-ai-driven-development-pipeline-template#211](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/211) | Release gate only checks npm, so a version on npm without a GitHub release is never repaired. CodeQL scans `experiments/`. Floating macOS and Windows labels. |
| python | [python-ai-driven-development-pipeline-template#96](https://github.com/link-foundation/python-ai-driven-development-pipeline-template/issues/96) | A PyPI lag over ~100 s leaves the release permanently red: the smoke test is the only wait, the gate checks the tag, and the publish has no `skip-existing`. |
| rust | [rust-ai-driven-development-pipeline-template#187](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/187) | Link check fails on github.com 429s. CodeQL scans `experiments/`. The crates.io wait leaves ~60 s of margin. |
| csharp | [csharp-ai-driven-development-pipeline-template#68](https://github.com/link-foundation/csharp-ai-driven-development-pipeline-template/issues/68) | Link check fails on github.com 429s: no lychee host limits, and 429 is treated as final. |
| php | [php-ai-driven-development-pipeline-template#18](https://github.com/link-foundation/php-ai-driven-development-pipeline-template/issues/18) | Link check fails on github.com 429s. 21 jobs on `ubuntu-latest`. `checkout@v4` and the Pages actions several majors behind. |
| java | [java-ai-driven-development-pipeline-template#12](https://github.com/link-foundation/java-ai-driven-development-pipeline-template/issues/12) | A failed release is never retried: the tag is pushed before the GitHub release, and nothing self-heals. `ubuntu-latest`. Outdated pins. |
| go | [go-ai-driven-development-pipeline-template#11](https://github.com/link-foundation/go-ai-driven-development-pipeline-template/issues/11) | Same as java. |

Defects found here but **not** reported to templates, because no template has them:

- The C# PDF's pdfLaTeX Unicode failure. The csharp template has no PDF job.
- The trufflehog `version:` blind spot. No template's freshness checker pins trufflehog that way.
- The PEG warnings, which are specific to this grammar.
- The rust-cache ENOENT errors. The rust template does not use `Swatinem/rust-cache`.

## Third-party problems already reported upstream

These are not fixable here. Each one already had an upstream report, so nothing new was filed. The
links are recorded so the workarounds can be removed once upstream ships a fix.

| Finding | Upstream | State on 2026-10-06 | Local handling |
| --- | --- | --- | --- |
| P1: rust-cache reports un-awaited `ENOENT` rejections as errors | [Swatinem/rust-cache#193](https://github.com/Swatinem/rust-cache/issues/193), fix in [Swatinem/rust-cache#387](https://github.com/Swatinem/rust-cache/pull/387) | both open | `rm -rf target/package` before the post step (`1ebcb5c`) |
| W5: CodeQL C# `No NuGet feeds are reachable` | [github/codeql#22766](https://github.com/github/codeql/issues/22766) | open | none; informational |
| W6: `DEP0005 Buffer()` in `actions/download-artifact` | [actions/download-artifact#484](https://github.com/actions/download-artifact/issues/484), [#381](https://github.com/actions/download-artifact/issues/381), [actions/toolkit#2003](https://github.com/actions/toolkit/issues/2003), [mhr3/unzip-stream#38](https://github.com/mhr3/unzip-stream/issues/38), [#55](https://github.com/mhr3/unzip-stream/issues/55) | open | none; the action is already at its latest release |
| W7: `DEP0040 punycode` in `actions/deploy-pages` | [actions/deploy-pages#434](https://github.com/actions/deploy-pages/issues/434), [#413](https://github.com/actions/deploy-pages/issues/413), [actions/toolkit#2173](https://github.com/actions/toolkit/issues/2173) | open | none; the action is already at its latest release |

## Actions only a maintainer can take

None of these can be done from a pull request. The workflows already report each one as a notice or
warning instead of failing.

| # | Action | Why |
| --- | --- | --- |
| M1 | `gh release create js_0.21.0 --target 4922c48 --title "[JS] 0.21.0" --generate-notes` | `links-notation@0.21.0` is on npm, but there is no GitHub release. `4922c48` is the `main` commit that set `js/package.json` to 0.21.0. |
| M2 | `gh release create rust_0.16.0 --target 6f18805 --title "[Rust] 0.16.0" --generate-notes` | `links-notation` 0.16.0 is on crates.io, but there is no GitHub release. `6f18805` is the `main` commit that set it. |
| — | (no action) `js_0.23.0` | Created automatically by the first `js.yml` run on `main` after this pull request merges: it finds 0.23.0 on npm, reports `published=skipped`, and the release job now runs on `skipped` (N1). |
| M3 | Java: add `CENTRAL_USERNAME`, `CENTRAL_TOKEN`, `GPG_PRIVATE_KEY` and `GPG_PASSPHRASE`, or decide not to publish Java. | Nothing has ever been published on Maven Central. The job skips with a notice. Carried over from #290 (M3 there). |
| M4 | PHP: submit the repository at packagist.org once. | Packagist needs an initial manual submission; the API token can only trigger re-crawls. Carried over from #290 (M4 there). |
| M5 | PyPI: register a trusted publisher for `python.yml`, then delete `PYPI_TOKEN`. | `pypa/gh-action-pypi-publish` prints a "new Trusted Publisher ... can be created" warning on every token publish. |
| M6 | Go: add `CODECOV_TOKEN`, or remove the Codecov upload. | The upload is skipped without the secret, and a notice says `CODECOV_TOKEN is not configured, so coverage was not uploaded`. |

The repository's secrets, checked by name only: `DEPENDABOT_AUTO_MERGE_TOKEN`, `NUGET_TOKEN` and
`PYPI_TOKEN`. There are no repository variables. Organization secrets are not visible to this
token.
