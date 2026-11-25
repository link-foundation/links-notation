// Reproduces issues #443 and #444 against the JS reference parser.
import { Parser } from '../../js/src/index.js';
const p = new Parser();
const show = l => (l && typeof l === 'object' ? (l.values?.length ? [l.id, ...l.values.map(show)] : l.id) : l);
const cases = [
  'root:\n  a ""\n  b ""\n', "root:\n  a ''\n  b ''\n", 'root:\n  a ""\n  b "x y"\n',
  '(a: """")', '(a: """""")', 'a ""\nb ""\n', 'a ""',
  'root:\n  tag #release\n  next 1\n', 'root:\n  time 12:30\n', 'root:\n  url https://x/y#frag\n',
  'a: b # why\n', 'a #b\n', 'a:b\n', 'a: b:c\n', 'x 12:30\n', 'a :b',
];
for (const t of cases) {
  try { console.log(JSON.stringify(t), '=>', JSON.stringify(p.parse(t).map(show))); }
  catch (e) { console.log(JSON.stringify(t), 'ERROR', e.message.split('\n')[0]); }
}
