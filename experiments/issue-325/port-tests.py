"""Adapt the pinned link-cli conformance suites; run before adding the codecs."""

from pathlib import Path

root = Path(__file__).parent / "research"

if Path("rust/links-notation/tests/binary_notation_tests.rs").exists():
    raise SystemExit(
        "Historical baseline port: use a fresh checkout before implementation."
    )


def rename(text):
    for old, new in [
        ("link_cli::protocol", "links_notation::binary"),
        ("BinaryLinoProtocol", "BinaryLinoCodec"),
        ("LinoProtocolErrorKind", "BinaryErrorKind"),
        ("ProtocolError", "BinaryError"),
        ("ProtocolResult", "BinaryResult"),
        (
            "Foundation.Data.Doublets.Cli.Protocol",
            "Link.Foundation.Links.Notation.Binary",
        ),
        (
            "Foundation.Data.Doublets.Cli.Tests.Protocol",
            "Link.Foundation.Links.Notation.Tests.Binary",
        ),
        ("LinoProtocolException", "BinaryNotationException"),
        ("LinoProtocolErrorKind", "BinaryErrorKind"),
        ("LinoProtocolCodecTests", "BinaryLinoCodecTests"),
    ]:
        text = text.replace(old, new)
    return text


text = (root / "rust/tests/protocol_packet_tests.rs").read_text()
text = text.replace(
    "mod common;\n\nuse common::binary_options;\nuse link_cli::external_reference;\n",
    "",
)
text = text.replace("    read_any_document, ", "    ").replace(
    "    LinksPacket, LinoConnection, LinoProtocol, MessageFormat, ProtocolError, Reference, Section,\n    TextLinoProtocol,",
    "    LinksPacket, ProtocolError, Reference, Section,",
)
text = text.replace("../../docs/protocol/", "../../../docs/protocol/")
start = text.index("    for value in [0u32, 1, 5, 1000, i32::MAX as u32]")
end = text.index("\n}\n", start)
text = text[:start] + text[end:]
start = text.index("#[test]\nfn text_messages_are_dot_stuffed")
hiccup = text.index("/// Fails once with", start)
text = text[:start] + text[hiccup:]
start = text.index("#[test]\nfn connections_decorate_any_byte_stream")
end = text.index("#[test]\nfn every_short_reference_over_delimiters_round_trips", start)
text = text[:start] + text[end:]
text = text[: text.index("#[test]\nfn deeply_nested_text_parses_in_linear_time")]
text += """fn binary_options() -> Vec<BinaryLinoOptions> {
    let mut options = Vec::new();
    for external_references in [false, true] {
        for arity in [ArityRange::DOUBLETS, ArityRange::between(2, 3), ArityRange::at_least(1)] {
            for packed_widths in [false, true] {
                options.push(BinaryLinoOptions { external_references, arity, packed_widths });
            }
        }
    }
    options
}

#[test]
fn comment_references_survive_binary_and_text_round_trips() {
    for reference in ["#", "#tag", "# with space", "issue#1047"] {
        let document = vec![links_notation::LiNo::Ref(reference.into())];
        let codec = BinaryLinoCodec::new();
        let decoded = codec.decode(&codec.encode(&document).unwrap()).unwrap();
        assert_eq!(decoded, document);
        assert_eq!(parse_document(&format_document(&decoded)).unwrap(), document);
    }
}
"""
Path("rust/links-notation/tests/binary_notation_tests.rs").write_text(
    rename(text).replace(
        "//! Binary and text LiNo protocol codecs (issue #105).",
        "//! Shared binary links notation conformance tests, adapted from link-cli.",
    )
)

headers = "using System;\nusing System.Collections.Generic;\nusing System.IO;\nusing System.Linq;\nusing Xunit;\n"
text = (
    (
        root
        / "csharp/Foundation.Data.Doublets.Cli.Tests/Protocol/BinaryLinksNotationTests.cs"
    )
    .read_text()
    .replace("using Platform.Data;\n", "")
)
start = text.index("        foreach (var value in new uint[]")
end = text.index("\n    }", start)
text = text[:start] + text[end:]
Path(
    "csharp/Link.Foundation.Links.Notation.Tests/BinaryLinksNotationTests.cs"
).write_text(headers + rename(text))
text = (
    root
    / "csharp/Foundation.Data.Doublets.Cli.Tests/Protocol/LinoProtocolCodecTests.cs"
).read_text()
text = text[: text.index("    [Fact]\n    public void TextMessagesAreDotStuffed()")]
text += """    [Fact]
    public void CommentReferencesSurviveBinaryAndTextRoundTrips()
    {
        foreach (var reference in new[] { "#", "#tag", "# with space", "issue#1047" })
        {
            var document = new[] { LinoFormat.Reference(reference) };
            var codec = new BinaryLinoCodec();
            var decoded = codec.Decode(codec.Encode(document));
            Assert.Equal(document, decoded);
            Assert.Equal(document, Parse(LinoFormat.FormatDocument(decoded)));
        }
    }
}
"""
Path("csharp/Link.Foundation.Links.Notation.Tests/BinaryLinoCodecTests.cs").write_text(
    headers + rename(text)
)
Path("docs/protocol").mkdir(parents=True, exist_ok=True)
Path("docs/protocol/binary-links-notation-vectors.txt").write_text(
    (root / "docs/protocol/binary-links-notation-vectors.txt").read_text()
)
