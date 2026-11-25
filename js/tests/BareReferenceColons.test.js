// Issue #444: colons inside a bare reference.
//
// A run of colons between two characters of a bare reference belongs to the
// reference, so times, URLs and qualified names need no quotes. A colon that is
// followed by whitespace, a parenthesis, a quote or a versioned literal still
// separates an ID from its values, and a bare reference never starts or ends
// with a colon.

import { test, expect } from 'bun:test';
import { Parser, ParseError, formatLinks } from '../src/index.js';

const parser = new Parser();
const tree = (links) =>
  links.map((link) => [link.id, ...tree(link.values ?? [])]);
const parses = (document) => JSON.stringify(tree(parser.parse(document)));
const same = (document, expected) =>
  expect(parses(document)).toBe(parses(expected));

test('a time is one reference', () => {
  same('time 12:30\n', "time '12:30'\n");
  same('root:\n  time 12:30\n', "root:\n  time '12:30'\n");
});

test('a URL is one reference', () => {
  same('url https://example.com/a#b\n', "url 'https://example.com/a#b'\n");
});

test('a qualified name is one reference', () => {
  same('type std::string\n', "type 'std::string'\n");
});

test('an ID may hold a colon', () => {
  same('a:b: c\n', "'a:b': c\n");
  same('(a:b: c)', "('a:b': c)");
  same('a:b\n', "'a:b'\n");
});

test('a colon before a value that cannot continue a reference separates', () => {
  same('a: b\n', '(a: b)');
  same('a:"b c"\n', "(a: 'b c')");
  same("a:'b'\n", '(a: b)');
  same('a:(b c)\n', '(a: (b c))');
  same('a:~1{62}\n', '(a: b)');
  same('a :b\n', '(a: b)');
});

test('a value of the link may hold a colon', () => {
  same('a: b:c\n', "(a: 'b:c')");
});

test('a second ID on a line is still an error', () => {
  expect(() => parser.parse('stage: rust: nextest\n')).toThrow(ParseError);
  expect(() => parser.parse(': a\n')).toThrow(ParseError);
});

test('a reference with colons is written with quotes', () => {
  expect(formatLinks(parser.parse('time 12:30\n'))).toBe("(time '12:30')");
});
