import assert from 'node:assert/strict';
import {
  BinaryLinoCodec, Link, Parser, StreamParser, encodeReferenceLiteral,
} from '../js/src/index.js';

// Self-authored application text, including all delimiters and exact whitespace.
const body = ' He said "it\'s `ready`"\r\n\u0000😀 ';
const original = [new Link('message', [new Link(body)])];
const parser = new Parser();
const nativeText = original[0].format();
const literalText = `(message: ${encodeReferenceLiteral(body)})`;
assert.deepEqual(parser.parse(nativeText), original);
assert.deepEqual(parser.parse(literalText), original);

for (let split = 0; split <= literalText.length; split++) {
  const stream = new StreamParser();
  stream.write(literalText.slice(0, split));
  stream.write(literalText.slice(split));
  assert.deepEqual(stream.end(), original);
}

const codec = new BinaryLinoCodec();
const decoded = codec.decode(codec.encode(original));
assert.deepEqual(decoded, original);
assert.deepEqual(parser.parse(codec.formatDocument(decoded)), original);
console.log(literalText);
console.log('Exact references preserved through native, literal, stream and binary round trips.');
