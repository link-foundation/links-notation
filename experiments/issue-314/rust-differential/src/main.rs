//! Reads one document per line of stdin, with line breaks written as `\n` (as
//! printed by `random-documents.mjs`), and prints what `parse_lino_to_links`
//! and `parse_document` make of it.
//! Build it against two versions of the parser and diff the outputs.
use links_notation::parse_lino_to_links;
use links_notation::parser::parse_document;
use std::io::{self, BufRead, Write};

fn main() {
    let stdin = io::stdin();
    let mut out = io::BufWriter::new(io::stdout());
    for line in stdin.lock().lines() {
        let document = line.unwrap().replace("\\n", "\n");
        let links = match parse_lino_to_links(&document) {
            Ok(links) => links
                .iter()
                .map(|l| l.to_string())
                .collect::<Vec<_>>()
                .join(" | "),
            Err(e) => format!("ERR {e}"),
        };
        let low = match parse_document(&document) {
            Ok((rest, links)) => format!("{rest:?} {links:?}"),
            Err(e) => format!("ERR {e:?}"),
        };
        writeln!(out, "{document:?}\n  {links}\n  {low}").unwrap();
    }
}
