import { describe, test, expect } from 'bun:test';
import { Parser, Link, formatLinks } from '../src/index.js';

/**
 * Multi-Reference Feature Tests (Issue #184)
 *
 * Tests for multi-word references without quotes:
 * - (some example: some example is a link)
 * - ID as array: ["some", "example"]
 * - Context-aware recognition in values
 */

describe('Multi-Reference Parsing', () => {
  const parser = new Parser();

  describe('Basic multi-reference ID parsing', () => {
    test('parses two-word multi-reference ID', () => {
      const result = parser.parse('(some example: value)');
      expect(result.length).toBe(1);
      expect(Array.isArray(result[0].id)).toBe(true);
      expect(result[0].id).toEqual(['some', 'example']);
      expect(result[0].values.length).toBe(1);
      expect(result[0].values[0].id).toBe('value');
    });

    test('parses three-word multi-reference ID', () => {
      const result = parser.parse('(new york city: value)');
      expect(result.length).toBe(1);
      expect(result[0].id).toEqual(['new', 'york', 'city']);
    });

    test('parses four-word multi-reference ID', () => {
      const result = parser.parse('(a b c d: value)');
      expect(result.length).toBe(1);
      expect(result[0].id).toEqual(['a', 'b', 'c', 'd']);
    });

    test('single-word ID remains string (backward compatibility)', () => {
      const result = parser.parse('(papa: value)');
      expect(result.length).toBe(1);
      expect(typeof result[0].id).toBe('string');
      expect(result[0].id).toBe('papa');
    });

    test('quoted multi-word ID remains string (backward compatibility)', () => {
      const result = parser.parse("('some example': value)");
      expect(result.length).toBe(1);
      expect(typeof result[0].id).toBe('string');
      expect(result[0].id).toBe('some example');
    });
  });

  describe('Context-aware multi-reference recognition', () => {
    test('recognizes multi-reference in values when same as ID', () => {
      const result = parser.parse('(some example: some example is a link)');
      expect(result[0].id).toEqual(['some', 'example']);
      // First value should be the multi-reference "some example"
      expect(result[0].values[0].id).toEqual(['some', 'example']);
      // Remaining values
      expect(result[0].values[1].id).toBe('is');
      expect(result[0].values[2].id).toBe('a');
      expect(result[0].values[3].id).toBe('link');
      expect(result[0].values.length).toBe(4);
    });

    test('recognizes three-word multi-reference in values', () => {
      const result = parser.parse('(new york city: new york city is great)');
      expect(result[0].id).toEqual(['new', 'york', 'city']);
      expect(result[0].values[0].id).toEqual(['new', 'york', 'city']);
      expect(result[0].values[1].id).toBe('is');
      expect(result[0].values[2].id).toBe('great');
      expect(result[0].values.length).toBe(3);
    });

    test('does not recognize multi-reference when parts are separated', () => {
      // If "some example" is defined, "some" alone should not trigger match
      const result = parser.parse('(some example: some other example)');
      expect(result[0].id).toEqual(['some', 'example']);
      // "some" should be separate, "other" separate, "example" separate
      expect(result[0].values[0].id).toBe('some');
      expect(result[0].values[1].id).toBe('other');
      expect(result[0].values[2].id).toBe('example');
    });

    test('multi-reference recognition is greedy (longest match first)', () => {
      // With definitions like "a b" and "a b c", should match "a b c"
      const result = parser.parse('(a b c: a b c d)\n(a b: x)');
      expect(result[0].id).toEqual(['a', 'b', 'c']);
      // Should recognize "a b c" (3 words) not "a b" (2 words)
      expect(result[0].values[0].id).toEqual(['a', 'b', 'c']);
      expect(result[0].values[1].id).toBe('d');
    });
  });

  describe('Multi-reference formatting', () => {
    test('formats multi-reference ID without quotes', () => {
      const result = parser.parse('(some example: value)');
      const formatted = formatLinks(result, true);
      // Multi-reference IDs need parentheses since they contain space-separated words
      expect(formatted).toBe('(some example: value)');
    });

    test('formats multi-reference value correctly', () => {
      const result = parser.parse('(some example: some example is a link)');
      const formatted = formatLinks(result, true);
      expect(formatted).toBe('(some example: some example is a link)');
    });

    test('round-trip: parse then format preserves structure', () => {
      const input = '(new york city: new york city is great)';
      const result = parser.parse(input);
      const formatted = formatLinks(result, true);
      expect(formatted).toBe('(new york city: new york city is great)');
    });
  });

  describe('Multi-reference with indented syntax', () => {
    test('parses indented multi-reference ID', () => {
      const input = `some example:
  value1
  value2`;
      const result = parser.parse(input);
      expect(result.length).toBe(1);
      expect(result[0].id).toEqual(['some', 'example']);
      expect(result[0].values.length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    test('handles multi-reference with special characters in quoted parts', () => {
      // Mixed: unquoted multi-ref ID, quoted value with special chars
      const result = parser.parse("(some example: 'value:special')");
      expect(result[0].id).toEqual(['some', 'example']);
      expect(result[0].values[0].id).toBe('value:special');
    });

    test('handles empty values with multi-reference ID', () => {
      const result = parser.parse('(some example:)');
      expect(result[0].id).toEqual(['some', 'example']);
      expect(result[0].values.length).toBe(0);
    });

    test('multiple links with same multi-reference definition', () => {
      const input = `(some example: first)
(some example: second)`;
      const result = parser.parse(input);
      expect(result.length).toBe(2);
      expect(result[0].id).toEqual(['some', 'example']);
      expect(result[1].id).toEqual(['some', 'example']);
    });
  });

  describe('Parser options', () => {
    test('can disable multi-reference context with option', () => {
      const parserNoContext = new Parser({ enableMultiRefContext: false });
      const result = parserNoContext.parse('(some example: some example is a link)');
      // ID should still be array (grammar change)
      expect(result[0].id).toEqual(['some', 'example']);
      // But values should NOT be grouped (context disabled)
      expect(result[0].values.length).toBe(5); // some, example, is, a, link
      expect(result[0].values[0].id).toBe('some');
      expect(result[0].values[1].id).toBe('example');
    });
  });
});

describe('Backward Compatibility', () => {
  const parser = new Parser();

  test('existing single-line syntax still works', () => {
    const result = parser.parse('papa: loves mama');
    expect(result[0].id).toBe('papa');
    expect(result[0].values[0].id).toBe('loves');
    expect(result[0].values[1].id).toBe('mama');
  });

  test('existing parenthesized syntax still works', () => {
    const result = parser.parse('(papa: loves mama)');
    expect(result[0].id).toBe('papa');
    expect(result[0].values[0].id).toBe('loves');
    expect(result[0].values[1].id).toBe('mama');
  });

  test('existing quoted ID syntax still works', () => {
    const result = parser.parse("('multi word id': value)");
    expect(result[0].id).toBe('multi word id');
    expect(result[0].values[0].id).toBe('value');
  });

  test('existing nested links still work', () => {
    const result = parser.parse('(outer: (inner: value))');
    expect(result[0].id).toBe('outer');
    expect(result[0].values[0].id).toBe('inner');
    expect(result[0].values[0].values[0].id).toBe('value');
  });

  test('existing value-only links still work', () => {
    const result = parser.parse('(a b c)');
    expect(result[0].id).toBe(null);
    expect(result[0].values.length).toBe(3);
  });
});
