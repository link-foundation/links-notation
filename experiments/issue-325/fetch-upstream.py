"""Download the pinned, Unlicensed baseline used by the historical port scripts."""

from pathlib import Path
import subprocess

COMMIT = "6417179b0ce7669f482e50268f4a8bdb506bb034"
ROOT = Path(__file__).parent / "research"
PATHS = [
    "LICENSE",
    "docs/protocol/binary-links-notation.md",
    "docs/protocol/binary-links-notation-vectors.txt",
    "rust/tests/protocol_packet_tests.rs",
    *[f"rust/src/protocol/{name}.rs" for name in ["packet", "mapping", "format"]],
    *[
        f"csharp/Foundation.Data.Doublets.Cli.Library/Protocol/{name}.cs"
        for name in [
            "LinksPacket",
            "ArityRange",
            "LinoMapping",
            "LinoFormat",
            "SectionPlanner",
            "LinoProtocolException",
        ]
    ],
    *[
        f"csharp/Foundation.Data.Doublets.Cli.Tests/Protocol/{name}.cs"
        for name in ["BinaryLinksNotationTests", "LinoProtocolCodecTests"]
    ],
    "csharp/Foundation.Data.Doublets.Cli.Library/Protocol/LinoStreamReader.cs",
]

for source in PATHS:
    result = subprocess.run(
        [
            "gh",
            "api",
            f"repos/link-foundation/link-cli/contents/{source}?ref={COMMIT}",
            "-H",
            "Accept: application/vnd.github.raw+json",
        ],
        check=True,
        capture_output=True,
    )
    destination = ROOT / (
        "LinoStreamReader.cs" if source.endswith("LinoStreamReader.cs") else source
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(result.stdout)
    print(source)
