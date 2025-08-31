import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

const parser = new Parser();

test('SingleLinkTest', () => {
  const source = '(address: source target)';
  const links = parser.parse(source);
  const target = formatLinks(links);
  expect(target).toBe(source);
});

test('TripletSingleLinkTest', () => {
  const source = '(papa has car)';
  const links = parser.parse(source);
  const target = formatLinks(links);
  expect(target).toBe(source);
});

test('BugTest1', () => {
  const source = '(ignore conan-center-index repository)';
  const links = parser.parse(source);
  const target = formatLinks(links);
  expect(target).toBe(source);
});

test('QuotedReferencesTest', () => {
  const source = `(a: 'b' "c")`;
  const target = `(a: b c)`;
  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('QuotedReferencesWithSpacesTest', () => {
  const source = `('a a': 'b b' "c c")`;
  const target = `('a a': 'b b' 'c c')`;
  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('Parse simple reference', () => {
  const input = 'test';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('test');
  expect(result[0].values).toEqual([]);
});

test('Parse reference with colon and values', () => {
  const input = 'parent: child1 child2';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('parent');
  expect(result[0].values.length).toBe(2);
  expect(result[0].values[0].id).toBe('child1');
  expect(result[0].values[1].id).toBe('child2');
});

test('Parse multiline link', () => {
  const input = '(parent: child1 child2)';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('parent');
  expect(result[0].values.length).toBe(2);
});

test('Parse quoted references', () => {
  const input = `"has space" 'has:colon'`;
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(2);
  expect(result[0].values[0].id).toBe('has space');
  expect(result[0].values[1].id).toBe('has:colon');
  // Ensure formatting matches C# expectation
  expect(formatLinks(result)).toBe(`('has space' 'has:colon')`);
});

test('Parse values only', () => {
  const input = ': value1 value2';
  // Standalone ':' is now forbidden and should throw an error
  expect(() => parser.parse(input)).toThrow();
});

test('Test single-line link with id', () => {
  const input = 'id: value1 value2';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test multi-line link with id', () => {
  const input = '(id: value1 value2)';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test link without id (single-line)', () => {
  const input = ': value1 value2';
  // Standalone ':' is now forbidden and should throw an error
  expect(() => parser.parse(input)).toThrow();
});

test('Test link without id (multi-line)', () => {
  const input = '(: value1 value2)';
  // '(:)' syntax is now forbidden and should throw an error
  expect(() => parser.parse(input)).toThrow();
});

test('Test singlet link', () => {
  const input = '(singlet)';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('singlet');
  expect(result[0].values).toEqual([]);
});

test('Test value link', () => {
  const input = '(value1 value2 value3)';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test quoted references', () => {
  const input = '("id with spaces": "value with spaces")';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test single-quoted references', () => {
  const input = "('id': 'value')";
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test nested links', () => {
  const input = '(outer: (inner: value))';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test special characters in quotes', () => {
  let input = '("key:with:colons": "value(with)parens")';
  let result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
  
  input = "('key with spaces': 'value: with special chars')";
  result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test deeply nested', () => {
  const input = '(a: (b: (c: (d: (e: value)))))';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test hyphenated identifiers', () => {
  const input = '(conan-center-index: repository info)';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Test multiple words in quotes', () => {
  const input = '("New York": city state)';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
  expect(JSON.stringify(result)).toContain('New York');
});

test('Test simple ref', () => {
  const input = 'simple_ref';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});