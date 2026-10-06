import { BinaryLinoCodec, BinaryLinoOptions, ArityRange } from '../../js/src/index.js';
import { readFileSync } from 'node:fs';
const corpus = readFileSync(new URL('./corpus.txt', import.meta.url), 'utf8').replace(/\n$/, '').split('\n');
for (const source of corpus) {
  const text = source.replaceAll('\\n', '\n');
  const document = new BinaryLinoCodec().parseDocument(text);
  for (const external of [false, true]) for (const arity of ['2', '2..3', '1..']) for (const packed of [false, true]) {
    const codec = new BinaryLinoCodec(new BinaryLinoOptions(external, ArityRange.parse(arity), packed));
    const data = codec.encode(document);
    const decoded = codec.decode(data);
    if (!document.every((n, i) => n.equals(decoded[i])) || document.length !== decoded.length) throw new Error('Document changed');
    console.log([...data].map(b => b.toString(16).padStart(2, '0')).join(' ') + '\t' + codec.formatDocument(decoded).replaceAll('\n', '\\n'));
  }
}
