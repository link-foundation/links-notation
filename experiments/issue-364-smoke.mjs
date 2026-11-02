import { Parser } from '../js/src/index.js';
const p = new Parser();
const [l] = p.parse("(t 1 '1')");
console.log(l.values.map(v => [v.id, v.rawId, v.quote]), l.values[1].equals(l.values[2]));
console.log(JSON.stringify(l), l.format());
const inputs = ["(t 1 '1')", "a:\n  b c # note\n\n  'x\ny'\r\n(~1{31} ``q``)", "papa (lovesMama: loves mama)\nson lovesMama\n", "  x\ty"];
for (const s of inputs) { const c = p.parseCst(s); console.log(c.text === s, c.toSExpression()); }
console.log(new Parser({syntax:false}).parse("'a' b")[0].rawId);
console.log(p.parse("id:\n  'v'")[0]);
