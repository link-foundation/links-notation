// Writes the issue #443/#444 shared fixtures from the JavaScript reference
// implementation, and refreshes the syntax fixtures whose expected output the
// new rules changed. Review the diff of parity/*.json after running it.
import { readFileSync, writeFileSync } from 'node:fs';
import { Parser, formatLinks, formatNested } from '../../js/src/index.js';

const path = (name) => new URL(`../../parity/${name}`, import.meta.url);
const read = (name) => JSON.parse(readFileSync(path(name), 'utf8'));
const write = (name, value) =>
  writeFileSync(path(name), `${JSON.stringify(value, null, 2)}\n`);

const textCases = [
  ['empty-quote-pairs-per-line', 'empty-references', 'root:\n  a ""\n  b ""\n'],
  ['empty-quote-pairs-single', 'empty-references', "root:\n  a ''\n  b ''\n"],
  ['empty-quote-pair-then-quote', 'empty-references', 'root:\n  a ""\n  b "x y"\n'],
  ['empty-quote-pairs-top-level', 'empty-references', 'a ""\nb ""\n'],
  ['empty-quote-pair-trailing-space', 'empty-references', 'a "" \nb ""\n'],
  ['doubled-quotes-alone', 'quote-runs', '(a: """")\n(b: """""")\n'],
  ['single-quote-characters', 'quote-runs', `(a: '"')\n(b: "'")\n`],
  ['multiline-even-run', 'multiline-references', 'a ""x\ny""\n'],
  ['hash-values', 'comments', 'root:\n  tag #release\n  colour #ff0000 # a note\n  a: b #\n'],
  ['colon-inside-references', 'named-links', 'time 12:30\nurl https://example.com/a#b\ntype std::string\n'],
  ['colon-after-reference-id', 'named-links', 'a:b: c\nd:"e f"\ng:(h i)\nj :k\n'],
];
const syntaxCases = [
  ['hash-value-and-comment', 'concrete-syntax-tree', 'tag #release # note\n'],
  ['colon-inside-reference', 'concrete-syntax-tree', 'at 12:30\na:b: c\nd:"e"\n'],
  ['empty-quote-pair-ends-line', 'concrete-syntax-tree', 'a ""\nb ""\n'],
];
// Syntax fixtures whose input the new rules read differently: the input keeps
// exercising what the fixture is about, and the expectation is regenerated.
const syntaxUpdates = {
  'comment-after-adjacent-quote': '"x"\' #y\'\n```q```""x # c\n"""\n',
  'stream-empty-quote-closed-later': 'a ""b\n"" c\n',
};

const tree = (links) =>
  links.map((link) => ({ id: link.id, values: tree(link.values) }));
const syntaxTree = (links) =>
  links.map((link) => ({
    id: link.id,
    raw: link.rawId,
    quote: link.quote,
    values: syntaxTree(link.values),
  }));
const syntaxFixture = (id, feature, input) => {
  const parser = new Parser();
  return {
    id,
    feature,
    input,
    links: syntaxTree(parser.parse(input)),
    cst: parser.parseCst(input).toSExpression(),
  };
};

const text = read('text-fixtures.json');
const nested = read('nested-fixtures.json');
const lastText = text[text.length - 1].id;
const newText = [];
const newNested = [];
for (const [id, feature, input] of textCases) {
  if (text.some((fixture) => fixture.id === id)) continue;
  const links = new Parser().parse(input);
  newText.push({
    id,
    feature,
    input,
    expected: tree(links),
    format: formatLinks(links),
    lessParentheses: formatLinks(links, true),
  });
  newNested.push({ id, input, nested: formatNested(links) });
}
text.push(...newText);
const at = nested.findIndex((fixture) => fixture.id === lastText) + 1;
nested.splice(at, 0, ...newNested);
write('text-fixtures.json', text);
write('nested-fixtures.json', nested);

const syntax = read('syntax-fixtures.json').map((fixture) =>
  fixture.id in syntaxUpdates
    ? syntaxFixture(fixture.id, fixture.feature, syntaxUpdates[fixture.id])
    : fixture
);
for (const [id, feature, input] of syntaxCases) {
  if (!syntax.some((fixture) => fixture.id === id)) {
    syntax.push(syntaxFixture(id, feature, input));
  }
}
write('syntax-fixtures.json', syntax);
console.log(`added ${newText.length} text fixtures`);
