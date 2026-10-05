//! Encode and decode the same corpus as examples/binary/csharp/Program.cs.
use links_notation::binary::{
    format_document, parse_document, ArityRange, BinaryLinoCodec, BinaryLinoOptions, BinaryResult,
};

fn main() -> BinaryResult<()> {
    let corpus = [
        "",
        "() ((1 1))",
        "(child: father mother)",
        "('😀' 007 18446744073709551615)",
        "'#tag'\n((a))",
        "(70000 1)",
    ];
    for text in corpus {
        let document = parse_document(text)?;
        for external_references in [false, true] {
            for arity in [
                ArityRange::DOUBLETS,
                ArityRange::between(2, 3),
                ArityRange::at_least(1),
            ] {
                for packed_widths in [false, true] {
                    let codec = BinaryLinoCodec::with_options(BinaryLinoOptions {
                        external_references,
                        arity,
                        packed_widths,
                    });
                    let bytes = codec.encode(&document)?;
                    let decoded = codec.decode(&bytes)?;
                    assert_eq!(decoded, document);
                    let hex = bytes
                        .iter()
                        .map(|byte| format!("{byte:02x}"))
                        .collect::<Vec<_>>()
                        .join(" ");
                    println!("{hex}\t{}", format_document(&decoded).replace('\n', "\\n"));
                }
            }
        }
    }
    Ok(())
}
