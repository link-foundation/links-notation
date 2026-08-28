//! Conformance tests for the empty reference (issue #288).
//!
//! A bare delimiter pair is the empty reference. The three delimiters `"`, `'`
//! and `` ` `` behave identically, and every longer n-quote run keeps the
//! meaning it already had. The table below is shared with the JavaScript,
//! Python, C#, Go, Java and PHP suites, so a document written by one
//! implementation reads the same in all of them.

use links_notation::{format_links, parse_lino_to_links, LiNo};

/// Render a parsed node unambiguously: every reference is wrapped in angle
/// brackets so an empty one is visible as `<>`.
fn render(node: &LiNo<String>) -> String {
    match node {
        LiNo::Ref(id) => format!("<{}>", id),
        LiNo::Link { id, values } => {
            let head = id
                .as_ref()
                .map(|id| format!("<{}>: ", id))
                .unwrap_or_default();
            let body = values.iter().map(render).collect::<Vec<_>>().join(" ");
            format!("({}{})", head, body)
        }
    }
}

fn rendered(input: &str) -> String {
    let links = parse_lino_to_links(input)
        .unwrap_or_else(|e| panic!("expected {:?} to parse, got {}", input, e));
    links.iter().map(render).collect::<Vec<_>>().join("\n")
}

fn assert_parses_as(input: &str, expected: &str) {
    assert_eq!(rendered(input), expected, "input: {}", input);
}

#[test]
fn bare_delimiter_pair_is_the_empty_reference() {
    assert_parses_as(r#"(a "" b)"#, "(<a> <> <b>)");
}

#[test]
fn every_delimiter_style_yields_the_same_empty_reference() {
    assert_parses_as(r#"(a "" b)"#, "(<a> <> <b>)");
    assert_parses_as(r#"(a '' b)"#, "(<a> <> <b>)");
    assert_parses_as("(a `` b)", "(<a> <> <b>)");
}

#[test]
fn adjacent_empty_references_stay_separate() {
    assert_parses_as(r#"(a "" "" b)"#, "(<a> <> <> <b>)");
    assert_parses_as(r#"(a '' '' b)"#, "(<a> <> <> <b>)");
    assert_parses_as("(a `` `` b)", "(<a> <> <> <b>)");
    assert_parses_as(r#"(a ""  "" b)"#, "(<a> <> <> <b>)");
}

#[test]
fn nested_empty_references_parse() {
    assert_parses_as(r#"("" ("" 1))"#, "(<> (<> <1>))");
    assert_parses_as(r#"("" ('' 1))"#, "(<> (<> <1>))");
    assert_parses_as(r#"("x" ("" 1))"#, "(<x> (<> <1>))");
    assert_parses_as(r#"("" ("x" 1))"#, "(<> (<x> <1>))");
    assert_parses_as(r#"("" x ("" 1))"#, "(<> <x> (<> <1>))");
    assert_parses_as(r#"("" 1 ("" 1))"#, "(<> <1> (<> <1>))");
}

#[test]
fn empty_reference_is_valid_as_an_id() {
    assert_parses_as(r#"("": 1)"#, "(<>: <1>)");
    assert_parses_as(r#"(o: ("" (o: ("" 1))))"#, "(<o>: (<> (<o>: (<> <1>))))");
}

#[test]
fn n_quote_delimited_bodies_are_unchanged() {
    // A run that encloses a substantive body keeps its n-quote meaning.
    assert_parses_as(r#"(a ""x"" b)"#, "(<a> <x> <b>)");
    assert_parses_as(r#"(x "" " "")"#, r#"(<x> < " >)"#);
    assert_parses_as(r#"(x ' " ')"#, r#"(<x> < " >)"#);
    // An n-quote-delimited empty is still empty.
    assert_parses_as(r#"(a """" b)"#, "(<a> <> <b>)");
}

#[test]
fn a_single_space_still_reads_as_a_space() {
    assert_parses_as(r#"(a " " b)"#, "(<a> < > <b>)");
}

#[test]
fn odd_delimiter_runs_stay_literal_text() {
    assert_parses_as(r#"(a " b)"#, r#"(<a> <"> <b>)"#);
    assert_parses_as(r#"(a """ b)"#, r#"(<a> <"""> <b>)"#);
}

#[test]
fn empty_reference_survives_a_round_trip() {
    for input in [
        r#"(a "" b)"#,
        r#"(a "" "" b)"#,
        r#"("" ("" 1))"#,
        r#"("": 1)"#,
        r#"(o: ("" (o: ("" 1))))"#,
    ] {
        let links = parse_lino_to_links(input).expect("parses");
        let formatted = format_links(&links);
        let reparsed = parse_lino_to_links(&formatted)
            .unwrap_or_else(|e| panic!("formatted {:?} did not parse: {}", formatted, e));
        assert_eq!(links, reparsed, "round trip changed {:?}", input);
    }
}

#[test]
fn empty_reference_is_written_as_a_delimiter_pair() {
    let links = parse_lino_to_links(r#"(a "" b)"#).expect("parses");
    assert_eq!(format_links(&links), r#"(a "" b)"#);
}
