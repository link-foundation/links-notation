# Nested contexts, checked in all seven implementations

[Issue #282](https://github.com/link-foundation/links-notation/issues/282) asked
what a parenthesis does to the lines inside it. The answer the parsers settled on
is that `(` opens a nested context: the body starts fresh at indentation level
zero and follows the same rules the root does, so the line breaks and the
indentation inside the parentheses are structure, not whitespace.

That answer has to be the same in every implementation, or a document written
against one library means something else when another library reads it. This
directory checks that it is.

## The document

```
value (
  id "1"
  label "one"
)
```

Every implementation must print `(value ((id 1) (label one)))`: two children,
each a link of its own. The reading this rules out is the flat one -
`(value (id 1 label one))` - in which the record boundary between `id` and
`label` is lost and cannot be recovered by the reader.

## Running it

```bash
bash experiments/issue-282/parity/run.sh
```

The script parses the document with the JavaScript, Python, PHP, Rust, Go, Java
and C# libraries in this repository, formats the result back to notation, and
compares each against `expected.txt`. It exits non-zero if any implementation
disagrees. A language whose toolchain is not installed is reported as skipped
rather than failed, so the script is still useful on a machine that has only
some of them; PHP additionally needs `composer install` in `php/` and an
interpreter new enough for the package, which the script looks for by version
rather than by binary name.

Output on a machine with all seven:

```
JavaScript   (value ((id 1) (label one)))
Python       (value ((id 1) (label one)))
PHP          (value ((id 1) (label one)))
Rust         (value ((id 1) (label one)))
Go           (value ((id 1) (label one)))
Java         (value ((id 1) (label one)))
C#           (value ((id 1) (label one)))

Every implementation that ran agrees.
```

## What each file is

| File | What it does |
|------|--------------|
| `document.lino` | The input, shared by all seven checks |
| `expected.txt` | The one reading they must all produce |
| `run.sh` | Runs every check and compares the output |
| `check.mjs` | JavaScript, against `js/src` directly |
| `check.py` | Python, against `python/` on `sys.path` |
| `check.php` | PHP, through `php/vendor/autoload.php` |
| `rust/` | A crate outside the workspace with a path dependency on `rust/links-notation` |
| `go/` | A module with a `replace` pointing at `go/` |
| `java/Check.java` | Compiled against the sources in `java/src/main/java` |
| `csharp/` | A project referencing `csharp/Link.Foundation.Links.Notation` |

Each one reaches into the library in this working tree rather than a published
package, so the check reports what the code here does today.
