// Finite deterministic probe; run: node --max-old-space-size=256 experiments/issue-380/fuzz-nested-format.mjs
import assert from "node:assert/strict";
import { Link, Parser, formatNested } from "../../js/src/index.js";
const parser = new Parser();
const fold = ({ element, children }) =>
  children.length
    ? new Link(element.id, [...element.values, ...children.map(fold)])
    : element;
const tree = (links) =>
  links.map(({ id, values }) => ({ id, values: tree(values) }));
let seed = 380;
const rand = (n) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};
const ids = ["a", "b", "", "a b", "# comment", "x:y", "a\nb", "'\"`", "λ"];
function node(depth) {
  if (!depth || rand(3) === 0) return new Link(ids[rand(ids.length)]);
  return new Link(
    rand(2) ? null : ids[rand(ids.length)],
    Array.from({ length: 1 + rand(4) }, () => node(depth - 1)),
  );
}
for (let i = 0; i < 1500; i++) {
  // Normalize through parse first: excludes models the existing inline format cannot represent.
  const links = parser.parse(node(3).format());
  const text = formatNested(links);
  assert.deepEqual(
    tree(parser.parseGroups(text).map(fold)),
    tree(links),
    `case ${i}: ${text}`,
  );
}
console.log(
  "1500 deterministic nested round trips passed (maximum generated depth 3).",
);
