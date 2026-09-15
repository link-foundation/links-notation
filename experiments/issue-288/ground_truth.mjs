import { Parser } from '../../js/src/Parser.js';
const parser = new Parser();
const render = (n) =>
  !n.values || n.values.length === 0
    ? `<${n.id ?? ''}>`
    : `(${n.id !== null && n.id !== undefined ? `<${n.id}>: ` : ''}${n.values.map(render).join(' ')})`;
const cases = [
  '(a " " b)', '(a "" b)', "(a '' b)", '(a `` b)',
  '(a "" "" b)', "(a '' '' b)", '(a `` `` b)',
  '(a ""x"" b)', '(a """" b)', '(x "" " "")', `(x ' " ')`,
  '("" ("" 1))', `("" ('' 1))`, '("x" ("" 1))', '("" ("x" 1))',
  '("" x ("" 1))', '("" 1 ("" 1))', '(o: ("" (o: ("" 1))))',
  '(a " b)', '(a """ b)', '("")', '("": 1)', '(a ""  "" b)', '("" "")',
];
for (const c of cases) {
  try {
    const r = parser.parse(c);
    console.log(c.padEnd(24), '=>', r.map(render).join('\n'));
  } catch (e) {
    console.log(c.padEnd(24), '=> Err(' + e.message.split('\n')[0] + ')');
  }
}
