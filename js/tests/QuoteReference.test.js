// Quoting a reference, and reading every quoted reference back (issues #443
// and #444).
//
// `quoteReference` writes one reference so a parser reads it back as exactly
// that text; `needsQuoting` says whether the text can be written bare. The
// property test below feeds seeded random text built from the characters that
// matter to the grammar through the formatter and reads it back in the ID and
// the value position of parenthesised, single-line and indented links.

import { test, expect } from 'bun:test';
import {
  Link,
  Parser,
  escapeReference,
  formatLinks,
  formatNested,
  needsQuoting,
  quoteReference,
  unescapeReference,
} from '../src/index.js';

const parser = new Parser();

test('quoteReference writes text that needs no delimiters as it is', () => {
  for (const text of ['plain', 'issue#1047', 'a-b_c.d', 'π', '~1']) {
    expect(quoteReference(text)).toBe(text);
    expect(needsQuoting(text)).toBe(false);
  }
});

test('quoteReference quotes text a parser would read differently', () => {
  expect(quoteReference('has space')).toBe("'has space'");
  expect(quoteReference('12:30')).toBe("'12:30'");
  expect(quoteReference('#release')).toBe("'#release'");
  expect(quoteReference('(a)')).toBe("'(a)'");
  expect(quoteReference('"')).toBe("'\"'");
  expect(quoteReference("'")).toBe('"\'"');
  expect(quoteReference('')).toBe('~1{}');
  expect(quoteReference('a\nb')).toBe('~1{610a62}');
  for (const text of ['has space', '12:30', '#release', '', '"', 'a\nb']) {
    expect(needsQuoting(text)).toBe(true);
  }
});

test('quoteReference is escapeReference', () => {
  for (const text of ['a b', 'a', "it's", '', '#x', 'x:y']) {
    expect(quoteReference(text)).toBe(escapeReference(text));
    expect(quoteReference(text, { minimal: true })).toBe(
      escapeReference(text, { minimal: true })
    );
  }
  expect(quoteReference(null)).toBe('');
});

test('needsQuoting refuses what is not text', () => {
  expect(() => needsQuoting(null)).toThrow(TypeError);
  expect(() => needsQuoting(1)).toThrow(TypeError);
});

// A small, seeded generator, so a failure names the text that broke and the
// same texts are tried on every run.
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = [
  'a',
  'b',
  '1',
  ' ',
  ' ',
  '\t',
  '\n',
  '\r',
  '"',
  '"',
  "'",
  "'",
  '`',
  '#',
  ':',
  '(',
  ')',
  '~',
  '{',
  '}',
  'é',
  '😀',
];

function texts(count, seed) {
  const next = random(seed);
  const result = [];
  for (let index = 0; index < count; index++) {
    const length = Math.floor(next() * 9);
    let text = '';
    for (let position = 0; position < length; position++) {
      text += ALPHABET[Math.floor(next() * ALPHABET.length)];
    }
    result.push(text);
  }
  return result;
}

// Texts that broke a parser or a formatter before, or came close.
const TRICKY = [
  '',
  ' ',
  '"',
  "'",
  '`',
  '""',
  "''",
  '""""',
  '"\'',
  '\'"',
  '#',
  '#x',
  'a #b',
  ':',
  'a:',
  ':a',
  '12:30',
  'a: b',
  '(',
  ')',
  '~1{}',
  '~1{61}',
  'a\nb',
  '"" ',
  ' ""',
  '"\n',
  "it's",
  'say "hi"',
];

const tree = (links) =>
  links.map((link) => [link.id, ...tree(link.values ?? [])]);
const readBack = (document) => JSON.stringify(tree(parser.parse(document)));

test('every quoted reference reads back in every position', () => {
  for (const text of [...TRICKY, ...texts(2000, 443444)]) {
    const written = quoteReference(text);
    const message = JSON.stringify({ text, written });
    expect(unescapeReference(written), message).toBe(text);

    const link = JSON.stringify([[text, [text], ['x']]]);
    expect(readBack(`(${written}: ${written} x)`), message).toBe(link);
    expect(readBack(`${written}: ${written} x`), message).toBe(link);
    expect(readBack(`${written}: ${written} x\n`), message).toBe(link);
    expect(readBack(`${written}:\n  ${written}\n  x\n`), message).toBe(link);
    // Two lines that each end with the reference: the shape of issue #443.
    expect(readBack(`root:\n  a ${written}\n  b ${written}\n`), message).toBe(
      JSON.stringify([['root', [null, ['a'], [text]], [null, ['b'], [text]]]])
    );
    expect(readBack(`(a (${written} ${written}) b)`), message).toBe(
      JSON.stringify([[null, ['a'], [null, [text], [text]], ['b']]])
    );
  }
});

test('every formatted link reads back as the same link', () => {
  const pool = [...TRICKY, ...texts(400, 445)];
  for (let index = 0; index + 2 < pool.length; index += 3) {
    const links = [
      new Link(pool[index], [new Link(pool[index + 1]), new Link('x')]),
      new Link(null, [new Link(pool[index + 2]), new Link(pool[index])]),
    ];
    const message = JSON.stringify(pool.slice(index, index + 3));
    for (const document of [formatLinks(links), formatLinks(links, true)]) {
      const parsed = parser.parse(document);
      expect(parsed.length, message + document).toBe(links.length);
      parsed.forEach((link, at) =>
        expect(link.equals(links[at]), message + document).toBe(true)
      );
    }
    // The nested writer puts every value on a line of its own.
    const nested = parser.parse(formatNested(links));
    expect(tree(nested), message).toEqual(
      tree(parser.parse(formatLinks(links)))
    );
  }
});
