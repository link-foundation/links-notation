import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

const parser = new Parser();

test('Empty link', () => {
  const source = ':';
  // Standalone ':' is now forbidden and should throw an error
  expect(() => parser.parse(source)).toThrow();
});

test('Empty link with parentheses', () => {
  const source = '()';
  const target = '()';
  const links = parser.parse(source);
  const formattedLinks = formatLinks(links);
  expect(formattedLinks).toBe(target);
});

test('Empty link with empty self reference', () => {
  const source = '(:)';
  // '(:)' is now forbidden and should throw an error
  expect(() => parser.parse(source)).toThrow();
});

test('All features', () => {
  // Test single-line link with id
  let input = 'id: value1 value2';
  let result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);

  // Test multi-line link with id
  input = '(id: value1 value2)';
  result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);

  // Test link without id (single-line) - now forbidden
  input = ': value1 value2';
  expect(() => parser.parse(input)).toThrow();

  // Test link without id (multi-line) - now forbidden
  input = '(: value1 value2)';
  expect(() => parser.parse(input)).toThrow();

  // Test singlet link
  input = '(singlet)';
  result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('singlet');
  expect(result[0].values[0].values).toEqual([]);

  // Test value link
  input = '(value1 value2 value3)';
  result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);

  // Test quoted references
  input = '("id with spaces": "value with spaces")';
  result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);

  // Test single-quoted references
  input = "('id': 'value')";
  result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);

  // Test nested links
  input = '(outer: (inner: value))';
  result = parser.parse(input);
  expect(result.length).toBeGreaterThan(0);
});

test('Empty document', () => {
  const input = '';
  // Empty document should return empty array
  const result = parser.parse(input);
  expect(result).toEqual([]);
});

test('Whitespace only', () => {
  const input = '   \n   \n   ';
  // Whitespace-only document should return empty array
  const result = parser.parse(input);
  expect(result).toEqual([]);
});

test('Empty links', () => {
  let input = '()';
  let result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values).toEqual([]);
  
  // '(:)' is now forbidden
  input = '(:)';
  expect(() => parser.parse(input)).toThrow();
  
  input = '(id:)';
  result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('id');
  expect(result[0].values).toEqual([]);
});

test('Singlet links', () => {
  // Test singlet (1)
  let input = '(1)';
  let result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(1);
  expect(result[0].values[0].id).toBe('1');
  expect(result[0].values[0].values).toEqual([]);

  // Test (1 2)
  input = '(1 2)';
  result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(2);
  expect(result[0].values[0].id).toBe('1');
  expect(result[0].values[0].values).toEqual([]);
  expect(result[0].values[1].id).toBe('2');
  expect(result[0].values[1].values).toEqual([]);

  // Test (1 2 3)
  input = '(1 2 3)';
  result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(3);
  expect(result[0].values[0].id).toBe('1');
  expect(result[0].values[0].values).toEqual([]);
  expect(result[0].values[1].id).toBe('2');
  expect(result[0].values[1].values).toEqual([]);
  expect(result[0].values[2].id).toBe('3');
  expect(result[0].values[2].values).toEqual([]);

  // Test (1 2 3 4)
  input = '(1 2 3 4)';
  result = parser.parse(input);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(null);
  expect(result[0].values.length).toBe(4);
  expect(result[0].values[0].id).toBe('1');
  expect(result[0].values[0].values).toEqual([]);
  expect(result[0].values[1].id).toBe('2');
  expect(result[0].values[1].values).toEqual([]);
  expect(result[0].values[2].id).toBe('3');
  expect(result[0].values[2].values).toEqual([]);
  expect(result[0].values[3].id).toBe('4');
  expect(result[0].values[3].values).toEqual([]);
});

test('Invalid input', () => {
  const input = '(invalid';
  // Unclosed parentheses should throw an error
  expect(() => parser.parse(input)).toThrow();
});