# Token efficiency benchmarks

How much of a model's context each format spends on the same information. Links Notation is compared against JSON, YAML, XML and CSV over 11 datasets that cover the shapes real payloads have: uniform records, semi-uniform records, nested records, deeply nested configuration, keyed maps and tuples.

> This file is generated. Run `cargo run -p links-notation-benchmark --release` from the `rust` directory to rebuild it; CI regenerates it on every push to `main` and commits it when it changes.

## What is measured

Every representation is produced from the same source dataset by the benchmark itself, so no format silently carries less information than another. Each document is then measured four ways:

- **Tokens (o200k)** - the `o200k_base` encoding, used by GPT-5, GPT-4.1 and GPT-4o. This is the headline number: it is what a document costs in a context window.
- **Tokens (cl100k)** - the `cl100k_base` encoding, used by GPT-4 and GPT-3.5, so a result that depends on one vocabulary is visible as such.
- **Characters** - Unicode scalar values of the UTF-8 text.
- **Bytes** - the length of the UTF-8 text.

Links Notation appears in three rows because a writer has a real choice to make. **Links Notation** is what `lino-objects-codec` writes today: every string is quoted, so a reader never has to know the resolution rules to tell text from a number. **Links Notation (minimal quoting)** quotes a string only where writing it bare would read back as something else, which is the rule YAML plain scalars follow and therefore the like-for-like comparison against YAML. **Links Notation (single line)** is the one-line form. All three decode back to the same value; the difference is how much the writer pays for making the types obvious in the text.

## Totals across all datasets

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 9873 | 9919 | 34467 | 34568 | 23.5% | -23.4% |
| Links Notation (minimal quoting) | 9205 | 9227 | 33239 | 33340 | 28.7% | -15.0% |
| Links Notation (single line) | 9811 | 9857 | 26427 | 26528 | 24.0% | -22.6% |
| JSON (indented) | 12914 | 12960 | 40428 | 40529 | 0.0% | -61.3% |
| JSON (compact) | 8004 | 7906 | 25636 | 25737 | 38.0% | 0.0% |
| YAML | 9831 | 9853 | 28847 | 28948 | 23.9% | -22.8% |
| XML (indented) | 16028 | 16047 | 48500 | 48601 | -24.1% | -100.2% |
| CSV (reference floor) * | 1528 | 1549 | 4394 | 4394 | 88.2% | 80.9% |

\* Not available for every dataset in this group, so its total covers fewer datasets than the others.

## Totals by data shape

### Deeply nested (deep_config)

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 244 | 244 | 1043 | 1043 | 26.9% | -31.9% |
| Links Notation (minimal quoting) | 237 | 237 | 1029 | 1029 | 29.0% | -28.1% |
| Links Notation (single line) | 253 | 253 | 701 | 701 | 24.3% | -36.8% |
| JSON (indented) | 334 | 334 | 1199 | 1199 | 0.0% | -80.5% |
| JSON (compact) | 185 | 185 | 653 | 653 | 44.6% | 0.0% |
| YAML | 232 | 232 | 824 | 824 | 30.5% | -25.4% |
| XML (indented) | 410 | 409 | 1519 | 1519 | -22.8% | -121.6% |

### Keyed maps (feature_flags)

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 658 | 658 | 2583 | 2583 | 26.9% | -16.7% |
| Links Notation (minimal quoting) | 628 | 628 | 2493 | 2493 | 30.2% | -11.3% |
| Links Notation (single line) | 689 | 689 | 2013 | 2013 | 23.4% | -22.2% |
| JSON (indented) | 900 | 900 | 2975 | 2975 | 0.0% | -59.6% |
| JSON (compact) | 564 | 535 | 1917 | 1917 | 37.3% | 0.0% |
| YAML | 638 | 638 | 2107 | 2107 | 29.1% | -13.1% |
| XML (indented) | 1115 | 1114 | 3764 | 3764 | -23.9% | -97.7% |

