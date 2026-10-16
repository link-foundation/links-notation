# Lockfile entries still behind their latest release

Every lockfile was regenerated after the direct updates. Then every resolved entry was compared
with its registry's `latest` (`../ci-logs/deps/npm-transitive-after.log`,
`../ci-logs/deps/cargo-transitive-after.log`). The entries below are still behind. In every case
the package that depends on them declares a range that excludes the newest release, and that
package is itself already on its latest release. Overriding these ranges in this repository
(`overrides`, a direct pin) would run code against a major its authors never tested, so nothing
was forced. Where the upstream maintainers do not already track the bump, it was reported (see
[`../upstream/README.md`](../upstream/README.md)).

Optional platform packages (`@typescript/typescript-*`, `@rolldown/binding-*`, `esbuild`,
`fsevents`, `jiti`, `@vitejs/devtools`) show as `None` in the log because npm only installs the
one for the current platform, or none at all. Their locked versions equal `latest`.

## npm (`js`, `docs/website`, `benchmarks/js`, `docs/comparison`, `benchmarks/tools`)

| Package | Locked | Latest | Required by (latest release) | Declared range | Status |
| --- | --- | --- | --- | --- | --- |
| `@humanfs/node` | 0.16.8 | 0.17.0 | eslint 10.13.0 | `^0.16.6` | Renovate PR [eslint/eslint#21338](https://github.com/eslint/eslint/pull/21338) is open |
| `@humanfs/core`, `@humanfs/types` | 0.19.2, 0.15.0 | 0.20.0, 0.16.0 | `@humanfs/node` 0.16.8 | `^0.19.x`, `^0.15.0` | follows the PR above |
| `ajv` → `json-schema-traverse` | 6.15.0 → 0.4.1 | 8.20.0 → 1.0.0 | eslint 10.13.0 | `^6.14.0` | listed on eslint's Renovate dashboard [eslint/eslint#17733](https://github.com/eslint/eslint/issues/17733). ajv 8 changes the schema dialect eslint validates rule options with |
| `find-up` → `locate-path` → `p-locate` → `p-limit` → `yocto-queue`, and `path-exists` | 5.0.0 → 6.0.0 → 5.0.0 → 3.1.0 → 0.1.0, 4.0.0 | 8.0.0, 8.0.0, 7.0.0, 7.3.3, 1.2.2, 5.0.0 | eslint 10.13.0 | `^5.0.0` | on [eslint/eslint#17733](https://github.com/eslint/eslint/issues/17733). find-up 6 and later are ESM-only |
| `escape-string-regexp` | 4.0.0 | 5.0.0 | eslint 10.13.0 | `^4.0.0` | on [eslint/eslint#17733](https://github.com/eslint/eslint/issues/17733). 5 is ESM-only |
| `ignore` | 5.3.2 | 7.0.12 | eslint 10.13.0 | `^5.2.0` | on [eslint/eslint#17733](https://github.com/eslint/eslint/issues/17733) |
| `eslint-visitor-keys` | 3.4.3 | 5.0.1 | `@eslint-community/eslint-utils` 4.10.1 | `^3.4.3` | eslint itself uses 5.0.1. eslint-utils keeps 3.x for its eslint 8 support |
| `fast-levenshtein` | 2.0.6 | 3.0.0 | `optionator` 0.9.4 (eslint) | `^2.0.6` | optionator's last release was 2024. Not reported: the package is in maintenance and eslint plans to drop it |
| `which` → `isexe`, `path-key`, `shebang-regex` | 2.0.2 → 2.0.0, 3.1.1, 3.0.0 | 7.0.0 → 4.0.0, 4.0.0, 4.0.0 | `cross-spawn` 7.0.6 (eslint) | `^2.0.1`, `^3.1.0`, `^3.0.0` | cross-spawn supports Node 8, and the newer majors do not. Not reported: long-standing and intentional upstream |
| `@keyv/bigmap` | 1.3.1 | 6.1.0 | `@cacheable/memory` 2.2.0 (eslint → file-entry-cache → flat-cache → cacheable) | `^1.3.1` | reported: [jaredwray/cacheable#1739](https://github.com/jaredwray/cacheable/issues/1739) |
| `keyv` | 5.6.0 | 6.1.0 | `cacheable` 2.5.0, `@cacheable/memory` 2.2.0, `@cacheable/utils` 2.5.0 | `^5.6.0` | same report |
| `hashery`, `hookified`, `qified` | 1.5.1, 1.15.1 and 2.2.0, 0.10.1 | 3.0.3, 3.0.4, 0.13.2 | the cacheable family and flat-cache 6.1.23 | `^1.5.1`, `^1.15.0`, `^0.10.1` | same report (one family, one maintainer, one release train) |
| `@peggyjs/from-mem` → `semver` | 3.1.3 → 7.7.4 | 4.0.0 → 7.8.5 | peggy 5.1.0 | exact `3.1.3`, exact `7.7.4` | peggy's `main` already has from-mem 4.0.0. Waiting for the next peggy release. Not reported: already done upstream |
| `source-map-generator` | 2.0.6 | 2.0.7 | peggy 5.1.0 | exact `2.0.6` | same: on peggy's `main` |
| `commander` | 14.0.3 | 15.0.0 | peggy 5.1.0 | `^14.0.3` | peggy's `main` still has `^14`. commander 15 drops CommonJS, which peggy's CLI still uses |
| `undici-types` | 8.9.0 | 8.12.2 | `@types/node` 26.6.5 | `~8.9.0` | intentional: DefinitelyTyped pins the undici types that match the Node release |
| `nanoid` | 3.3.20 | 6.0.2 | `postcss` 8.5.30 (`docs/website`, via vite) | `^3.3.20` | intentional: nanoid 4+ is ESM-only, and postcss still ships CommonJS |
| `links-notation` | 0.25.2 | 0.26.0 | `lino-objects-codec` 0.9.2 (`docs/comparison`, `benchmarks/tools`) | `^0.25.2` | reported in our own organisation: [link-foundation/lino-objects-codec#74](https://github.com/link-foundation/lino-objects-codec/issues/74) |

## Cargo

None. `cargo update --dry-run` reports nothing to update in any workspace. The one exception is
`experiments/issue-316/rust-timing`, whose `links-notation =0.21.1` is the baseline that the
experiment times against.

## NuGet (test project only)

| Package | Resolved | Latest | Required by | Reason |
| --- | --- | --- | --- | --- |
| `Microsoft.ApplicationInsights` | 2.23.0 | 3.2.0 | `Microsoft.Testing.Extensions.Telemetry` 2.5.1 (xunit.v3 test platform) | 3.x is a breaking rewrite that the test platform has not adopted yet: [microsoft/testfx#7465](https://github.com/microsoft/testfx/issues/7465) |
| `Microsoft.Bcl.AsyncInterfaces` | 6.0.0 | 10.0.13 | `xunit.v3.common` 4.0.2 | NuGet resolves the lowest version that satisfies a range, and xunit declares `>= 6.0.0`. On net10.0 the types are part of the shared framework, so the package only forwards types. A direct pin would add a dependency just to move a no-op, which is what removing the `Microsoft.Bcl.Memory` pin undid |

`dotnet list package --vulnerable --include-transitive` and `--deprecated` report nothing (see
[`AUDITS.md`](AUDITS.md)).

## Composer, Go, Maven, PyPI

Composer: `composer outdated --direct` and `composer outdated` (all) are empty in both lockfiles
(`../ci-logs/deps/outdated-after.log`).

Go: `go list -m -u all` lists no updates in `go/`. In `benchmarks/go`, `pkoukk/tiktoken-go`
v0.1.8 (its latest) requires `testify` v1.8.2 for its own tests, which put testify 1.8.2,
go-spew, go-difflib and `gopkg.in/yaml.v3` into `go.sum`. Commit `9a484e1` raises testify to
1.12.1 in the module graph (`// indirect` in `go.mod`), which removes those four entries and
records only testify 1.12.1 and `go.yaml.in/yaml/v3` v3.0.5. What is left in `go list -m -u all`
is `stretchr/objx` 0.5.3 -> 0.8.0. That is a node in the pruned module graph that no package
loads, and it has no `go.sum` line ("objx in go.sum: 0"). `go mod tidy` removes a direct objx
requirement for that reason, so there is nothing to update. In the six Go experiments the only line is
`links-notation/go v0.0.0 -> v0.26.0`. Each requires `v0.0.0` and `replace`s it with the
repository's own `go/` directory, so it always builds against the current sources, which is intended.

Maven: `versions:display-dependency-updates`, `display-plugin-updates` and
`display-property-updates`, run through `./mvnw` after the update, print "No dependencies in
Dependencies have newer versions", "All plugins with a version specified are using the latest
versions" and "All version properties are referencing the newest version available"
(`../ci-logs/deps/java-versions-after.log`). Its 2.x "updates" (for example
`maven-compiler-plugin 3.16.0 -> 2.0.2`) are an artefact of the plugin's "Require Maven X" table
and are not newer releases. Maven resolves exactly the versions the POMs declare, so there is no
transitive lag to report.

PyPI: there is no lockfile. The CI environments install the latest releases that satisfy the
floors.
