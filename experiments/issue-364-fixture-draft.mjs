// Drafts parity/syntax-fixtures.json entries from the JS reference parser so
// they can be reviewed by hand before they become golden fixtures.
import { Parser } from '../js/src/index.js';
const inputs = JSON.parse(process.argv[2]);
const p = new Parser();
const tree = (links) => links.map((l) => ({ id: l.id, raw: l.rawId, quote: l.quote, values: tree(l.values) }));
const out = [];
for (const [id, feature, input] of inputs) {
  try {
    out.push({ id, feature, input, links: tree(p.parse(input)), cst: p.parseCst(input).toSExpression() });
  } catch (e) { out.push({ id, input, error: String(e) }); }
}
console.log(JSON.stringify(out, null, 1));
