// Conformance tests for line comments (issue #301).
//
// `#` starts a comment that runs to the end of the line, unless it sits inside
// a token or inside a delimited reference. Parsers accept comments by default
// and can be told to treat `#` as an ordinary character again. The table below
// is shared with the Rust, Python, C#, Go, Java and PHP suites, so a document
// written by one implementation reads the same in all of them.

import { test, expect } from 'bun:test';
import { Parser, ParseError, stripComments } from '../src/index.js';

const parser = new Parser();

// Render a parsed node unambiguously: every reference is wrapped in angle
// brackets, so a `#` that survived as content is visible.
function render(node) {
  if (!node.values || node.values.length === 0) {
    return `<${node.id ?? ''}>`;
  }
  const head =
    node.id === null || node.id === undefined ? '' : `<${node.id}>: `;
  return `(${head}${node.values.map(render).join(' ')})`;
}

function parsesAs(input) {
  return parser.parse(input).map(render).join('\n');
}

test('a line that starts with a hash is a comment', () => {
  expect(parsesAs('# a b\n')).toBe('');
});

test('a comment may hold a colon', () => {
  // The document from #301: prose with a colon used to be a parse error.
  expect(parsesAs('# a: b\n')).toBe('');
});

test('a comment may hold anything at all', () => {
  expect(parsesAs('# ) : ( " \' ` #\n')).toBe('');
});

test('a comment ends at the end of its line', () => {
  expect(parsesAs('# note\na: b\n')).toBe('(<a>: <b>)');
});

test('a comment may follow a link', () => {
  expect(parsesAs('a: b # why\n')).toBe('(<a>: <b>)');
});

test('a comment may follow a group', () => {
  expect(parsesAs('(a b) # why\n')).toBe('(<a> <b>)');
});

test('a comment needs no closing newline', () => {
  expect(parsesAs('a: b # why')).toBe('(<a>: <b>)');
});

test('a comment line inside an indented block is skipped', () => {
  expect(parsesAs('parent\n  # what the child is for\n  child\n')).toBe(
    parsesAs('parent\n  child\n')
  );
});

test('a comment line inside a group is skipped', () => {
  expect(parsesAs('(\n  a\n  # why\n  b\n)\n')).toBe(
    parsesAs('(\n  a\n  b\n)\n')
  );
});

test('a line of spaces separates links the way an empty line does', () => {
  // Blanking a comment leaves a line of spaces behind, so such a line has to
  // read as a blank line.
  expect(parsesAs('a\n   \nb\n')).toBe(parsesAs('a\n\nb\n'));
});

test('a document of comments alone holds no links', () => {
  expect(parsesAs('# one\n# two\n')).toBe('');
});

test('a hash inside a token is an ordinary character', () => {
  expect(parsesAs('issue#1047\n')).toBe('(<issue#1047>)');
});

test('a hash that opens a token is an ordinary character', () => {
  expect(parsesAs('a: b#c\n')).toBe('(<a>: <b#c>)');
});

test('a hash inside a delimited reference is content', () => {
  expect(parsesAs('"# not a comment" a\n')).toBe('(<# not a comment> <a>)');
});

test('a comment may follow a delimited reference', () => {
  expect(parsesAs('"a" # why\n')).toBe('(<a>)');
});

test('a hash inside a multiline delimited reference is content', () => {
  expect(parsesAs('"a # b\nc" d\n')).toBe('(<a # b\nc> <d>)');
});

test('comments can be turned off', () => {
  const plain = new Parser({ comments: false });

  expect(plain.parse('# a b\n').map(render).join('\n')).toBe('(<#> <a> <b>)');
});

test('a parser without comments still rejects the document from the issue', () => {
  const plain = new Parser({ comments: false });

  expect(() => plain.parse('# a: b\n')).toThrow(ParseError);
});

test('comments are on by default', () => {
  expect(new Parser().comments).toBe(true);
  expect(new Parser({}).comments).toBe(true);
});

test('a comment does not move the position a later error is reported at', () => {
  // Blanking a comment keeps every later character where it was, so the
  // position reported for a defect is the position in the original document.
  let error = null;
  try {
    parser.parse('# a comment\nstage: rust: nextest\n');
  } catch (thrown) {
    error = thrown;
  }

  expect(error).toBeInstanceOf(ParseError);
  expect(error.line).toBe(2);
  expect(error.column).toBe(12);
  expect(error.lineText).toBe('stage: rust: nextest');
});

test('blanking a comment keeps the length of the document', () => {
  expect(stripComments('a: b # why\n')).toBe('a: b      \n');
  expect(stripComments('"# kept"\n')).toBe('"# kept"\n');
  expect(stripComments('issue#1047\n')).toBe('issue#1047\n');
  expect(stripComments('a: b\n').length).toBe(5);
});
