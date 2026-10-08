from pathlib import Path

import pytest

from links_notation import (
    FormatConfig,
    Link,
    Parser,
    StreamParser,
    decode_reference_literal,
    encode_reference_literal,
    format_binary_reference,
    format_links,
)
from links_notation.binary import BinaryLinoCodec

REFERENCES = [
    "" if line == "-" else bytes.fromhex(line).decode("utf-8")
    for line in (Path(__file__).resolve().parents[2] / "docs/protocol/reference-literals.txt").read_text().splitlines()
    if not line.startswith("#")
]


def test_native_reference_fidelity():
    for reference in REFERENCES:
        original = [Link(reference, [Link(reference), Link("nested", [Link(reference)])])]
        for less_parentheses in (False, True, FormatConfig(max_inline_refs=1, prefer_inline=False)):
            assert Parser().parse(format_links(original, less_parentheses)) == original


def test_reference_literals_at_every_chunk_split():
    for reference in REFERENCES:
        assert decode_reference_literal(encode_reference_literal(reference)) == reference
        for literal in (
            Link.escape_reference(reference),
            format_binary_reference(reference),
            encode_reference_literal(reference),
        ):
            text = f"(root: {literal})\n({literal}: fixture)"
            expected = [Link("root", [Link(reference)]), Link(reference, [Link("fixture")])]
            assert Parser().parse(text) == expected
            for split in range(len(text) + 1):
                stream = StreamParser()
                stream.write(text[:split])
                stream.write(text[split:])
                assert stream.finish() == expected


def test_binary_reference_fidelity():
    codec = BinaryLinoCodec()
    for reference in REFERENCES:
        original = [Link(reference, [Link(reference)])]
        decoded = codec.decode(codec.encode(original))
        assert decoded == original
        assert codec.parse_document(codec.format_document(decoded)) == original


def test_malformed_reference_literals_are_rejected():
    invalid = (
        (Path(__file__).resolve().parents[2] / "docs/protocol/invalid-reference-literals.txt").read_text().splitlines()
    )
    for literal in invalid:
        if literal.startswith("#"):
            continue
        with pytest.raises(ValueError):
            decode_reference_literal(literal)
        with pytest.raises(Exception):
            Parser().parse(literal)
    assert decode_reference_literal("~1{C3A9}") == "é"
    with pytest.raises(UnicodeEncodeError):
        encode_reference_literal("\ud800")
    with pytest.raises(UnicodeEncodeError):
        Link.escape_reference("\ud800")
