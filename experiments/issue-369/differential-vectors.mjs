#!/usr/bin/env node
/**
 * Differential fuzzing of the Swift port against links-notation (JS).
 * Writes random documents with what the JS parser makes of them, in the
 * format of the shared fixtures (errors carry their code, line,
 * column and message), for DifferentialTests.swift to replay:
 *
 *   node experiments/issue-369/differential-vectors.mjs 5000 42 8 > /tmp/diff.json  # count seed maxDepth
 *   LINKS_NOTATION_VECTORS=/tmp/diff.json LINKS_NOTATION_MAX_DEPTH=8 swift test --filter Differential
 */
import { Parser, formatLinks } from '../../js/src/index.js';

const linkTree = (link) => ({
  id: link.id ?? null,
  values: (link.values ?? []).map(linkTree),
});

const [count = 2000, seed = 1, maxDepth = 8] = process.argv
  .slice(2)
  .map(Number);
let state = seed >>> 0 || 1;
const random = (n) => {
  state ^= state << 13;
  state >>>= 0;
  state ^= state >>> 17;
  state ^= state << 5;
  state >>>= 0;
  return state % n;
};
const pieces = [
  'a',
  'b',
  'id',
  ' ',
  ' ',
  '  ',
  '\t',
  '\n',
  '\n',
  '\r\n',
  '\r',
  '(',
  '(',
  ')',
  ')',
  ':',
  ': ',
  '"',
  "'",
  '`',
  '""',
  "''",
  '#',
  ' # c',
  '~1{61}',
  '~1{zz}',
  '~2{',
  '~',
  'é',
  '🙂',
  '́',
  ' ',
  '﻿',
  'x y',
  '((',
  '))',
  '\n  ',
  '\n    ',
  '"a b"',
  "'it''s'",
  '```q```',
  '\u0001',
];
const parser = new Parser({ maxDepth, maxInputSize: 1 << 20 });
const vectors = [];
for (let i = 0; i < count; i++) {
  let input = '';
  const length = 1 + random(14);
  for (let j = 0; j < length; j++) {
    input += pieces[random(pieces.length)];
  }
  const id = `fuzz-${i}`;
  try {
    const links = parser.parse(input);
    vectors.push({
      id,
      input,
      expected: links.map(linkTree),
      format: formatLinks(links),
    });
  } catch (error) {
    if (error.name !== 'ParseError') {
      // An invalid ~1{...} literal: a plain Error without a location.
      if (!/reference literal/.test(error.message)) {
        throw error;
      }
      vectors.push({
        id,
        input,
        error: true,
        code: 'invalid-literal',
        message: error.cause.message,
      });
      continue;
    }
    vectors.push({
      id,
      input,
      error: true,
      code: error.maxDepth === null ? 'syntax-error' : 'depth-exceeded',
      line: error.line,
      column: error.column,
      message: error.cause.message,
    });
  }
}
process.stdout.write(JSON.stringify(vectors));
