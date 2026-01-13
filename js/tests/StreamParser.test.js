import { test, expect, describe } from 'bun:test';
import { StreamParser, ParseError } from '../src/StreamParser.js';
import { Parser } from '../src/Parser.js';
import { Link, formatLinks } from '../src/Link.js';

describe('StreamParser', () => {
  describe('basic functionality', () => {
    test('parses simple single-line input', () => {
      const parser = new StreamParser();
      const links = [];

      parser.on('link', (link) => links.push(link));

      parser.write('a b c\n');
      parser.end();

      expect(links.length).toBe(1);
      expect(links[0].values.length).toBe(3);
    });

    test('parses multiline input incrementally', () => {
      const parser = new StreamParser();
      const links = [];

      parser.on('link', (link) => links.push(link));

      parser.write('line1 value1\n');
      parser.write('line2 value2\n');
      parser.end();

      expect(links.length).toBe(2);
    });

    test('parses parenthesized link', () => {
      const parser = new StreamParser();
      const links = [];

      parser.on('link', (link) => links.push(link));

      parser.write('(id: value1 value2)\n');
      parser.end();

      expect(links.length).toBe(1);
      expect(links[0].id).toBe('id');
      expect(links[0].values.length).toBe(2);
    });

    test('handles empty input', () => {
      const parser = new StreamParser();
      const links = parser.end();

      expect(links.length).toBe(0);
    });

    test('handles whitespace-only input', () => {
      const parser = new StreamParser();
      parser.write('   \n\n  \n');
      const links = parser.end();

      expect(links.length).toBe(0);
    });

    test('returns same result as regular Parser', () => {
      const input = `papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama`;

      const regularParser = new Parser();
      const regularLinks = regularParser.parse(input);

      const streamParser = new StreamParser();
      streamParser.write(input);
      const streamLinks = streamParser.end();

      expect(streamLinks.length).toBe(regularLinks.length);

      for (let i = 0; i < regularLinks.length; i++) {
        expect(formatLinks([streamLinks[i]])).toBe(
          formatLinks([regularLinks[i]])
        );
      }
    });
  });

  describe('streaming behavior', () => {
    test('can write multiple chunks', () => {
      const parser = new StreamParser();
      const links = [];

      parser.on('link', (link) => links.push(link));

      parser.write('first');
      parser.write(' second');
      parser.write('\n');
      parser.end();

      expect(links.length).toBe(1);
    });

    test('buffers incomplete elements', () => {
      const parser = new StreamParser();
      const links = [];

      parser.on('link', (link) => links.push(link));

      // Write incomplete parenthesized expression
      parser.write('(id: val');

      // Links should be empty (waiting for closing paren)
      expect(links.length).toBe(0);

      // Complete the expression
      parser.write('ue)\n');
      parser.end();

      expect(links.length).toBe(1);
      expect(links[0].id).toBe('id');
    });

    test('emits links as soon as they are complete', () => {
      const parser = new StreamParser();
      const links = [];
      const emitTimes = [];

      parser.on('link', (link) => {
        links.push(link);
        emitTimes.push(Date.now());
      });

      parser.write('first line\n');
      const afterFirst = links.length;

      parser.write('second line\n');
      const afterSecond = links.length;

      parser.end();

      // First link should have been emitted after first write
      expect(afterFirst).toBe(1);
      // Second link should have been emitted after second write
      expect(afterSecond).toBe(2);
    });
  });

  describe('event handling', () => {
    test('on() returns parser for chaining', () => {
      const parser = new StreamParser();
      const result = parser.on('link', () => {});

      expect(result).toBe(parser);
    });

    test('fires link event for each parsed link', () => {
      const parser = new StreamParser();
      const links = [];

      parser.on('link', (link) => links.push(link));

      parser.write('a\nb\nc\n');
      parser.end();

      expect(links.length).toBe(3);
    });

    test('fires end event when parsing completes', () => {
      const parser = new StreamParser();
      let endCalled = false;
      let endLinks = null;

      parser.on('end', (links) => {
        endCalled = true;
        endLinks = links;
      });

      parser.write('test\n');
      parser.end();

      expect(endCalled).toBe(true);
      expect(endLinks.length).toBe(1);
    });

    test('off() removes event handler', () => {
      const parser = new StreamParser();
      let callCount = 0;

      const handler = () => callCount++;

      parser.on('link', handler);
      parser.write('first\n');

      parser.off('link', handler);
      parser.write('second\n');
      parser.end();

      expect(callCount).toBe(1);
    });

    test('multiple handlers for same event', () => {
      const parser = new StreamParser();
      const results = [];

      parser.on('link', () => results.push('handler1'));
      parser.on('link', () => results.push('handler2'));

      parser.write('test\n');
      parser.end();

      expect(results).toEqual(['handler1', 'handler2']);
    });
  });

  describe('error handling', () => {
    test('fires error event on parse error', () => {
      const parser = new StreamParser();
      let errorReceived = null;

      parser.on('error', (error) => {
        errorReceived = error;
      });

      // Unclosed parenthesis at end of stream
      parser.write('(unclosed\n');
      parser.end();

      expect(errorReceived).not.toBeNull();
      expect(errorReceived instanceof ParseError).toBe(true);
    });

    test('throws when writing after end', () => {
      const parser = new StreamParser();
      parser.end();

      expect(() => parser.write('more data')).toThrow(
        'Cannot write to a parser that has ended'
      );
    });

    test('throws on non-string input', () => {
      const parser = new StreamParser();

      expect(() => parser.write(123)).toThrow(TypeError);
      expect(() => parser.write(null)).toThrow(TypeError);
    });

    test('throws when input exceeds max size', () => {
      const parser = new StreamParser({ maxInputSize: 100 });

      const largeInput = 'x'.repeat(200);

      expect(() => parser.write(largeInput)).toThrow(
        /exceeds maximum allowed size/
      );
    });
  });

  describe('ParseError', () => {
    test('ParseError has line and column properties', () => {
      const error = new ParseError('test message', 5, 10);

      expect(error.line).toBe(5);
      expect(error.column).toBe(10);
      expect(error.message).toBe('test message');
    });

    test('ParseError toString includes location', () => {
      const error = new ParseError('test error', 3, 7);

      expect(error.toString()).toBe(
        'ParseError at line 3, column 7: test error'
      );
    });

    test('ParseError toString without location', () => {
      const error = new ParseError('test error');

      expect(error.toString()).toBe('ParseError: test error');
    });
  });

  describe('position tracking', () => {
    test('getPosition() returns current position', () => {
      const parser = new StreamParser();

      parser.write('first line\n');
      const pos1 = parser.getPosition();

      parser.write('second line\n');
      const pos2 = parser.getPosition();

      expect(pos1.line).toBe(2);
      expect(pos2.line).toBe(3);
    });
  });

  describe('reset functionality', () => {
    test('reset() allows parser reuse', () => {
      const parser = new StreamParser();
      const allLinks = [];

      parser.on('link', (link) => allLinks.push(link));

      parser.write('first\n');
      parser.end();

      expect(allLinks.length).toBe(1);

      parser.reset();
      parser.write('second\n');
      parser.end();

      expect(allLinks.length).toBe(2);
    });

    test('reset() clears internal state', () => {
      const parser = new StreamParser();

      parser.write('data\n');
      parser.end();

      parser.reset();

      expect(parser.getLinks().length).toBe(0);
      expect(parser.isEnded()).toBe(false);
    });
  });

  describe('getLinks() method', () => {
    test('getLinks() returns all parsed links', () => {
      const parser = new StreamParser();

      parser.write('a\nb\nc\n');
      parser.end();

      const links = parser.getLinks();

      expect(links.length).toBe(3);
    });

    test('getLinks() returns copy of internal array', () => {
      const parser = new StreamParser();

      parser.write('test\n');
      parser.end();

      const links1 = parser.getLinks();
      const links2 = parser.getLinks();

      expect(links1).not.toBe(links2);
      expect(links1).toEqual(links2);
    });
  });

  describe('indented syntax', () => {
    test('parses indented ID syntax', () => {
      const parser = new StreamParser();

      parser.write('id:\n  value1\n  value2\n');
      const links = parser.end();

      expect(links.length).toBe(1);
      expect(links[0].id).toBe('id');
      expect(links[0].values.length).toBe(2);
    });

    test('produces same result as regular parser for indented syntax', () => {
      const input = `id:
  value1
  value2`;

      const regularParser = new Parser();
      const regularLinks = regularParser.parse(input);

      const streamParser = new StreamParser();
      streamParser.write(input);
      const streamLinks = streamParser.end();

      expect(formatLinks(streamLinks)).toBe(formatLinks(regularLinks));
    });
  });

  describe('quoted strings', () => {
    test('parses single-quoted references', () => {
      const parser = new StreamParser();

      parser.write("('hello world')\n");
      const links = parser.end();

      expect(links.length).toBe(1);
      // Single value in parentheses becomes a Link with null id and single value
      expect(links[0].values.length).toBe(1);
      expect(links[0].values[0].id).toBe('hello world');
    });

    test('parses double-quoted references', () => {
      const parser = new StreamParser();

      parser.write('("hello world")\n');
      const links = parser.end();

      expect(links.length).toBe(1);
      // Single value in parentheses becomes a Link with null id and single value
      expect(links[0].values.length).toBe(1);
      expect(links[0].values[0].id).toBe('hello world');
    });

    test('handles quotes in streaming chunks', () => {
      const parser = new StreamParser();

      parser.write('("hello ');
      parser.write('world")\n');
      const links = parser.end();

      expect(links.length).toBe(1);
      // Single value in parentheses becomes a Link with null id and single value
      expect(links[0].values.length).toBe(1);
      expect(links[0].values[0].id).toBe('hello world');
    });

    test('parses quoted id with colon syntax', () => {
      const parser = new StreamParser();

      parser.write('("quoted id": value1 value2)\n');
      const links = parser.end();

      expect(links.length).toBe(1);
      expect(links[0].id).toBe('quoted id');
      expect(links[0].values.length).toBe(2);
    });
  });

  describe('complex inputs', () => {
    test('nested parentheses', () => {
      const input = '(outer: (inner: a b))\n';

      const regularParser = new Parser();
      const regularLinks = regularParser.parse(input);

      const streamParser = new StreamParser();
      streamParser.write(input);
      const streamLinks = streamParser.end();

      expect(formatLinks(streamLinks)).toBe(formatLinks(regularLinks));
    });

    test('mixed syntax', () => {
      const input = `(id: value1 value2)
simple line
other:
  child1
  child2
`;

      const regularParser = new Parser();
      const regularLinks = regularParser.parse(input);

      const streamParser = new StreamParser();
      streamParser.write(input);
      const streamLinks = streamParser.end();

      expect(streamLinks.length).toBe(regularLinks.length);
    });
  });

  describe('use case from issue', () => {
    test('API matches issue request for JavaScript', () => {
      // Test the API matches what was requested in the issue
      const parser = new StreamParser();
      const parsedLinks = [];
      const errors = [];

      parser.on('link', (link) => {
        // Process each link as it's parsed
        parsedLinks.push(link);
      });

      parser.on('error', (error) => {
        // Handle parse errors with location info
        errors.push({
          message: error.message,
          line: error.line,
          column: error.column,
        });
      });

      // Feed data incrementally
      const chunk1 = 'papa (lovesMama: loves mama)\n';
      const chunk2 = 'son lovesMama\n';

      parser.write(chunk1);
      parser.write(chunk2);
      const finalLinks = parser.end();

      expect(parsedLinks.length).toBe(2);
      expect(finalLinks.length).toBe(2);
      expect(errors.length).toBe(0);
    });
  });
});
