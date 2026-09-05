//! Conformance tests for line comments (issue #301).
//!
//! `#` starts a comment that runs to the end of the line, unless it sits inside
//! a token or inside a delimited reference. Parsers accept comments by default
//! and can be told to treat `#` as an ordinary character again. The table below
//! is shared with the JavaScript, Python, C#, Go, Java and PHP suites, so a
//! document written by one implementation reads the same in all of them.

use links_notation::format_config::FormatConfig;
use links_notation::{
    format_links_with_config, parse_lino, parse_lino_to_links, parse_lino_to_links_with_config,
    LiNo, ParserConfig,
};

/// Render a parsed node unambiguously: every reference is wrapped in angle
/// brackets, so a `#` that survived as content is visible.
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
fn a_line_that_starts_with_a_hash_is_a_comment() {
    assert_parses_as("# a b\n", "");
}

#[test]
fn a_comment_may_hold_a_colon() {
    // The document from #301: prose with a colon used to be a parse error.
    assert_parses_as("# a: b\n", "");
}

#[test]
fn a_comment_may_hold_anything_at_all() {
    assert_parses_as("# ) : ( \" ' ` #\n", "");
}

#[test]
fn a_comment_ends_at_the_end_of_its_line() {
    assert_parses_as("# note\na: b\n", "(<a>: <b>)");
}

#[test]
fn a_comment_may_follow_a_link() {
    assert_parses_as("a: b # why\n", "(<a>: <b>)");
}

#[test]
fn a_comment_may_follow_a_group() {
    assert_parses_as("(a b) # why\n", "(<a> <b>)");
}

#[test]
fn a_comment_needs_no_closing_newline() {
    assert_parses_as("a: b # why", "(<a>: <b>)");
}

#[test]
fn a_comment_line_inside_an_indented_block_is_skipped() {
    assert_eq!(
        rendered("parent\n  # what the child is for\n  child\n"),
        rendered("parent\n  child\n"),
    );
}

#[test]
fn a_comment_line_inside_a_group_is_skipped() {
    assert_parses_as("(\n  a\n  # why\n  b\n)\n", "(<a> <b>)");
}

#[test]
fn a_document_of_comments_alone_holds_no_links() {
    assert_parses_as("# one\n# two\n", "");
}

#[test]
fn a_hash_inside_a_token_is_an_ordinary_character() {
    assert_parses_as("issue#1047\n", "<issue#1047>");
}

#[test]
fn a_hash_that_opens_a_token_is_an_ordinary_character() {
    assert_parses_as("a: b#c\n", "(<a>: <b#c>)");
}

#[test]
fn a_hash_inside_a_delimited_reference_is_content() {
    assert_parses_as("\"# not a comment\" a\n", "(<# not a comment> <a>)");
}

#[test]
fn a_comment_may_follow_a_delimited_reference() {
    assert_parses_as("\"a\" # why\n", "<a>");
}

#[test]
fn a_hash_inside_a_multiline_delimited_reference_is_content() {
    assert_parses_as("\"a # b\nc\" d\n", "(<a # b\nc> <d>)");
}

#[test]
fn comments_can_be_turned_off() {
    let config = ParserConfig::without_comments();
    let links = parse_lino_to_links_with_config("# a b\n", &config).expect("parses");

    assert_eq!(
        links.iter().map(render).collect::<Vec<_>>().join("\n"),
        "(<#> <a> <b>)"
    );
}

#[test]
fn a_parser_without_comments_still_rejects_the_document_from_the_issue() {
    let config = ParserConfig::without_comments();

    assert!(parse_lino_to_links_with_config("# a: b\n", &config).is_err());
}

#[test]
fn comments_are_on_by_default() {
    assert!(ParserConfig::default().comments);
    assert_eq!(ParserConfig::new(), ParserConfig::with_comments(true));
}

#[test]
fn a_comment_does_not_move_the_position_a_later_error_is_reported_at() {
    // Blanking a comment keeps every later character where it was, so the
    // position reported for a defect is the position in the original document.
    let error = parse_lino("# a comment\nstage: rust: nextest\n").unwrap_err();

    assert!(
        format!("{error}").starts_with("Syntax error at line 2, column 12:"),
        "{error}"
    );
}

#[test]
fn a_line_of_spaces_separates_links_the_way_an_empty_line_does() {
    // Blanking a comment leaves a line of spaces behind, so such a line has to
    // read as a blank line.
    assert_eq!(rendered("a\n   \nb\n"), rendered("a\n\nb\n"));
}

/// Writes a document the way a caller that keeps the default formatting does.
fn written(links: &[LiNo<String>]) -> String {
    format_links_with_config(links, &FormatConfig::default())
}

#[test]
fn a_reference_that_begins_with_a_hash_is_written_quoted() {
    // Without the quotes the document would read as `a` followed by a comment.
    let document = written(&[LiNo::Link {
        id: None,
        values: vec![LiNo::Ref("a".to_string()), LiNo::Ref("#tag".to_string())],
    }]);

    assert_eq!(document, "(a '#tag')");
    assert_eq!(rendered(&document), "(<a> <#tag>)");
}

#[test]
fn a_hash_that_cannot_open_a_comment_is_left_unquoted() {
    let quoted = |reference: &str| written(&[LiNo::Ref(reference.to_string())]);

    assert_eq!(quoted("issue#1047"), "(issue#1047)");
    assert_eq!(quoted("#"), "('#')");
    assert_eq!(quoted("#ff0000"), "('#ff0000')");
}
