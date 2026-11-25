//! Issue #444: colons inside a bare reference.
//!
//! A run of colons between two characters of a bare reference belongs to the
//! reference, so times, URLs and qualified names need no quotes. A colon that is
//! followed by whitespace, a parenthesis, a quote or a versioned literal still
//! separates an ID from its values, and a bare reference never starts or ends
//! with a colon.

use links_notation::{
    CstKind, LiNo, ParseError, format_links, parse_lino, parse_lino_to_cst, parse_lino_to_links,
};

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

fn parses(document: &str) -> String {
    tree(&parse_lino_to_links(document).unwrap_or_else(|e| panic!("{document:?}: {e}")))
}

fn same(document: &str, expected: &str) {
    assert_eq!(parses(document), parses(expected), "{document:?}");
}

#[test]
fn a_time_is_one_reference() {
    same("time 12:30\n", "time '12:30'\n");
    same("root:\n  time 12:30\n", "root:\n  time '12:30'\n");
}

#[test]
fn a_url_is_one_reference() {
    same(
        "url https://example.com/a#b\n",
        "url 'https://example.com/a#b'\n",
    );
}

#[test]
fn a_qualified_name_is_one_reference() {
    same("type std::string\n", "type 'std::string'\n");
}

#[test]
fn an_id_may_hold_a_colon() {
    same("a:b: c\n", "'a:b': c\n");
    same("(a:b: c)", "('a:b': c)");
    same("a:b\n", "'a:b'\n");
}

#[test]
fn a_colon_before_a_value_that_cannot_continue_a_reference_separates() {
    same("a: b\n", "(a: b)");
    same("a:\"b c\"\n", "(a: 'b c')");
    same("a:'b'\n", "(a: b)");
    same("a:(b c)\n", "(a: (b c))");
    same("a:~1{62}\n", "(a: b)");
    same("a :b\n", "(a: b)");
}

#[test]
fn a_value_of_the_link_may_hold_a_colon() {
    same("a: b:c\n", "(a: 'b:c')");
}

#[test]
fn a_second_id_on_a_line_is_still_an_error() {
    assert!(matches!(
        parse_lino("stage: rust: nextest\n"),
        Err(ParseError::SyntaxError(_))
    ));
    assert!(parse_lino(": a\n").is_err());
}

#[test]
fn a_reference_with_colons_is_written_with_quotes() {
    assert_eq!(
        format_links(&parse_lino_to_links("time 12:30\n").unwrap()),
        "(time '12:30')"
    );
}

#[test]
fn the_concrete_syntax_tree_reads_colons_inside_a_reference_as_the_parser_does() {
    let references = |document: &str| -> Vec<String> {
        parse_lino_to_cst(document)
            .unwrap()
            .tokens()
            .into_iter()
            .filter(|token| token.kind == CstKind::Reference || token.kind == CstKind::Colon)
            .map(|token| token.text())
            .collect()
    };
    assert_eq!(references("time 12:30\n"), ["time", "12:30"]);
    assert_eq!(references("a:b: c\n"), ["a:b", ":", "c"]);
    assert_eq!(references("a:\"b\"\n"), ["a", ":", "\"b\""]);
    assert_eq!(references("a:~1{62}\n"), ["a", ":", "~1{62}"]);
}
