# Lossless reference literals, version 1

Starting with Links Notation 0.24.0, all seven bindings support an explicit
UTF-8 literal for any reference identifier or value:

```ebnf
reference_literal = "~1{", { hex_digit, hex_digit }, "}" ;
hex_digit         = "0".."9" | "a".."f" | "A".."F" ;
```

The body is the hexadecimal encoding of the reference's UTF-8 bytes. Encoders
write lowercase hex; decoders accept either case. There is no whitespace
inside the literal. `~1{}` is the empty string, `~1{00}` is U+0000,
`~1{0d0a}` is CR followed by LF, and `~1{f09f9880}` is U+1F600.
The literal represents one reference, so it can appear before a link's colon,
inside a group, or in an indented link:

```text
(~1{}: ~1{00} ~1{0d0a} ~1{f09f9880})
```

UTF-8 must be well formed: incomplete sequences, overlong encodings, surrogate
code points, and values above U+10FFFF are errors. An odd hex length, a missing
closing brace, non-hex content, or any version other than exactly `1` is also
an error. Parsers refuse reserved malformed literals rather than returning
their spelling as a reference. Decoding preserves every scalar, including a
leading U+FEFF, combining marks, controls, line endings and whitespace. It
performs no trimming, newline conversion, or Unicode normalization.

## Formatting and compatibility

Native formatting and binary-to-text formatting share the same reference
encoder. They use literals for empty strings, C0 controls (U+0000–U+001F),
and DEL (U+007F). Other references retain readable bare or quoted spelling.
For quoting, the encoder chooses `'`, `"`, or a backtick different from the
first character, and uses an odd delimiter width greater than every run of
that delimiter in the body. The existing n-quote grammar then returns the
body exactly, even when it contains all three delimiters. Backslashes are
ordinary characters; they do not introduce escapes.

This is an explicitly versioned grammar extension. At a reference boundary,
the prefix `~` followed by one or more ASCII digits and `{` is reserved.
An existing reference such as `~1{61}` must now be written as `'~1{61}'` to
retain that spelling; unquoted `~1{61}` means `a`. Formatters automatically
quote these names. Existing quoted references, including legacy empty quote
pairs, still parse. The old ambiguous empty identifier spelling can span
another quote pair, so new formatters always write `~1{}` instead.

Upgrade readers to 0.24.0 before sending literals. Older parsers treat this
spelling as an ordinary reference and cannot decode its contents. The binary
packet version and its existing golden bytes remain unchanged: the codecs
store the decoded Unicode references, not the literal spelling.

Native strings must contain valid Unicode. Explicit literal encoders and text
formatters reject malformed UTF-8 or unpaired surrogates rather than replace
them. Go's existing string-returning formatter reports invalid UTF-8 by panic;
its explicit encoder returns an error. Rust's `str` already guarantees UTF-8.

## Public literal helpers

| Binding | Encode | Decode |
| --- | --- | --- |
| JavaScript | `encodeReferenceLiteral(text)` | `decodeReferenceLiteral(literal)` |
| Python | `encode_reference_literal(text)` | `decode_reference_literal(literal)` |
| Rust | `encode_reference_literal(text)` | `decode_reference_literal(literal)` |
| C# | `ReferenceLiteral.Encode(text)` | `ReferenceLiteral.Decode(literal)` |
| Go | `EncodeReferenceLiteral(text)` | `DecodeReferenceLiteral(literal)` |
| Java | `ReferenceLiteral.encode(text)` | `ReferenceLiteral.decode(literal)` |
| PHP | `ReferenceLiteral::encode($text)` | `ReferenceLiteral::decode($literal)` |

For arbitrary application text, use the explicit encoder when a predictable,
single-line spelling is useful. Native formatters also round-trip exact text:

```javascript
import { Link, Parser, encodeReferenceLiteral } from 'links-notation';

const body = ' He said "it\'s `ready`"\r\n';
const original = new Link('message', [new Link(body)]);
new Parser().parse(original.format()); // Same identifier and value.
new Parser().parse(`(message: ${encodeReferenceLiteral(body)})`); // Same model.
```

Run `node examples/reference-literals.mjs` for executable native, explicit
literal, stream and binary round trips. The shared exact-reference corpus is
[reference-literals.txt](reference-literals.txt); malformed inputs are in
[invalid-reference-literals.txt](invalid-reference-literals.txt). Every binding
tests identifiers, nested values, both encodings, every two-chunk split, and
binary decoding against these fixtures. The binary interoperability example
also compares identical bytes and formatted text across all seven bindings.
