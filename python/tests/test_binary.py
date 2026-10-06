"""Shared binary vectors and native text-model parity (issue 325)."""

from pathlib import Path

import pytest

from links_notation import Link, Parser
from links_notation.binary import ArityRange, BinaryLinoCodec, BinaryLinoOptions, DecodeLimits, LinksPacket


def test_string_budget_stops_decoding_before_later_scalars():
    data = bytes.fromhex("13024605011001030000009fffffff9effffff0028ffff06")
    with pytest.raises(ValueError, match="string bytes"):
        BinaryLinoCodec(limits=DecodeLimits(max_string_bytes=1)).decode(data)


def test_shared_vectors():
    count = 0
    for line in (
        (Path(__file__).parents[2] / "docs/protocol/binary-links-notation-vectors.txt").read_text().splitlines()
    ):
        if not line or line.startswith("#"):
            continue
        fields = line.split("\t")
        expected = bytes.fromhex(fields[-1])
        if fields[0] == "document":
            codec = BinaryLinoCodec(
                BinaryLinoOptions(fields[2] == "external", ArityRange.parse(fields[3]), fields[4] == "packed")
            )
            document = codec.parse_document(fields[1].replace("\\n", "\n"))
            assert codec.encode(document) == expected, line
            assert codec.decode(expected) == document, line
        else:
            links = LinksPacket.parse_links(fields[1])
            packet = LinksPacket.pack(fields[2] == "external", links, fields[3] == "packed")
            assert packet.to_bytes() == expected, line
            assert LinksPacket.from_bytes(expected).links() == links, line
        count += 1
    assert count == 96


@pytest.mark.parametrize(
    "source",
    [
        "",
        "()",
        '""',
        "a",
        "(a)",
        "((a))",
        "(a b c)",
        '("": () "" (b))',
        "a:\n  b\n  c",
        '"#x" "λ😀" "007" "18446744073709551615"',
        "# comment\n(a # tail\n b)",
    ],
)
def test_native_text_model_round_trip(source):
    document = Parser().parse(source)
    for external in (False, True):
        for arity in ("2", "2..3", "1.."):
            for packed in (False, True):
                codec = BinaryLinoCodec(BinaryLinoOptions(external, ArityRange.parse(arity), packed))
                assert codec.decode(codec.encode(document)) == document


def test_limits_and_malformed_packets():
    document = [Link(None, [Link("abcdef")])]
    bytes_ = BinaryLinoCodec().encode(document)
    for limits in (
        DecodeLimits(max_nodes=1),
        DecodeLimits(max_string_bytes=2),
        DecodeLimits(max_depth=1),
        DecodeLimits(max_links=1),
        DecodeLimits(max_references=1),
    ):
        with pytest.raises(ValueError):
            BinaryLinoCodec(limits=limits).decode(bytes_)
        with pytest.raises(ValueError):
            BinaryLinoCodec(limits=limits).encode(document)
    for bytes_ in (b"", b"\x20", b"\x1e\x00", b"\x10\x01", b"\x10\x00\x00", b"\x10" + b"\xff" * 10):
        with pytest.raises(ValueError):
            BinaryLinoCodec().decode(bytes_)


def test_packet_stream_boundaries_uint64_and_every_truncated_prefix():
    from io import BytesIO

    for external, references in [(False, "0 18446744073709551615"), (True, "#0 #9223372036854775807")]:
        links = LinksPacket.parse_links("6:" + references)
        packet = LinksPacket.pack(external, links, True)
        data = packet.to_bytes()
        stream = BytesIO(data + data)
        assert LinksPacket.read_from(stream).links() == links
        assert stream.tell() == len(data)
        assert LinksPacket.read_from(stream).links() == links
        assert LinksPacket.read_from(stream) is None
        for end in range(len(data)):
            with pytest.raises(ValueError):
                LinksPacket.from_bytes(data[:end])
    document = [Link("leaf")]
    for _ in range(70):
        document = [Link(None, document)]
    with pytest.raises(ValueError):
        BinaryLinoCodec().encode(document)
    codec = BinaryLinoCodec(limits=DecodeLimits(max_depth=80))
    assert codec.decode(codec.encode(document)) == document
