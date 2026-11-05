// One-shot: add the reviewed lessParentheses text to parity/text-fixtures.json.
// The texts are written by hand here, not computed from a formatter, so that the
// corpus is able to fail. Usage: node experiments/issue-379/add-less-parentheses-fixtures.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const path = new URL('../../parity/text-fixtures.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(path, 'utf8'));
const r = (id) => ({ id, values: [] });
const a = (...values) => ({ id: null, values });
const n = (id, ...values) => ({ id, values });
const added = [
  ['less-parentheses-lone-nested', '((b c))', [a(a(r('b'), r('c')))], '((b c))', '((b c))'],
  ['less-parentheses-lone-singlet', '((b))', [a(a(r('b')))], '((b))', '((b))'],
  ['less-parentheses-lone-named', '((a: b))', [a(n('a', r('b')))], '((a: b))', '((a: b))'],
  ['less-parentheses-lone-quoted', "(('a b' c))", [a(a(r('a b'), r('c')))], "(('a b' c))", "(('a b' c))"],
  ['less-parentheses-lone-deep', '(((b c)))', [a(a(a(r('b'), r('c'))))], '(((b c)))', '(((b c)))'],
  ['less-parentheses-lone-mixed', '(((a b) c))', [a(a(a(r('a'), r('b')), r('c')))], '(((a b) c))', '(((a b) c))'],
  ['less-parentheses-named-lone', '(id: ((b c)))', [n('id', a(a(r('b'), r('c'))))], '(id: ((b c)))', 'id: ((b c))'],
  ['less-parentheses-empty-link', '()', [a()], '()', '()'],
  ['less-parentheses-several-nested', '((b c) (d e))', [a(a(r('b'), r('c')), a(r('d'), r('e')))], '((b c) (d e))', '(b c) (d e)'],
  ['less-parentheses-trailing-nested', '(a (b c))', [a(r('a'), a(r('b'), r('c')))], '(a (b c))', 'a (b c)'],
  ['less-parentheses-leading-nested', '((a) b)', [a(a(r('a')), r('b'))], '((a) b)', '(a) b'],
].map(([id, input, expected, format, lessParentheses]) => ({
  id, feature: 'less-parentheses', input, expected, format, lessParentheses,
}));
// Reviewed by hand against the unfixed probe: none of these has a lone nested value.
const existing = {
  empty: '',
  singlet: 'alpha',
  tuple: 'alpha beta',
  named: 'root: alpha beta',
  nested: 'root: (child: leaf) tail',
  indent: 'root: (child: leaf) tail',
  context: 'value ((id 1) (label one))',
  quotes: "('a a': 'b b' 'c c')",
  'empty-ref': 'root: ~1{} ~1{}',
  unicode: '根: café 🙂',
  comments: 'root: value',
  'quote-runs': 'root: `has \' and " quotes`',
  multiline: 'root: ~1{6c696e65310a6c696e6532}',
  literal: 'root: ~1{610062}',
};
const out = fixtures.map((f) => ({ ...f, lessParentheses: f.lessParentheses ?? existing[f.id] }));
writeFileSync(path, JSON.stringify([...out, ...added], null, 2) + '\n');
