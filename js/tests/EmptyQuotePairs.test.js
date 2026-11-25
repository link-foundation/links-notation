// Issue #443: an empty quoted value at the end of a line must not swallow the
// lines after it.
//
// An even run of quotes (`""`, `''`, `""""`, ...) followed by whitespace up to
// the end of its line is the empty reference, however later lines continue. A
// run followed directly by text (`""x`) still opens a reference that may reach
// across lines, so multiline references keep working.

import { test, expect } from 'bun:test';
import { Parser, StreamParser, formatLinks } from '../src/index.js';

const parser = new Parser();
const tree = (links) =>
  links.map((link) => [link.id, ...tree(link.values ?? [])]);
const parses = (document) => JSON.stringify(tree(parser.parse(document)));

test('empty values on consecutive indented lines stay on their lines', () => {
  const expected = [['root', [null, ['a'], ['']], [null, ['b'], ['']]]];
  expect(parses('root:\n  a ""\n  b ""\n')).toBe(JSON.stringify(expected));
  expect(parses("root:\n  a ''\n  b ''\n")).toBe(JSON.stringify(expected));
  expect(parses('root:\n  a ""\n  b ""')).toBe(JSON.stringify(expected));
});

test('an empty value before a quoted value keeps both values', () => {
  const [root] = parser.parse('root:\n  a ""\n  b "x y"\n');
  expect(root.values.map((link) => link.values.map((v) => v.id))).toEqual([
    ['a', ''],
    ['b', 'x y'],
  ]);
});

test('an empty value at the end of a top-level line stays on its line', () => {
  expect(formatLinks(parser.parse('a ""\nb ""\n'))).toBe('(a ~1{})\n(b ~1{})');
  expect(formatLinks(parser.parse('a "" \nb ""\n'))).toBe('(a ~1{})\n(b ~1{})');
  expect(formatLinks(parser.parse('a ""'))).toBe('(a ~1{})');
});

test('a longer even run at the end of a line is empty too', () => {
  expect(formatLinks(parser.parse('a """"\nb """"\n'))).toBe(
    '(a ~1{})\n(b ~1{})'
  );
});

test('doubled quotes that nothing closes are the empty reference', () => {
  expect(parses('(a: """")')).toBe(JSON.stringify([['a', ['']]]));
  expect(parses('(a: """""")')).toBe(JSON.stringify([['a', ['']]]));
});

test('a single quote character is written between the other quotes', () => {
  expect(parses("(a: '\"')")).toBe(JSON.stringify([['a', ['"']]]));
  expect(parses('(a: "\'")')).toBe(JSON.stringify([['a', ["'"]]]));
  expect(parses('(a: `"`)')).toBe(JSON.stringify([['a', ['"']]]));
});

test('an even run followed by text still opens a multiline reference', () => {
  expect(parses('a ""x\ny""\n')).toBe(
    JSON.stringify([[null, ['a'], ['x\ny']]])
  );
});

test('an even run still holds what the same line closes', () => {
  expect(parses('(x "" " "")')).toBe(JSON.stringify([[null, ['x'], [' " ']]]));
  expect(parses('a "" b ""')).toBe(JSON.stringify([[null, ['a'], [' b ']]]));
});

test('the stream emits a line that ends with an empty value at once', () => {
  const stream = new StreamParser();
  const emitted = [];
  for (const character of 'a ""\nb ""\nc\n') {
    emitted.push(...stream.write(character));
  }
  expect(formatLinks(emitted)).toBe('(a ~1{})\n(b ~1{})');
  expect(formatLinks(stream.end())).toBe('(a ~1{})\n(b ~1{})\n(c)');
});
