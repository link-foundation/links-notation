// Run from the repository root: node examples/js_cst_round_trip.mjs
//
// Issue #364: a parsed link remembers how its ID was written, and the concrete
// syntax tree (CST) gives back the document exactly as it was written.
import assert from "node:assert/strict";
import { Parser, CstKind } from "../js/src/index.js";

const parser = new Parser();

// `1` and `'1'` are the same reference; only the way they were written differs.
const [link] = parser.parse("(t 1 '1')");
const [, bare, quoted] = link.values;
assert.ok(bare.equals(quoted));
assert.equal(link.format(), "(t 1 1)");
console.log(`${bare.rawId} quote=${bare.quote}`); // 1 quote=null
console.log(`${quoted.rawId} quote=${quoted.quote}`); // '1' quote='

// AST mode leaves the metadata out.
const [plain] = new Parser({ syntax: false }).parse("(t 1 '1')");
assert.equal(plain.values[2].rawId, null);

// The CST keeps every character: comments, blank lines, indentation, quotes.
const document = "# settings\r\nname: 'Ada'  # who\n\n(t 1 '1')\n";
const cst = parser.parseCst(document);
assert.equal(cst.toString(), document);
assert.equal(
  cst
    .tokens()
    .map((token) => token.text)
    .join(""),
  document,
);
for (const token of cst.tokens()) {
  if (token.kind === CstKind.REFERENCE) {
    console.log(`${token.text} -> ${token.value} (quote ${token.quote})`);
  }
}
console.log(cst.toSExpression());
