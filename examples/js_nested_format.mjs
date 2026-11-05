// Run from the repository root: node examples/js_nested_format.mjs
import assert from "node:assert/strict";
import { Link, Parser, formatNested } from "../js/src/index.js";

const parser = new Parser();
const links = parser.parse(
  "(form: stack (direction vertical) (gap 8px) (save: button 'Save' (on press (emit save) (navigate home))))",
);
const text = formatNested(links);
console.log(text);

// Fold child groups into the element's values to read nested formatting.
const fold = ({ element, children }) =>
  children.length
    ? new Link(element.id, [...element.values, ...children.map(fold)])
    : element;
const tree = (values) =>
  values.map(({ id, values }) => ({ id, values: tree(values) }));
assert.deepEqual(tree(parser.parseGroups(text).map(fold)), tree(links));
