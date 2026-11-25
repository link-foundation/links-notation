//! Quoting a reference, and reading every quoted reference back (issues #443
//! and #444).
//!
//! `quote_reference` writes one reference so a parser reads it back as exactly
//! that text; `needs_quoting` says whether the text can be written bare. The
//! round trip below feeds texts built from the characters that matter to the
//! grammar through `quote_reference` and reads them back in the ID and the
//! value position of parenthesised, single-line and indented links.

use links_notation::{LiNo, needs_quoting, parse_lino_to_links, quote_reference};

#[test]
fn quote_reference_writes_text_that_needs_no_delimiters_as_it_is() {
    for text in ["plain", "issue#1047", "a-b_c.d", "π", "~1"] {
        assert_eq!(quote_reference(text), text);
        assert!(!needs_quoting(text), "{text:?}");
    }
}

#[test]
fn quote_reference_quotes_text_a_parser_would_read_differently() {
    assert_eq!(quote_reference("has space"), "'has space'");
    assert_eq!(quote_reference("12:30"), "'12:30'");
    assert_eq!(quote_reference("#release"), "'#release'");
    assert_eq!(quote_reference("(a)"), "'(a)'");
    assert_eq!(quote_reference("\""), "'\"'");
    assert_eq!(quote_reference("'"), "\"'\"");
    assert_eq!(quote_reference(""), "~1{}");
    assert_eq!(quote_reference("a\nb"), "~1{610a62}");
    for text in ["has space", "12:30", "#release", "", "\"", "a\nb"] {
        assert!(needs_quoting(text), "{text:?}");
    }
}

#[test]
fn quote_reference_is_what_the_formatter_writes() {
    for text in ["a b", "a", "it's", "", "#x", "x:y"] {
        let link = LiNo::Link {
            id: None,
            values: vec![LiNo::Ref("v".to_owned()), LiNo::Ref(text.to_owned())],
        };
        assert_eq!(link.to_string(), format!("(v {})", quote_reference(text)));
    }
}

/// Texts that broke a parser or a formatter before, or came close.
const TRICKY: &[&str] = &[
    "",
    " ",
    "\"",
    "'",
    "`",
    "\"\"",
    "''",
    "\"\"\"\"",
    "\"'",
    "'\"",
    "#",
    "#x",
    "a #b",
    ":",
    "a:",
    ":a",
    "12:30",
    "a: b",
    "(",
    ")",
    "~1{}",
    "~1{61}",
    "a\nb",
    "\"\" ",
    " \"\"",
    "\"\n",
    "it's",
    "say \"hi\"",
];

/// The characters that matter to the grammar, for the seeded texts.
const ALPHABET: &[&str] = &[
    "a", "b", "1", " ", " ", "\t", "\n", "\r", "\"", "\"", "'", "'", "`", "#", ":", "(", ")", "~",
    "{", "}", "é", "😀",
];

/// A small, seeded generator (mulberry32), so a failure names the text that
/// broke and the same texts are tried on every run.
fn texts(count: usize, seed: u32) -> Vec<String> {
    let mut state = seed;
    let mut next = move || {
        state = state.wrapping_add(0x6d2b_79f5);
        let mut value = state;
        value = (value ^ (value >> 15)).wrapping_mul(value | 1);
        value ^= value.wrapping_add((value ^ (value >> 7)).wrapping_mul(value | 61));
        f64::from(value ^ (value >> 14)) / 4_294_967_296.0
    };
    (0..count)
        .map(|_| {
            let length = (next() * 9.0) as usize;
            (0..length)
                .map(|_| ALPHABET[(next() * ALPHABET.len() as f64) as usize])
                .collect()
        })
        .collect()
}

/// Every link as `[id, values...]`, with `~` for a link without an ID.
fn tree(links: &[LiNo<String>]) -> String {
    links
        .iter()
        .map(|link| {
            let (id, values) = match link {
                LiNo::Ref(id) => (Some(id), &[][..]),
                LiNo::Link { id, values } => (id.as_ref(), values.as_slice()),
            };
            let id = id.map_or_else(|| "~".to_owned(), |id| format!("{id:?}"));
            if values.is_empty() {
                format!("[{id}]")
            } else {
                format!("[{id} {}]", tree(values))
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn read_back(document: &str) -> String {
    tree(&parse_lino_to_links(document).unwrap_or_else(|e| panic!("{document:?}: {e}")))
}

#[test]
fn every_quoted_reference_reads_back_in_every_position() {
    let seeded = texts(2000, 443_444);
    for text in TRICKY
        .iter()
        .copied()
        .chain(seeded.iter().map(String::as_str))
    {
        let w = quote_reference(text);
        let message = format!("text {text:?} written {w:?}");
        let t = format!("{text:?}");

        assert_eq!(read_back(&w), format!("[~ [{t}]]"), "{message}");
        let link = format!("[{t} [{t}] [\"x\"]]");
        assert_eq!(read_back(&format!("({w}: {w} x)")), link, "{message}");
        assert_eq!(read_back(&format!("{w}: {w} x")), link, "{message}");
        assert_eq!(read_back(&format!("{w}: {w} x\n")), link, "{message}");
        assert_eq!(read_back(&format!("{w}:\n  {w}\n  x\n")), link, "{message}");
        // Two lines that each end with the reference: the shape of issue #443.
        assert_eq!(
            read_back(&format!("root:\n  a {w}\n  b {w}\n")),
            format!("[\"root\" [~ [\"a\"] [{t}]] [~ [\"b\"] [{t}]]]"),
            "{message}"
        );
        assert_eq!(
            read_back(&format!("(a ({w} {w}) b)")),
            format!("[~ [\"a\"] [~ [{t}] [{t}]] [\"b\"]]"),
            "{message}"
        );
    }
}
