import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

const parser = new Parser();

const format = (source) => formatLinks(parser.parse(source), false);

// https://github.com/link-foundation/links-notation/issues/282
// Indentation is structural at the root, so it must be structural inside
// parentheses too: a parenthesised group opens a nested context that starts
// fresh at indentation level zero and follows exactly the root's rules.

test('TestParenthesesReproduceRootIndentation', () => {
  const root = format(`a
  b
c
  d`);

  expect(root).toBe(`(a)
((a) (b))
(c)
((c) (d))`);

  // The same lines inside parentheses keep the same structure, nested under the
  // link the group belongs to.
  const nested = format(`array (
  a
    b
  c
    d
)`);

  expect(nested).toBe('(array ((a) ((a) (b)) (c) ((c) (d))))');
});

test('TestParenthesesKeepRecordBoundaries', () => {
  expect(
    format(`value (
  id "1"
  label "one"
)`)
  ).toBe('(value ((id 1) (label one)))');

  const links = parser.parse(`value (
  id "1"
  label "one"
)`);
  expect(links.length).toBe(1);

  const group = links[0].values[1];
  expect(group.id).toBe(null);
  expect(group.values.length).toBe(2);
  expect(group.values[0].values[0].id).toBe('id');
  expect(group.values[0].values[1].id).toBe('1');
  expect(group.values[1].values[0].id).toBe('label');
  expect(group.values[1].values[1].id).toBe('one');
});

test('TestParenthesesKeepSeveralRecordsSeparate', () => {
  expect(
    format(`value (
  (id "1" label "one")
  (id "2" label "two")
)`)
  ).toBe('(value ((id 1 label one) (id 2 label two)))');
});

test('TestParenthesesNestDeeply', () => {
  expect(
    format(`outer (
  inner (
    x 1
    y 2
  )
  z 3
)`)
  ).toBe('(outer ((inner ((x 1) (y 2))) (z 3)))');
});

test('TestSingleLineParenthesesAreUnchanged', () => {
  expect(format('(a b c)')).toBe('(a b c)');
  expect(format('(1: 2 3)')).toBe('(1: 2 3)');
  expect(format('(a: b c)')).toBe('(a: b c)');
  expect(format('((a b))')).toBe('((a b))');
  expect(format('(a)')).toBe('(a)');
  expect(format('()')).toBe('()');
});

test('TestParenthesesWithIndentedIdSyntax', () => {
  expect(
    format(`(
  a:
    b
    c
)`)
  ).toBe('(a: b c)');
});

test('TestEmployeeRecordsKeepTheirFields', () => {
  expect(
    format(`empInfo
  employees:
    (
      name (James Kirk)
      age 40
    )
    (
      name (Jean-Luc Picard)
      age 45
    )`)
  ).toBe(`(empInfo)
((empInfo) (employees: ((name (James Kirk)) (age 40)) ((name (Jean-Luc Picard)) (age 45))))`);
});
