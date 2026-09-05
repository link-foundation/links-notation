// A parse error has to say where the document stopped making sense.
//
// The positions asserted here are the ones the Rust and C# ports report for the
// same input, so the implementations can be held to the same contract
// (https://github.com/link-foundation/links-notation/issues/302).

import { test, expect } from 'bun:test';
import { Parser, ParseError } from '../src/index.js';

const parser = new Parser();

function syntaxError(document) {
  try {
    const links = parser.parse(document);
    throw new Error(
      `expected ${JSON.stringify(document)} not to parse, got ${links.length} links`
    );
  } catch (error) {
    expect(error).toBeInstanceOf(ParseError);
    return error;
  }
}

test('reports the line and column of the defect', () => {
  // The example from the issue: the defect is the colon on line 2, and the
  // two lines after it are fine.
  const error = syntaxError('# ok line\n# break: two\nci_gate x\n  stage rust');

  expect(error.line).toBe(2);
  expect(error.column).toBe(8);
  expect(error.found).toBe(':');
});

test('offset agrees with the other implementations', () => {
  // Rust and C# report offset 17, line 2, column 8 for this document.
  const error = syntaxError('# ok line\n# break: two\n');

  expect(error.offset).toBe(17);
  expect(error.line).toBe(2);
  expect(error.column).toBe(8);
});

test('reports the line a late defect is on', () => {
  const error = syntaxError('a\nb\nc\nd\ne: f: g\nh\n');

  expect(error.line).toBe(5);
  expect(error.column).toBe(5);
  expect(error.lineText).toBe('e: f: g');
});

test('reports the end of the document when a group is never closed', () => {
  const error = syntaxError('a (b\n');

  expect(error.offset).toBe(5);
  expect(error.line).toBe(2);
  expect(error.column).toBe(1);
  expect(error.found).toBeNull();
  expect(error.message).toContain('end of input');
});

test('reports an unmatched closing parenthesis', () => {
  const error = syntaxError('a b)\n');

  expect(error.offset).toBe(3);
  expect(error.line).toBe(1);
  expect(error.column).toBe(4);
  expect(error.found).toBe(')');
});

test('message says where the document broke', () => {
  const error = syntaxError('# ok line\n# break: two\n');

  expect(error.message.startsWith('Syntax error at line 2, column 8:')).toBe(
    true
  );
  expect(error.snippet).toBe('2 | # break: two\n  |        ^');
});

test('message quotes one line rather than the rest of the document', () => {
  const document = `# ok line\n# break: two\n${'trailing line\n'.repeat(500)}`;

  const error = syntaxError(document);

  expect(error.message).toContain('line 2, column 8');
  expect(error.message).not.toContain('trailing line');
  expect(error.message.length).toBeLessThan(200);
});

test('message of a long line stays a message', () => {
  const document = `${'a'.repeat(400)}: ${'b'.repeat(400)}: c`;

  const error = syntaxError(document);

  expect(error.line).toBe(1);
  expect(error.column).toBe(803);
  expect(error.message).toContain('...');
  expect(error.message.length).toBeLessThan(300);
});

test('the location the parser used to report is still there', () => {
  const error = syntaxError('a: b: c');

  expect(error.location.start).toEqual({ offset: 4, line: 1, column: 5 });
  expect(error.cause).toBeDefined();
});

test('a document that parses reports nothing', () => {
  expect(parser.parse('a: b\n  c: d\n').length).toBe(2);
});
