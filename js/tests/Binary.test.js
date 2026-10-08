import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  Parser,
  Link,
  BinaryLinoCodec,
  BinaryLinoOptions,
  ArityRange,
  DecodeLimits,
  LinksPacket,
  PacketReader,
  formatBinaryReference,
} from '../src/index.js';

test('binary text quotes every Unicode grammar whitespace character', () => {
  for (const text of [
    '\u0085',
    'x\u00a0y',
    'x\u2028y',
    '\u001c',
    '\u001d',
    '\u001e',
    '\u001f',
    '\ufeff',
  ]) {
    expect(
      new Parser().parse(`(root: ${formatBinaryReference(text)})`)
    ).toEqual([new Link('root', [new Link(text)])]);
  }
});

test('string decoding stops at the UTF-8 budget before reading later scalars', () => {
  const bytes = Buffer.from(
    '13024605011001030000009fffffff9effffff0028ffff06',
    'hex'
  );
  const codec = new BinaryLinoCodec(
    undefined,
    new DecodeLimits({ maxStringBytes: 1 })
  );
  expect(() => codec.decode(bytes)).toThrow('string budget exceeded');
});

test('shared binary golden vectors', () => {
  let count = 0;
  for (const line of readFileSync(
    new globalThis.URL(
      '../../docs/protocol/binary-links-notation-vectors.txt',
      import.meta.url
    ),
    'utf8'
  ).split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const f = line.split('\t');
    const bytes = Buffer.from(f.at(-1).replaceAll(' ', ''), 'hex');
    if (f[0] === 'document') {
      const codec = new BinaryLinoCodec(
        new BinaryLinoOptions(
          f[2] === 'external',
          ArityRange.parse(f[3]),
          f[4] === 'packed'
        )
      );
      const model = codec.parseDocument(f[1].replaceAll('\\n', '\n'));
      expect(Buffer.from(codec.encode(model))).toEqual(bytes);
      expect(codec.decode(bytes)).toEqual(model);
    } else {
      const links = LinksPacket.parseLinks(f[1]);
      expect(
        Buffer.from(
          LinksPacket.pack(
            f[2] === 'external',
            links,
            f[3] === 'packed'
          ).toBytes()
        )
      ).toEqual(bytes);
      expect(LinksPacket.fromBytes(bytes).links()).toEqual(links);
    }
    count++;
  }
  expect(count).toBe(96);
});

test('all native text models survive all binary options', () => {
  for (const source of [
    '',
    '()',
    '""',
    'a',
    '(a)',
    '((a))',
    '(a b c)',
    '("": () "" (b))',
    'a:\n  b\n  c',
    '"#x" "λ😀" "007" "18446744073709551615"',
    '# comment\n(a # tail\n b)',
  ]) {
    const model = new Parser().parse(source);
    for (const external of [false, true])
      for (const arity of ['2', '2..3', '1..'])
        for (const packed of [false, true]) {
          const codec = new BinaryLinoCodec(
            new BinaryLinoOptions(external, ArityRange.parse(arity), packed)
          );
          const decoded = codec.decode(codec.encode(model));
          expect(decoded.length).toBe(model.length);
          expect(decoded.every((n, i) => n.equals(model[i]))).toBe(true);
        }
  }
});

test('configurable limits apply in both directions; reject malformed packets', () => {
  const model = [new Link(null, [new Link('abcdef')])];
  const bytes = new BinaryLinoCodec().encode(model);
  for (const values of [
    { maxNodes: 1 },
    { maxStringBytes: 2 },
    { maxDepth: 1 },
    { maxLinks: 1 },
    { maxReferences: 1 },
  ]) {
    const codec = new BinaryLinoCodec(undefined, new DecodeLimits(values));
    expect(() => codec.decode(bytes)).toThrow();
    expect(() => codec.encode(model)).toThrow();
  }
  for (const hex of [
    '',
    '20',
    '1e00',
    '1001',
    '100000',
    '10ffffffffffffffffffff',
  ]) {
    expect(() =>
      new BinaryLinoCodec().decode(Buffer.from(hex, 'hex'))
    ).toThrow();
  }
});

test('packet cursor boundaries, uint64, truncation and configurable depth', () => {
  for (const [external, references] of [
    [false, '0 18446744073709551615'],
    [true, '#0 #9223372036854775807'],
  ]) {
    const links = LinksPacket.parseLinks('6:' + references);
    const packet = LinksPacket.pack(external, links, true);
    const data = packet.toBytes();
    const reader = new PacketReader(new Uint8Array([...data, ...data]));
    expect(reader.read().links()).toEqual(links);
    expect(reader.offset).toBe(data.length);
    expect(reader.read().links()).toEqual(links);
    expect(reader.read()).toBeNull();
    for (let end = 0; end < data.length; end++)
      expect(() => LinksPacket.fromBytes(data.slice(0, end))).toThrow();
  }
  let document = [new Link('leaf')];
  for (let i = 0; i < 70; i++) document = [new Link(null, document)];
  expect(() => new BinaryLinoCodec().encode(document)).toThrow();
  const codec = new BinaryLinoCodec(
    undefined,
    new DecodeLimits({ maxDepth: 80 })
  );
  expect(codec.decode(codec.encode(document))).toEqual(document);
});
