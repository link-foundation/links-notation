/**
 * Tests for punctuation and math symbol tokenization (Issue #148)
 *
 * These tests verify that:
 * 1. Punctuation is tokenized when following alphanumeric characters
 * 2. Math symbols are tokenized only when between digits
 * 3. Hyphenated words are preserved
 * 4. Quoted strings preserve their content
 * 5. Compact formatting can restore human-readable output
 */
import { test, expect } from 'bun:test';
import { Parser, DEFAULT_PUNCTUATION_SYMBOLS, DEFAULT_MATH_SYMBOLS } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';
import { FormatOptions } from '../src/FormatOptions.js';

const parser = new Parser();
const parserNoTokenize = new Parser({ tokenizeSymbols: false });

// Test punctuation tokenization
test('Punctuation: comma separates numbers', () => {
  const links = parser.parse('1, 2 and 3');
  expect(links[0].values.length).toBe(5);
  expect(links[0].values[0].id).toBe('1');
  expect(links[0].values[1].id).toBe(',');
  expect(links[0].values[2].id).toBe('2');
  expect(links[0].values[3].id).toBe('and');
  expect(links[0].values[4].id).toBe('3');
});

test('Punctuation: comma without space', () => {
  const links = parser.parse('1,2,3');
  expect(links[0].values.length).toBe(5);
  expect(links[0].values[0].id).toBe('1');
  expect(links[0].values[1].id).toBe(',');
  expect(links[0].values[2].id).toBe('2');
  expect(links[0].values[3].id).toBe(',');
  expect(links[0].values[4].id).toBe('3');
});

test('Punctuation: period between numbers', () => {
  const links = parser.parse('1.2.3');
  expect(links[0].values.length).toBe(5);
  expect(links[0].values[0].id).toBe('1');
  expect(links[0].values[1].id).toBe('.');
  expect(links[0].values[2].id).toBe('2');
});

test('Punctuation: hello world with comma', () => {
  const links = parser.parse('hello, world');
  expect(links[0].values.length).toBe(3);
  expect(links[0].values[0].id).toBe('hello');
  expect(links[0].values[1].id).toBe(',');
  expect(links[0].values[2].id).toBe('world');
});

// Test math symbol tokenization
test('Math: addition between digits', () => {
  const links = parser.parse('1+1');
  expect(links[0].values.length).toBe(3);
  expect(links[0].values[0].id).toBe('1');
  expect(links[0].values[1].id).toBe('+');
  expect(links[0].values[2].id).toBe('1');
});

test('Math: multiple operations', () => {
  const links = parser.parse('1+1,1/1,1*1');
  expect(links[0].values.length).toBe(11);
  expect(links[0].values[1].id).toBe('+');
  expect(links[0].values[5].id).toBe('/');
  expect(links[0].values[9].id).toBe('*');
});

test('Math: subtraction between digits', () => {
  const links = parser.parse('10-20');
  expect(links[0].values.length).toBe(3);
  expect(links[0].values[0].id).toBe('10');
  expect(links[0].values[1].id).toBe('-');
  expect(links[0].values[2].id).toBe('20');
});

// Test hyphenated words are preserved
test('Hyphenated: Jean-Luc preserved', () => {
  const links = parser.parse('Jean-Luc Picard');
  expect(links[0].values.length).toBe(2);
  expect(links[0].values[0].id).toBe('Jean-Luc');
  expect(links[0].values[1].id).toBe('Picard');
});

test('Hyphenated: conan-center-index preserved', () => {
  const links = parser.parse('conan-center-index');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('conan-center-index');
});

test('Hyphenated: a-b preserved', () => {
  const links = parser.parse('a-b');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('a-b');
});

test('Math symbols between letters are preserved', () => {
  const links = parser.parse('x+y=z');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('x+y=z');
});

// Test quoted strings preserve content
test('Quoted: double quoted comma preserved', () => {
  const links = parser.parse('"1,"');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('1,');
});

test('Quoted: double quoted period preserved', () => {
  const links = parser.parse('"1."');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('1.');
});

test('Quoted: double quoted multiple commas preserved', () => {
  const links = parser.parse('"1,2,3"');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('1,2,3');
});

test('Quoted: hello world with comma preserved', () => {
  const links = parser.parse('"hello, world"');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('hello, world');
});

test('Quoted: mixed quoted and unquoted', () => {
  const links = parser.parse('test "1,2,3" more');
  expect(links[0].values.length).toBe(3);
  expect(links[0].values[0].id).toBe('test');
  expect(links[0].values[1].id).toBe('1,2,3');
  expect(links[0].values[2].id).toBe('more');
});

// Test base64 strings are preserved
test('Base64: padding equals preserved', () => {
  const links = parser.parse('bmFtZQ==');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('bmFtZQ==');
});

// Test compact formatting
test('Compact: restore 1,2,3', () => {
  const links = parser.parse('1,2,3');
  const options = new FormatOptions({ compactSymbols: true });
  const formatted = formatLinks(links, options);
  expect(formatted).toBe('(1,2,3)');
});

test('Compact: restore 1+1', () => {
  const links = parser.parse('1+1');
  const options = new FormatOptions({ compactSymbols: true });
  const formatted = formatLinks(links, options);
  expect(formatted).toBe('(1+1)');
});

test('Compact: restore hello, world', () => {
  const links = parser.parse('hello, world');
  const options = new FormatOptions({ compactSymbols: true });
  const formatted = formatLinks(links, options);
  expect(formatted).toBe('(hello,world)');
});

// Test backward compatibility with tokenizeSymbols: false
test('Backward compat: tokenizeSymbols false preserves 1,2,3', () => {
  const links = parserNoTokenize.parse('1,2,3');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('1,2,3');
});

test('Backward compat: tokenizeSymbols false preserves 1+1', () => {
  const links = parserNoTokenize.parse('1+1');
  expect(links[0].values.length).toBe(1);
  expect(links[0].values[0].id).toBe('1+1');
});

// Test default symbols are exported
test('Default symbols exported', () => {
  expect(DEFAULT_PUNCTUATION_SYMBOLS).toContain(',');
  expect(DEFAULT_PUNCTUATION_SYMBOLS).toContain('.');
  expect(DEFAULT_MATH_SYMBOLS).toContain('+');
  expect(DEFAULT_MATH_SYMBOLS).toContain('-');
});
