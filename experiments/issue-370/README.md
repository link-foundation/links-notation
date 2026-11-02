# Issue 370: the Kotlin Multiplatform binding

The Kotlin port started as a copy of the one link-foundation/ui vendored under
`native/kotlin/links-notation` (link-foundation/ui#89). These experiments carry
over the two checks ui ran against it, so the experience gathered there is
reproducible against this repository's sources.

## Differential test against the JavaScript reference

`differential/` is ui's `experiments/kotlin-differential`. It now reads the
JavaScript parser from `js/src` and builds the Kotlin side with `kotlin/gradlew`
instead of a separately compiled jar. It compares, for random documents, the
parsed links, the `formatLinks` text, and for a refused document the error
kind, line, column and full message:

```sh
# <count> <seed> <maxDepth>
node experiments/issue-370/differential/differential.mjs 5000 1 64
```

`differential.init.gradle` adds the Kotlin program to the build only for that
run; it is not part of the published library.

ui's generator was a linear congruential generator computed in doubles. It
lost low bits and repeated itself, so only about 1,500 of 5,000 documents per
seed were distinct. The script now uses xorshift32 in exact 32-bit arithmetic,
the generator of Swift's `experiments/issue-369/differential-vectors.mjs`.
About 4,600 of 5,000 documents are distinct; the repeats are short ones.

The table shows the results for the port as committed, with 5,000 random
documents plus 21 fixed ones per seed. The seeds and depths are the ones ui
used.

| Seeds | `maxDepth` | Mismatches |
| ----- | ---------- | ---------- |
| 1–5   | 64         | 0          |
| 6–8   | 2          | 0          |
| 9     | 0          | 0          |
| 11    | 64         | 0          |

There is one expected difference. A malformed reference literal (`~1{zz}`,
`~1{ff}`, `~2{41}`) makes the JavaScript parser throw `Parse error: …` without
a position. The Kotlin port throws `ParseException.Syntax` at the literal. The
script counts those cases as agreeing.

The `differential` job of `.github/workflows/kotlin.yml` runs the script on
every CI run with 20,000 documents, `maxDepth` 8, and the run id as the seed, as
Swift's `differential` job does.

## ui's parser vectors

ui checked the port against its 50 ui-dialect/0 parser vectors
(`docs/spec/parser-vectors.json` there). They belong to ui's specification, so
they are not copied here. `ui-vectors.init.gradle` runs them through the shared
`assertCase` of the Kotlin tests on JVM, JS and Wasm. Its header has the exact
commands. All 50 pass, including the three refused documents with JavaScript's
line, column and message.

## Release preparation

`prepare_release.py` prepares 0.30.0 for all ten bindings.
