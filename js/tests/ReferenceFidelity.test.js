import { readFileSync } from 'node:fs';
import { expect, test } from 'bun:test';
import {
  BinaryLinoCodec,
  decodeReferenceLiteral,
  encodeReferenceLiteral,
  formatBinaryReference,
  formatLinks,
  FormatConfig,
  Link,
  Parser,
  StreamParser,
} from '../src/index.js';

const references = readFileSync(
  new globalThis.URL(
    '../../docs/protocol/reference-literals.txt',
    import.meta.url
  ),
  'utf8'
)
  .trim()
  .split('\n')
  .filter((line) => !line.startsWith('#'))
  .map((hex) => (hex === '-' ? '' : Buffer.from(hex, 'hex').toString('utf8')));

test('native reference fidelity', () => {
  for (const id of references) {
    const original = new Link(id, [
      new Link(id),
      new Link('nested', [new Link(id)]),
    ]);
    for (const lessParentheses of [
      false,
      true,
      new FormatConfig({ maxInlineRefs: 1, preferInline: false }),
    ]) {
      const text = formatLinks([original], lessParentheses);
      expect(new Parser().parse(text)).toEqual([original]);
    }
  }
});

test('reference literals at every chunk split', () => {
  for (const id of references) {
    expect(decodeReferenceLiteral(encodeReferenceLiteral(id))).toBe(id);
    for (const literal of [
      Link.escapeReference(id),
      formatBinaryReference(id),
      encodeReferenceLiteral(id),
    ]) {
      const text = `(root: ${literal})\n(${literal}: fixture)`;
      const expected = [
        new Link('root', [new Link(id)]),
        new Link(id, [new Link('fixture')]),
      ];
      expect(new Parser().parse(text)).toEqual(expected);
      for (let split = 0; split <= text.length; split++) {
        const stream = new StreamParser();
        stream.write(text.slice(0, split));
        stream.write(text.slice(split));
        expect(stream.end()).toEqual(expected);
      }
    }
  }
}, 10000);

test('binary reference fidelity', () => {
  const codec = new BinaryLinoCodec();
  for (const id of references) {
    const original = [new Link(id, [new Link(id)])];
    const decoded = codec.decode(codec.encode(original));
    expect(decoded).toEqual(original);
    expect(codec.parseDocument(codec.formatDocument(decoded))).toEqual(
      original
    );
  }
});

test('malformed reference literals are rejected', () => {
  const invalid = readFileSync(
    new globalThis.URL(
      '../../docs/protocol/invalid-reference-literals.txt',
      import.meta.url
    ),
    'utf8'
  )
    .trim()
    .split('\n')
    .filter((line) => !line.startsWith('#'));
  for (const literal of invalid) {
    expect(() => decodeReferenceLiteral(literal)).toThrow();
    expect(() => new Parser().parse(literal)).toThrow();
  }
  expect(() => decodeReferenceLiteral('~1{61}\n')).toThrow();
  expect(decodeReferenceLiteral('~1{C3A9}')).toBe('é');
  expect(() => encodeReferenceLiteral('\ud800')).toThrow();
  expect(() => Link.escapeReference('\ud800')).toThrow();
});
