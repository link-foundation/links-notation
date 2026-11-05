import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { expect, test } from 'bun:test';
import {
  FormatOptions,
  Link,
  Parser,
  StreamParser,
  formatLinks,
} from '../src/index.js';

const fixtures = JSON.parse(
  readFileSync(
    new URL('../../parity/text-fixtures.json', import.meta.url),
    'utf8'
  )
);
const tree = (links) =>
  links.map((link) => ({ id: link.id, values: tree(link.values) }));

test('shared text parity', () => {
  for (const fixture of fixtures) {
    const parsed = new Parser().parse(fixture.input);
    expect(tree(parsed), fixture.id).toEqual(fixture.expected);
    expect(formatLinks(parsed), fixture.id).toBe(fixture.format);
    expect(tree(new Parser().parse(fixture.format)), fixture.id).toEqual(
      fixture.expected
    );
    const stream = new StreamParser();
    for (const character of fixture.input) stream.write(character);
    expect(tree(stream.end()), fixture.id).toEqual(fixture.expected);
  }
});

test('shared less parentheses round trip', () => {
  const options = new FormatOptions({ lessParentheses: true });
  for (const fixture of fixtures) {
    const parsed = new Parser().parse(fixture.input);
    expect(formatLinks(parsed, true), fixture.id).toBe(fixture.lessParentheses);
    expect(formatLinks(parsed, options), fixture.id).toBe(
      fixture.lessParentheses
    );
    expect(
      tree(new Parser().parse(fixture.lessParentheses)),
      fixture.id
    ).toEqual(fixture.expected);
    for (const link of parsed) {
      const [readBack] = new Parser().parse(link.format(true));
      expect(link.equals(readBack), fixture.id).toBe(true);
    }
  }
});

test('less parentheses keeps the parentheses of a lone nested value', () => {
  const nested = new Link(null, [new Link('b'), new Link('c')]);
  expect(new Link(null, [nested]).format(true)).toBe('((b c))');
  expect(new Link(null, [new Link('b')]).format(true)).toBe('b');
  expect(new Link(null, [new Link('a'), nested]).format(true)).toBe('a (b c)');
});

test('less parentheses keeps the parentheses of an empty link', () => {
  const options = new FormatOptions({ lessParentheses: true });
  expect(new Link(null, []).format(true)).toBe('()');
  expect(new Link(null, []).format(options)).toBe('()');
  expect(formatLinks([], true)).toBe('');
});

test('line length is measured on the parentheses a lone nested value keeps', () => {
  const link = new Link(null, [new Link(null, [new Link('b'), new Link('c')])]);
  const options = (maxLineLength) =>
    new FormatOptions({
      lessParentheses: true,
      indentLongLines: true,
      maxLineLength,
      preferInline: false,
    });
  expect(link.format(options(7))).toBe('((b c))');
  expect(link.format(options(6))).toBe('((b c))');
});
