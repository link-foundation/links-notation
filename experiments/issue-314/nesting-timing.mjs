// Times the JavaScript parser on the nesting shapes from issue #314.
// Usage: node experiments/issue-314/nesting-timing.mjs [maxMs]
import { Parser } from '../../js/src/index.js';

const budget = Number(process.argv[2] ?? 2000);
const shapes = {
  'closed        ((((a))))': (d) => '('.repeat(d) + 'a' + ')'.repeat(d),
  'value after   ((((a) b) b) b': (d) => '('.repeat(d) + 'a' + ') b'.repeat(d),
  'unclosed      ((((a': (d) => '('.repeat(d) + 'a',
  'indented      (a\\n (a\\n  (a': (d) =>
    Array.from({ length: d }, (_, i) => ' '.repeat(i) + '(a').join('\n'),
  'indented ids  a:\\n  a:\\n    (': (d) =>
    Array.from({ length: d }, (_, i) => ' '.repeat(i) + 'a').join('\n') + '\n' + ' '.repeat(d) + '(',
};
for (const [name, make] of Object.entries(shapes)) {
  const row = [];
  for (const d of [2, 4, 8, 12, 16, 20, 24, 64, 256, 1024]) {
    const source = make(d);
    const started = performance.now();
    let outcome = 'ok';
    try {
      new Parser({ maxInputSize: 1 << 30 }).parse(source);
    } catch (e) {
      outcome = e.name;
    }
    const ms = performance.now() - started;
    row.push(`${d}: ${ms.toFixed(1)} ms (${outcome})`);
    if (ms > budget) break;
  }
  console.log(`${name}\n  ${row.join(', ')}`);
}
