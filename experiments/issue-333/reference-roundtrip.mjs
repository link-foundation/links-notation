// A finite exhaustive probe: strings up to length three over syntax characters.
// Run: node --max-old-space-size=256 experiments/issue-333/reference-roundtrip.mjs
import assert from "node:assert/strict";
const {
  Parser,
  escapeReference,
  unescapeReference,
  formatIndentedDocument,
  parseIndentedDocument,
} = await import(
  process.argv.includes('--built')
    ? '../../js/dist/index.js'
    : '../../js/src/index.js'
);

const alphabet = [
  "a",
  " ",
  "'",
  '"',
  "`",
  "#",
  ":",
  "(",
  ")",
  "\n",
  "\t",
  "\r",
  "\\",
];
const parser = new Parser();
let checked = 0;
function check(text) {
  const escaped = escapeReference(text);
  assert.equal(unescapeReference(escaped), text, JSON.stringify(text));
  assert.equal(
    parser.parse(escaped)[0].values[0].id,
    text,
    JSON.stringify(text),
  );
  const entries = new Map([[text, text]]);
  assert.deepEqual(
    parseIndentedDocument(formatIndentedDocument(entries)),
    entries,
  );
  checked++;
}
function enumerate(prefix, remaining) {
  check(prefix);
  if (remaining === 0) return;
  for (const character of alphabet)
    enumerate(prefix + character, remaining - 1);
}
enumerate("", 3);
console.log(`Verified ${checked} reference and document round trips.`);
