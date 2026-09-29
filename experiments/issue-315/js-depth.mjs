import { Parser } from '../../js/src/index.js';
const shapes = {
  parens: (d) => '('.repeat(d) + 'a' + ')'.repeat(d),
  values: (d) => '(a '.repeat(d) + 'b' + ')'.repeat(d),
  indent: (d) => Array.from({ length: d + 1 }, (_, i) => ' '.repeat(i) + 'a\n').join(''),
};
for (const [name, make] of Object.entries(shapes)) for (const d of [3, 4, 65, 100000]) {
  if (name === 'indent' && d > 5000) continue;
  const t = Date.now();
  try { new Parser({ maxDepth: d < 10 ? 3 : undefined }).parse(make(d)); console.log(name, d, 'ok', Date.now() - t, 'ms'); }
  catch (e) { console.log(name, d, e.constructor.name, e.maxDepth, JSON.stringify(e.message.slice(0, 90)), Date.now() - t, 'ms'); }
}
