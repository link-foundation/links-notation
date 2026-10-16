# Upstream reports

This index covers every dependency whose code or release lag caused a workaround or an
unresolved lag in this repository. Before anything was reported, existing upstream issues and
pull requests were searched. A report was only filed where nothing already tracked the problem.
Each workaround stays in this repository, so no upstream release blocks this pull request.
States were checked on 2026-10-16.

## Filed for this issue

| Report | State | Problem | Local effect | Body |
| --- | --- | --- | --- | --- |
| [jaredwray/cacheable#1739](https://github.com/jaredwray/cacheable/issues/1739) | open | `@cacheable/memory` 2.2.0 pins `@keyv/bigmap ^1.3.1` and `keyv ^5.6.0`. Both have a 6.x release | Five transitive npm entries under eslint stay on old majors. npm `overrides` could force 6.x, but that would run cacheable against a major it does not declare, so the ranges are left as published | [`cacheable-memory-keyv-bigmap-6.md`](cacheable-memory-keyv-bigmap-6.md) |
| [link-foundation/lino-objects-codec#74](https://github.com/link-foundation/lino-objects-codec/issues/74) | open | All four packages pin `links-notation` 0.25.x, which excludes 0.26.0 | `docs/comparison` and `benchmarks/tools` depend on the codec, so their lockfiles resolve `links-notation` 0.25.2, one release behind the 0.26.0 this repository publishes | [`lino-objects-codec-links-notation-0.26.md`](lino-objects-codec-links-notation-0.26.md) |

## Already tracked upstream, so not filed again

| Upstream | State | Problem | Local workaround |
| --- | --- | --- | --- |
| [eslint/eslint#21338](https://github.com/eslint/eslint/pull/21338) (Renovate PR) | open | eslint 10.13.0 pins `@humanfs/node ^0.16.6`, which excludes 0.17.0 | none needed: transitive lag recorded in [`../analysis/TRANSITIVE.md`](../analysis/TRANSITIVE.md) |
| [eslint/eslint#17733](https://github.com/eslint/eslint/issues/17733) (Renovate dashboard) | open | ajv 6, find-up 5, escape-string-regexp 4 and ignore 5 under eslint | same |
| [microsoft/testfx#7465](https://github.com/microsoft/testfx/issues/7465) | open | `Microsoft.Testing.Extensions.Telemetry` holds `Microsoft.ApplicationInsights` at 2.23.0 (3.2.0 is a breaking rewrite) | same. `dotnet list package --vulnerable --include-transitive` is clean |
| [rhysd/actionlint#682](https://github.com/rhysd/actionlint/issues/682) | open | actionlint 1.7.12, the latest release, does not know the `ubuntu-26.04` runner label | `.github/actionlint.yaml` declares the label. Its comment says to remove the file once a release includes it |
| [diffplug/spotless#3126](https://github.com/diffplug/spotless/issues/3126), [google/google-java-format#1478](https://github.com/google/google-java-format/issues/1478) | closed (fixed in gjf commit `a51e46a`, not yet released; gjf 1.37.0 is still the latest) | spotless 3.10.4 cannot drive google-java-format 1.37.0 (`NoSuchMethodError`) | the `format` profile in `java/pom.xml` and `java/format.sh` run 1.37.0 directly. That workaround predates this pull request. `c542ce5` updated its comment to cite the fix |
| [dependabot/dependabot-core#14812](https://github.com/dependabot/dependabot-core/pull/14812) | merged 2026-08-11, behind a rollout flag | Dependabot does not update `.mvn/wrapper/maven-wrapper.properties` | `scripts/ci/check-dependencies.py` tracks the wrapper and the Maven distribution, and its `--update` mode re-hashes the distribution |

## Not reported, with reasons

| Package | Lag | Reason |
| --- | --- | --- |
| `peggy` 5.1.0 (latest, 2026-03-01) | pins `@peggyjs/from-mem` 3.1.3 and `source-map-generator` 2.0.6 exactly | peggy's `main` already has the newer versions. Waiting for its next release. `commander ^14` stays because commander 15 drops CommonJS, which peggy's CLI uses |
| `cross-spawn` 7.0.6 | `which` 2, `path-key` 3, `shebang-regex` 3 | Intentional and long-standing upstream: cross-spawn supports Node versions those majors drop |
| `optionator` 0.9.4 | `fast-levenshtein` 2 | The package is in maintenance, and eslint plans to remove it |
| `@types/node` | `undici-types ~8.9.0` | Intentional: DefinitelyTyped pins the undici types that match the Node release |
| `postcss` | `nanoid ^3` | Intentional: nanoid 4+ is ESM-only, and postcss still ships CommonJS |
