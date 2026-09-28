// Times the JavaScript parser on the quote-heavy shapes from issue #316.
// Usage: node experiments/issue-316/timing.mjs [sizes...]
import { Parser } from '../../js/src/index.js';
import { stripComments } from '../../js/src/comments.js';

export const shapes = {
  'wide quote over a long run': (size) => {
    const width = Math.floor(size / 4);
    return `${"'".repeat(width + 1)} a ${"'".repeat(width - 4)} ${'x'.repeat(2 * width)}`;
  },
  'narrowing unclosed quotes': (size) => {
    const widths = [];
    for (let width = 2 * Math.floor(Math.sqrt(size / 2) / 2) + 1; width >= 1; width -= 2) widths.push(width);
    const head = widths.map((width) => `${"'".repeat(width)}x`).join(' ');
    return `${head} ${"a' ".repeat(Math.max(0, Math.floor((size - head.length) / 3)))}`;
  },
  'closed wide quote over quotes': (size) => {
    const width = Math.floor(size / 8);
    // Body is runs of width-1 quotes (never close, never escape), then a close.
    const q = "'".repeat(width);
    return `${q}${("'".repeat(width - 1) + 'x').repeat(6)}${q}`;
  },
  // Distinct widths that never close, a long tail with a delimiter every third
  // character, and one run at the end that every width reads as escapes only
  // (Math.floor(run / width) is even), so no run is too short to be looked at
  // by a reader that only compares against the longest run after it.
  'unclosed widths over an even run': (size) => {
    const run = Math.floor(size / 4);
    const widths = [];
    for (let width = Math.floor(Math.sqrt(size)); width >= 2; width--) {
      if (Math.floor(run / width) % 2 === 0) widths.push(width);
    }
    const head = widths.map((width) => `${"'".repeat(width)}x`).join(' ');
    const tail = "a' ".repeat(Math.max(0, Math.floor((size - head.length - run) / 3)));
    return `${head} ${tail}${"'".repeat(run)} b`;
  },
};

const sizes = process.argv.slice(2).map(Number);
for (const [name, make] of Object.entries(shapes)) {
  const row = [];
  for (const size of sizes.length ? sizes : [25000, 50000, 100000, 200000]) {
    const source = make(size);
    let t = performance.now();
    stripComments(source);
    const strip = Math.round(performance.now() - t);
    t = performance.now();
    let outcome = 'ok';
    try {
      new Parser({ maxInputSize: 100 * 1024 * 1024 }).parse(source);
    } catch (e) {
      outcome = e.constructor.name;
    }
    row.push(`${source.length}B: ${Math.round(performance.now() - t)} ms (strip ${strip} ms, ${outcome})`);
  }
  console.log(`${name}\n  ${row.join('\n  ')}`);
}
