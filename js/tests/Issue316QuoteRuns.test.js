import { test, expect, setDefaultTimeout } from 'bun:test';
import { performance } from 'node:perf_hooks';
import { Parser } from '../src/Parser.js';
import { quotedReferenceEnd, stripComments } from '../src/comments.js';
import { DelimitedReferences } from '../src/quotes.js';
import { StreamParser } from '../src/StreamParser.js';

// Issue #316: a reference that opens with a wide run of delimiters used to be
// read one character at a time, comparing the whole width at every position,
// and every run that never closed was read to the end of the document again.
// These documents took from seconds to tens of seconds; read a run at a time
// they take milliseconds, so the bound below only fails on the old behaviour.

const parser = new Parser();
const BOUND_MS = 2000;
const SIZE = 400000;
// A regression fails on the bound; the timeout stops it from hanging the run.
setDefaultTimeout(20000);

function render(node) {
  if (!node.values || node.values.length === 0) {
    return `<${node.id ?? ''}>`;
  }
  const head =
    node.id === null || node.id === undefined ? '' : `<${node.id}>: `;
  return `(${head}${node.values.map(render).join(' ')})`;
}

function parsesAs(source) {
  return parser.parse(source).map(render).join('\n');
}

const q = (count) => "'".repeat(count);

function timed(read) {
  const started = performance.now();
  const result = read();
  return { result, elapsed: performance.now() - started };
}

// The shapes from the issue, and two that defeat shortcuts a fix could take.

function wideQuoteOverALongRun(size) {
  const width = Math.floor(size / 4);
  return `${q(width + 1)} a ${q(width - 4)} ${'x'.repeat(2 * width)}`;
}

function narrowingUnclosedQuotes(size) {
  const widths = [];
  for (
    let width = 2 * Math.floor(Math.sqrt(size / 2) / 2) + 1;
    width >= 1;
    width -= 2
  ) {
    widths.push(width);
  }
  const head = widths.map((width) => `${q(width)}x`).join(' ');
  return `${head} ${"a' ".repeat(Math.floor((size - head.length) / 3))}`;
}

function closedWideQuoteOverQuotes(size) {
  const width = Math.floor(size / 8);
  return `${q(width)}${`${q(width - 1)}x`.repeat(6)}${q(width)}`;
}

function unclosedWidthsOverAnEvenRun(size) {
  const run = Math.floor(size / 4);
  const widths = [];
  for (let width = Math.floor(Math.sqrt(size)); width >= 2; width--) {
    if (Math.floor(run / width) % 2 === 0) widths.push(width);
  }
  const head = widths.map((width) => `${q(width)}x`).join(' ');
  const tail = "a' ".repeat(Math.floor((size - head.length - run) / 3));
  return `${head} ${tail}${q(run)} b`;
}

function expectParsedWithinBound(source) {
  expect(timed(() => parser.parse(source)).elapsed).toBeLessThan(BOUND_MS);
  expect(timed(() => stripComments(source)).elapsed).toBeLessThan(BOUND_MS);
}

test('a run inside a body is read as escapes then a closing run', () => {
  expect(parsesAs("'''a'''")).toBe('(<a>)');
  expect(parsesAs("'''a''''''b'''")).toBe("(<a'''b>)");
  expect(parsesAs("''a'''")).toBe("(<a'>)");
  expect(parsesAs("'a'''")).toBe("(<a'>)");
  expect(parsesAs(`${q(3)}a${q(9)} b`)).toBe("(<a'''> <b>)");
  expect(parsesAs(`${q(50)}a${q(100)}b${q(50)}`)).toBe(`(<a${q(50)}b>)`);
  expect(parsesAs('"""a""b"""')).toBe('(<a""b>)');
  expect(parsesAs('``a````b``')).toBe('(<a``b>)');
});

test('a run that never closes the reference leaves it unclosed', () => {
  // Math.floor(7 / 3) is even: two escaped runs of three and one delimiter.
  expect(parsesAs(`${q(3)}a${q(7)}`)).toBe(`(<${q(3)}a${q(7)}>)`);
  expect(parsesAs(`${q(5)}a${q(4)}`)).toBe(`(<${q(5)}a${q(4)}>)`);
  expect(parsesAs("''a'''''")).toBe("(<> <a'''''>)");
  expect(parsesAs("''''x a")).toBe('(<> <x> <a>)');
});

test('a reference can open inside a run', () => {
  // Comment stripping and the stream parser ask where a reference opened at
  // any delimiter ends, including one in the middle of a run.
  const cases = [
    ["x'''a'''", 1, 8],
    ["x'''a''", 2, 7],
    ["x'''a'", 3, 6],
    ["'''a", 0, null],
    ["''''a", 0, 4],
    ['a', 0, null],
    ["'a'", 3, null],
  ];
  for (const [document, start, end] of cases) {
    expect(quotedReferenceEnd(document, start)).toBe(end);
    expect(new DelimitedReferences(document).endAt(start)).toBe(end);
  }
});

test('a reference that opens with a wide run is read in linear time', () => {
  const width = Math.floor(SIZE / 4);
  const source = wideQuoteOverALongRun(SIZE);
  const { result, elapsed } = timed(() => parser.parse(source));
  // The odd opening run never closes, so it is a plain reference; the even
  // run after `a` encloses nothing and is the empty reference.
  expect(result.length).toBe(1);
  expect(result[0].values.map((value) => value.id)).toEqual([
    q(width + 1),
    'a',
    '',
    'x'.repeat(2 * width),
  ]);
  expect(elapsed).toBeLessThan(BOUND_MS);
});

test('wide quote over a long run is parsed within the time bound', () => {
  expectParsedWithinBound(wideQuoteOverALongRun(SIZE));
});

test('narrowing unclosed quotes is parsed within the time bound', () => {
  expectParsedWithinBound(narrowingUnclosedQuotes(SIZE));
});

test('closed wide quote over quotes is parsed within the time bound', () => {
  expectParsedWithinBound(closedWideQuoteOverQuotes(SIZE));
});

test('unclosed widths over an even run is parsed within the time bound', () => {
  expectParsedWithinBound(unclosedWidthsOverAnEvenRun(SIZE));
});

test('a stream of wide quotes is read within the time bound', () => {
  // The second line is what makes the stream ask whether the first is complete.
  const source = `${closedWideQuoteOverQuotes(SIZE)}\nb`;
  const links = [];
  const { elapsed } = timed(() => {
    const stream = new StreamParser();
    stream.on('link', (link) => links.push(link));
    stream.write(source);
    stream.end();
  });
  expect(links.length).toBe(2);
  expect(elapsed).toBeLessThan(BOUND_MS);
});
