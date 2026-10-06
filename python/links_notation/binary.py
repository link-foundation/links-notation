"""Binary links notation v1. See docs/protocol/binary-links-notation.md.

The packet layer is independent of the document mapping. Native Link models
are preserved; parse_document explicitly selects link-cli canonical groups.
All integers on the wire are unsigned 64-bit values.
"""

import io
import re
from dataclasses import dataclass, field
from typing import Optional

from .link import Link
from .parser import Parser

U64 = (1 << 64) - 1
WIDTHS = (1, 2, 4, 8)


def _require(condition, message):
    if not condition:
        raise ValueError(message)


def _u64(value):
    _require(isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= U64, "expected uint64")
    return value


@dataclass(frozen=True)
class External:
    """Hybrid external reference; bare integers denote internal addresses."""

    value: int

    def __post_init__(self):
        _u64(self.value)


@dataclass(frozen=True)
class ArityRange:
    min: int = 2
    max: Optional[int] = 2

    def __post_init__(self):
        _require(1 <= _u64(self.min) <= U64 >> 4, "invalid minimum arity")
        _require(self.max is None or _u64(self.max) >= self.min, "invalid maximum arity")

    def contains(self, length):
        return length >= self.min and (self.max is None or length <= self.max)

    @property
    def fixed(self):
        return self.min == self.max

    @classmethod
    def parse(cls, text):
        _require(re.fullmatch(r"[0-9]+(?:\.\.[0-9]*)?", text), "invalid arity")
        parts = text.split("..")
        return cls(int(parts[0]), int(parts[-1]) if parts[-1] else None)


@dataclass(frozen=True)
class DecodeLimits:
    """Work budgets applied to both byte/model input and encoding."""

    max_links: int = 1 << 22
    max_references: int = 1 << 24
    max_nodes: int = 1 << 22
    max_string_bytes: int = 64 << 20
    max_depth: int = 64

    def __post_init__(self):
        for value in vars(self).values():
            _u64(value)

    @classmethod
    def unlimited(cls):
        """For trusted input; caller must provide adequate memory/stack."""
        return cls(U64, U64, U64, U64, U64)


@dataclass(frozen=True)
class BinaryLinoOptions:
    external_references: bool = False
    arity: ArityRange = field(default_factory=ArityRange)
    packed_widths: bool = False

    @classmethod
    def of_packet(cls, packet):
        lengths = [2] + [len(link) for _, link in packet.links()]
        return cls(
            packet.external_references,
            ArityRange(min(lengths), max(lengths)),
            len({section.width for section in packet.sections}) > 1,
        )


@dataclass
class Section:
    gap: int
    arity: ArityRange
    width: int
    links: list


def _width(reference, external):
    value = reference.value if isinstance(reference, External) else _u64(reference)
    _require(not isinstance(reference, External) or external, "external reference disabled")
    for width in WIDTHS:
        bits = width * 8 - int(external or isinstance(reference, External))
        if value < 1 << bits:
            return width
    raise ValueError("reference exceeds capacity")


def _leb(out, value):
    value = _u64(value)
    while value >= 128:
        out.append((value & 127) | 128)
        value >>= 7
    out.append(value)


class _Reader:
    def __init__(self, stream):
        self.stream = stream

    def raw(self, count):
        chunks = bytearray()
        while len(chunks) < count:
            part = self.stream.read(count - len(chunks))
            _require(part, "unexpected end of packet")
            chunks.extend(part)
        return int.from_bytes(chunks, "little")

    def leb(self):
        value = 0
        for shift in range(0, 64, 7):
            byte = self.raw(1)
            payload = byte & 127
            _require(shift != 63 or payload <= 1, "LEB128 overflow")
            value |= payload << shift
            if byte < 128:
                return value
        raise ValueError("LEB128 overflow")


