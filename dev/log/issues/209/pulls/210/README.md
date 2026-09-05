# Work log — issue #209 / pull request #210

What was measured, what was verified and how, while answering
[link-foundation/links-notation#209](https://github.com/link-foundation/links-notation/issues/209)
("Add tokenization benchmarks comparing with YAML, XML, JSON") and the follow-up review comment on
[#210](https://github.com/link-foundation/links-notation/pull/210).

`dev/log/` is gitignored (`.gitignore`, `[Ll]og/`), so only what is written here and the screenshots
are committed, with `git add -f`.

| Path | Committed? | Contents |
| --- | --- | --- |
| `README.md` | yes | this file |
| `screenshots/website-before.png`, `screenshots/website-after.png` | yes | the docs site before and after the changes in this branch |

## What the benchmark rests on

The claim a reviewer has to be able to check is that the formats are being compared on the same
information. Four things establish that, and each one fails the build rather than warning:

1. **One source of truth.** `benchmarks/tools/generate-datasets.mjs` writes `datasets/*.json` from
   seeded generators; the Rust benchmark derives every other representation from those. No YAML,
   XML, CSV or Links Notation document in `generated/` is hand-written.
2. **Round-trip.** Every `.lino` document and the compact JSON are decoded back and compared with
   the source value before a number is reported.
3. **Third-party readers.** `tools/verify-representations.mjs` re-reads every generated document
   with `yaml`, `fast-xml-parser`, `csv-parse` and `lino-objects-codec` — libraries with no stake in
   the outcome — and compares against the dataset.
4. **Seven-way agreement.** Each supported language parses every generated `.lino` with its own
   implementation and counts it with its own tokenizer. The seven files in `results/` differ only in
   which language wrote them; any disagreement is a failure.

Point 4 is also why both encodings are OpenAI BPE: `o200k_base` and `cl100k_base` are the only two
for which a tokenizer exists in all seven languages, and cross-language agreement is the property
that keeps the numbers honest. `benchmarks/README.md` and the generated report both now say so
under "What the benchmark does not answer" / "What this does not measure", alongside the other
three limits — no accuracy measurement, no surrounding prompt, no speed.

## Headline result

From `benchmarks/BENCHMARK_RESULTS.md`, totals over all 11 datasets, `o200k_base`:

| Format | Tokens | vs JSON (indented) |
| --- | ---: | ---: |
| Links Notation (minimal quoting) | 9205 | 28.7% fewer |
| YAML | 9831 | 23.9% fewer |
| Links Notation | 9873 | 23.5% fewer |
| JSON (indented) | 12914 | — |
| XML (indented) | 16028 | 24.1% more |

Compact JSON (8004) is smaller than all of them, and CSV smaller still, which is why the report
carries both as reference points rather than quietly omitting them.

## Bugs found while verifying, and fixed here

| Symptom | Root cause | Fix |
| --- | --- | --- |
| The report footer credited `links-notation` **0.1.0** | `report::markdown` was passed `env!("CARGO_PKG_VERSION")` from `main.rs`, which expands to the *benchmark* crate's version, not the parser's | `rust/links-notation/src/lib.rs` now exposes `pub const VERSION`, and the benchmark reports that |
| The website header advertised a stale version | `docs/website/index.html` carried a hand-typed literal while `script.js` also wrote the same span from `__LIBRARY_VERSION__` | literal removed; the build-time value is now the only source |
| `experiments/issue-209/lino-shapes` would not build | path dependency was one `..` short (`../../rust/…` resolves to the non-existent `experiments/rust/…`); `cargo metadata` exited 101 | corrected to `../../../rust/links-notation` |
| `experiments/issue-282/parity/run.sh` reported a false disagreement | with an older SDK the C# check hit `NETSDK1045` and counted as a disagreement instead of a skip | the block now asks `dotnet --list-sdks` what it can target, and skips like the PHP check does |

## Verification run before pushing

- All seven benchmarks agree; `npm --prefix benchmarks/tools run check` passes.
- All seven test suites pass. C# is run from `csharp/` because `csharp/global.json` opts into
  Microsoft.Testing.Platform and CI sets `working-directory: csharp`; from the repository root
  `dotnet test` picks up VSTest instead and fails for that reason alone.
- `scripts/version-consistency.mjs` reports all seven implementations declaring **0.17.0**.
- `experiments/issue-282/parity/run.sh` — all seven agree with .NET 10 present, six agree and C# is
  skipped without it.
