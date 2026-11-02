import { describe, expect, test } from 'bun:test';
import { CstKind, CstNode, Parser } from '../src/index.js';

const roundTrip = (input, options) =>
  new Parser(options).parseCst(input).toString();

describe('concrete syntax tree (issue #364)', () => {
  test('is the default lossless view of a document', () => {
    const input = "(t 1 '1')";
    const cst = new Parser().parseCst(input);
    expect(cst).toBeInstanceOf(CstNode);
    expect(cst.kind).toBe(CstKind.DOCUMENT);
    expect(cst.toString()).toBe(input);
    expect(cst.toSExpression()).toBe(
      '(document (line (group open_paren:"(" (line reference:"t" whitespace:" " reference:"1" whitespace:" " reference:"\'1\'") close_paren:")")))'
    );
  });

  test('reference tokens carry their value and delimiter', () => {
    const references = new Parser()
      .parseCst("(a \"b c\" ~1{64} ''e''''f'')")
      .tokens()
      .filter((token) => token.kind === CstKind.REFERENCE);
    expect(
      references.map((token) => [token.text, token.value, token.quote])
    ).toEqual([
      ['a', 'a', null],
      ['"b c"', 'b c', '"'],
      ['~1{64}', 'd', null],
      ["''e''''f''", "e''f", "'"],
    ]);
  });

  test.each([
    ['empty', ''],
    ['only whitespace', ' \t '],
    ['blank lines', '\n\n'],
    ['CRLF and CR', 'a\r\nb\rc\r\n'],
    ['tabs and trailing spaces', 'a\t b  \n'],
    ['comments everywhere', '# head\na: b # tail\n  # inner\n  c\n# end'],
    ['multiline quotes', '(note: "one\n  two\r\nthree")'],
    ['nested groups over lines', '(a (b\n  (c d)\n) e)\n'],
    ['indentation', 'root:\n  child:\n    leaf\n  tail'],
    ['literals', '(~1{} ~1{e6a0b9})'],
    ['comment marks inside quotes', '(\'#a\' "b # c" `#`)'],
    ['unicode', '(根: café 🙂)\n'],
  ])('recovers %s exactly', (_, input) => {
    expect(roundTrip(input)).toBe(input);
  });

  test('without comment support, # is part of references', () => {
    const input = 'a #b';
    const cst = new Parser({ comments: false }).parseCst(input);
    expect(cst.toString()).toBe(input);
    expect(cst.tokens().map((token) => token.kind)).toEqual([
      'reference',
      'whitespace',
      'reference',
    ]);
  });

  test('a group belongs to the line it opens on', () => {
    const cst = new Parser().parseCst('a (b\nc)\nd');
    expect(cst.children.map((line) => line.toString())).toEqual([
      'a (b\nc)\n',
      'd',
    ]);
    const group = cst.children[0].children[2];
    expect(group.kind).toBe(CstKind.GROUP);
    expect(group.children.map((child) => child.kind)).toEqual([
      'open_paren',
      'line',
      'line',
      'close_paren',
    ]);
  });

  test('reads versioned literals in linear time', () => {
    // CodeQL js/polynomial-redos flagged the regular expression that used to
    // find where a literal ends; the scanner that replaced it is one pass.
    const input = [
      `~1{${'61'.repeat(50000)}}`,
      `~${'1'.repeat(50000)}x`,
      '~1{61} '.repeat(20000),
    ].join('\n');
    const started = Date.now();
    const cst = new Parser().parseCst(input);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(cst.toString()).toBe(input);
    expect(
      new Parser()
        .parseCst('(~1{64} ~{} ~a{b} ~1x)')
        .tokens()
        .filter((token) => token.kind === CstKind.REFERENCE)
        .map((token) => [token.text, token.value])
    ).toEqual([
      ['~1{64}', 'd'],
      ['~{}', '~{}'],
      ['~a{b}', '~a{b}'],
      ['~1x', '~1x'],
    ]);
  });

  test('rejects what parse() rejects', () => {
    expect(() => new Parser().parseCst('(a')).toThrow();
    expect(() => new Parser().parseCst('a)')).toThrow();
    expect(() => new Parser({ maxDepth: 1 }).parseCst('((a))')).toThrow();
  });
});
