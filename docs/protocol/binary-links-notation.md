# Binary links notation, version 1

This repository owns the shared wire specification and
[golden vectors](binary-links-notation-vectors.txt). Version 1 consists of
an address-ordered **packet** layer (§1–§6) and a **LiNo mapping** (§7).
The packet layer also supports raw store links, including holes and
self-references; the document mapping imposes additional rules (§8).

The format and vectors originate in
[link-cli PR #106](https://github.com/link-foundation/link-cli/pull/106),
pinned at commit `6417179b0ce7669f482e50268f4a8bdb506bb034` (Unlicense).
The Rust and C# codecs in this repository are adapted from that implementation.
Existing version 1 packets and the 96 golden vectors retain their bytes.

## 1. Conventions

- **LEB128** means unsigned LEB128: 7 bits per byte, least significant group
  first, and the high bit set on every byte except the last. A value must fit
  in 64 bits.
- A **reference** is `width` bytes, little-endian, where `width` is 1, 2, 4
  or 8. The width is set per section (§3).
- An **address** is a link's position. `0` is null, and links are numbered
  from `1`.

## 2. Header byte

```text
bit  7 6 5 4   3 2      1          0
     0 0 0 1   width    explicit   external
     version   (log2)   layout     references
```

- **Version** is the high nibble. Version 1 is `0x1_`. A text LiNo message
  never starts with a byte in `0x10..=0x1F`, so the header also tells a
  binary packet apart from a text message. `0x2_` to `0xF_` are reserved.
- **External references** (bit 0): the top bit of every reference marks an
  external value (§5).
- **Explicit layout** (bit 1): section headers follow (§3.2). Otherwise the
  packet uses the compact layout (§3.1).
- **Width** (bits 2–3): the log2 of the reference width in the compact
  layout. The explicit layout must keep these bits clear.

## 3. Layouts and sections

A packet is a list of **sections**. A section has:

- a **gap**: how many addresses are skipped before it;
- an **arity range** `min..=max`: how many references each of its links holds;
- a **width**;
- its links.

The first section starts at address `1 + gap`, and every later section starts
at `previous end + gap`. So gaps leave holes in the address space, and a
packet can hold any ascending set of addresses.

### 3.1 Compact layout

```text
0x10 | external | width << 2
LEB128 N                       the number of links, all doublets
```

The compact layout is exactly one section with gap 5, arity 2 and the header
width. That is the common case of a LiNo document made of doublets, and it
costs just two header bytes. An empty packet is `10 00`, or `11 00` with
external references.

### 3.2 Explicit layout

```text
0x12 | external
LEB128 S                       the number of sections, then S section headers:
  LEB128 shape                 bits 0-1  log2 of the reference width
                               bit 2     a gap follows
                               bit 3     variable arity
                               bits 4+   min, at least 1
  LEB128 gap                   only when bit 2 is set; a gap of 0 is not written
  LEB128 extra                 only when bit 3 is set: 0 = no maximum, else max - min
  LEB128 count                 the number of links in the section
```

A section without the variable-arity bit has a fixed arity: every link holds
exactly `min` references.

### 3.3 Links

After the headers come the links, section by section and in address order.

- A link in a **fixed-arity** section is `min` references.
- A link in a **variable-arity** section is `LEB128 (length - min)` followed
  by `length` references. The length must lie in the section's range.

Each reference takes the width of its section.

### 3.4 Examples

These packets come from the `links` vectors. A section is written as
`address:references`, and `#v` is the external value `v`.

`1:1 1; 2:1 2 3; 3:2 2 2; 10:3 9` becomes
`12 03 20 01 30 02 24 06 01 01 01 01 02 03 02 02 02 03 09`:

| Bytes | Meaning |
|---|---|
| `12` | version 1, explicit layout |
| `03` | three sections |
| `20 01` | shape: min 2, fixed, 1-byte references; 1 link (address 1) |
| `30 02` | min 3, fixed, 1 byte; 2 links (addresses 2 and 3) |
| `24 06 01` | min 2, gap 6, 1 byte; 1 link at `3 + 1 + 6 = 10` |
| `01 01` | link 1 |
| `01 02 03` `02 02 02` | links 2 and 3 |
| `03 09` | link 10 |

`1:1; 2:1 1; 3:1 1 1; 4:1 1 1 1` becomes
`12 01 18 03 04 00 01 01 01 01 02 01 01 01 03 01 01 01 01`. The shape `18` is
min 1, variable arity and 1-byte references. `03` is the extra (max 4) and
`04` is the count. Every link starts with its length minus 1.

## 4. Widths

An internal reference `a` needs the narrowest width that holds `a`:

| Width | Plain addresses | With external references |
|---|---|---|
| 1 byte | `0..=255` | `0..=127` |
| 2 bytes | `0..=65 535` | `0..=32 767` |
| 4 bytes | `0..=2³²−1` | `0..=2³¹−1` |
| 8 bytes | `0..=2⁶⁴−1` | `0..=2⁶³−1` |

A section's width must hold every reference in it. A link never needs to be
wide because of its own address, only because of the references it holds.

## 5. External references

With bit 0 of the header set, a reference is either a link address or an
**external value**, exactly like `Platform.Data.Hybrid<T>`. At a width of
`w` bits:

- an external value `v ≥ 1` is stored as `2^w − v`, which is its
  two's-complement negation;
- an external `0` is stored as `2^(w−1)`;
- any raw value of `2^(w−1)` or more is external, and anything below it is an
  internal address.

An external value up to `2^(w−1) − 1` fits `w` bits, so it can be at most
2⁶³ − 1. Without external references, every reference is an internal address.

## 6. Packing

`pack(external_references, links, packed_widths)` lays out
`(address, references)` pairs given in ascending address order:

- A hole between two addresses always starts a new section.
- Links of one length can share a fixed-arity section. Links of differing
  lengths need a variable-arity section or separate sections.
- **Uniform widths** (the default) give every section the width of the widest
  reference in the packet, so all references have one size.
- **Packed widths** let each section take the narrowest width its own links
  need, and split sections wherever that saves bytes.

A linear dynamic program chooses the sections. Its state is the width and
whether the arity is fixed or variable, which makes eight states. A link
either continues the section of the previous link or opens a new one, at an
estimated cost of 2 bytes for a section header and 1 more byte for a
variable arity. With packed widths, `pack` also builds the uniform layout and
keeps the packed one only when it is strictly smaller. So **packed widths
never cost more than uniform ones.** Both ports break ties the same way, so
they produce identical bytes.

A packet whose only section matches §3.1 is written in the compact layout.

## 7. LiNo mapping

The binary LiNo protocol maps a LiNo document to links and packs them. It
uses only links, the way linksplatform represents data. Addresses `1` to `5`
are fixed **marker points** that are never transmitted, and links start at
`6`:

| Address | Meaning |
|---|---|
| `0` | null, the empty link `()` |
| `1` | `One`, the unary 1 |
| `2` | `Number`: `(Number unary)` is a non-negative integer |
| `3` | `String`: `(String code-points…)` is a Unicode string |
| `4` | `List`: `(List elements…)` is a list of links |
| `5` | `Identified`: `(Identified id values…)` is a link with an id |
| `6…` | the links of the document |

| LiNo | Links |
|---|---|
| `()` | `0` |
| number `n` | `(Number unary(n))`. `unary(0)` is null, `2^0` is `One`, `2^k` is `(2^(k-1) 2^(k-1))`, and other numbers are right-nested sums of powers of two from the highest bit down. With external references, `n` is the external value `n` instead |
| any other reference | `(String code-point…)`. Each code point is a unary number, or an external value with external references |
| a link of two values, no id | a doublet |
| a link of any other number of values, no id | a list |
| a link with an id | `(Identified id value…)` |
| the document | the list of its top-level links, stored last as the root |

A link of two values is always a doublet. A list or typed value of any
other length `n` becomes **one link** of `n` references when the arity range
contains `n`. That link is the bare elements for a list, or
`marker elements…` for a typed value. Otherwise it becomes the doublet
`(marker chain)`, where `chain` is the nil-terminated cons list
`(e1 (e2 (… (en 0))))`. Identical sub-links are written once and shared,
because links are content-addressed. Links are numbered so that each one
refers only to earlier ones: the doublets of plain doublets come first, then
the rest in creation order.

### 7.1 Options

Each option is off by default and can be switched on on its own:

| Option | Rust | C# | Effect |
|---|---|---|---|
| external references | `with_external_references(true)` | `WithExternalReferences()` | numbers and code points become external values (§5) |
| arity | `with_arity(ArityRange)` | `WithArity(ArityRange)` | the link lengths the encoder may use. The default, `2`, writes only doublets. `2..3` adds triplets, and `1..` allows any length. The range must contain 2 |
| packed widths | `with_packed_widths(true)` | `WithPackedWidths()` | per-section widths (§6) |

An arity is written `n`, `min..max` (inclusive) or `min..` (no maximum).

A decoder needs none of these encoder options: the packet announces its
reference interpretation, widths and link lengths. `BinaryLinoOptions::of_packet`
(Rust) or `BinaryLinoOptions.OfPacket` (C#) can infer a compatible encoding style.

Numeric references mean canonical unsigned decimal strings within `u64`: no
sign or leading zeros except `0`. Other strings, including `007`, negative or
fractional numbers, and values above `u64::MAX`, use the String marker. With
external references on, numbers above `2⁶³−1` fall back to Number/unary links.
Strings consist of Unicode scalar values, rather than UTF-8 bytes or UTF-16
code units; invalid Unicode strings are rejected by the document encoders.

For link-cli compatibility, the binary text helpers canonicalize parsed groups:
`a` and `(a)` become a reference, while `((a))` becomes a one-element list.
Rust uses `binary::parse_document`; C# uses `LinoFormat.ParseDocument`. The other
ports provide the same canonicalization through their codec parse helpers.
The low-level mapping and `BinaryLinoCodec.Encode` / `encode` accept the native
parser model directly and preserve its groups. They never canonicalize inputs.
The mapping can represent IDs without values. Rust and C# models distinguish
these from references and preserve them in binary. The other native models
represent an ID with no children as a reference, matching their text parsers;
`(a:)` is also read as a reference. Quoting, comments, layout and formatting-only
parser metadata are not stored. A binary round trip preserves the semantic
native model, including identifiers, empty references, groups, Unicode and
noncanonical numeric strings. It does not preserve the original text spelling.

### 7.2 Example

`() ((1 1))` with the defaults becomes
`10 07 02 01 06 06 07 00 04 08 00 09 0a 00 04 0b`, which is the compact layout
with 7 doublets of 1 byte each:

| Address | Link | Meaning |
|---|---|---|
| 6 | `02 01` | `(Number One)`, the number 1 |
| 7 | `06 06` | `(1 1)` |
| 8 | `07 00` | the chain `((1 1))` |
| 9 | `04 08` | `(List 8)`, the list `((1 1))` |
| 10 | `00 09` | `() ((1 1))` |
| 11 | `0a 00` | the chain of top-level links |
| 12 | `04 0b` | `(List 11)`, the document |

With arity `1..`, the two lists become single links and the packet becomes
`12 04 24 05 02 10 01 20 01 10 01 02 01 06 06 07 00 08 09`. That is four
fixed-arity sections: doublets 6 and 7 after the gap of 5, the one-element
list `8 = (7)`, the doublet `9 = (0 8)` and the document `10 = (9)`.

## 8. Decoding untrusted input

`from_bytes` / `FromBytes` consumes exactly one packet. Bytes after it, or a packet that ends early,
are an error. The decoder rejects:

- a header outside `0x10..=0x1F`, or an explicit layout with width bits set;
- a LEB128 value over 64 bits;
- a section shape with min 0, or an arity range that overflows;
- a link length outside its section's arity;
- addresses that overflow 64 bits.

`DecodeLimits` bounds the work a peer can cause:

| Limit | Default |
|---|---|
| links in a packet | 2²² |
| references in all links | 2²⁴ |
| LiNo nodes a packet expands to | 2²² |
| total UTF-8 bytes in expanded references and ids | 64 MiB |
| LiNo nesting depth | 64 |

The LiNo mapping also requires that:

- links are contiguous from address 6;
- each link refers only to earlier links;
- marker points do not decode as standalone LiNo values;
- numbers are well-formed unary values and code points are valid Unicode
  scalar values;
- the root is a list.

The codecs check limits for both byte input and manually constructed packets.
String limits count repeated references each time they appear in the decoded
model, including numeric references formatted as decimal text.
The encoders validate native models before entering recursive encoding.
The defaults allow depth 64 and 2²² nodes. All five budgets apply to encoding
and decoding and can be configured on the codec. Raising the depth limit
requires adequate stack space. Raw packet readers are iterative and have no
LiNo depth constraint. `unlimited` / `Unlimited` is for trusted input only.

## 9. Framing, mapping negotiation and compatibility

Version 1 has no magic prefix, length frame, checksum or compression. Its counts
make a packet self-delimiting. A transport may wrap it in a length/checksum or
compression frame and may concatenate packets using the packet stream reader.
C# callers must reuse the same `PacketReader` across reads to retain buffered
bytes. Framing and transport negotiation belong to the transport, not this
notation specification. No TCP, store or queue protocol is implemented here.

The version nibble identifies the packet grammar. For **document** packets,
version 1 implies exactly the marker-point mapping in §7; there is no mapping
flag in version 1. Raw-store packets use the same packet layer, so the enclosing
protocol must declare whether a packet contains raw links or a LiNo document.
A future document mapping requires a new version or a separately negotiated
envelope that names it. Readers reject unknown versions and must not reinterpret
version 1 bits. Only `0x10..0x1F` is reserved for detecting version 1 among text;
a future version needs an explicit protocol negotiation rule.

[links-queue's legacy LNKQ encoding](https://github.com/link-foundation/links-queue/blob/main/docs/BINARY-NOTATION-SPEC.md)
is a different wire format: a typed tree of inline values. It is not a version 1
packet or a second supported mapping. In particular, its SELF_REF representation
has an open spec/encoder discrepancy
([links-queue #51](https://github.com/link-foundation/links-queue/issues/51)).
This specification does not silently change those existing queue messages.
Queue consumers adopting version 1 must negotiate a new encoding, map their data
onto links, and may keep an outer queue frame. Typed inline literals are a
possible future mapping after their semantics and vectors are agreed.

## 10. APIs and conformance

Rust exports `links_notation::binary::{BinaryLinoCodec, BinaryLinoOptions,
LinksPacket, ArityRange, DecodeLimits}`. C# exports the corresponding types in
`Link.Foundation.Links.Notation.Binary`, with `LinoMapping` and `LinoFormat`
providing document and text helpers. Every supported language implements the
same packet grammar, marker mapping, deterministic packing and golden vectors.

| Language | Codec and packet entry points | Integer representation |
|---|---|---|
| Rust | `links_notation::binary` | `u64` |
| C# | `Link.Foundation.Links.Notation.Binary` | `ulong` |
| JavaScript / TypeScript | exports from `links-notation` | `bigint`; unsafe numeric inputs are rejected |
| Python | `links_notation.binary` (also re-exported by `links_notation`) | `int` constrained to unsigned 64-bit |
| Go | `lino.NewBinaryLinoCodec`, `LinksPacket`, `ReadPacket` | `uint64` |
| Java | `BinaryLinoCodec` and its public nested `Packet`, `Options`, `Limits`, `Reference`, `Section`, `ArityRange` types | `BigInteger` constrained to unsigned 64-bit |
| PHP | `LinkFoundation\LinksNotation\Binary` | decimal strings, using integer arithmetic without floats or an extension dependency |

Raw packet APIs expose sections, gaps, arity ranges, widths, internal and external
references. They can read consecutive packets without consuming the next packet
and distinguish clean EOF from truncation. JavaScript supplies a `PacketReader`
with an offset over `Uint8Array`; the other ports accept their native stream
interfaces. Complete-byte-array decoders reject trailing bytes. Encoding options
are independent; the defaults use internal references, doublets and uniform
widths. Decoding reads options from the packet, regardless of codec encoding
settings. `of_packet` / `ofPacket` / `OfPacket` / `OptionsOfPacket` infer compatible
options from a raw packet; re-encoding preserves semantics, not an arbitrary
original section layout.

`DecodeLimits` (Java: `Limits`) also bounds **encoding**, including native models
passed directly to the codec. Every port defaults to 2²² links, 2²⁴ references,
2²² expanded model nodes, 64 MiB of expanded UTF-8 string content, and depth 64.
Identifiers count as a model node when encoded as an identified group. Limits
are caller-configurable, including an explicit unlimited factory for trusted
input. Increasing depth still depends on the host runtime's available stack.
No process environment, global mutable switch or transport configuration is
needed. Normal text parser configuration remains available: pass its resulting
native `Link` model directly to binary encoding. Canonical parse helpers in
JavaScript, Python, Java and PHP also accept a caller-supplied parser.

```rust
use links_notation::binary::{parse_document, BinaryLinoCodec, BinaryLinoOptions};
let document = parse_document("() ((1 1))")?;
let codec = BinaryLinoCodec::with_options(
    BinaryLinoOptions::default().with_external_references(true)
);
let bytes = codec.encode(&document)?;
assert_eq!(codec.decode(&bytes)?, document);
```

```csharp
using Link.Foundation.Links.Notation.Binary;
var document = LinoFormat.ParseDocument("() ((1 1))");
var codec = new BinaryLinoCodec(new BinaryLinoOptions().WithExternalReferences());
var bytes = codec.Encode(document);
var decoded = codec.Decode(bytes);
```

The vector file is tab-separated, with hexadecimal bytes:

- `document<TAB>text<TAB>plain|external<TAB>arity<TAB>uniform|packed<TAB>hex`
- `links<TAB>address:refs;…<TAB>plain|external<TAB>uniform|packed<TAB>hex`

Text fields escape line breaks as literal `\n`; `#v` in a links field denotes
external value `v`. Empty document fields are intentional. All implementations
must decode these vectors. The supplied canonical encoders must also reproduce
their bytes; readers accept every valid layout, including less compact ones.
Packing is a deterministic heuristic, not a promise of global minimum size:
state order is width ascending, fixed before variable; equal costs keep the
first state and continue an existing section. Packed output wins only if its
actual byte length is strictly smaller than uniform output.

Each language's binary tests load this one vector file. They also round trip
native parser models under all twelve option combinations, enforce caller limits,
and cover malformed packets. Run the normal language test suite to include them.
[`examples/binary/`](../../examples/binary/README.md) compares all seven ports
byte for byte for all twelve option combinations; CI runs this check separately
from the language unit suites.
