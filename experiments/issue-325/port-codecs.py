"""Port the transport-independent codecs from the pinned link-cli sources."""

from pathlib import Path

root = Path(__file__).parent / "research"

if Path("rust/links-notation/src/binary").exists():
    raise SystemExit(
        "Historical baseline port: use a fresh checkout before implementation."
    )


def rename(text):
    for old, new in [
        ("LinoProtocolErrorKind", "BinaryErrorKind"),
        ("LinoProtocolException", "BinaryNotationException"),
        ("ProtocolError", "BinaryError"),
        ("ProtocolResult", "BinaryResult"),
        ("crate::protocol", "crate::binary"),
        ("use links_notation::", "use crate::"),
        (
            "Foundation.Data.Doublets.Cli.Protocol",
            "Link.Foundation.Links.Notation.Binary",
        ),
        ("link_cli::protocol", "links_notation::binary"),
        ("BinaryLinoProtocol", "BinaryLinoCodec"),
    ]:
        text = text.replace(old, new)
    return text


out = Path("rust/links-notation/src/binary")
out.mkdir(exist_ok=True)
for name in ["packet", "mapping", "format"]:
    text = (root / f"rust/src/protocol/{name}.rs").read_text()
    if name == "packet":
        text = text.replace(
            "//! protocol ([`crate::protocol::encode_document`]) and the store archive\n//! ([`crate::protocol::archive`]) are two uses of it.",
            "//! mapping ([`crate::binary::encode_document`]) is one use of it.",
        )
        text = text.replace(
            "    /// Maximum size of a text message in bytes.\n    pub max_text_bytes: usize,\n",
            "",
        )
        text = text.replace(
            "            max_depth: 1024,\n            max_text_bytes: 64 << 20,",
            "            max_depth: 64,",
        )
        text = text.replace("            max_text_bytes: usize::MAX,\n", "")
        text = text.replace(
            "in as few bytes as the format allows.",
            "using the version 1 section planner.",
        )
    (out / f"{name}.rs").write_text(rename(text))

out = Path("csharp/Link.Foundation.Links.Notation/Binary")
out.mkdir(exist_ok=True)
headers = "using System;\nusing System.Collections.Generic;\nusing System.IO;\nusing System.Linq;\n"
for name in [
    "LinksPacket",
    "ArityRange",
    "LinoMapping",
    "LinoFormat",
    "SectionPlanner",
    "LinoProtocolException",
]:
    text = (
        root / f"csharp/Foundation.Data.Doublets.Cli.Library/Protocol/{name}.cs"
    ).read_text()
    if name == "LinksPacket":
        text = text.replace(
            "    /// <summary>Maximum size of a text message in bytes.</summary>\n    public long MaxTextBytes { get; init; } = 64L << 20;\n\n",
            "",
        )
        text = text.replace(" = 1024;", " = 64;").replace(
            "        MaxTextBytes = long.MaxValue,\n", ""
        )
        text = text.replace(
            "in as few bytes as the format allows.",
            "using the version 1 section planner.",
        )
    text = text.replace("LinoStreamReader", "PacketReader")
    text = text.replace(
        "LiNo network protocols (issue #105)", "binary links notation codecs"
    )
    text = text.replace(
        "    /// <summary>The server answered with an <c>(error: …)</c> document.</summary>\n    Remote,\n",
        "",
    )
    text = text.replace('        LinoProtocolErrorKind.Remote => "server error",\n', "")
    (
        out
        / f'{"BinaryNotationException" if name == "LinoProtocolException" else name}.cs'
    ).write_text(headers + rename(text))

text = (root / "LinoStreamReader.cs").read_text()
start = text.index("    /// <summary>\n    /// Appends bytes")
end = text.index("    private bool Fill()", start)
text = text[:start] + text[end:]
text = text.replace("LinoStreamReader", "PacketReader")
text = text.replace(
    "A buffered byte reader that can peek at the next byte, so a server can\n/// tell a text message from a binary one before reading it.",
    "A buffered reader for consecutive binary packets. Reuse it across reads\n/// so bytes buffered from the following packet remain available.",
)
text = text.replace(
    "        _stream = stream;",
    "        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(bufferSize);\n        _stream = stream;",
)
(out / "PacketReader.cs").write_text(headers + rename(text))
# Fix the test-port replacement order.
for path in Path("csharp/Link.Foundation.Links.Notation.Tests").glob("Binary*Tests.cs"):
    path.write_text(path.read_text().replace("LinoBinaryErrorKind", "BinaryErrorKind"))
