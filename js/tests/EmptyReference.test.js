// Conformance tests for the empty reference (issue #288).
//
// A bare delimiter pair is the empty reference. The three delimiters `"`, `'`
// and ` (backtick) behave identically, and every longer n-quote run keeps the
// meaning it already had. The table below is shared with the Rust, Python, C#,
// Go, Java and PHP suites, so a document written by one implementation reads
// the same in all of them.

import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

const parser = new Parser();

// Render a parsed node unambiguously: every reference is wrapped in angle
// brackets so an empty one is visible as `<>`.
function render(node) {
  if (!node.values || node.values.length === 0) {
    return `<${node.id ?? ''}>`;
  }
  const head = node.id === null || node.id === undefined ? '' : `<${node.id}>: `;
  return `(${head}${node.values.map(render).join(' ')})`;
}

function parsesAs(input) {
  return parser
    .parse(input)
    .map(render)
    .join('\n');
}

test('TestBareDelimiterPairIsTheEmptyReference', () => {
  expect(parsesAs('(a "" b)')).toBe('(<a> <> <b>)');
});

test('TestEveryDelimiterStyleYieldsTheSameEmptyReference', () => {
  expect(parsesAs('(a "" b)')).toBe('(<a> <> <b>)');
  expect(parsesAs("(a '' b)")).toBe('(<a> <> <b>)');
  expect(parsesAs('(a `` b)')).toBe('(<a> <> <b>)');
});

test('TestAdjacentEmptyReferencesStaySeparate', () => {
  expect(parsesAs('(a "" "" b)')).toBe('(<a> <> <> <b>)');
  expect(parsesAs("(a '' '' b)")).toBe('(<a> <> <> <b>)');
  expect(parsesAs('(a `` `` b)')).toBe('(<a> <> <> <b>)');
  expect(parsesAs('(a ""  "" b)')).toBe('(<a> <> <> <b>)');
});

test('TestNestedEmptyReferencesParse', () => {
  expect(parsesAs('("" ("" 1))')).toBe('(<> (<> <1>))');
  expect(parsesAs('("" (\'\' 1))')).toBe('(<> (<> <1>))');
  expect(parsesAs('("x" ("" 1))')).toBe('(<x> (<> <1>))');
  expect(parsesAs('("" ("x" 1))')).toBe('(<> (<x> <1>))');
  expect(parsesAs('("" x ("" 1))')).toBe('(<> <x> (<> <1>))');
  expect(parsesAs('("" 1 ("" 1))')).toBe('(<> <1> (<> <1>))');
});

test('TestEmptyReferenceIsValidAsAnId', () => {
  expect(parsesAs('("": 1)')).toBe('(<>: <1>)');
  expect(parsesAs('(o: ("" (o: ("" 1))))')).toBe('(<o>: (<> (<o>: (<> <1>))))');
});

test('TestNQuoteDelimitedBodiesAreUnchanged', () => {
  // A run that encloses a substantive body keeps its n-quote meaning.
  expect(parsesAs('(a ""x"" b)')).toBe('(<a> <x> <b>)');
  expect(parsesAs('(x "" " "")')).toBe('(<x> < " >)');
  expect(parsesAs('(x \' " \')')).toBe('(<x> < " >)');
  // An n-quote-delimited empty is still empty.
  expect(parsesAs('(a """" b)')).toBe('(<a> <> <b>)');
});

test('TestSingleSpaceStillReadsAsASpace', () => {
  expect(parsesAs('(a " " b)')).toBe('(<a> < > <b>)');
});

test('TestOddDelimiterRunsStayLiteralText', () => {
  expect(parsesAs('(a " b)')).toBe('(<a> <"> <b>)');
  expect(parsesAs('(a """ b)')).toBe('(<a> <"""> <b>)');
});

test('TestEmptyReferenceSurvivesARoundTrip', () => {
  const inputs = [
    '(a "" b)',
    '(a "" "" b)',
    '("" ("" 1))',
    '("": 1)',
    '(o: ("" (o: ("" 1))))',
  ];
  for (const input of inputs) {
    const links = parser.parse(input);
    const formatted = formatLinks(links);
    expect(parser.parse(formatted)).toEqual(links);
  }
});

test('TestEmptyReferenceIsWrittenAsADelimiterPair', () => {
  expect(formatLinks(parser.parse('(a "" b)'))).toBe('(a "" b)');
});
