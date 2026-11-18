import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const { Link, BinaryLinoCodec, BinaryLinoOptions, ArityRange, DecodeLimits } =
  await import(process.env.LINKS_NOTATION_MODULE ?? '../../js/src/index.js');

const document = Array.from(
  { length: 101 },
  (_, index) =>
    new Link('vacancy', [
      new Link(`https://example.test/vacancy/${index}`),
      new Link(`Requirements: Python and PostgreSQL. Record ${index}.`),
      new Link('Conserver le texte intégral. 日本語の求人情報。 🌍'),
    ])
);
const limits = new DecodeLimits({ maxNodes: 1000, maxStringBytes: 32_768 });
const layouts = [
  ['pure-doublet', new BinaryLinoOptions()],
  ['object-transport', new BinaryLinoOptions(true, new ArityRange(2, null))],
];

for (const [layout, options] of layouts) {
  const codec = new BinaryLinoCodec(options, limits);
  const reader = new BinaryLinoCodec(undefined, limits);
  const encodeTimes = [];
  let byteLength;
  for (let sample = 0; sample < 6; sample++) {
    const started = performance.now();
    const bytes = codec.encode(document);
    const elapsed = performance.now() - started;
    if (sample > 0) encodeTimes.push(elapsed);
    assert.deepEqual(reader.decode(bytes), document);
    byteLength = bytes.length;
  }
  encodeTimes.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      layout,
      records: document.length,
      bytes: byteLength,
      medianEncodeMs: Number(encodeTimes[2].toFixed(2)),
    })
  );
}
