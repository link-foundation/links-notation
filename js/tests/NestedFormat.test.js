import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { expect, test } from 'bun:test';
import * as lino from '../src/index.js';

const { Parser, Link, FormatOptions, formatLinks } = lino;
const parser = new Parser();
const fold = ({ element, children }) =>
  children.length
    ? new Link(element.id, [...element.values, ...children.map(fold)])
    : element;
const tree = (links) =>
  links.map(({ id, values }) => ({ id, values: tree(values) }));
const form =
  "(form: stack (direction vertical) (gap 8px) (save: button 'Save' (on press (emit save) (navigate home))))";

test('recursive nested writer formats the issue form and reads back through groups', () => {
  const links = parser.parse(form);
  const text = lino.formatNested(links);
  expect(text).toBe(
    'form: stack\n  direction vertical\n  gap 8px\n  save: button Save\n    on press\n      emit save\n      navigate home'
  );
  expect(tree(parser.parseGroups(text).map(fold))).toEqual(tree(links));
});

test('anonymous threshold output retains the anonymous container', () => {
  for (const input of ['a b c', '((b c))', '(a (b c))']) {
    const links = parser.parse(input);
    for (const threshold of [
      { maxInlineRefs: 1 },
      { indentLongLines: true, maxLineLength: 1 },
    ]) {
      const text = formatLinks(
        links,
        new FormatOptions({
          lessParentheses: true,
          preferInline: false,
          ...threshold,
        })
      );
      expect(tree(parser.parse(text)), input).toEqual(tree(links));
    }
  }
});

test('nested writer folds every existing shared text fixture without changing values', () => {
  const fixtures = JSON.parse(
    readFileSync(
      new URL('../../parity/text-fixtures.json', import.meta.url),
      'utf8'
    )
  );
  for (const fixture of fixtures) {
    const links = parser.parse(fixture.input);
    const text = lino.formatNested(links);
    expect(tree(parser.parseGroups(text).map(fold)), fixture.id).toEqual(
      tree(links)
    );
  }
});

test('shared nested golden corpus and custom indentation read back exactly', () => {
  const cases = JSON.parse(
    readFileSync(
      new URL('../../parity/nested-fixtures.json', import.meta.url),
      'utf8'
    )
  );
  for (const fixture of cases) {
    const links = parser.parse(fixture.input);
    expect(lino.formatNested(links), fixture.id).toBe(fixture.nested);
    for (const indent of ['  ', '    ']) {
      const text = lino.formatNested(links, indent);
      expect(tree(parser.parseGroups(text).map(fold)), fixture.id).toEqual(
        tree(links)
      );
    }
  }
  expect(() => lino.formatNested([], '')).toThrow();
  expect(() => lino.formatNested([], 'x')).toThrow();
  expect(() => lino.formatNested([], '\t')).toThrow();
});
