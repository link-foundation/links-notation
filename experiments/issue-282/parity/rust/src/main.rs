//! Print what the Rust implementation makes of the document.

fn main() {
    let document = include_str!("../../document.lino");
    let links = links_notation::parse_lino_to_links(document).expect("the document should parse");
    println!("{}", links_notation::format_links(&links));
}
