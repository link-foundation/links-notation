//! Encode and decode the same corpus as examples/binary/csharp/Program.cs.
use links_notation::binary::{
    format_document, parse_document, ArityRange, BinaryLinoCodec, BinaryLinoOptions, BinaryResult,
};

fn main() -> BinaryResult<()> {
    let corpus = include_str!("../../../examples/binary/corpus.txt");
    for source in corpus.split_terminator('\n') {
        let text = source.replace("\\n", "\n");
        let document = parse_document(&text)?;
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
                    let formatted = format_document(&decoded);
                    assert_eq!(parse_document(&formatted)?, document);
                    let hex = bytes
                        .iter()
                        .map(|byte| format!("{byte:02x}"))
                        .collect::<Vec<_>>()
                        .join(" ");
                    println!("{hex}\t{}", formatted.replace('\n', "\\n"));
                }
            }
        }
    }
    Ok(())
}
