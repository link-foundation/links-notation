import { describe, expect, test } from 'bun:test';
import {
  formatLinks,
  Parser,
  StreamParseError,
  StreamParser,
} from '../src/index.js';

const document = `first loves data
profile:
  name Ada
  note "line one
line two"
(nested:
  child value)
last sees first`;

const formatted = (links) => formatLinks(links);

describe('StreamParser', () => {
  test('matches the canonical parser when fed one symbol at a time', () => {
    const stream = new StreamParser();
    for (const character of document) stream.write(character);

    expect(formatted(stream.end())).toBe(
      formatted(new Parser().parse(document))
    );
  });

  test('matches the canonical parser when fed one line at a time', () => {
    const stream = new StreamParser();
    for (const line of document.match(/.*(?:\n|$)/g).filter(Boolean)) {
      stream.write(line);
    }

    expect(formatted(stream.end())).toBe(
      formatted(new Parser().parse(document))
    );
  });

  test('emits a record as soon as the next top-level record starts', () => {
    const stream = new StreamParser();
    const seen = [];
    stream.on('link', (link) => seen.push(link.toString()));

    expect(stream.write('first loves data\n')).toEqual([]);
    expect(stream.write('s').map(String)).toEqual(['(first loves data)']);
    expect(seen).toEqual(['(first loves data)']);
  });

  test('does not emit an indented record before its children arrive', () => {
    const stream = new StreamParser();
    const seen = [];
    stream.on('link', (link) => seen.push(link));

    for (const character of 'profile:\n  name Ada\n  role engineer\n') {
      stream.write(character);
    }
    expect(seen).toEqual([]);

    stream.write('n');
    expect(formatted(seen)).toBe('(profile: (name Ada) (role engineer))');
  });

  test('does not split multiline quotes or parenthesized contexts', () => {
    const stream = new StreamParser();
    const seen = [];
    stream.on('link', (link) => seen.push(link));

    stream.write('"first\nsecond"\n(nested:\n  value one)\n');
    expect(seen).toHaveLength(1);
    stream.write('n');
    expect(seen).toHaveLength(2);
  });

  test('accepts a final record without a newline', () => {
    const stream = new StreamParser();
    stream.write('only one record');
    expect(formatted(stream.end())).toBe('(only one record)');
  });

  test('reports positions relative to the whole stream', () => {
    const stream = new StreamParser();
    stream.on('error', () => {});
    stream.write('good link\nnext link\nb');

    let caught;
    try {
      stream.end('ad: value: nope');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(StreamParseError);
    expect(caught.line).toBe(3);
    expect(caught.offset).toBeGreaterThan('good link\nnext link\n'.length);
  });

  test('can avoid retaining output for bounded-memory event processing', () => {
    const stream = new StreamParser({ collect: false });
    const seen = [];
    stream.on('link', (link) => seen.push(link.toString()));
    stream.write('one link\nt');
    expect(stream.drain()).toEqual([]);
    expect(stream.end('wo link').map(String)).toEqual(['(two link)']);
    expect(seen).toEqual(['(one link)', '(two link)']);
  });

  test('drains retained output and can be reset', () => {
    const stream = new StreamParser();
    stream.write('one link\nt');
    expect(stream.drain().map(String)).toEqual(['(one link)']);
    expect(stream.end('wo link').map(String)).toEqual(['(two link)']);

    stream.reset().write('fresh record');
    expect(stream.end().map(String)).toEqual(['(fresh record)']);
  });

  test('offers synchronous and asynchronous iterable adapters', async () => {
    expect(
      [...StreamParser.parse(['one link\n', 'two link'])].map(String)
    ).toEqual(['(one link)', '(two link)']);

    async function* chunks() {
      yield 'one link\n';
      yield 'two link';
    }
    const links = [];
    for await (const link of StreamParser.parseAsync(chunks())) {
      links.push(link.toString());
    }
    expect(links).toEqual(['(one link)', '(two link)']);
  });

  test('limits only the unresolved record, not total stream size', () => {
    const stream = new StreamParser({ maxBufferSize: 12, collect: false });
    stream.on('error', () => {});
    for (let index = 0; index < 100; index++) stream.write(`a${index}\n`);
    expect(stream.end().map(String)).toEqual(['(a99)']);

    const tooLarge = new StreamParser({ maxBufferSize: 4 });
    tooLarge.on('error', () => {});
    expect(() => tooLarge.write('12345')).toThrow(RangeError);
  });

  test('tracks the absolute stream position', () => {
    const stream = new StreamParser();
    stream.write('one\ntw');
    expect(stream.position()).toEqual({
      offset: 6,
      line: 2,
      column: 3,
      buffered: 2,
    });
  });
});
