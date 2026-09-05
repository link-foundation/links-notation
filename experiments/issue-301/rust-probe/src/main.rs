//! What the Rust parser does with prose written after a `#`.

use links_notation::parse_lino_to_links;

fn main() {
    let docs = [
        "# a b\n",
        "# a: b\n",
        "a: b # note\n",
        "a#b\n",
        "\"#\" a\n",
        "parent\n  # what the child is for\n  child\n",
    ];
    for doc in docs {
        match parse_lino_to_links(doc) {
            Ok(links) => {
                let shown: Vec<String> = links.iter().map(|link| link.to_string()).collect();
                println!("{doc:?} -> PARSED [{}]", shown.join(" "));
            }
            Err(error) => println!("{doc:?} -> {error}"),
        }
    }
}
