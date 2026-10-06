/** Binary links notation v1. Packet and document layers share no transport. */
import { Link } from './Link.js';
import { Parser } from './Parser.js';

const U64 = (1n << 64n) - 1n;
const WIDTHS = [1, 2, 4, 8];
function requireValue(condition, message) {
  if (!condition) throw new RangeError(message);
}
function uint64(value) {
  requireValue(
    typeof value === 'bigint' || (Number.isSafeInteger(value) && value >= 0),
    'expected uint64'
  );
  const result = BigInt(value);
  requireValue(result >= 0n && result <= U64, 'uint64 overflow');
  return result;
}
export class External {
  constructor(value) {
    this.value = uint64(value);
  }
}
export class ArityRange {
  constructor(min = 2, max = 2) {
    this.min = uint64(min);
    this.max = max === null ? null : uint64(max);
    requireValue(
      this.min > 0n &&
        this.min <= U64 >> 4n &&
        (this.max === null || this.max >= this.min),
      'invalid arity'
    );
  }
  contains(length) {
    return (
      BigInt(length) >= this.min &&
      (this.max === null || BigInt(length) <= this.max)
    );
  }
  get fixed() {
    return this.min === this.max;
  }
  static parse(text) {
    requireValue(/^[0-9]+(?:\.\.[0-9]*)?$/.test(text), 'invalid arity');
    const parts = text.split('..');
    return new ArityRange(
      BigInt(parts[0]),
      parts.at(-1) === '' ? null : BigInt(parts.at(-1))
    );
  }
}
export class DecodeLimits {
  constructor(values = {}) {
    Object.assign(
      this,
      {
        maxLinks: 2 ** 22,
        maxReferences: 2 ** 24,
        maxNodes: 2 ** 22,
        maxStringBytes: 64 * 2 ** 20,
        maxDepth: 64,
      },
      values
    );
    for (const key of Object.keys(this)) {
      requireValue(
        [
          'maxLinks',
          'maxReferences',
          'maxNodes',
          'maxStringBytes',
          'maxDepth',
        ].includes(key),
        'unknown limit'
      );
      requireValue(
        Number.isSafeInteger(this[key]) && this[key] >= 0,
        'invalid limit'
      );
    }
  }
  static unlimited() {
    return new DecodeLimits({
      maxLinks: Number.MAX_SAFE_INTEGER,
      maxReferences: Number.MAX_SAFE_INTEGER,
      maxNodes: Number.MAX_SAFE_INTEGER,
      maxStringBytes: Number.MAX_SAFE_INTEGER,
      maxDepth: Number.MAX_SAFE_INTEGER,
    });
  }
}
export class BinaryLinoOptions {
  constructor(
    externalReferences = false,
    arity = new ArityRange(),
    packedWidths = false
  ) {
    Object.assign(this, { externalReferences, arity, packedWidths });
  }
  static ofPacket(packet) {
    let min = 2,
      max = 2;
    for (const [, link] of packet.links()) {
      min = Math.min(min, link.length);
      max = Math.max(max, link.length);
    }
    return new BinaryLinoOptions(
      packet.externalReferences,
      new ArityRange(min, max),
      new Set(packet.sections.map((s) => s.width)).size > 1
    );
  }
}
export class Section {
  constructor(gap, arity, width, links) {
    Object.assign(this, { gap: uint64(gap), arity, width, links });
  }
}
function referenceWidth(reference, external) {
  const value =
    reference instanceof External ? reference.value : uint64(reference);
  requireValue(
    !(reference instanceof External) || external,
    'external references disabled'
  );
  for (const width of WIDTHS)
    if (value < 1n << BigInt(width * 8 - Number(external))) return width;
  throw new RangeError('reference exceeds capacity');
}
function leb(out, input) {
  let value = uint64(input);
  while (value >= 128n) {
    out.push(Number(value & 127n) | 128);
    value >>= 7n;
  }
  out.push(Number(value));
}
/** Cursor reads a single packet without consuming any following packet. */
export class PacketReader {
  constructor(bytes, offset = 0) {
    requireValue(
      bytes instanceof Uint8Array &&
        Number.isSafeInteger(offset) &&
        offset >= 0 &&
        offset <= bytes.length,
      'invalid byte cursor'
    );
    this.bytes = bytes;
    this.offset = offset;
  }
  raw(width) {
    requireValue(
      width <= this.bytes.length - this.offset,
      'unexpected end of packet'
    );
    let result = 0n;
    for (let i = 0; i < width; i++)
      result |= BigInt(this.bytes[this.offset++]) << BigInt(i * 8);
    return result;
  }
  leb() {
    let value = 0n;
    for (let shift = 0n; shift < 64n; shift += 7n) {
      const byte = this.raw(1);
      requireValue(shift !== 63n || (byte & 127n) <= 1n, 'LEB128 overflow');
      value |= (byte & 127n) << shift;
      if (byte < 128n) return value;
    }
    throw new RangeError('LEB128 overflow');
  }
  read(limits = new DecodeLimits()) {
    if (this.offset === this.bytes.length) return null;
    const header = Number(this.raw(1));
    requireValue((header & 0xf0) === 0x10, 'unsupported binary version');
    const sections = [],
      counts = [];
    if (header & 2) {
      requireValue((header & 12) === 0, 'explicit header width bits set');
      const sectionCount = this.leb();
      requireValue(
        sectionCount <= BigInt(limits.maxLinks),
        'too many sections'
      );
      let address = 1n,
        total = 0n;
      for (let i = 0n; i < sectionCount; i++) {
        const shape = this.leb(),
          gap = shape & 4n ? this.leb() : 0n;
        const min = shape >> 4n,
          extra = shape & 8n ? this.leb() : null;
        const arity = new ArityRange(
          min,
          extra === null ? min : extra === 0n ? null : uint64(min + extra)
        );
        const count = this.leb();
        address = uint64(address + gap + count);
        total += count;
        requireValue(total <= BigInt(limits.maxLinks), 'too many links');
        sections.push(new Section(gap, arity, WIDTHS[Number(shape & 3n)], []));
        counts.push(Number(count));
      }
    } else {
      const count = this.leb();
      uint64(6n + count);
      requireValue(count <= BigInt(limits.maxLinks), 'too many links');
      if (count) {
        sections.push(
          new Section(5, new ArityRange(), WIDTHS[(header >> 2) & 3], [])
        );
        counts.push(Number(count));
      }
    }
    let references = 0n;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      for (let j = 0; j < counts[i]; j++) {
        const length = uint64(
          section.arity.min + (section.arity.fixed ? 0n : this.leb())
        );
        requireValue(section.arity.contains(length), 'link outside arity');
        references += length;
        requireValue(
          references <= BigInt(limits.maxReferences),
          'too many references'
        );
        const link = [],
          top = 1n << BigInt(section.width * 8 - 1);
        for (let k = 0n; k < length; k++) {
          const raw = this.raw(section.width);
          link.push(
            header & 1 && raw >= top
              ? new External(raw === top ? 0n : (top << 1n) - raw)
              : raw
          );
        }
        section.links.push(link);
      }
    }
    return new LinksPacket(Boolean(header & 1), sections);
  }
}
export class LinksPacket {
  constructor(externalReferences = false, sections = []) {
    Object.assign(this, { externalReferences, sections });
  }
  links() {
    const result = [];
    let address = 1n;
    for (const section of this.sections) {
      address = uint64(address + uint64(section.gap));
      for (const link of section.links) {
        result.push([
          address,
          link.map((r) => (r instanceof External ? r : uint64(r))),
        ]);
        address = uint64(address + 1n);
      }
    }
    return result;
  }
  validate(limits = new DecodeLimits()) {
    requireValue(
      this.sections.length <= limits.maxLinks &&
        this.links().length <= limits.maxLinks,
      'too many links or sections'
    );
    let references = 0;
    for (const s of this.sections) {
      requireValue(WIDTHS.includes(s.width), 'invalid width');
      new ArityRange(s.arity.min, s.arity.max);
      for (const link of s.links) {
        requireValue(s.arity.contains(link.length), 'link outside arity');
        references += link.length;
        requireValue(references <= limits.maxReferences, 'too many references');
        for (const r of link)
          requireValue(
            referenceWidth(r, this.externalReferences) <= s.width,
            'reference outside width'
          );
      }
    }
    return this;
  }
  toBytes(limits = new DecodeLimits()) {
    this.validate(limits);
    const s = this.sections[0];
    const compact =
      !s ||
      (this.sections.length === 1 &&
        s.gap === 5n &&
        s.arity.min === 2n &&
        s.arity.max === 2n &&
        s.links.length > 0);
    const out = [0x10 | Number(this.externalReferences)];
    if (compact) {
      out[0] |= WIDTHS.indexOf(s?.width ?? 1) << 2;
      leb(out, s?.links.length ?? 0);
    } else {
      out[0] |= 2;
      leb(out, this.sections.length);
      for (const s of this.sections) {
        leb(
          out,
          (s.arity.min << 4n) |
            BigInt(
              WIDTHS.indexOf(s.width) |
                (s.gap ? 4 : 0) |
                (s.arity.fixed ? 0 : 8)
            )
        );
        if (s.gap) leb(out, s.gap);
        if (!s.arity.fixed)
          leb(out, s.arity.max === null ? 0n : s.arity.max - s.arity.min);
        leb(out, s.links.length);
      }
    }
    for (const s of this.sections)
      for (const link of s.links) {
        if (!s.arity.fixed) leb(out, BigInt(link.length) - s.arity.min);
        for (const r of link) {
          const bits = BigInt(s.width * 8);
          let raw =
            r instanceof External
              ? r.value === 0n
                ? 1n << (bits - 1n)
                : (1n << bits) - r.value
              : uint64(r);
          for (let i = 0; i < s.width; i++) {
            out.push(Number(raw & 255n));
            raw >>= 8n;
          }
        }
      }
    return Uint8Array.from(out);
  }
  static fromBytes(bytes, limits = new DecodeLimits()) {
    const reader = new PacketReader(bytes),
      packet = reader.read(limits);
    requireValue(packet !== null, 'empty input');
    requireValue(reader.offset === bytes.length, 'trailing bytes');
    return packet;
  }
  static parseLinks(text) {
    return text
      .split(';')
      .filter((s) => s.trim())
      .map((entry) => {
        const [a, refs] = entry.split(':');
        return [
          uint64(BigInt(a.trim())),
          refs
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((r) =>
              r.startsWith('#')
                ? new External(BigInt(r.slice(1)))
                : uint64(BigInt(r))
            ),
        ];
      });
  }
  static pack(externalReferences, input, packedWidths = false) {
    const links = input.map(([a, r]) => [uint64(a), r]);
    let previous = 0n;
    const needs = links.map(([a, refs]) => {
      requireValue(
        a > previous && a < U64 && refs.length > 0,
        'invalid address order or empty link'
      );
      previous = a;
      return refs.reduce(
        (need, r) => Math.max(need, referenceWidth(r, externalReferences)),
        1
      );
    });
    function layout(packed) {
      if (!links.length) return [];
      const widest = needs.reduce((a, b) => Math.max(a, b), 1),
        opens = [],
        bests = [];
      let costs = Array(8).fill(Infinity);
      const cheapest = (c) =>
        c.reduce((best, v, s) => (v < c[best] ? s : best), 0);
      for (let i = 0; i < links.length; i++) {
        const best = cheapest(costs),
          before = i ? costs[best] : 0,
          next = Array(8).fill(Infinity);
        let mask = 0;
        bests.push(best);
        for (let state = 0; state < 8; state++) {
          const width = WIDTHS[state >> 1],
            variable = state & 1;
          if ((!packed && width !== widest) || width < needs[i]) continue;
          const opening = before + 2 + variable;
          const continuing =
            i &&
            links[i - 1][0] + 1n === links[i][0] &&
            (variable || links[i - 1][1].length === links[i][1].length)
              ? costs[state]
              : Infinity;
          if (continuing <= opening)
            next[state] = continuing + links[i][1].length * width + variable;
          else {
            next[state] = opening + links[i][1].length * width + variable;
            mask |= 1 << state;
          }
        }
        opens.push(mask);
        costs = next;
      }
      const result = [];
      let end = links.length,
        state = cheapest(costs);
      for (let i = links.length - 1; i >= 0; i--)
        if (opens[i] & (1 << state)) {
          result.push([end - i, WIDTHS[state >> 1]]);
          end = i;
          state = bests[i];
        }
      return result.reverse();
    }
    function packet(plan) {
      const sections = [];
      let index = 0,
        address = 1n;
      for (const [count, width] of plan) {
        const members = links.slice(index, index + count),
          start = members[0][0];
        let min = Infinity,
          max = 0;
        for (const [, r] of members) {
          min = Math.min(min, r.length);
          max = Math.max(max, r.length);
        }
        sections.push(
          new Section(
            start - address,
            new ArityRange(min, max),
            width,
            members.map(([, r]) => r)
          )
        );
        index += count;
        address = start + BigInt(count);
      }
      return new LinksPacket(externalReferences, sections);
    }
    const uniform = packet(layout(false));
    if (!packedWidths) return uniform;
    const packed = packet(layout(true));
    return packed.toBytes(DecodeLimits.unlimited()).length <
      uniform.toBytes(DecodeLimits.unlimited()).length
      ? packed
      : uniform;
  }
}
class Encoder {
  constructor(options) {
    this.options = options;
    this.doublets = [];
    this.tuples = [];
    this.created = new Map();
    this.powers = [['i', 1n]];
  }
  link(items) {
    const key = items.map(([k, v]) => `${k}${v}`).join(',');
    if (!this.created.has(key)) {
      const doublet = items.length === 2 && items.every(([k]) => k !== 't'),
        target = doublet ? this.doublets : this.tuples;
      const node = [doublet ? 'd' : 't', BigInt(target.length)];
      target.push(items);
      this.created.set(key, node);
    }
    return this.created.get(key);
  }
  chain(items) {
    let tail = ['i', 0n];
    for (let i = items.length - 1; i >= 0; i--)
      tail = this.link([items[i], tail]);
    return tail;
  }
  typed(marker, elements) {
    const items = [['i', BigInt(marker)], ...elements];
    return items.length !== 2 && this.options.arity.contains(items.length)
      ? this.link(items)
      : this.link([items[0], this.chain(elements)]);
  }
  list(elements) {
    if (!elements.length) return ['i', 0n];
    return elements.length === 2 || this.options.arity.contains(elements.length)
      ? this.link(elements)
      : this.typed(4, elements);
  }
  unary(value) {
    const powers = [];
    for (let bit = 63; bit >= 0; bit--)
      if (value & (1n << BigInt(bit))) {
        while (this.powers.length <= bit) {
          const p = this.powers.at(-1);
          this.powers.push(this.link([p, p]));
        }
        powers.push(this.powers[bit]);
      }
    let sum = powers.pop() ?? ['i', 0n];
    while (powers.length) sum = this.link([powers.pop(), sum]);
    return sum;
  }
  scalar(value) {
    return this.options.externalReferences && value < 1n << 63n
      ? ['e', value]
      : this.unary(value);
  }
  reference(text) {
    if (
      /^(0|[1-9][0-9]*)$/.test(text) &&
      text.length <= 20 &&
      BigInt(text) <= U64
    ) {
      const value = BigInt(text);
      return this.options.externalReferences && value < 1n << 63n
        ? ['e', value]
        : this.link([['i', 2n], this.unary(value)]);
    }
    return this.typed(
      3,
      Array.from(text, (c) => this.scalar(BigInt(c.codePointAt(0))))
    );
  }
  encode(node) {
    if (node.id !== null && !node.values.length) return this.reference(node.id);
    if (node.id !== null) {
      const id = this.reference(node.id);
      return this.typed(5, [id, ...node.values.map((v) => this.encode(v))]);
    }
    return this.list(node.values.map((v) => this.encode(v)));
  }
  finish() {
    const resolve = ([k, v]) =>
      k === 'e'
        ? new External(v)
        : k === 'i'
          ? v
          : 6n + v + (k === 't' ? BigInt(this.doublets.length) : 0n);
    return LinksPacket.pack(
      this.options.externalReferences,
      this.doublets
        .concat(this.tuples)
        .map((items, i) => [6n + BigInt(i), items.map(resolve)]),
      this.options.packedWidths
    );
  }
}
class Decoder {
  constructor(packet, limits) {
    packet.validate(limits);
    this.limits = limits;
    this.links = [];
    this.unary = [];
    this.nodes = limits.maxNodes;
    this.strings = limits.maxStringBytes;
    for (const [address, refs] of packet.links()) {
      requireValue(
        address === 6n + BigInt(this.links.length) &&
          refs.every((r) => r instanceof External || r < address),
        'document addresses must be contiguous and references backward'
      );
      const value = (r) =>
        r instanceof External
          ? null
          : r <= 1n
            ? r
            : r >= 6n
              ? this.unary[Number(r - 6n)]
              : null;
      const a = refs.length === 2 ? value(refs[0]) : null,
        b = refs.length === 2 ? value(refs[1]) : null;
      this.unary.push(a !== null && b !== null && a + b <= U64 ? a + b : null);
      this.links.push(refs);
    }
  }
  chain(tail) {
    const elements = [];
    while (tail !== 0n) {
      requireValue(typeof tail === 'bigint' && tail >= 6n, 'broken chain');
      const items = this.links[Number(tail - 6n)];
      requireValue(
        items.length === 2 && elements.length < this.limits.maxNodes,
        'broken or excessive chain'
      );
      elements.push(items[0]);
      tail = items[1];
    }
    return elements;
  }
  number(r) {
    const value =
      r instanceof External
        ? r.value
        : r <= 1n
          ? r
          : r >= 6n
            ? this.unary[Number(r - 6n)]
            : null;
    requireValue(value !== null, 'expected unary number');
    return value;
  }
  text(text) {
    this.strings -= new globalThis.TextEncoder().encode(text).length;
    requireValue(this.strings >= 0, 'string budget exceeded');
    return new Link(text);
  }
  decode(r, depth) {
    requireValue(
      depth < this.limits.maxDepth && --this.nodes >= 0,
      'node or depth budget exceeded'
    );
    if (r instanceof External) return this.text(String(r.value));
    if (r === 0n) return new Link();
    requireValue(r >= 6n, 'standalone marker');
    const items = this.links[Number(r - 6n)];
    let elements;
    if (typeof items[0] === 'bigint' && items[0] >= 1n && items[0] <= 5n) {
      const marker = Number(items[0]);
      elements =
        items.length !== 2 || marker === 2
          ? items.slice(1)
          : this.chain(items[1]);
      if (marker === 2) {
        requireValue(elements.length === 1, 'number needs one value');
        return this.text(String(this.number(elements[0])));
      }
      if (marker === 3) {
        const chars = [];
        let byteCount = 0;
        for (const e of elements) {
          const p = this.number(e);
          requireValue(
            p <= 0x10ffffn && !(p >= 0xd800n && p <= 0xdfffn),
            'invalid Unicode scalar'
          );
          const size = p <= 0x7fn ? 1 : p <= 0x7ffn ? 2 : p <= 0xffffn ? 3 : 4;
          requireValue(
            size <= this.strings - byteCount,
            'string budget exceeded'
          );
          byteCount += size;
          chars.push(String.fromCodePoint(Number(p)));
        }
        return this.text(chars.join(''));
      }
      if (marker === 5) {
        requireValue(elements.length > 0, 'identified needs id');
        const id = this.decode(elements[0], depth);
        requireValue(
          id.id !== null && !id.values.length,
          'id must be reference'
        );
        return new Link(
          id.id,
          elements.slice(1).map((e) => this.decode(e, depth + 1))
        );
      }
      requireValue(marker === 4, 'invalid typed marker');
    } else elements = items;
    return new Link(
      null,
      elements.map((e) => this.decode(e, depth + 1))
    );
  }
  document() {
    if (!this.links.length) return [];
    const root = this.links.at(-1);
    let elements;
    if (root.length === 2 && root[0] === 4n) elements = this.chain(root[1]);
    else {
      requireValue(
        !(typeof root[0] === 'bigint' && root[0] >= 1n && root[0] <= 5n),
        'root must be list'
      );
      elements = root;
    }
    return elements.map((e) => this.decode(e, 0));
  }
}
function canonical(node) {
  if (
    node.id === null &&
    node.values.length === 1 &&
    node.values[0].id !== null &&
    !node.values[0].values.length
  )
    return node.values[0];
  return new Link(node.id, node.values.map(canonical));
}
export function formatBinaryReference(text) {
  if (
    text &&
    !text.startsWith('#') &&
    !/[\p{White_Space}\u001c-\u001f\ufeff():"'`]/u.test(text)
  )
    return text;
  let choice = null;
  for (const quote of ["'", '"', '`'])
    if (!text.startsWith(quote)) {
      let longest = 0,
        run = 0;
      for (const c of text) {
        run = c === quote ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
      const count = (longest + 1) | 1;
      if (choice === null || count < choice.count) choice = { quote, count };
    }
  const delimiter = choice.quote.repeat(choice.count);
  return delimiter + text + delimiter;
}
export function formatBinaryDocument(document) {
  function nested(node, top = false) {
    if (node.id !== null && !node.values.length)
      return formatBinaryReference(node.id);
    const values = node.values.map((v) => nested(v)).join(' ');
    if (node.id !== null)
      return `(${formatBinaryReference(node.id)}: ${values})`;
    if (
      node.values.length === 1 &&
      node.values[0].id !== null &&
      !node.values[0].values.length
    )
      return `((${values}))`;
    return top && node.values.length >= 2 ? values : `(${values})`;
  }
  return document.map((n) => nested(n, true)).join('\n');
}
export class BinaryLinoCodec {
  constructor(options = new BinaryLinoOptions(), limits = new DecodeLimits()) {
    Object.assign(this, { options, limits });
  }
  encodePacket(document) {
    requireValue(this.options.arity.contains(2), 'arity must contain 2');
    const pending = document.map((n) => [n, 0]);
    let nodes = 0,
      strings = 0;
    while (pending.length) {
      const [n, depth] = pending.pop();
      requireValue(
        n instanceof Link && depth < this.limits.maxDepth,
        'invalid model or excessive depth'
      );
      nodes += 1 + Number(n.id !== null && n.values.length > 0);
      if (n.id !== null) {
        requireValue(
          typeof n.id === 'string' && n.id.isWellFormed(),
          'invalid Unicode string'
        );
        strings += new globalThis.TextEncoder().encode(n.id).length;
      }
      requireValue(
        nodes <= this.limits.maxNodes && strings <= this.limits.maxStringBytes,
        'model budget exceeded'
      );
      for (const v of n.values) pending.push([v, depth + 1]);
    }
    const encoder = new Encoder(this.options);
    if (document.length) encoder.list(document.map((n) => encoder.encode(n)));
    return encoder.finish().validate(this.limits);
  }
  encode(document) {
    return this.encodePacket(document).toBytes(this.limits);
  }
  decodePacket(packet) {
    return new Decoder(packet, this.limits).document();
  }
  decode(bytes) {
    return this.decodePacket(LinksPacket.fromBytes(bytes, this.limits));
  }
  parseDocument(text, parser = new Parser()) {
    return parser.parse(text).map(canonical);
  }
  formatDocument(document) {
    return formatBinaryDocument(document);
  }
  encodeText(text, parser) {
    return this.encode(this.parseDocument(text, parser));
  }
  decodeText(bytes) {
    return this.formatDocument(this.decode(bytes));
  }
}
