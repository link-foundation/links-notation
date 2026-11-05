import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { expect, test } from 'bun:test';
import { Link, Parser } from '../src/index.js';

const unindent = ({ element, children }) =>
  children.length
    ? new Link(element.id, [...element.values, ...children.map(unindent)])
    : element;

const fixtures = JSON.parse(
  readFileSync(
    new URL('../../parity/text-fixtures.json', import.meta.url),
    'utf8'
  )
);

test('indented ID groups fold to the same links as parse (#381)', () => {
  for (const input of [
    'x:\n  a\n  b',
    "'x':\n  'a'\n  ~1{62}",
    'x:\n  (a)\n  b c\n  child: value',
    'x:\n  inner:\n    a\n  branch\n    b',
    'x:\n  child: kind\n    a\n  (branch)\n    b',
    'x:\r\n  a # comment\r\n\r\n  b',
    ...fixtures
      .filter((fixture) => fixture.id.startsWith('indented-id-'))
      .map((fixture) => fixture.input),
  ]) {
    const parser = new Parser();
    expect(parser.parseGroups(input).map(unindent), input).toEqual(
      parser.parse(input)
    );
  }
});

test('a bare ID group is a self reference with an empty value list', () => {
  const parser = new Parser();
  for (const input of ['id:', '(id:)', 'id:\n  a']) {
    const [group] = parser.parseGroups(input);
    expect(group.element.id).toBe('id');
    expect(group.element.values).toEqual([]);
    expect(group.children).toHaveLength(input.includes('\n') ? 1 : 0);
  }
  expect(parser.parse('id:')).toEqual([new Link('id', [])]);
});

test('reference children keep syntax metadata and explicit parentheses', () => {
  const [group] = new Parser().parseGroups("'x':\n  'a'\n  (b)");
  expect(group.element.rawId).toBe("'x'");
  expect(group.children[0].element.id).toBe('a');
  expect(group.children[0].element.rawId).toBe("'a'");
  expect(group.children[0].element.quote).toBe("'");
  expect(group.children[1].element).toEqual(new Link(null, [new Link('b')]));
  const [ast] = new Parser({ syntax: false }).parseGroups("x:\n  'a'");
  expect(ast.children[0].element.rawId).toBeNull();
});

test('ordinary heads retain one-value child links and path expansion', () => {
  const parser = new Parser();
  for (const input of ['x\n  a\n  b', 'x: kind\n  a\n  b']) {
    const [group] = parser.parseGroups(input);
    expect(group.children.map((child) => child.element)).toEqual([
      new Link(null, [new Link('a')]),
      new Link(null, [new Link('b')]),
    ]);
    expect(parser.parse(input)).toHaveLength(3);
  }
});
