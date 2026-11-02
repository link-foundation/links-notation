// Append the issue #377 comment/reference cases to parity/syntax-fixtures.json,
// computing the expected tree and CST with the JavaScript reference parser.
// Review the printed rows before committing. Idempotent: replaces rows by id.
// Run: node experiments/issue-377/add-syntax-fixtures.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Parser } from "../../js/src/index.js";

const path = new URL("../../parity/syntax-fixtures.json", import.meta.url);
const fixtures = JSON.parse(readFileSync(path, "utf8"));
const cases = [
  ["comment-after-group-quote", '(a)" #b"\n'],
  ["comment-after-adjacent-quote", '"x"\' #y\'\n```q```"" #c\n"""\n'],
  ["comment-after-literal-quote", '~1{62}" #b"\n'],
  ["comment-after-empty-quote", '"" a #)b\n""\n'],
  // A stream must not take an even run for the empty reference before the
  // line that closes it arrives.
  ["stream-empty-quote-closed-later", 'a "" b\n"" c\n'],
];
const tree = (links) =>
  links.map((link) => ({
    id: link.id,
    raw: link.rawId,
    quote: link.quote,
    values: tree(link.values),
  }));
for (const [id, input] of cases) {
  const parser = new Parser();
  const row = {
    id,
    feature: "concrete-syntax-tree",
    input,
    links: tree(parser.parse(input)),
    cst: parser.parseCst(input).toSExpression(),
  };
  const index = fixtures.findIndex((fixture) => fixture.id === id);
  if (index === -1) fixtures.push(row);
  else fixtures[index] = row;
  console.log(JSON.stringify(row));
}
writeFileSync(path, JSON.stringify(fixtures, null, 2) + "\n");
