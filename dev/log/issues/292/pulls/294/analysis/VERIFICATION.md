# Verification — issue #292

Nothing here is taken from the tables in the issue. Several of those entries were already stale by
the time the issue was written (`xunit.runner.visualstudio` was listed as needing 2.x→3.x when NuGet
already served 4.0.0; java and php were listed at 0.3.0/0.2.0 when both were already 0.15.0 on
`main`). Every version below was read from the registry, and every suite below was run.

## What the registries actually serve

`registry-latest.txt` is the output of `experiments/issue-292/registry-latest.mjs`, which asks npm,
PyPI, crates.io, NuGet, repo1.maven.org and Packagist directly. After this pull request, every
dependency the repository declares equals the current release there.

One caveat worth recording: `search.maven.org`'s solr index answered `5.12.2` for `junit-bom` while
`repo1.maven.org/maven2/org/junit/junit-bom/maven-metadata.xml` already served `6.1.3`. The script
reads the repository metadata for that reason.

Four Maven plugins were deliberately **not** taken to their newest artefact
(`maven-plugin-versions.txt`): `maven-compiler-plugin` 4.0.0-beta-4, `maven-jar-plugin`
4.0.0-beta-1, `maven-source-plugin` 4.0.0-beta-1 and `maven-surefire-plugin` 3.6.0-M1 are a beta and
a milestone. The newest *stable* releases (3.15.0, 3.5.1, 3.4.0, 3.5.6) are what the pom declares.

## Suites run against the new versions

| Language | Command | Result |
| --- | --- | --- |
| js | `bun test`, `bun run lint`, peggy regeneration | 204 tests pass; regenerating `src/parser-generated.js` produces a byte-identical file, so peggy 5.1.0 emits the same parser |
| python | `pytest`, `black --check`, `isort --check`, `flake8` | 193 passed, 1 skipped; all three linters clean |
| rust | `cargo test`, `cargo update` | passes; `cargo update` locked 0 packages — nom 8.0.0, syn 3.0.4, quote 1.0.47 and proc-macro2 1.0.107 are already the current releases |
| csharp | `dotnet test`, `dotnet format --verify-no-changes`, `dotnet pack` | 196 tests pass on net10.0 under xunit.v3 4.0.0 |
| java | `mvn test`, `mvn spotless:check`, `mvn package` | 133 tests pass on JDK 21 with JUnit 6.1.3 |
| php | `phpunit`, `phpcs` | 183 tests / 497 assertions pass under PHPUnit 13 on **both** php:8.4 and php:8.5 containers; PSR-12 clean under PHP_CodeSniffer 4 |
| go | `go build`, `go vet`, `gofmt -l`, `go test` | passes on go1.26.4; the module has no external dependencies |

## Major bumps and what each one forced

- **JUnit 5 → 6** requires Java 17+, so `maven.compiler.release` went 11 → 21 and the CI matrix went
  `['11','17','21']` → `['21','25']`. The READMEs' "Java 11 or higher" line was updated with it.
- **PHPUnit 10 → 13** requires `php >=8.4.1`, so `composer.json` went `>=8.1` → `>=8.4` and the CI
  matrix went `['8.1','8.2','8.3','8.4']` → `['8.4','8.5']`. PHP 8.4 and 8.5 are not installed
  locally, so both were run in the official docker images.
- **xunit 2 → xunit.v3 4 on net10.0** was the only bump that needed a change beyond a version
  number. The .NET 10 SDK removed the VSTest path, and `dotnet test` failed with *"Testing with
  VSTest target is no longer supported by Microsoft.Testing.Platform on .NET 10 SDK and later"*.
  Neither `<TestingPlatformDotnetTestSupport>` nor a `dotnet.config` `[dotnet.test.runner]` section
  fixed it. The documented opt-in is `global.json`:

  ```json
  { "test": { "runner": "Microsoft.Testing.Platform" } }
  ```

  with `TestingPlatformDotnetTestSupport` **removed**, and the test project built as
  `<OutputType>Exe</OutputType>` because an xunit v3 project is its own test host. `Microsoft.NET.Test.Sdk`,
  `xunit.runner.visualstudio` and `coverlet.collector` are VSTest components and are gone.
  `Microsoft.CSharp` was dropped too — it is part of the framework on net10.0, and keeping it emitted
  NU1510.

## Negative test of the new consistency check

The check has to fail when the implementations disagree, not merely pass when they agree:

```
$ sed -i 's|<version>0.16.0</version>|<version>0.3.0</version>|' java/pom.xml
$ node scripts/version-consistency.mjs; echo "exit=$?"
js: 0.16.0
python: 0.16.0
rust: 0.16.0
csharp: 0.16.0
go: 0.16.0
java: 0.3.0
php: 0.16.0
::error::the implementations declare different versions: 0.16.0 (js, python, rust, csharp, go, php); 0.3.0 (java)
exit=1
$ git checkout java/pom.xml && node scripts/version-consistency.mjs; echo "exit=$?"
All 7 implementations declare 0.16.0.
exit=0
```

## Release audit after the bump

`release-audit-after-bump.txt` is the audit's output with 0.16.0 declared and every registry still
serving 0.15.0 — seven warnings and exit 0. This is exactly the state
[REQUIREMENTS.md](REQUIREMENTS.md) describes as the reason that check must not be a hard failure.

## Pre-commit hooks

`.pre-commit-config.yaml` pins its hooks by git tag, which is a dependency declaration like any
other, and they had drifted badly: `pre-commit-hooks` v4.5.0 (v6.0.0 current), `mirrors-eslint`
v8.56.0 while `js/package.json` asks for eslint 10, `black` 24.1.1 while `python/pyproject.toml`
asks for 26.5, `isort` 5.13.2 against 9.0, `flake8` 7.0.0 against 7.3, `markdownlint-cli` v0.39.0
(v0.49.1 current). All six were bumped to match. `doublify/pre-commit-rust` stays at v1.0 — that is
still its newest tag.

`pre-commit run --all-files` does **not** pass on this repository, and did not before this pull
request either. It is not wired into any workflow, and the failures are all outside the shipped
implementations: `black` and `isort` want to reformat `csharp/scripts/format-files.py` and two
`experiments/` scripts, `flake8` reports E203/E501 in `docs/comparison/generate_comparison_svgs.py`,
and `markdownlint` reports hundreds of MD013/MD024/MD040 findings across `docs/case-studies/` and
the READMEs. The `python/` package itself is clean under all three linters. Reformatting the rest of
the repository is not part of #292, so it was left alone rather than folded into a dependency
update — the auto-fixing hooks were run once, and their edits reverted.

## Dependabot ecosystems

`.github/dependabot.yml` watched `cargo`, `npm`, `pip` and `github-actions`. It now also watches
`maven` (/java), `composer` (/php) and `gomod` (/go), so every manifest in the repository is
covered. `.pre-commit-config.yaml` is not: Dependabot has no `pre-commit` ecosystem, so those tags
stay a manual bump.
