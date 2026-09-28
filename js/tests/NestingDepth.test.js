// Reading nested groups must take time that grows with the size of the
// document, not with two to the power of its nesting depth
// (https://github.com/link-foundation/links-notation/issues/314).
//
// Before the fix, every level of nesting doubled the work: a nine-byte document
// took seconds. Each case is parsed on its own thread and fails when it has not
// finished within the budget, so a regression fails instead of hanging.

import { test, expect } from 'bun:test';
import { clearTimeout, setTimeout } from 'node:timers';
import { URL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { Parser } from '../src/Parser.js';
import { formatLinks } from '../src/Link.js';

// Generous enough for a slow machine, and far below what the exponential
// reading took at the depths used here.
const BUDGET_MS = 5000;

// The depth used for the shapes that used to take exponential time.
const DEEP = 32;

// A depth that shows the time grows with the size of the document.
const VERY_DEEP = 256;

function withinBudget(what, source) {
  const worker = new Worker(
    new URL('./support/nestingDepthWorker.js', import.meta.url)
  );
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${what} did not finish within ${BUDGET_MS} ms`)),
      BUDGET_MS
    );
  });
  const result = new Promise((resolve, reject) => {
    worker.once('message', resolve);
    worker.once('error', reject);
  });
  worker.postMessage(source);
  return Promise.race([result, timeout]).finally(() => {
    clearTimeout(timer);
    worker.terminate();
  });
}

const closed = (depth) => `${'('.repeat(depth)}a${')'.repeat(depth)}`;

const valueAfter = (depth) => `${'('.repeat(depth)}a${') b'.repeat(depth)}`;

const unclosed = (depth) => `${'('.repeat(depth)}a`;

// Unclosed groups on lines that are each indented one space deeper.
const indentedUnclosed = (depth) =>
  Array.from({ length: depth }, (_, level) => `${' '.repeat(level)}(a`).join(
    '\n'
  );

test(
  'closed groups read in linear time',
  async () => {
    const source = closed(DEEP);
    const result = await withinBudget('closed groups', source);
    expect(result).toEqual({ formatted: source });
  },
  BUDGET_MS * 2
);

test(
  'values after groups read in linear time',
  async () => {
    const source = valueAfter(DEEP);
    const result = await withinBudget('values after groups', source);
    expect(result).toEqual({ formatted: `(${source})` });
  },
  BUDGET_MS * 2
);

test(
  'unclosed groups fail in linear time',
  async () => {
    const result = await withinBudget('unclosed groups', unclosed(DEEP));
    expect(result).toEqual({ error: 'ParseError' });
  },
  BUDGET_MS * 2
);

test(
  'unclosed groups on indented lines fail in linear time',
  async () => {
    const result = await withinBudget(
      'unclosed indented groups',
      indentedUnclosed(DEEP)
    );
    expect(result).toEqual({ error: 'ParseError' });
  },
  BUDGET_MS * 2
);

test(
  'values after very deep groups read in linear time',
  async () => {
    const source = valueAfter(VERY_DEEP);
    const result = await withinBudget('very deep values after groups', source);
    expect(result).toEqual({ formatted: `(${source})` });
  },
  BUDGET_MS * 2
);

test('group followed by values keeps its structure', () => {
  const cases = [
    ['(a) b', '((a) b)'],
    ['(a) (b) c', '((a) (b) c)'],
    ['((a) b) c', '(((a) b) c)'],
    ['(a: b) c', '((a: b) c)'],
    ['(a)\n(b) c', '(a)\n((b) c)'],
    ['x\n  (a) b\n  (c)', '(x)\n((x) ((a) b))\n((x) (c))'],
  ];
  const parser = new Parser();
  for (const [source, expected] of cases) {
    expect(formatLinks(parser.parse(source))).toBe(expected);
  }
});
