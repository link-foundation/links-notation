import { describe, expect, test } from 'bun:test';
import {
  Link,
  Parser,
  StreamParser,
  formatLinks,
  referenceQuote,
} from '../src/index.js';

describe('syntax metadata on parsed links (issue #364)', () => {
  test("1 and '1' are the same reference but keep how they were written", () => {
    const [link] = new Parser().parse("(t 1 '1')");
    const [, bare, quoted] = link.values;
    expect(bare.id).toBe('1');
    expect(quoted.id).toBe('1');
    expect(bare.rawId).toBe('1');
    expect(quoted.rawId).toBe("'1'");
    expect(bare.quote).toBeNull();
    expect(quoted.quote).toBe("'");
    // Equality and formatting ignore the metadata.
    expect(bare.equals(quoted)).toBe(true);
    expect(link.format()).toBe('(t 1 1)');
  });

  test('records every quote kind and run length', () => {
    const [link] = new Parser().parse('("a": \'b\' `c` ""d"" ~1{65} f)');
    expect(link.rawId).toBe('"a"');
    expect(link.quote).toBe('"');
    expect(link.values.map((value) => [value.rawId, value.quote])).toEqual([
      ["'b'", "'"],
      ['`c`', '`'],
      ['""d""', '"'],
      ['~1{65}', null],
      ['f', null],
    ]);
  });

  test('keeps raw text from the source, not from comment stripping', () => {
    const [link] = new Parser().parse("(a 'b # c') # d");
    expect(link.values[1].rawId).toBe("'b # c'");
  });

  test('leaves links without written IDs without raw text', () => {
    const [link] = new Parser().parse('(a b)');
    expect(link.rawId).toBeNull();
    expect(link.quote).toBeNull();
    expect(new Link('x').rawId).toBeNull();
    expect(new Link('x').quote).toBeNull();
  });

  test('does not change equality, formatting or serialization', () => {
    const quoted = new Parser().parse("('a': 'b')");
    const bare = new Parser().parse('(a: b)');
    expect(quoted[0].equals(bare[0])).toBe(true);
    expect(formatLinks(quoted)).toBe(formatLinks(bare));
    expect(quoted[0].toString()).toBe(bare[0].toString());
    expect(JSON.stringify(quoted)).toBe(JSON.stringify(bare));
    expect(quoted).toEqual(bare);
  });

  test('AST mode (syntax: false) drops the metadata', () => {
    const [link] = new Parser({ syntax: false }).parse("('a': 'b')");
    expect(link.rawId).toBeNull();
    expect(link.values[0].rawId).toBeNull();
    expect(link.values[0].quote).toBeNull();
    expect(link.equals(new Parser().parse("('a': 'b')")[0])).toBe(true);
  });

  test('parseGroups and StreamParser keep the metadata', () => {
    const groups = new Parser().parseGroups('\'root\':\n  "child"');
    expect(groups[0].element.rawId).toBe("'root'");
    expect(groups[0].children[0].element.rawId).toBe('"child"');
    const stream = new StreamParser();
    stream.write("(a '");
    stream.write("b')");
    const [link] = stream.end();
    expect(link.values[1].rawId).toBe("'b'");
    expect(link.values[1].quote).toBe("'");
  });

  test('rawId can be set on links built in code and must be text or null', () => {
    const link = new Link('a');
    link.rawId = '"a"';
    expect(link.quote).toBe('"');
    link.rawId = null;
    expect(link.quote).toBeNull();
    expect(() => {
      link.rawId = 1;
    }).toThrow(TypeError);
  });

  test('referenceQuote reads the delimiter of one complete reference', () => {
    expect(referenceQuote("'1'")).toBe("'");
    expect(referenceQuote('""a b""')).toBe('"');
    expect(referenceQuote('`x`')).toBe('`');
    expect(referenceQuote('1')).toBeNull();
    expect(referenceQuote('~1{31}')).toBeNull();
    expect(referenceQuote("'unclosed")).toBeNull();
    expect(referenceQuote("'a' b")).toBeNull();
    expect(referenceQuote(null)).toBeNull();
  });
});
