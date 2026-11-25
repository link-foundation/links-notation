// The reproductions from issues #443 and #444, run against the built package.
// Usage: node experiments/issue-445/reproduce.mjs [path to the package entry]
const entry = process.argv[2] ?? new URL('../../js/dist/index.js', import.meta.url).href;
const { Parser, quoteReference, needsQuoting } = await import(entry);
const p = new Parser();
const show = (l) =>
  l && typeof l === 'object' ? (l.values?.length ? [l.id, ...l.values.map(show)] : l.id) : l;
for (const t of [
  'root:\n  a ""\n  b ""\n',
  "root:\n  a ''\n  b ''\n",
  'root:\n  a ""\n  b "x y"\n',
  '(a: """")',
  '(a: \'"\')',
  'root:\n  tag #release\n  next 1\n',
  'root:\n  time 12:30\n',
  'root:\n  url https://x/y#frag\n',
  'a: b # a comment\n',
]) {
  try {
    console.log(JSON.stringify(t), '=>', JSON.stringify(p.parse(t).map(show)));
  } catch (e) {
    console.log(JSON.stringify(t), '=> ERROR', e.message.split('\n')[0]);
  }
}
if (quoteReference) {
  for (const s of ['plain', '12:30', '#release', '', '"', 'a b'])
    console.log(`quoteReference(${JSON.stringify(s)}) = ${quoteReference(s)}  needsQuoting: ${needsQuoting(s)}`);
}
