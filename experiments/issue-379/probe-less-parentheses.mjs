// Probe: which documents stop round-tripping through format(true) / FormatOptions({lessParentheses:true})?
// Usage: bun experiments/issue-379/probe-less-parentheses.mjs
import { readFileSync } from 'node:fs';
import { Parser, FormatOptions, formatLinks } from '../../js/src/index.js';

const parser = new Parser();
const fixtures = JSON.parse(
  readFileSync(new URL('../../parity/text-fixtures.json', import.meta.url))
);
const extra = [
  '((b c))', '(((b c)))', '((a: b))', '(a: (b c))', 'a: (b c)', '((b c) (d e))', '(a (b c))',
  '(b)', '((b))', '(((b)))', '()', '(())', '((()))', '(() a)', '(a ())', '((a) b)', '((a) (b))',
  '(id: (b))', '(id: ((b c)))', "('a b')", "(('a b'))", "('a b' c)", "(('a b' c))", '(a: b)', "('a b': c)", "(('a b': c))",
  'a b', '(a b)', '(a: )', '(a:)', '((a:))', '((a:) b)', "(a: ('b c'))",
  '((a b) c)', '(((a b) c))', '(x: ((a b)))','""',"(\"\")","((\"\"))", '("" a)', '(("" a))',
];
const cases = [
  ...fixtures.map((f) => [f.id, f.input]),
  ...extra.map((e) => [e, e]),
];
const opts = new FormatOptions({ lessParentheses: true });
for (const [name, input] of cases) {
  let links;
  try { links = parser.parse(input); } catch (e) { console.log('PARSEERR', JSON.stringify(input), e.message.split('\n')[0]); continue; }
  const row = [];
  for (const [mode, fmt] of [
    ['default', (l) => formatLinks(l, false)],
    ['true', (l) => formatLinks(l, true)],
    ['options', (l) => formatLinks(l, opts)],
  ]) {
    const text = fmt(links);
    let ok;
    try {
      const again = parser.parse(text);
      ok = again.length === links.length && again.every((l, i) => l.equals(links[i]));
    } catch (e) { ok = 'ERR'; }
    row.push(`${mode}:${ok === true ? 'ok' : 'FAIL(' + ok + ')'} ${JSON.stringify(text)}`);
  }
  console.log(JSON.stringify(input.length>40?name:input), JSON.stringify(links), '\n   ', row.join('\n    '));
}
