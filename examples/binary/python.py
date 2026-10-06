"""Byte interoperability with every supported language (run from repository root)."""
from links_notation.binary import ArityRange, BinaryLinoCodec, BinaryLinoOptions

from pathlib import Path

CORPUS = (Path(__file__).parent / "corpus.txt").read_text().removesuffix("\n").split("\n")
for source in CORPUS:
    text = source.replace("\\n", "\n")
    document = BinaryLinoCodec.parse_document(text)
    for external in (False, True):
        for arity in ("2", "2..3", "1.."):
            for packed in (False, True):
                codec = BinaryLinoCodec(BinaryLinoOptions(external, ArityRange.parse(arity), packed))
                data = codec.encode(document)
                decoded = codec.decode(data)
                assert decoded == document
                print(data.hex(" ") + "\t" + codec.format_document(decoded).replace("\n", "\\n"))
