# Update links-notation from 0.25.2 to 0.26.0 in all four packages

links-notation 0.26.0 shipped on 2026-10-12 for every language ([releases](https://github.com/link-foundation/links-notation/releases)), but each lino-objects-codec package still pins a range that excludes it:

| Package | File | Constraint | Excludes 0.26.0 |
| --- | --- | --- | --- |
| npm `lino-objects-codec` 0.9.2 | `js/package.json` | `"links-notation": "^0.25.2"` | yes (`^0.25` on a 0.x version is `>=0.25.2 <0.26.0`) |
| crates.io | `rust/Cargo.toml` | `links-notation = "0.25.2"` | yes (same caret rule) |
| PyPI | `python/pyproject.toml` | `links-notation>=0.25.2,<0.26.0` | yes |
| NuGet | `csharp/src/Lino.Objects.Codec/Lino.Objects.Codec.csproj` | `Link.Foundation.Links.Notation` `0.25.2` | resolves 0.25.2 |

## Reproduction

```console
$ npm init -y >/dev/null && npm i lino-objects-codec@0.9.2 links-notation@0.26.0
$ npm ls links-notation
+-- links-notation@0.26.0
`-- lino-objects-codec@0.9.2
  `-- links-notation@0.25.2
```

(Node 26.11.1, npm 11.20.0.) Any project that uses both packages gets two copies of the parser. links-notation's own `benchmarks/tools` resolves 0.25.2 through `lino-objects-codec`.

## Impact downstream

link-foundation/links-notation#348 updates every dependency in that repository to the latest release. This is one of the transitive entries it cannot move. The workaround is to leave it alone: `benchmarks/tools/package-lock.json` keeps 0.25.2 under `lino-objects-codec`, and the reason is recorded in link-foundation/links-notation#349.

## Suggested fix

Raise the constraint in all four languages to `0.26.0` (`^0.26.0`, `"0.26.0"`, `>=0.26.0,<0.27.0`, `Version="0.26.0"`), run the suites, and release. If 0.26.0 changes any parser behaviour the codec relies on, the readable-format fixtures in `fixtures/` should show it.
