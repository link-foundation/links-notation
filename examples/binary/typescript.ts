import {
  ArityRange,
  BinaryLinoCodec,
  BinaryLinoOptions,
  DecodeLimits,
  LinksPacket,
  PacketReader,
} from '../../js';

const codec = new BinaryLinoCodec(
  new BinaryLinoOptions(true, ArityRange.parse('2..3'), true),
  new DecodeLimits({ maxDepth: 80 })
);
const bytes: Uint8Array = codec.encodeText('(child: father mother)');
console.log(codec.decodeText(bytes));

// BigInt keeps every bit of a plain unsigned 64-bit store reference.
const packet = LinksPacket.pack(false, [[6n, [0n, 18446744073709551615n]]]);
const reader = new PacketReader(packet.toBytes());
console.log(reader.read()?.links());
