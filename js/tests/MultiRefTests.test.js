import { describe, test, expect } from 'bun:test';
import { Parser, Link, formatLinks } from '../src/index.js';

/**
 * Multi-Reference Feature Tests (Issue #184)
 *
 * Tests for multi-word references without quotes:
 * - (some example: some example is a link)
 * - IDs as array: ["some", "example"]
 * - id property throws for multi-refs, use ids instead
 */

describe('Multi-Reference Parsing', () => {
  const parser = new Parser();

  describe('Basic multi-reference ID parsing', () => {
    test('parses two-word multi-reference ID', () => {
      const result = parser.parse('(some example: value)');
      expect(result.length).toBe(1);
      // Use ids property for multi-references
      expect(Array.isArray(result[0].ids)).toBe(true);
      expect(result[0].ids).toEqual(['some', 'example']);
      expect(result[0].values.length).toBe(1);
      expect(result[0].values[0].id).toBe('value');
    });

    test('parses three-word multi-reference ID', () => {
      const result = parser.parse('(new york city: value)');
      expect(result.length).toBe(1);
      expect(result[0].ids).toEqual(['new', 'york', 'city']);
    });

    test('parses four-word multi-reference ID', () => {
      const result = parser.parse('(a b c d: value)');
      expect(result.length).toBe(1);
      expect(result[0].ids).toEqual(['a', 'b', 'c', 'd']);
    });

    test('single-word ID still accessible via id property (backward compatibility)', () => {
      const result = parser.parse('(papa: value)');
      expect(result.length).toBe(1);
      // Single-word: id returns string, ids returns array with single element
      expect(typeof result[0].id).toBe('string');
      expect(result[0].id).toBe('papa');
      expect(result[0].ids).toEqual(['papa']);
    });

    test('quoted multi-word ID remains string (backward compatibility)', () => {
      const result = parser.parse("('some example': value)");
      expect(result.length).toBe(1);
      // Quoted multi-word is a single reference, so id works
      expect(typeof result[0].id).toBe('string');
      expect(result[0].id).toBe('some example');
      expect(result[0].ids).toEqual(['some example']);
    });

    test('id property throws for multi-reference IDs', () => {
      const result = parser.parse('(some example: value)');
      expect(() => result[0].id).toThrow(
        /Use the 'ids' property instead of 'id'/
      );
    });
  });

  describe('Multi-reference values are NOT context-aware', () => {
    // Per issue #184 feedback: context-aware parsing is out of scope
    test('values are parsed as separate references', () => {
      const result = parser.parse('(some example: some example is a link)');
      expect(result[0].ids).toEqual(['some', 'example']);
      // Values should be 5 separate references (no context-aware grouping)
      expect(result[0].values.length).toBe(5);
      expect(result[0].values[0].id).toBe('some');
      expect(result[0].values[1].id).toBe('example');
      expect(result[0].values[2].id).toBe('is');
      expect(result[0].values[3].id).toBe('a');
      expect(result[0].values[4].id).toBe('link');
    });

    test('three-word multi-reference values are separate', () => {
      const result = parser.parse('(new york city: new york city is great)');
      expect(result[0].ids).toEqual(['new', 'york', 'city']);
      // Values should be 5 separate references
      expect(result[0].values.length).toBe(5);
      expect(result[0].values[0].id).toBe('new');
      expect(result[0].values[1].id).toBe('york');
      expect(result[0].values[2].id).toBe('city');
      expect(result[0].values[3].id).toBe('is');
      expect(result[0].values[4].id).toBe('great');
    });
  });

  describe('Multi-reference formatting', () => {
    test('formats multi-reference ID without quotes', () => {
      const result = parser.parse('(some example: value)');
      const formatted = formatLinks(result, true);
      // Multi-reference IDs need parentheses since they contain space-separated words
      expect(formatted).toBe('(some example: value)');
    });

    test('round-trip: parse then format preserves structure', () => {
      const input = '(new york city: one two three)';
      const result = parser.parse(input);
      const formatted = formatLinks(result, true);
      expect(formatted).toBe('(new york city: one two three)');
    });
  });

  describe('Multi-reference with indented syntax', () => {
    test('parses indented multi-reference ID', () => {
      const input = `some example:
  value1
  value2`;
      const result = parser.parse(input);
      expect(result.length).toBe(1);
      expect(result[0].ids).toEqual(['some', 'example']);
      expect(result[0].values.length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    test('handles multi-reference with special characters in quoted parts', () => {
      // Mixed: unquoted multi-ref ID, quoted value with special chars
      const result = parser.parse("(some example: 'value:special')");
      expect(result[0].ids).toEqual(['some', 'example']);
      expect(result[0].values[0].id).toBe('value:special');
    });

    test('handles empty values with multi-reference ID', () => {
      const result = parser.parse('(some example:)');
      expect(result[0].ids).toEqual(['some', 'example']);
      expect(result[0].values.length).toBe(0);
    });

    test('multiple links with same multi-reference definition', () => {
      const input = `(some example: first)
(some example: second)`;
      const result = parser.parse(input);
      expect(result.length).toBe(2);
      expect(result[0].ids).toEqual(['some', 'example']);
      expect(result[1].ids).toEqual(['some', 'example']);
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
    expect(result[0].ids).toBe(null);
    expect(result[0].values.length).toBe(3);
  });
});
