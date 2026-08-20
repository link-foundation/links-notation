# Issue 282 — indentation inside parentheses

`repro.js` prints how the JavaScript parser handles the cases from
[issue #282](https://github.com/link-foundation/links-notation/issues/282):
the same indented lines at the root of a document and inside a `( )` group.

Run it from the repository root:

```sh
node experiments/issue-282/repro.js
```

Before the fix the parenthesised cases collapsed into a single flat list of
references. After the fix a `( )` group opens a nested context that starts fresh
at indentation level zero and follows exactly the root's rules, so both forms
produce the same structure.
