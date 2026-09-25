// Links nested too deeply are refused with an error rather than recursed into
// until the stack overflows
// (https://github.com/link-foundation/links-notation/issues/315).
//
// Every parenthesized group and every indentation level is one level, and the
// lines of a document start at level 0. The positions asserted here are the
// ones the Rust port reports for the same input.

import { test, expect } from 'bun:test';
import {
  Parser,
  ParseError,
  StreamParser,
  StreamParseError,
  DEFAULT_MAX_DEPTH,
} from '../src/index.js';

const parens = (depth) => '('.repeat(depth) + 'a' + ')'.repeat(depth);

const values = (depth) => '(a '.repeat(depth) + 'b' + ')'.repeat(depth);

const indentation = (depth) =>
  Array.from(
    { length: depth + 1 },
    (_, level) => ' '.repeat(level) + 'a\n'
  ).join('');

function tooDeep(document, maxDepth) {
  try {
    const links = new Parser({ maxDepth }).parse(document);
    throw new Error(
      `expected ${JSON.stringify(document)} to be too deep, got ${links.length} links`
    );
  } catch (error) {
    expect(error).toBeInstanceOf(ParseError);
    expect(error.maxDepth).toBe(maxDepth);
    return error;
  }
}

const accepted = (document, maxDepth) =>
  new Parser({ maxDepth }).parse(document).length > 0;

test('the default limit is shared by every implementation', () => {
  expect(DEFAULT_MAX_DEPTH).toBe(64);
  expect(new Parser().maxDepth).toBe(DEFAULT_MAX_DEPTH);
});

test('parentheses up to the limit are accepted', () => {
  expect(accepted(parens(3), 3)).toBe(true);
  expect(accepted(values(3), 3)).toBe(true);
});

test('parentheses past the limit are refused at the group that is too deep', () => {
  const error = tooDeep(parens(4), 3);

  expect([error.line, error.column, error.offset]).toEqual([1, 4, 3]);
  expect(error.message).toBe(
    'Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n' +
      '1 | ((((a))))\n' +
      '  |    ^'
  );
});

test('groups in value position count like any other group', () => {
  const error = tooDeep(values(4), 3);

  expect([error.line, error.column]).toEqual([1, 10]);
});

test('indentation up to the limit is accepted', () => {
  expect(accepted(indentation(3), 3)).toBe(true);
  expect(accepted(indentation(DEFAULT_MAX_DEPTH), undefined)).toBe(true);
});

test('indentation past the limit is refused at the line that is too deep', () => {
  const error = tooDeep(indentation(4), 3);

  expect([error.line, error.column]).toEqual([5, 5]);
  expect(error.lineText).toBe('    a');
});

test('groups and indentation add up', () => {
  // `(b)` on the line indented once is at level 2.
  expect(accepted('a\n  (b)\n', 2)).toBe(true);
  const error = tooDeep('a\n  (b)\n', 1);

  expect([error.line, error.column]).toEqual([2, 3]);
});

test('trailing spaces on a deep line are not a deeper line', () => {
  expect(accepted('a\n  b\n    c   \n', 2)).toBe(true);
});

test('a syntax error is not mistaken for nesting that is too deep', () => {
  try {
    new Parser().parse('a: b: c');
    throw new Error('expected a syntax error');
  } catch (error) {
    expect(error).toBeInstanceOf(ParseError);
    expect(error.maxDepth).toBeNull();
    expect(error.message).toStartWith('Syntax error at ');
  }
});

test('refuses a document far past the limit instead of overflowing the stack', () => {
  // Before the limit existed each of these ran out of stack.
  for (const document of [
    parens(100_000),
    values(100_000),
    indentation(2_000),
  ]) {
    const error = tooDeep(document, DEFAULT_MAX_DEPTH);
    expect(error.message).toStartWith('Nesting too deep at ');
  }
});

test('the stream parser reports where the nesting is too deep', () => {
  const stream = new StreamParser({ maxDepth: 1 });
  stream.write('a\nb ((c))\n');

  let error;
  try {
    stream.end();
  } catch (thrown) {
    error = thrown;
  }

  expect(error).toBeInstanceOf(StreamParseError);
  expect(error.cause.maxDepth).toBe(1);
  expect([error.line, error.column, error.offset]).toEqual([2, 4, 5]);
});
