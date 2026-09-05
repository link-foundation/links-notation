# Token efficiency benchmarks

How much of a model's context Links Notation spends compared with JSON, YAML, XML and CSV.
The generated report is [BENCHMARK_RESULTS.md](BENCHMARK_RESULTS.md).

## What the benchmark answers

The question issue [#209](https://github.com/link-foundation/links-notation/issues/209) asks is
how many tokens the same information costs in each format. Characters and bytes are reported too,
but tokens are the headline: a context window is billed in tokens, not in characters.

Every document is measured four ways:

| Measurement | How |
| --- | --- |
| Tokens (o200k) | `o200k_base`, the encoding GPT-5, GPT-4.1 and GPT-4o use |
| Tokens (cl100k) | `cl100k_base`, the encoding GPT-4 and GPT-3.5 use |
| Characters | Unicode scalar values of the UTF-8 text |
| Bytes | Length of the UTF-8 text |

Both encodings are counted *ordinarily*: a sequence such as `<|endoftext|>` inside a dataset is
counted as the text it is, not as a control token, because that is what a model sees when a
document is pasted into a prompt.

## Method

One source of truth, everything else derived from it:

1. `tools/generate-datasets.mjs` writes `datasets/*.json` from seeded generators, so the data is
   the same on every machine and every run.
2. The Rust benchmark reads each dataset and writes every representation of it into `generated/`.
   No representation is hand-written, so a format cannot quietly carry less information than
   another.
3. Every Links Notation document and the compact JSON are decoded back and compared with the
   source value before a number is reported. A document that loses information fails the build.
4. `tools/verify-representations.mjs` reads the generated YAML, XML, CSV, JSON and Links Notation
   back with third-party parsers (`yaml`, `fast-xml-parser`, `csv-parse`, `lino-objects-codec`)
   and compares the result with the dataset, so the baselines are checked by libraries that have
   no stake in the outcome.
5. Each of the seven supported languages parses every generated `.lino` with its own
   implementation, counts every document with its own tokenizer, and fails unless every number
   matches Rust's. The seven files in `results/` differ only in which language wrote them.

### Why Links Notation has three rows

A writer has a real choice, and all three forms decode back to the same value through the same
unmodified reader:

| Row | What it is |
| --- | --- |
| Links Notation | What `lino-objects-codec` writes today: every string quoted, so a reader never needs the resolution rules to tell text from a number |
| Links Notation (minimal quoting) | A string is quoted only where writing it bare would read back as something else - the rule YAML plain scalars follow, and therefore the like-for-like comparison against YAML |
| Links Notation (single line) | The one-line form, where the whole document is one link |

### Why CSV is a floor, not a rival

CSV writes each field name once and nothing else, but it cannot carry nesting, cannot carry types
and cannot carry the key a table sits under. It is emitted only for genuinely tabular datasets and
reported as a reference floor.

## Running

The Rust benchmark is the one that writes the documents and the report; the other six check it.

```bash
# Regenerate the datasets (only needed when a generator changes)
node benchmarks/tools/generate-datasets.mjs

# Rust: writes generated/, results/rust.json and BENCHMARK_RESULTS.md
cargo run --manifest-path rust/Cargo.toml -p links-notation-benchmark --release

# JavaScript
npm --prefix benchmarks/js install && node benchmarks/js/benchmark.mjs

# Python
pip install -r benchmarks/python/requirements.txt && python3 benchmarks/python/benchmark.py

# C#
dotnet run --project benchmarks/csharp -c Release

# Go
cd benchmarks/go && go run .

# Java (after `mvn -f java/pom.xml install -DskipTests`)
cd benchmarks/java && mvn -q compile exec:java

# PHP
cd benchmarks/php && composer install && php benchmark.php

# Third-party verification of every generated document
npm --prefix benchmarks/tools install && npm --prefix benchmarks/tools run check
```

Every command accepts `--check`, which compares the committed output instead of rewriting it and
exits non-zero when it is stale. That is what CI runs. `--verbose`, or `CI_VERBOSE=true`, reports
progress per dataset.

## Layout

```
benchmarks/
├── README.md                 # This file
├── BENCHMARK_RESULTS.md      # Generated report (CI commits it on main when it changes)
├── datasets/                 # Source of truth: one JSON file per dataset, plus index.json
├── generated/                # Every representation of every dataset, plus index.json
├── results/                  # One results file per language; all seven agree
├── tools/                    # generate-datasets.mjs, verify-representations.mjs
├── js/       python/    go/  # One benchmark per supported language
└── csharp/   java/     php/
```

The emitters live with the Rust benchmark, one module each:
`rust/links-notation-benchmark/src/{lino,yaml,xml,csv}.rs`, next to `metrics.rs` and
`report.rs`. JSON needs no emitter: `serde_json` writes both the indented and the compact form.

## CI

`.github/workflows/benchmarks.yml` runs the whole chain on every push and pull request that
touches the benchmarks. One job runs the Rust benchmark and publishes what it wrote as an
artifact; the dataset check and the six other language benchmarks all read that artifact, so
every language counts the same bytes rather than whatever happens to be committed.

A pull request fails if the committed output no longer matches the generator, which keeps the
numbers a reviewer reads honest. On `main` that drift is expected instead: once every language
has agreed, a final job commits `generated/`, `results/` and `BENCHMARK_RESULTS.md` with
`GITHUB_TOKEN` - only when the benchmark succeeded, and only when something changed.

## Adding a dataset

1. Add a generator to `tools/generate-datasets.mjs`. Give it a `structure` (`uniform`,
   `semi-uniform`, `nested`, `keyed`, `deeply-nested`, `sparse` or `tuples`) and a `profile`,
   because the report groups by shape.
2. Run `node benchmarks/tools/generate-datasets.mjs`, then the Rust benchmark, then
   `npm --prefix benchmarks/tools run check`.
3. Re-run the six other language benchmarks so their results files pick up the new dataset.

Nothing has to be added to the individual language benchmarks: they read `generated/index.json`.
