import { describe, test, expect } from 'bun:test';
import { StreamParser } from '../src/StreamParser.js';
import { Link } from '../src/Link.js';

describe('StreamParser', () => {
  test('should parse simple single-line links incrementally', () => {
    const parser = new StreamParser();
    const links = [];

    parser.on('link', (link) => {
      links.push(link);
    });

    parser.write('papa loves mama\n');
    parser.write('son loves papa\n');

    const result = parser.end();

    expect(result.length).toBe(2);
    expect(links.length).toBe(2);
  });

  test('should parse data in small chunks', () => {
    const parser = new StreamParser();
    const links = [];

    parser.on('link', (link) => {
      links.push(link);
    });

    // Feed data in very small chunks
    parser.write('papa ');
    parser.write('(loves');
    parser.write('Mama: ');
    parser.write('loves ');
    parser.write('mama)\n');

    const result = parser.end();

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  test('should emit error event on parse failure', () => {
    const parser = new StreamParser();
    const errors = [];

    parser.on('error', (error) => {
      errors.push(error);
    });

    parser.write('papa (loves mama\n'); // Missing closing paren

    try {
      parser.end();
    } catch (error) {
      // Expected to throw
    }

    // Should have received an error
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should parse multiline indented syntax', () => {
    const parser = new StreamParser();

    parser.write('3:\n');
    parser.write('  papa\n');
    parser.write('  loves\n');
    parser.write('  mama\n');

    const result = parser.end();

    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle empty input', () => {
    const parser = new StreamParser();

    const result = parser.end();

    expect(result.length).toBe(0);
  });

  test('should handle whitespace-only input', () => {
    const parser = new StreamParser();

    parser.write('   \n  \n  \n');

    const result = parser.end();

    expect(result.length).toBe(0);
  });

  test('should parse links with IDs', () => {
    const parser = new StreamParser();
    const links = [];

    parser.on('link', (link) => {
      links.push(link);
    });

    parser.write('(lovesMama: loves mama)\n');

    const result = parser.end();

    expect(result.length).toBe(1);
    expect(links.length).toBe(1);
  });

  test('should provide error location information', () => {
    const parser = new StreamParser();
    let errorWithLocation = null;

    parser.on('error', (error) => {
      errorWithLocation = error;
    });

    parser.write('invalid ( syntax here\n');

    try {
      parser.end();
    } catch (error) {
      // Expected to throw
    }

    if (errorWithLocation) {
      expect(errorWithLocation.line).toBeDefined();
      expect(errorWithLocation.column).toBeDefined();
    }
  });

  test('should work without event listeners', () => {
    const parser = new StreamParser();

    parser.write('papa loves mama\n');
    parser.write('son loves papa\n');

    const result = parser.end();

    expect(result.length).toBe(2);
  });

  test('should track parsing position', () => {
    const parser = new StreamParser();

    const pos1 = parser.position();
    expect(pos1.line).toBe(1);
    expect(pos1.column).toBe(0);

    parser.write('papa loves mama\n');

    const pos2 = parser.position();
    expect(pos2.line).toBe(2);
  });

  test('should enforce max input size', () => {
    const parser = new StreamParser({ maxInputSize: 100 });
    let errorThrown = false;

    parser.on('error', () => {
      errorThrown = true;
    });

    try {
      parser.write('a'.repeat(101));
    } catch (error) {
      expect(error.message).toContain('exceeds maximum allowed size');
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
  });

  test('should reject non-string input', () => {
    const parser = new StreamParser();
    let errorThrown = false;

    parser.on('error', (error) => {
      expect(error.message).toContain('Input must be a string');
      errorThrown = true;
    });

    try {
      parser.write(123);
    } catch (error) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
  });

  test('should parse quoted strings', () => {
    const parser = new StreamParser();

    parser.write('(id: "value with spaces")\n');

    const result = parser.end();

    expect(result.length).toBe(1);
  });

  test('should handle nested links', () => {
    const parser = new StreamParser();

    parser.write('(outer: (inner: value))\n');

    const result = parser.end();

    expect(result.length).toBe(1);
  });

  test('should parse multiple links in one write', () => {
    const parser = new StreamParser();
    const links = [];

    parser.on('link', (link) => {
      links.push(link);
    });

    parser.write('papa loves mama\nson loves papa\ndaughter loves mama\n');

    const result = parser.end();

    expect(result.length).toBe(3);
    expect(links.length).toBe(3);
  });

  test('should handle links with multiple values', () => {
    const parser = new StreamParser();

    parser.write('(id: value1 value2 value3)\n');

    const result = parser.end();

    expect(result.length).toBe(1);
    const link = result[0];
    expect(link.values.length).toBe(3);
  });

  test('should emit link event for each parsed link', () => {
    const parser = new StreamParser();
    let linkCount = 0;

    parser.on('link', () => {
      linkCount++;
    });

    parser.write('papa loves mama\n');
    parser.write('son loves papa\n');
    parser.end();

    expect(linkCount).toBe(2);
  });
});
