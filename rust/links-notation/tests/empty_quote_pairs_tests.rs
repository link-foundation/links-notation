//! Issue #443: an empty quoted value at the end of a line must not swallow the
//! lines after it.
//!
//! An even run of quotes (`""`, `''`, `""""`, ...) followed by whitespace up to
//! the end of its line is the empty reference, however later lines continue. A
//! run followed directly by text (`""x`) still opens a reference that may reach
//! across lines, so multiline references keep working.

use links_notation::{LiNo, StreamParser, format_links, parse_lino_to_links};

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

fn formatted(document: &str) -> String {
    format_links(&parse_lino_to_links(document).unwrap())
}

#[test]
fn empty_values_on_consecutive_indented_lines_stay_on_their_lines() {
    let expected = r#"["root" [~ ["a"] [""]] [~ ["b"] [""]]]"#;
    assert_eq!(parses("root:\n  a \"\"\n  b \"\"\n"), expected);
    assert_eq!(parses("root:\n  a ''\n  b ''\n"), expected);
    assert_eq!(parses("root:\n  a \"\"\n  b \"\""), expected);
}

#[test]
fn an_empty_value_before_a_quoted_value_keeps_both_values() {
    assert_eq!(
        parses("root:\n  a \"\"\n  b \"x y\"\n"),
        r#"["root" [~ ["a"] [""]] [~ ["b"] ["x y"]]]"#
    );
}

#[test]
fn an_empty_value_at_the_end_of_a_top_level_line_stays_on_its_line() {
    assert_eq!(formatted("a \"\"\nb \"\"\n"), "(a ~1{})\n(b ~1{})");
    assert_eq!(formatted("a \"\" \nb \"\"\n"), "(a ~1{})\n(b ~1{})");
    assert_eq!(formatted("a \"\""), "(a ~1{})");
}

#[test]
fn a_longer_even_run_at_the_end_of_a_line_is_empty_too() {
    assert_eq!(formatted("a \"\"\"\"\nb \"\"\"\"\n"), "(a ~1{})\n(b ~1{})");
}

#[test]
fn doubled_quotes_that_nothing_closes_are_the_empty_reference() {
    assert_eq!(parses("(a: \"\"\"\")"), r#"["a" [""]]"#);
    assert_eq!(parses("(a: \"\"\"\"\"\")"), r#"["a" [""]]"#);
}

#[test]
fn a_single_quote_character_is_written_between_the_other_quotes() {
    assert_eq!(parses("(a: '\"')"), r#"["a" ["\""]]"#);
    assert_eq!(parses("(a: \"'\")"), r#"["a" ["'"]]"#);
    assert_eq!(parses("(a: `\"`)"), r#"["a" ["\""]]"#);
}

#[test]
fn an_even_run_followed_by_text_still_opens_a_multiline_reference() {
    assert_eq!(parses("a \"\"x\ny\"\"\n"), r#"[~ ["a"] ["x\ny"]]"#);
}

#[test]
fn an_even_run_still_holds_what_the_same_line_closes() {
    assert_eq!(parses("(x \"\" \" \"\")"), r#"[~ ["x"] [" \" "]]"#);
    assert_eq!(parses("a \"\" b \"\""), r#"[~ ["a"] [" b "]]"#);
}

#[test]
fn the_stream_emits_a_line_that_ends_with_an_empty_value_at_once() {
    let mut stream = StreamParser::new();
    let mut emitted = Vec::new();
    for character in "a \"\"\nb \"\"\nc\n".chars() {
        emitted.extend(stream.write(&character.to_string()).unwrap());
    }
    assert_eq!(format_links(&emitted), "(a ~1{})\n(b ~1{})");
    assert_eq!(
        format_links(&stream.finish().unwrap()),
        "(a ~1{})\n(b ~1{})\n(c)"
    );
}