### Nested records (orders)

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1968 | 1974 | 7319 | 7319 | 20.5% | -27.6% |
| Links Notation (minimal quoting) | 1876 | 1877 | 7157 | 7157 | 24.2% | -21.7% |
| Links Notation (single line) | 1897 | 1903 | 5050 | 5050 | 23.3% | -23.0% |
| JSON (indented) | 2474 | 2480 | 8299 | 8299 | 0.0% | -60.4% |
| JSON (compact) | 1542 | 1517 | 4873 | 4873 | 37.7% | 0.0% |
| YAML | 1863 | 1862 | 5804 | 5804 | 24.7% | -20.8% |
| XML (indented) | 2855 | 2861 | 8722 | 8722 | -15.4% | -85.1% |

### Semi-uniform records (event_logs)

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1022 | 1022 | 3433 | 3433 | 18.5% | -29.7% |
| Links Notation (minimal quoting) | 952 | 949 | 3311 | 3311 | 24.1% | -20.8% |
| Links Notation (single line) | 965 | 965 | 2599 | 2599 | 23.0% | -22.5% |
| JSON (indented) | 1254 | 1254 | 3895 | 3895 | 0.0% | -59.1% |
| JSON (compact) | 788 | 786 | 2515 | 2515 | 37.2% | 0.0% |
| YAML | 954 | 951 | 2725 | 2725 | 23.9% | -21.1% |
| XML (indented) | 1475 | 1474 | 4269 | 4269 | -17.6% | -87.2% |

### Other (sparse_records)

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1590 | 1614 | 5693 | 5794 | 22.6% | -21.6% |
| Links Notation (minimal quoting) | 1544 | 1563 | 5571 | 5672 | 24.8% | -18.0% |
| Links Notation (single line) | 1604 | 1628 | 4236 | 4337 | 21.9% | -22.6% |
| JSON (indented) | 2054 | 2078 | 6485 | 6586 | 0.0% | -57.0% |
| JSON (compact) | 1308 | 1308 | 4084 | 4185 | 36.3% | 0.0% |
| YAML | 1579 | 1598 | 4701 | 4802 | 23.1% | -20.7% |
| XML (indented) | 2304 | 2327 | 7036 | 7137 | -12.2% | -76.1% |

### Tuples (doublets, triplets, sequences)

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 534 | 547 | 1467 | 1467 | 41.8% | -22.2% |
| Links Notation (minimal quoting) | 283 | 291 | 1151 | 1151 | 69.2% | 35.2% |
| Links Notation (single line) | 534 | 547 | 1473 | 1473 | 41.8% | -22.2% |
| JSON (indented) | 918 | 931 | 2596 | 2596 | 0.0% | -110.1% |
| JSON (compact) | 437 | 395 | 1473 | 1473 | 52.4% | 0.0% |
| YAML | 655 | 669 | 1673 | 1673 | 28.6% | -49.9% |
| XML (indented) | 1819 | 1823 | 4934 | 4934 | -98.1% | -316.2% |
| CSV (reference floor) * | 240 | 266 | 744 | 744 | 73.9% | 45.1% |

\* Not available for every dataset in this group, so its total covers fewer datasets than the others.

### Uniform records (employees, analytics, repositories)

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 3857 | 3860 | 12929 | 12929 | 22.6% | -21.3% |
| Links Notation (minimal quoting) | 3685 | 3682 | 12527 | 12527 | 26.0% | -15.9% |
| Links Notation (single line) | 3869 | 3872 | 10355 | 10355 | 22.3% | -21.7% |
| JSON (indented) | 4980 | 4983 | 14979 | 14979 | 0.0% | -56.6% |
| JSON (compact) | 3180 | 3180 | 10121 | 10121 | 36.1% | 0.0% |
| YAML | 3910 | 3903 | 11013 | 11013 | 21.5% | -23.0% |
| XML (indented) | 6050 | 6039 | 18256 | 18256 | -21.5% | -90.3% |
| CSV (reference floor) * | 1288 | 1283 | 3650 | 3650 | 74.1% | 59.5% |

