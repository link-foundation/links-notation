//! What a parse error says: the line, the column, what could have stood there
//! and the offending line with a caret under it.
//!
//! Run with `cargo run --example parse_error_positions`.

use links_notation::{parse_lino, ParseError};

fn main() {
    let documents = [
        "# ok line\n# break: two\nci_gate x\n  stage rust",
        "a: b: c",
        "a (b\n",
        "a b)\n",
    ];

    for document in documents {
        match parse_lino(document) {
            Ok(links) => println!("{document:?} parses as {links}\n"),
            Err(error) => {
                println!("{error}");
                if let ParseError::SyntaxError(syntax) = &error {
                    println!(
                        "  line {}, column {}, byte offset {}\n",
                        syntax.line, syntax.column, syntax.offset
                    );
                }
            }
        }
    }
}
