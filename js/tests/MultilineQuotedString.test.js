import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';

const parser = new Parser();

test('TestMultilineDoubleQuotedReference', () => {
  const input = `(
  "long
string literal representing
the reference"

  'another
long string literal
as another reference'
)`;
  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  expect(result.length).toBe(1);

  const link = result[0];
  expect(link.id).toBe(null);
  expect(link.values).toBeTruthy();
  expect(link.values.length).toBe(2);

  expect(link.values[0].id).toBe(`long
string literal representing
the reference`);

  expect(link.values[1].id).toBe(`another
long string literal
as another reference`);
});

test('TestSimpleMultilineDoubleQuoted', () => {
  const input = `("line1
line2")`;
  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  expect(result.length).toBe(1);

  const link = result[0];
  expect(link.id).toBe(null);
  expect(link.values).toBeTruthy();
  expect(link.values.length).toBe(1);
  expect(link.values[0].id).toBe('line1\nline2');
});

test('TestSimpleMultilineSingleQuoted', () => {
  const input = `('line1
line2')`;
  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  expect(result.length).toBe(1);

  const link = result[0];
  expect(link.id).toBe(null);
  expect(link.values).toBeTruthy();
  expect(link.values.length).toBe(1);
  expect(link.values[0].id).toBe('line1\nline2');
});

test('TestMultilineQuotedAsId', () => {
  const input = `("multi
line
id": value1 value2)`;
  const result = parser.parse(input);

  expect(result.length).toBeGreaterThan(0);
  expect(result.length).toBe(1);

  const link = result[0];
  expect(link.id).toBe('multi\nline\nid');
  expect(link.values).toBeTruthy();
  expect(link.values.length).toBe(2);
});
