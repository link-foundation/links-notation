# Porting the issue #443 / #444 fixes to one language

JavaScript is the reference implementation. Commit `76730c36` holds the whole JS
change: run `git show 76730c36 -- js/src` to read it, and
`git show 76730c36 -- js/tests` for the tests. Port the same behaviour to your
language so that it behaves exactly as JS does. The shared fixtures in
`parity/text-fixtures.json`, `parity/syntax-fixtures.json`,
`parity/nested-fixtures.json` and the generated `parity/*-vectors.tsv` are
already updated. Your language's shared-parity tests read them, so they are the
acceptance test.

## Rule 1: an even quote run that ends its line is empty (#443)

In the delimited-reference reader (JS `js/src/quotes.js`, function `reading` and
the new helper `staysOnItsLine`), an even opening run (2, 4, ... quotes) is read
as the empty reference `{value: '', length: count, closed: true}` when both of
these hold:

- the character right after the run is whitespace (space, tab, `\n`, `\r`) or
  the end of the input; and
- either no run closes the reference (end === null), or the body up to the
  closing run contains `\n` or `\r`.

This check runs before any other logic in `reading`. Odd runs are unaffected.
`""x\ny""` (non-whitespace right after the run) is still a multiline
reference. `(x "" " "")` is still `' " '`, and `a "" b ""` is still `' b '`.

## Rule 2: when `#` opens a comment (#444)

`#` opens a comment only if the character before it is space, tab, `\n` or
`\r`, or the `#` is at position 0. In addition, one of these must hold:

- only spaces and tabs stand between it and the start of its line (or of the
  document); or
- the character after it is one of space, tab, `\n`, `\r`, `(`, `:`, `)`, or
  the end of the document.

Otherwise the `#` is an ordinary character starting a bare reference. So
`tag #release` is the link of `tag` and `#release`, while `a: b # why`,
`a: b #`, `a b #(x)` and `#release` at the start of a line are comments.

In JS this is one exported predicate, `opensComment(document, position)` in
`js/src/comments.js`. It is used both by `stripComments` and by
`StreamParser.structurallyComplete`. Use one shared predicate in your language
too, wherever a `#` is judged: the comment stripper, the stream parser's
completeness check, and any CST code that detects comments. The stream
parser's "line starts with `#` → comment line" classification is unchanged.

## Rule 3: colons inside bare references (#444)

A run of one or more colons is part of a bare (unquoted) reference when:

- it follows a bare-reference character (the reference has started; a bare
  reference never starts with a colon); and
- the character right after the colon run is a bare-reference start character,
  i.e. NOT one of space, tab, `\n`, `\r`, `(`, `:`, `)`, `"`, `'`,
  `` ` ``, and NOT end of input; and
- the text after the colon run does not start with a versioned-literal prefix
  `~[0-9]+{`.

Otherwise the colon ends the reference, as before. Results:

- `12:30`, `https://x/y#frag` and `std::string` are one reference each.
- `a:b` is the single reference `a:b`.
- `a:b: c` is a link with ID `a:b`.
- `a:"b"`, `a:(b c)`, `a:~1{62}`, `a :b` and `a: b` are still ID/value links.
- `stage: rust: nextest` is still a parse error at line 2, column 12, offset
  21, found `:` (see the ParseErrorPosition tests). Error positions and
  expected-token lists must not move; in Peggy this is why the whole colon
  test is a lookahead.

In JS the grammar rule is (`js/src/grammar.pegjs`):

```
simpleReference = &{ return !hasReferenceLiteralPrefix(input, offset()); }
 chars:$(referenceSymbol (referenceSymbol / innerColons)*) { return chars; }
innerColons = &(":"+ !referenceLiteralPrefix bareReferenceStart) ":"+
bareReferenceStart = [^ \t\n\r(:)"'`]
referenceLiteralPrefix = "~" [0-9]+ "{"
```

The CST tokenizer's bare-reference end scan (JS `js/src/Cst.js`
`referenceEnd`) must apply the same rule. The comment stripper and the stream
completeness check may keep treating `:` as a token separator; this is
consistent, because a character after inner colons can never be a quote or a
comment-opening `#`.

## Helpers (#444): `quoteReference` and `needsQuoting`

Add two public helpers, named idiomatically for your language next to the
existing reference escaping function:

- `quoteReference(reference[, options])`: the same function as the existing
  escape/format-reference function, including the minimal option if your
  language has one.
- `needsQuoting(reference[, options])`: true when `quoteReference` returns
  something other than the input.

Both stay conservative: colons, whitespace, parentheses, quotes and a leading
`#` are still quoted. Export them from the package's public API and
document them with doc comments.

## Tests to change or add in your language

Change these existing tests whose expectations the new rules change. Look in
your Comments / StreamParser / CST tests for the same strings:

- `` ```q```"" #c\n"""\n `` becomes `` ```q```""x # c\n"""\n ``, and it now
  reads as the references `q` and `x # c\n"`.
- `stripComments('a"b #c"\n') == 'a"b    \n'` becomes
  `stripComments('a"b # c"\n') == 'a"b     \n'`.
- The stream test "waits for the line that closes an even run of quotes
  (#377)" uses the input `'a ""b\n"" c\n'` instead of `'a "" b\n"" c\n'`.

Add native tests that mirror the new JS tests:

- `js/tests/EmptyQuotePairs.test.js`
- `js/tests/BareReferenceColons.test.js`
- the issue #444 hash tests at the end of `js/tests/Comments.test.js`
- `js/tests/QuoteReference.test.js`: the helper tests, plus a round trip over
  the same TRICKY list of strings. Every string goes through `quoteReference`
  and is parsed back in the positions `(q: q x)`, `q: q x`, `q:\n  q\n  x\n`,
  `root:\n  a q\n  b q\n` and `(a (q q) b)`. A seeded random generator is
  optional; if you add one, keep it deterministic and cheap.

Keep the new tests small and fast.

## Constraints

- Edit only files under your language's directory: `<lang>/`.
  - Do NOT edit `js/`, `parity/`, `docs/`, `README.md` or `changelog.d/`.
  - Do NOT run `scripts/ci/check-parity.mjs --refresh-inventory`.
- Do NOT commit, and do NOT push. The coordinator commits.
- Run your language's formatter and linter, if it has them and they are
  installed. Then run your language's whole native test suite, or at least the
  parser, comments, CST, stream, shared-parity and new tests, and get them
  passing. Save long logs in `ci-logs/<lang>-*.log`.
- Use a bounded build: one build at a time, few jobs. Never run builds of other
  languages.
- Do not leave build artifacts in the repo tree that git would see (check
  `git status`).
- If a generated parser exists (for example the C# `Parser.peg` with
  Pegasus), change the grammar source, and make sure the generated code is
  regenerated the way the build does it.
- If your language's README documents comments, colons in references, or
  reference escaping, update it to describe the new rules.

## Report back

When done, report:

1. the files you changed;
2. the exact path of the file implementing `quoteReference`/`needsQuoting`,
   and of the test file covering them (for `parity/language-features.json`);
3. the test command you ran and its pass/fail counts;
4. anything you could not do.