\* Not available for every dataset in this group, so its total covers fewer datasets than the others.

## Per dataset

### employees

Uniform employee records. Shape: Uniform records. Source: [`datasets/employees.json`](datasets/employees.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1522 | 1522 | 5317 | 5317 | 21.9% | -19.8% |
| Links Notation (minimal quoting) | 1445 | 1441 | 5137 | 5137 | 25.9% | -13.8% |
| Links Notation (single line) | 1520 | 1520 | 4339 | 4339 | 22.0% | -19.7% |
| JSON (indented) | 1949 | 1949 | 6119 | 6119 | 0.0% | -53.5% |
| JSON (compact) | 1270 | 1269 | 4261 | 4261 | 34.8% | 0.0% |
| YAML | 1520 | 1512 | 4556 | 4556 | 22.0% | -19.7% |
| XML (indented) | 2303 | 2298 | 7024 | 7024 | -18.2% | -81.3% |
| CSV (reference floor) | 794 | 789 | 2323 | 2323 | 59.3% | 37.5% |

### analytics

Time-series analytics data. Shape: Uniform records. Source: [`datasets/analytics.json`](datasets/analytics.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1273 | 1273 | 3895 | 3895 | 20.8% | -23.6% |
| Links Notation (minimal quoting) | 1272 | 1272 | 3833 | 3833 | 20.8% | -23.5% |
| Links Notation (single line) | 1270 | 1270 | 3082 | 3082 | 21.0% | -23.3% |
| JSON (indented) | 1607 | 1607 | 4501 | 4501 | 0.0% | -56.0% |
| JSON (compact) | 1030 | 1029 | 2989 | 2989 | 35.9% | 0.0% |
| YAML | 1327 | 1327 | 3311 | 3311 | 17.4% | -28.8% |
| XML (indented) | 2040 | 2039 | 5946 | 5946 | -26.9% | -98.1% |

### repositories

Repository listing with uniform fields. Shape: Uniform records. Source: [`datasets/repositories.json`](datasets/repositories.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1062 | 1065 | 3717 | 3717 | 25.4% | -20.7% |
| Links Notation (minimal quoting) | 968 | 969 | 3557 | 3557 | 32.0% | -10.0% |
| Links Notation (single line) | 1079 | 1082 | 2934 | 2934 | 24.2% | -22.6% |
| JSON (indented) | 1424 | 1427 | 4359 | 4359 | 0.0% | -61.8% |
| JSON (compact) | 880 | 882 | 2871 | 2871 | 38.2% | 0.0% |
| YAML | 1063 | 1064 | 3146 | 3146 | 25.4% | -20.8% |
| XML (indented) | 1707 | 1702 | 5286 | 5286 | -19.9% | -94.0% |
| CSV (reference floor) | 494 | 494 | 1327 | 1327 | 65.3% | 43.9% |

### orders

E-commerce orders with nested items and addresses. Shape: Nested records. Source: [`datasets/orders.json`](datasets/orders.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1968 | 1974 | 7319 | 7319 | 20.5% | -27.6% |
| Links Notation (minimal quoting) | 1876 | 1877 | 7157 | 7157 | 24.2% | -21.7% |
| Links Notation (single line) | 1897 | 1903 | 5050 | 5050 | 23.3% | -23.0% |
| JSON (indented) | 2474 | 2480 | 8299 | 8299 | 0.0% | -60.4% |
| JSON (compact) | 1542 | 1517 | 4873 | 4873 | 37.7% | 0.0% |
| YAML | 1863 | 1862 | 5804 | 5804 | 24.7% | -20.8% |
| XML (indented) | 2855 | 2861 | 8722 | 8722 | -15.4% | -85.1% |

### event_logs

Semi-uniform event log records. Shape: Semi-uniform records. Source: [`datasets/event_logs.json`](datasets/event_logs.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1022 | 1022 | 3433 | 3433 | 18.5% | -29.7% |
| Links Notation (minimal quoting) | 952 | 949 | 3311 | 3311 | 24.1% | -20.8% |
| Links Notation (single line) | 965 | 965 | 2599 | 2599 | 23.0% | -22.5% |
| JSON (indented) | 1254 | 1254 | 3895 | 3895 | 0.0% | -59.1% |
| JSON (compact) | 788 | 786 | 2515 | 2515 | 37.2% | 0.0% |
| YAML | 954 | 951 | 2725 | 2725 | 23.9% | -21.1% |
| XML (indented) | 1475 | 1474 | 4269 | 4269 | -17.6% | -87.2% |

### feature_flags

Feature flags keyed by name. Shape: Keyed maps. Source: [`datasets/feature_flags.json`](datasets/feature_flags.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 658 | 658 | 2583 | 2583 | 26.9% | -16.7% |
| Links Notation (minimal quoting) | 628 | 628 | 2493 | 2493 | 30.2% | -11.3% |
| Links Notation (single line) | 689 | 689 | 2013 | 2013 | 23.4% | -22.2% |
| JSON (indented) | 900 | 900 | 2975 | 2975 | 0.0% | -59.6% |
| JSON (compact) | 564 | 535 | 1917 | 1917 | 37.3% | 0.0% |
| YAML | 638 | 638 | 2107 | 2107 | 29.1% | -13.1% |
| XML (indented) | 1115 | 1114 | 3764 | 3764 | -23.9% | -97.7% |

### deep_config

Deeply nested application configuration. Shape: Deeply nested. Source: [`datasets/deep_config.json`](datasets/deep_config.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 244 | 244 | 1043 | 1043 | 26.9% | -31.9% |
| Links Notation (minimal quoting) | 237 | 237 | 1029 | 1029 | 29.0% | -28.1% |
| Links Notation (single line) | 253 | 253 | 701 | 701 | 24.3% | -36.8% |
| JSON (indented) | 334 | 334 | 1199 | 1199 | 0.0% | -80.5% |
| JSON (compact) | 185 | 185 | 653 | 653 | 44.6% | 0.0% |
| YAML | 232 | 232 | 824 | 824 | 30.5% | -25.4% |
| XML (indented) | 410 | 409 | 1519 | 1519 | -22.8% | -121.6% |

### sparse_records

Uniform records with missing values, empty containers and text that looks typed. Shape: Other. Source: [`datasets/sparse_records.json`](datasets/sparse_records.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 1590 | 1614 | 5693 | 5794 | 22.6% | -21.6% |
| Links Notation (minimal quoting) | 1544 | 1563 | 5571 | 5672 | 24.8% | -18.0% |
| Links Notation (single line) | 1604 | 1628 | 4236 | 4337 | 21.9% | -22.6% |
| JSON (indented) | 2054 | 2078 | 6485 | 6586 | 0.0% | -57.0% |
| JSON (compact) | 1308 | 1308 | 4084 | 4185 | 36.3% | 0.0% |
| YAML | 1579 | 1598 | 4701 | 4802 | 23.1% | -20.7% |
| XML (indented) | 2304 | 2327 | 7036 | 7137 | -12.2% | -76.1% |

### doublets

Doublet links (2-tuples). Shape: Tuples. Source: [`datasets/doublets.json`](datasets/doublets.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 167 | 177 | 444 | 444 | 42.2% | -12.1% |
| Links Notation (minimal quoting) | 111 | 121 | 364 | 364 | 61.6% | 25.5% |
| Links Notation (single line) | 167 | 177 | 446 | 446 | 42.2% | -12.1% |
| JSON (indented) | 289 | 299 | 767 | 767 | 0.0% | -94.0% |
| JSON (compact) | 149 | 139 | 446 | 446 | 48.4% | 0.0% |
| YAML | 183 | 195 | 484 | 484 | 36.7% | -22.8% |
| XML (indented) | 545 | 551 | 1438 | 1438 | -88.6% | -265.8% |
| CSV (reference floor) | 117 | 137 | 344 | 344 | 59.5% | 21.5% |

### triplets

Triplet relations (3-tuples). Shape: Tuples. Source: [`datasets/triplets.json`](datasets/triplets.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 189 | 192 | 540 | 540 | 42.9% | -25.2% |
| Links Notation (minimal quoting) | 94 | 91 | 420 | 420 | 71.6% | 37.7% |
| Links Notation (single line) | 189 | 192 | 542 | 542 | 42.9% | -25.2% |
| JSON (indented) | 331 | 334 | 963 | 963 | 0.0% | -119.2% |
| JSON (compact) | 151 | 134 | 542 | 542 | 54.4% | 0.0% |
| YAML | 240 | 242 | 620 | 620 | 27.5% | -58.9% |
| XML (indented) | 670 | 669 | 1834 | 1834 | -102.4% | -343.7% |
| CSV (reference floor) | 123 | 129 | 400 | 400 | 62.8% | 18.5% |

### sequences

Sequences of unlimited length (N-tuples). Shape: Tuples. Source: [`datasets/sequences.json`](datasets/sequences.json).

| Format | Tokens (o200k) | Tokens (cl100k) | Characters | Bytes | vs JSON | vs JSON compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Links Notation | 178 | 178 | 483 | 483 | 40.3% | -29.9% |
| Links Notation (minimal quoting) | 78 | 79 | 367 | 367 | 73.8% | 43.1% |
| Links Notation (single line) | 178 | 178 | 485 | 485 | 40.3% | -29.9% |
| JSON (indented) | 298 | 298 | 866 | 866 | 0.0% | -117.5% |
| JSON (compact) | 137 | 122 | 485 | 485 | 54.0% | 0.0% |
| YAML | 232 | 232 | 569 | 569 | 22.1% | -69.3% |
| XML (indented) | 604 | 603 | 1662 | 1662 | -102.7% | -340.9% |

## How the numbers are kept honest

- **One source of truth.** `benchmarks/datasets/` holds the data; every other representation is derived from it. A dataset cannot gain a field in one format and lose it in another.
- **Round-trip checked.** All three Links Notation forms and the compact JSON are decoded back and compared with the source value before any number is reported. A document that loses information is a failure, not a smaller number.
- **Parsed by the real parser.** Every `.lino` document is parsed by the `links-notation` crate, so the benchmark measures notation the implementation actually accepts.
- **Checked by real libraries.** `benchmarks/tools/verify-representations.mjs` parses the generated YAML and XML with established third-party parsers and compares the result with the source dataset.
- **Reproduced in every language.** All seven supported languages parse every generated Links Notation document with their own implementation and re-count every document with their own tokenizer, then fail unless every number matches the ones reported here. The seven results files under `benchmarks/results/` differ only in which language wrote them.
- **CSV is a floor, not a rival.** It cannot carry nesting, types or the key a table sits under, so it is reported only for genuinely tabular datasets and only as a reference.

## What this does not measure

- **Whether a model reads the format correctly.** Fewer tokens is a cost, not a capability. Choosing a format for a task also needs an accuracy measurement against the models in question, which needs paid inference and is deliberately not run here; nothing in this report is evidence that one format is understood better than another.
- **Vocabularies outside OpenAI's.** Both encodings are OpenAI BPE, because those are the two a tokenizer exists for in all seven implementations, and cross-language agreement is what keeps these numbers honest. Anthropic, Google and Meta models segment text differently, so the percentages would move on them.
- **The rest of the prompt.** Only the document is counted: no system prompt, no code fence, no schema description and no instructions. Those add a cost every format pays alike.
- **Speed and memory.** This is a size benchmark. How fast each format parses is a separate question with a separate answer.

Generated by `links-notation-benchmark` against `links-notation` 0.18.0.
