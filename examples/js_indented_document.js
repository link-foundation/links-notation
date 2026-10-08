// Run from the repository root: node examples/js_indented_document.js
import assert from "node:assert/strict";
import {
  parseIndentedDocument,
  formatIndentedDocument,
} from "../js/src/index.js";

const answers = new Map([
  ["What is your experience?", "I have worked with JavaScript"],
  ['Question with "quotes": and colon', "It's ready for review"],
  ["Skills", ["JavaScript", "Python"]],
  ["Tell us more", "First paragraph\nSecond paragraph"],
]);

const document = formatIndentedDocument(answers);
assert.deepEqual(parseIndentedDocument(document), answers);
console.log(document);
