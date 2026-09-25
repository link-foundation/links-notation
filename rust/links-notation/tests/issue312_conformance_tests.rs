//! The JavaScript and Rust parsers must give the same links for these documents.

use links_notation::{parse_lino_to_links, LiNo};

fn render(node: &LiNo<String>) -> String {
    match node {
        LiNo::Ref(id) => format!("<{id}>"),
        LiNo::Link { id, values } => {
            let head = id
                .as_ref()
                .map(|id| format!("<{id}>: "))
                .unwrap_or_default();
            format!(
                "({head}{})",
                values.iter().map(render).collect::<Vec<_>>().join(" ")
            )
        }
    }
}

fn assert_parses_as(source: &str, expected: &str) {
    let links = parse_lino_to_links(source).unwrap_or_else(|error| panic!("{source:?}: {error}"));
    assert_eq!(
        links.iter().map(render).collect::<Vec<_>>().join("\n"),
        expected,
        "{source:?}"
    );
}

#[test]
fn cr_is_a_line_break() {
    assert_parses_as("a\rb", "(<a>)\n(<b>)");
    assert_parses_as("a\r\nb", "(<a>)\n(<b>)");
}

#[test]
fn only_grammar_whitespace_makes_an_empty_document() {
    assert_parses_as(" \t\n\r", "");
    for character in ['\u{85}', '\u{a0}', '\u{2028}', '\u{3000}', '\u{feff}'] {
        assert_parses_as(&character.to_string(), &format!("(<{character}>)"));
    }
}

#[test]
fn unicode_spaces_are_substantive_even_quote_bodies() {
    for character in ['\u{85}', '\u{a0}', '\u{2028}', '\u{3000}', '\u{feff}'] {
        assert_parses_as(&format!("''{character}''"), &format!("(<{character}>)"));
    }
}

#[test]
fn trailing_indentation_is_document_whitespace() {
    assert_parses_as("a\n  ", "(<a>)");
    assert_parses_as("a\n  \t", "(<a>)");
}

#[test]
fn a_single_reference_is_a_link_value_at_every_depth() {
    assert_parses_as("1", "(<1>)");
    assert_parses_as("(1)", "(<1>)");
    assert_parses_as("((1))", "((<1>))");
}