@dataclass
class LinksPacket:
    external_references: bool = False
    sections: list = field(default_factory=list)

    def links(self):
        result, address = [], 1
        for section in self.sections:
            address = _u64(address + _u64(section.gap))
            for link in section.links:
                result.append((address, list(link)))
                address = _u64(address + 1)
        return result

    def validate(self, limits=DecodeLimits()):
        _require(len(self.sections) <= limits.max_links, "too many sections")
        links = self.links()
        _require(len(links) <= limits.max_links, "too many links")
        references = 0
        for section in self.sections:
            _require(section.width in WIDTHS, "invalid reference width")
            # Also validate mutable in-memory sections/packets.
            ArityRange(section.arity.min, section.arity.max)
            for link in section.links:
                _require(section.arity.contains(len(link)), "link outside arity range")
                references += len(link)
                _require(references <= limits.max_references, "too many references")
                for reference in link:
                    _require(_width(reference, self.external_references) <= section.width, "reference outside width")
        return self

    def to_bytes(self, limits=DecodeLimits()):
        self.validate(limits)
        compact = not self.sections or (
            len(self.sections) == 1
            and self.sections[0].gap == 5
            and self.sections[0].arity == ArityRange()
            and bool(self.sections[0].links)
        )
        out = bytearray([0x10 | int(self.external_references)])
        if compact:
            width = self.sections[0].width if self.sections else 1
            out[0] |= WIDTHS.index(width) << 2
            _leb(out, sum(len(s.links) for s in self.sections))
        else:
            out[0] |= 2
            _leb(out, len(self.sections))
            for section in self.sections:
                _leb(
                    out,
                    section.arity.min << 4
                    | WIDTHS.index(section.width)
                    | (4 if section.gap else 0)
                    | (0 if section.arity.fixed else 8),
                )
                if section.gap:
                    _leb(out, section.gap)
                if not section.arity.fixed:
                    _leb(out, 0 if section.arity.max is None else section.arity.max - section.arity.min)
                _leb(out, len(section.links))
        for section in self.sections:
            for link in section.links:
                if not section.arity.fixed:
                    _leb(out, len(link) - section.arity.min)
                for reference in link:
                    if isinstance(reference, External):
                        value = (
                            (1 << (section.width * 8 - 1))
                            if reference.value == 0
                            else (1 << (section.width * 8)) - reference.value
                        )
                    else:
                        value = reference
                    out.extend(value.to_bytes(section.width, "little"))
        return bytes(out)

    def write_to(self, stream, limits=DecodeLimits()):
        data = self.to_bytes(limits)
        offset = 0
        while offset < len(data):
            written = stream.write(data[offset:])
            _require(written is not None and written > 0, "stream did not write data")
            offset += written

    @classmethod
    def read_from(cls, stream, limits=DecodeLimits()):
        """Read exactly one packet; None only at a clean end of stream."""
        first = stream.read(1)
        if not first:
            return None
        header = first[0]
        _require(header & 0xF0 == 0x10, "unsupported binary version")
        reader, sections, counts = _Reader(stream), [], []
        if header & 2:
            _require(header & 12 == 0, "explicit header width bits set")
            count = reader.leb()
            _require(count <= limits.max_links, "too many sections")
            address, total = 1, 0
            for _ in range(count):
                shape = reader.leb()
                gap = reader.leb() if shape & 4 else 0
                minimum = shape >> 4
                extra = reader.leb() if shape & 8 else None
                maximum = minimum if extra is None else (None if extra == 0 else _u64(minimum + extra))
                arity = ArityRange(minimum, maximum)
                count = reader.leb()
                address = _u64(address + gap + count)
                total += count
                _require(total <= limits.max_links, "too many links")
                sections.append(Section(gap, arity, WIDTHS[shape & 3], []))
                counts.append(count)
        else:
            count = reader.leb()
            _u64(6 + count)
            _require(count <= limits.max_links, "too many links")
            if count:
                sections.append(Section(5, ArityRange(), WIDTHS[(header >> 2) & 3], []))
                counts.append(count)
        references = 0
        for section, count in zip(sections, counts):
            for _ in range(count):
                length = section.arity.min + (0 if section.arity.fixed else reader.leb())
                _require(section.arity.contains(_u64(length)), "link outside arity range")
                references += length
                _require(references <= limits.max_references, "too many references")
                link = []
                for _ in range(length):
                    raw = reader.raw(section.width)
                    top = 1 << (section.width * 8 - 1)
                    link.append(
                        External(0 if raw == top else (1 << (section.width * 8)) - raw)
                        if header & 1 and raw >= top
                        else raw
                    )
                section.links.append(link)
        return cls(bool(header & 1), sections)

    @classmethod
    def from_bytes(cls, data, limits=DecodeLimits()):
        stream = io.BytesIO(data)
        packet = cls.read_from(stream, limits)
        _require(packet is not None, "empty input")
        _require(not stream.read(1), "trailing bytes")
        return packet

    @classmethod
    def parse_links(cls, text):
        links = []
        for entry in text.split(";"):
            if not entry.strip():
                continue
            address, refs = entry.split(":")
            links.append(
                (
                    _u64(int(address)),
                    [External(int(r[1:])) if r.startswith("#") else _u64(int(r)) for r in refs.split()],
                )
            )
        return links

    @classmethod
    def pack(cls, external_references, links, packed_widths=False):
        links = list(links)
        needs, previous = [], 0
        for address, refs in links:
            _require(previous < _u64(address) < U64, "addresses must ascend and leave space for end")
            _require(refs, "empty raw link")
            previous = address
            needs.append(max(_width(r, external_references) for r in refs))

        def layout(packed):
            if not links:
                return []
            widest, costs, opens, bests = max(needs), [float("inf")] * 8, [], []
            for index, (address, refs) in enumerate(links):
                best = min(range(8), key=lambda s: costs[s])
                bests.append(best)
                before = costs[best] if index else 0
                next_costs, mask = [float("inf")] * 8, 0
                for state in range(8):
                    width, variable = WIDTHS[state // 2], state % 2
                    if (not packed and width != widest) or width < needs[index]:
                        continue
                    opening = before + 2 + variable
                    continuing = (
                        costs[state]
                        if index
                        and links[index - 1][0] + 1 == address
                        and (variable or len(links[index - 1][1]) == len(refs))
                        else float("inf")
                    )
                    if continuing <= opening:
                        next_costs[state] = continuing + len(refs) * width + variable
                    else:
                        next_costs[state] = opening + len(refs) * width + variable
                        mask |= 1 << state
                opens.append(mask)
                costs = next_costs
            result, end, state = [], len(links), min(range(8), key=lambda s: costs[s])
            for index in range(len(links) - 1, -1, -1):
                if opens[index] & (1 << state):
                    result.append((end - index, WIDTHS[state // 2]))
                    end, state = index, bests[index]
            return list(reversed(result))

        def packet(plan):
            sections, index, address = [], 0, 1
            for count, width in plan:
                members = links[index : index + count]
                lengths = [len(refs) for _, refs in members]
                start = members[0][0]
                sections.append(
                    Section(
                        start - address,
                        ArityRange(min(lengths), max(lengths)),
                        width,
                        [list(refs) for _, refs in members],
                    )
                )
                index, address = index + count, start + count
            return cls(external_references, sections)

        uniform = packet(layout(False))
        if not packed_widths:
            return uniform
        packed = packet(layout(True))
        return (
            packed
            if len(packed.to_bytes(DecodeLimits.unlimited())) < len(uniform.to_bytes(DecodeLimits.unlimited()))
            else uniform
        )


class _Encoder:
    def __init__(self, options):
        self.options = options
        self.doublets, self.tuples, self.created = [], [], {}
        self.powers = [("i", 1)]

    def link(self, items):
        key = tuple(items)
        if key not in self.created:
            doublet = len(items) == 2 and all(kind != "t" for kind, _ in items)
            target = self.doublets if doublet else self.tuples
            node = ("d" if doublet else "t", len(target))
            target.append(list(items))
            self.created[key] = node
        return self.created[key]

    def chain(self, items):
        tail = ("i", 0)
        for head in reversed(items):
            tail = self.link([head, tail])
        return tail

    def typed(self, marker, elements):
        items = [("i", marker)] + elements
        return (
            self.link(items)
            if len(items) != 2 and self.options.arity.contains(len(items))
            else self.link([("i", marker), self.chain(elements)])
        )

    def list(self, elements):
        if not elements:
            return ("i", 0)
        if len(elements) == 2 or self.options.arity.contains(len(elements)):
            return self.link(elements)
        return self.typed(4, elements)

    def unary(self, value):
        powers = []
        for bit in range(63, -1, -1):
            if value & (1 << bit):
                while len(self.powers) <= bit:
                    self.powers.append(self.link([self.powers[-1], self.powers[-1]]))
                powers.append(self.powers[bit])
        if not powers:
            return ("i", 0)
        result = powers[-1]
        for power in reversed(powers[:-1]):
            result = self.link([power, result])
        return result

    def scalar(self, value):
        return ("e", value) if self.options.external_references and value < 1 << 63 else self.unary(value)

    def reference(self, text):
        if re.fullmatch(r"0|[1-9][0-9]*", text) and len(text) <= 20 and int(text) <= U64:
            value = int(text)
            if self.options.external_references and value < 1 << 63:
                return ("e", value)
            return self.link([("i", 2), self.unary(value)])
        return self.typed(3, [self.scalar(ord(c)) for c in text])

    def encode_identified(self, node):
        if node.id is not None and node.values:
            identifier = self.reference(node.id)
            return self.typed(5, [identifier] + [self.encode_identified(v) for v in node.values])
        if node.id is not None:
            return self.reference(node.id)
        return self.list([self.encode_identified(v) for v in node.values])

    def finish(self):
        def resolve(node):
            kind, value = node
            return (
                External(value)
                if kind == "e"
                else (value if kind == "i" else 6 + value + (len(self.doublets) if kind == "t" else 0))
            )

        links = [(6 + i, [resolve(n) for n in nodes]) for i, nodes in enumerate(self.doublets + self.tuples)]
        return LinksPacket.pack(self.options.external_references, links, self.options.packed_widths)


class _Decoder:
    def __init__(self, packet, limits):
        packet.validate(limits)
        self.limits = limits
        self.links, self.unary = [], []
        self.nodes, self.strings = limits.max_nodes, limits.max_string_bytes
        for address, refs in packet.links():
            _require(address == 6 + len(self.links), "document links must be contiguous from 6")
            _require(all(isinstance(r, External) or r < address for r in refs), "document contains forward reference")

            def value(r):
                if isinstance(r, External):
                    return None
                return r if r <= 1 else (self.unary[r - 6] if r >= 6 else None)

            a, b = (value(refs[0]), value(refs[1])) if len(refs) == 2 else (None, None)
            self.unary.append(a + b if a is not None and b is not None and a + b <= U64 else None)
            self.links.append(refs)

    def chain(self, tail):
        result = []
        while tail != 0:
            _require(isinstance(tail, int) and tail >= 6, "broken element chain")
            items = self.links[tail - 6]
            _require(len(items) == 2, "broken element chain")
            _require(len(result) < self.limits.max_nodes, "chain too long")
            result.append(items[0])
            tail = items[1]
        return result

    def number(self, reference):
        if isinstance(reference, External):
            return reference.value
        if reference <= 1:
            return reference
        value = self.unary[reference - 6] if reference >= 6 else None
        _require(value is not None, "expected unary number")
        return value

    def text(self, text):
        self.strings -= len(text.encode("utf-8"))
        _require(self.strings >= 0, "too many expanded string bytes")
        return Link(text)

    def decode(self, reference, depth):
        _require(depth < self.limits.max_depth, "nesting limit exceeded")
        self.nodes -= 1
        _require(self.nodes >= 0, "too many expanded nodes")
        if isinstance(reference, External):
            return self.text(str(reference.value))
        if reference == 0:
            return Link()
        _require(reference >= 6, "standalone marker")
        items = self.links[reference - 6]
        if isinstance(items[0], int) and 1 <= items[0] <= 5:
            marker = items[0]
            elements = items[1:] if len(items) != 2 or marker == 2 else self.chain(items[1])
            if marker == 2:
                _require(len(elements) == 1, "number needs one value")
                return self.text(str(self.number(elements[0])))
            if marker == 3:
                chars, byte_count = [], 0
                for e in elements:
                    p = self.number(e)
                    _require(p <= 0x10FFFF and not 0xD800 <= p <= 0xDFFF, "invalid Unicode scalar")
                    size = 1 if p <= 0x7F else 2 if p <= 0x7FF else 3 if p <= 0xFFFF else 4
                    _require(size <= self.strings - byte_count, "too many expanded string bytes")
                    byte_count += size
                    chars.append(chr(p))
                return self.text("".join(chars))
            if marker == 5:
                _require(elements, "identified link needs id")
                identifier = self.decode(elements[0], depth)
                _require(identifier.id is not None and not identifier.values, "id must be reference")
                return Link(identifier.id, [self.decode(e, depth + 1) for e in elements[1:]])
            _require(marker == 4, "invalid typed marker")
        else:
            elements = items
        return Link(None, [self.decode(e, depth + 1) for e in elements])

    def document(self):
        if not self.links:
            return []
        root = self.links[-1]
        if len(root) == 2 and root[0] == 4:
            elements = self.chain(root[1])
        else:
            _require(not (isinstance(root[0], int) and 1 <= root[0] <= 5), "root must be list")
            elements = root
        return [self.decode(e, 0) for e in elements]


def _canonical(node):
    if node.id is None and len(node.values) == 1 and node.values[0].id is not None and not node.values[0].values:
        return node.values[0]
    return Link(node.id, [_canonical(v) for v in node.values])


def format_reference(text):
    if text and not text.startswith("#") and not any(c.isspace() or c in "\ufeff():\"'`" for c in text):
        return text
    choices = []
    for quote in "'\"`":
        if text.startswith(quote):
            continue
        longest = max([len(m.group()) for m in re.finditer(re.escape(quote) + "+", text)] or [0])
        choices.append(((longest + 1) | 1, quote))
    count, quote = min(choices, key=lambda item: item[0])
    delimiter = quote * count
    return delimiter + text + delimiter


def format_document(document):
    def nested(node, top=False):
        if node.id is not None and not node.values:
            return format_reference(node.id)
        values = " ".join(nested(v) for v in node.values)
        if node.id is not None:
            return "(" + format_reference(node.id) + ": " + values + ")"
        if len(node.values) == 1 and node.values[0].id is not None and not node.values[0].values:
            return "((" + values + "))"
        return values if top and len(node.values) >= 2 else "(" + values + ")"

    return "\n".join(nested(n, True) for n in document)


class BinaryLinoCodec:
    def __init__(self, options=None, limits=None):
        self.options = options or BinaryLinoOptions()
        self.limits = limits or DecodeLimits()

    def encode_packet(self, document):
        _require(self.options.arity.contains(2), "arity must contain 2")
        pending = [(node, 0) for node in document]
        nodes, strings = 0, 0
        while pending:
            node, depth = pending.pop()
            _require(isinstance(node, Link), "expected Link model")
            _require(depth < self.limits.max_depth, "nesting limit exceeded")
            nodes += 1 + int(node.id is not None and bool(node.values))
            if node.id is not None:
                _require(isinstance(node.id, str), "reference must be string")
                strings += len(node.id.encode("utf-8"))
            _require(nodes <= self.limits.max_nodes, "too many nodes")
            _require(strings <= self.limits.max_string_bytes, "too many string bytes")
            pending.extend((v, depth + 1) for v in node.values)
        encoder = _Encoder(self.options)
        if document:
            encoder.list([encoder.encode_identified(node) for node in document])
        return encoder.finish().validate(self.limits)

    def encode(self, document):
        return self.encode_packet(document).to_bytes(self.limits)

    def decode_packet(self, packet):
        return _Decoder(packet, self.limits).document()

    def decode(self, data):
        return self.decode_packet(LinksPacket.from_bytes(data, self.limits))

    @staticmethod
    def parse_document(text, parser=None):
        return [_canonical(n) for n in (parser or Parser()).parse(text)]

    @staticmethod
    def format_document(document):
        return format_document(document)

    def encode_text(self, text, parser=None):
        return self.encode(self.parse_document(text, parser))

    def decode_text(self, data):
        return format_document(self.decode(data))
