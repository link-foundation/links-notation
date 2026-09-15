//! Line comments: `#` hides the rest of its line, unless it sits inside a token
//! or inside a delimited reference. Parsers accept comments by default and can
//! be told to treat `#` as an ordinary character again.
//!
//! Run with `cargo run --example comments`.

use links_notation::{parse_lino, parse_lino_with_config, ParserConfig};

fn main() {
    let documents = [
        "# a note about the document\ndeploy: staging\n",
        "deploy: staging # only staging, for now\n",
        "issue#1047: open\n",
        "\"# not a comment\": still a reference\n",
        "parent\n  # what the child is for\n  child\n",
    ];

    for document in documents {
        match parse_lino(document) {
            Ok(links) => println!("{document:?}\n  parses as {links}"),
            Err(error) => println!("{document:?}\n  {error}"),
        }
    }

    // Documents that predate comments can be read with `#` as an ordinary
    // character.
    let config = ParserConfig::without_comments();
    let document = "# a b\n";
    match parse_lino_with_config(document, &config) {
        Ok(links) => println!("\nwithout comments {document:?}\n  parses as {links}"),
        Err(error) => println!("\nwithout comments {document:?}\n  {error}"),
    }
}
