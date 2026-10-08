# Indented document API investigation (#333)

The linked Q&A consumer reconstructed immediate children from the parser's
private `_isFromPathCombination` marker and implemented its own escaping,
unescaping, and array-versus-text heuristics. The grammar already retains an
indentation tree; `Parser.collectLinks()` expands it into paths. The new
`parseGroups()` exposes that tree as existing `LinksGroup` objects before this
expansion, while sharing validation, depth limits, comment handling, and errors.

The original `Link.escapeReference()` wrote `He said "it's ready"` with a
backslash before the apostrophe. The quote reader recognizes doubled enclosing
delimiters, so parsing the formatted Link truncated the reference to
`He said "it\`. The regression test was run before implementation and failed
with exactly that mismatch. The new APIs were also absent: the initial run of
`js/tests/IndentedDocument.test.js` reported ten failures.

Minimal escaping in `references.js` uses the existing quote reader to decode
serialized references and writes doubled escapes. Choosing a delimiter
different from the first content character avoids extending the opening quote
run accidentally. Minimal
mode quotes comment starts and significant whitespace, but leaves ordinary
single-space prose unquoted. Link IDs are not unescaped again after parsing.

Run the finite exhaustive probe (2,380 strings of length zero through three):

```sh
node --max-old-space-size=256 experiments/issue-333/reference-roundtrip.mjs
node --max-old-space-size=256 experiments/issue-333/reference-roundtrip.mjs --built
```

It checks serialized-reference decoding, ordinary parser round trips, and text
Map round trips over letters, all quote styles, whitespace, comments, structural
characters, and backslashes. The JavaScript unit suite covers the issue's full
document, nested groups, explicit array/join policies, duplicate parents,
multiline and Unicode text, empty values, invalid structures, and parser limits.
The runnable consumer example is `examples/js_indented_document.js`; TypeScript
declarations are checked in CI using `examples/js_indented_document.ts`.

Scope: JavaScript, the language used by the issue's consumer. Release metadata
is synchronized to 0.25.0 across all seven implementations because the
repository's mandatory version-consistency check requires it. A one-element
array reads back as a string because the text syntax cannot distinguish them.
Multiple children default to an array; joining them as multiline text requires
the explicit `multipleValues: 'join'` option.

The initial PR also failed dependency freshness before any implementation:
run [37853190544](https://github.com/link-foundation/links-notation/actions/runs/37853190544)
at 2026-10-08 22:23:45 UTC, head
`a2daba237e1440cc36d55e843077197d0eec2d63`. Lines 203–227 of its preserved
log listed stale Spotless, lino-objects-codec, Vite, and GitHub Actions versions.
Those declarations and the affected npm locks were refreshed without changing
the freshness policy. Local command output and downloaded CI logs are kept in
`ci-logs/` for review.

On head `b84905a`, the benchmark job in run
[37854026043](https://github.com/link-foundation/links-notation/actions/runs/37854026043)
failed its generated-file drift check. Lines 1006–1007 of the preserved log
showed one changed line in `benchmarks/BENCHMARK_RESULTS.md`; lines 1019–1020
reported stale output. Regenerating the report updates its embedded library
version from 0.23.0 to 0.24.0. The generator's subsequent `--check` verified all
73 generated files without drift.

During final review, main merged #335 with the lossless reference literal
extension in 0.24.0. This branch merges that change and retains its canonical
encoder for default Link formatting. Minimal mode also uses its literals for
empty/control strings and quotes reserved prefixes and Unicode whitespace;
`unescapeReference()` decodes complete literals. Two additional regression tests
failed before this integration (`~1{61}` was left unquoted and `~1{}` was not
decoded). They now cover the shared 91-reference Unicode corpus, malformed
literals, reserved-prefix text, and rejecting unpaired surrogates. An additional
case reproduced `text ~1{61} after` becoming `text a after`: minimal mode must
quote reserved prefixes at every word boundary, including the middle of prose.
The new API
therefore prepares the next minor release, 0.25.0. The benchmark report is
regenerated once more for that version.
