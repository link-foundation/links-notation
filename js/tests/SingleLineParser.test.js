import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

const parser = new Parser();

test('Single link', () => {
  const source = '(address: source target)';
  const links = parser.parse(source);
  const target = formatLinks(links);
  expect(target).toBe(source);
});

test('Triplet single link', () => {
  const source = '(papa has car)';
  const links = parser.parse(source);
  const target = formatLinks(links);
  expect(target).toBe(source);
});

test('Bug test 1', () => {
  const source = '(ignore conan-center-index repository)';
  const links = parser.parse(source);
  const target = formatLinks(links);
  expect(target).toBe(source);
});

test('Quoted references', () => {
  const source = '(a: \'b\' "c")';
  const target = '(a: b c)';
  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('Quoted references with spaces', () => {
  const source = "('a a': 'b b' \"c c\")";
  const target = "('a a': 'b b' 'c c')";
  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('Parse simple reference', () => {
  const input = 'test';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('test');
  expect(result[0].values[0].values).toEqual([]);
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
  const input = '"has space" \'has:colon\'';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(2);
  expect(result[0].values[0].id).toBe('has space');
  expect(result[0].values[1].id).toBe('has:colon');
  // Ensure formatting matches C# expectation
  expect(formatLinks(result)).toBe("('has space' 'has:colon')");
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
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('singlet');
  expect(result[0].values[0].values).toEqual([]);
});

test('Test value link', () => {
  const input = '(value1 value2 value3)';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Parse quoted references values only', () => {
  const source = '"has space" \'has:colon\'';
  const parser = new Parser();
  const links = parser.parse(source);
  expect(links).toBeTruthy();
  expect(links.length).toBe(1);
  expect(links[0].id).toBe(null);
  expect(links[0].values.length).toBe(2);
  expect(links[0].values[0].id).toBe('has space');
  expect(links[0].values[1].id).toBe('has:colon');
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

test('Test simple reference (parser)', () => {
  const input = 'hello';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('hello');
});

test('Test quoted reference (parser)', () => {
  const input = '"hello world"';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('hello world');
});

test('Test singlet link (parser)', () => {
  const input = '(singlet)';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('singlet');
  expect(result[0].values[0].values).toEqual([]);
});

test('Test value link (parser)', () => {
  const input = '(a b c)';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(3);
});

test('Multiline without id', () => {
  // Test that '(:)' syntax is forbidden and should throw an error
  const input = '(: value1 value2)';
  // JS parser forbids this syntax
  expect(() => parser.parse(input)).toThrow();
});

test('Parse values only standalone colon', () => {
  // Test that standalone ':' is forbidden and should throw an error
  const input = ': value1 value2';
  // JS parser forbids this syntax
  expect(() => parser.parse(input)).toThrow();
});

test('Quoted references with spaces in link', () => {
  const input = '(id: "value with spaces")';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('id');
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('value with spaces');
});

test('Single line without id', () => {
  // Test parsing a single line without ID (just values)
  const input = '(value1 value2)';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(2);
});

test('Link with id', () => {
  const input = '(id: a b c)';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('id');
  expect(result[0].values.length).toBe(3);
});

test('Quoted reference', () => {
  const input = '"quoted value"';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('quoted value');
});

test('Quoted references with special chars', () => {
  const input = '("special:char" "another@char")';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(2);
  expect(result[0].values[0].id).toBe('special:char');
  expect(result[0].values[1].id).toBe('another@char');
});

test('Simple reference', () => {
  const input = 'simplereference';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Single line link', () => {
  const input = 'id: value1 value2';
  const result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('id');
  expect(result[0].values.length).toBe(2);
});

test('Single line with id', () => {
  const input = 'myid: val1 val2';
  const result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
  expect(result[0].id).toBe('myid');
});
