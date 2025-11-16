import { test, expect } from 'bun:test';
import { Parser } from '../src/Parser.js';
import { Link, formatLinks } from '../src/Link.js';
import { FormatOptions } from '../src/FormatOptions.js';

const parser = new Parser();

test('test_is_ref', () => {
  // JS doesn't have separate Ref/Link types, but we can test simple link behavior
  const simpleLink = new Link('some_value');
  expect(simpleLink.id).toBe('some_value');
  expect(simpleLink.values).toEqual([]);
});

test('test_is_link', () => {
  // Test link with values
  const link = new Link('id', [new Link('child')]);
  expect(link.id).toBe('id');
  expect(link.values.length).toBe(1);
  expect(link.values[0].id).toBe('child');
});

test('test_is_ref equivalent', () => {
  // JS doesn't have separate Ref/Link types, but we can test simple link behavior
  const simpleLink = new Link('some_value');
  expect(simpleLink.id).toBe('some_value');
  expect(simpleLink.values).toEqual([]);
});

test('test_is_link equivalent', () => {
  // Test link with values
  const link = new Link('id', [new Link('child')]);
  expect(link.id).toBe('id');
  expect(link.values.length).toBe(1);
  expect(link.values[0].id).toBe('child');
});

test('test_empty_link', () => {
  const link = new Link(null, []);
  const output = link.toString();
  expect(output).toBe('()');
});

test('test_simple_link', () => {
  const input = '(1: 1 1)';
  const parsed = parser.parse(input);

  // Validate regular formatting
  const output = parsed[0].format();
  const expected = '(1: 1 1)'; // JS format matches input
  expect(output).toBe(expected);
});

test('test_link_with_source_target', () => {
  const input = '(index: source target)';
  const parsed = parser.parse(input);

  // Validate regular formatting
  const output = parsed[0].format();
  expect(output).toBe(input);
});

test('test_link_with_source_type_target', () => {
  const input = '(index: source type target)';
  const parsed = parser.parse(input);

  // Validate regular formatting
  const output = parsed[0].format();
  expect(output).toBe(input);
});

test('test_single_line_format', () => {
  const input = 'id: value1 value2';
  const parsed = parser.parse(input);

  // The parser should handle single-line format
  const output = parsed[0].format(true); // lessParentheses mode
  expect(output).toContain('id');
  expect(output).toContain('value1');
  expect(output).toContain('value2');
});

test('test_quoted_references', () => {
  const input = '("quoted id": "value with spaces")';
  const parsed = parser.parse(input);

  const output = parsed[0].format();
  expect(output).toContain('quoted id');
  expect(output).toContain('value with spaces');
});

test('test_quoted_references_parsing', () => {
  // Test that quoted references are parsed correctly
  const input = '("quoted id": "value with spaces")';
  const parsed = parser.parse(input);

  // Verify parsing worked correctly
  const output = formatLinks(parsed);
  expect(output).toContain('quoted id');
  expect(output).toContain('value with spaces');
});

test('test_indented_id_syntax_parsing', () => {
  // Test that indented ID syntax is parsed correctly
  const indented = `id:
  value1
  value2`;
  const inline = '(id: value1 value2)';

  const indentedParsed = parser.parse(indented);
  const inlineParsed = parser.parse(inline);

  // Both should produce equivalent structures
  const indentedOutput = formatLinks(indentedParsed);
  const inlineOutput = formatLinks(inlineParsed);
  expect(indentedOutput).toBe(inlineOutput);
  expect(indentedOutput).toBe('(id: value1 value2)');
});

test('test_indented_id_syntax_roundtrip', () => {
  const input = `id:
  value1
  value2`;
  const parsed = parser.parse(input);

  // Validate that we can format with indented syntax using FormatOptions
  const options = new FormatOptions();
  options.maxInlineRefs = 1;  // Force indentation with more than 1 ref
  options.preferInline = false;
  const output = formatLinks(parsed, options);
  expect(output).toBe(input);
});

test('test_multiple_indented_id_syntax_parsing', () => {
  // Test that multiple indented ID links are parsed correctly
  const indented = `id1:
  a
  b
id2:
  c
  d`;
  const inline = `(id1: a b)
(id2: c d)`;

  const indentedParsed = parser.parse(indented);
  const inlineParsed = parser.parse(inline);

  // Both should produce equivalent structures
  const indentedOutput = formatLinks(indentedParsed);
  const inlineOutput = formatLinks(inlineParsed);
  expect(indentedOutput).toBe(inlineOutput);
  expect(indentedOutput).toBe(`(id1: a b)
(id2: c d)`);
});

test('test_multiple_indented_id_syntax_roundtrip', () => {
  const input = `id1:
  a
  b
id2:
  c
  d`;
  const parsed = parser.parse(input);

  // Validate that we can format with indented syntax using FormatOptions
  const options = new FormatOptions();
  options.maxInlineRefs = 1;  // Force indentation with more than 1 ref
  options.preferInline = false;
  const output = formatLinks(parsed, options);
  expect(output).toBe(input);
});
