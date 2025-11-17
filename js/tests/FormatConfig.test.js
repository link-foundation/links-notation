import { test, expect } from 'bun:test';
import { Parser, Link, formatLinks, FormatConfig } from '../src/index.js';

const parser = new Parser();

test('Format config basic', () => {
  const config = new FormatConfig();
  expect(config.lessParentheses).toBe(false);
  expect(config.maxLineLength).toBe(80);
  expect(config.indentLongLines).toBe(false);
});

test('Format with line length limit', () => {
  // Create a link with many references that exceeds line length
  const link = new Link('sequence', [
    new Link('1'), new Link('2'), new Link('3'), new Link('4'), new Link('5'),
    new Link('6'), new Link('7'), new Link('8'), new Link('9'), new Link('10')
  ]);

  // Format with line length limit
  // The line '(sequence: 1 2 3 4 5 6 7 8 9 10)' is 32 chars, so use threshold of 30
  const config = new FormatConfig({
    indentLongLines: true,
    maxLineLength: 30,
    preferInline: false
  });

  const output = link.format(config);
  expect(output).toContain('sequence:');
  expect(output).toContain('\n'); // Should be indented across multiple lines
});

test('Format with max inline refs', () => {
  // Create a link with 4 references
  const link = new Link('id', [new Link('1'), new Link('2'), new Link('3'), new Link('4')]);

  // Format with maxInlineRefs=3 (should trigger indentation)
  const config = new FormatConfig({
    maxInlineRefs: 3,
    preferInline: false
  });

  const output = link.format(config);
  expect(output).toContain('id:');
  expect(output).toContain('\n'); // Should be indented
});

test('Format with consecutive grouping', () => {
  const links = [
    new Link('SetA', [new Link('a')]),
    new Link('SetA', [new Link('b')]),
    new Link('SetA', [new Link('c')])
  ];

  const config = new FormatConfig({ groupConsecutive: true });

  const output = formatLinks(links, config);

  // Should group consecutive SetA links
  // The output should have SetA with all values a, b, c
  expect(output).toContain('SetA');
  expect(output).toContain('a');
  expect(output).toContain('b');
  expect(output).toContain('c');
});

test('Format config less parentheses', () => {
  const link = new Link('id', [new Link('value')]);

  const config = new FormatConfig({ lessParentheses: true });

  const output = link.format(config);
  // Should not have outer parentheses
  expect(output).toBe('id: value');
});

test('Format config custom indent', () => {
  const link = new Link('id', [new Link('1'), new Link('2'), new Link('3'), new Link('4')]);

  const config = new FormatConfig({
    maxInlineRefs: 3,
    preferInline: false,
    indentString: '    ' // 4 spaces
  });

  const output = link.format(config);
  // Check for custom indentation
  expect(output).toContain('    '); // Should use 4 spaces
});

test('Roundtrip with line length formatting', () => {
  // Create a simple link
  const originalLink = new Link('test', [new Link('a'), new Link('b'), new Link('c')]);

  // Format with indentation
  const config = new FormatConfig({
    maxInlineRefs: 2,
    preferInline: false
  });

  const formatted = originalLink.format(config);

  // Parse it back
  const parsed = parser.parse(formatted);

  // Should preserve the structure (though format may differ)
  expect(parsed.length).toBeGreaterThan(0);
});

test('Should indent by length', () => {
  const config = new FormatConfig({ indentLongLines: true, maxLineLength: 80 });

  const shortLine = 'short';
  const longLine = 'a'.repeat(100);

  expect(config.shouldIndentByLength(shortLine)).toBe(false);
  expect(config.shouldIndentByLength(longLine)).toBe(true);
});

test('Should indent by ref count', () => {
  const config = new FormatConfig({ maxInlineRefs: 3 });

  expect(config.shouldIndentByRefCount(2)).toBe(false);
  expect(config.shouldIndentByRefCount(3)).toBe(false);
  expect(config.shouldIndentByRefCount(4)).toBe(true);
});
