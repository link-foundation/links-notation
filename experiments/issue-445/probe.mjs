import { Parser } from '../../js/src/index.js';
const p = new Parser();
const show = l => (l && typeof l === 'object' ? (l.values?.length ? [l.id, ...l.values.map(show)] : l.id) : l);
for (const t of process.argv.slice(2).map(s => JSON.parse(s))) {
  try { console.log(JSON.stringify(t), '=>', JSON.stringify(p.parse(t).map(show))); }
  catch (e) { console.log(JSON.stringify(t), 'ERROR', e.message.split('\n')[0]); }
}
