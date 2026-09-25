//! Links nested too deeply are refused with an error rather than recursed into
//! until the stack overflows, which aborts the process where no caller can
//! catch it ([#315](https://github.com/link-foundation/links-notation/issues/315)).
//!
//! Every parenthesized group and every indentation level is one level, and the
//! lines of a document start at level 0.

use links_notation::parser::DEFAULT_MAX_DEPTH;
use links_notation::{
    parse_lino_to_links, parse_lino_to_links_with_config, NestingTooDeep, ParseError, ParserConfig,
    StreamParser,
};

fn parens(depth: usize) -> String {
    format!("{}a{}", "(".repeat(depth), ")".repeat(depth))
}

fn values(depth: usize) -> String {
    format!("{}b{}", "(a ".repeat(depth), ")".repeat(depth))
}

fn indentation(depth: usize) -> String {
    (0..=depth)
        .map(|level| format!("{}a\n", " ".repeat(level)))
        .collect()
}

fn too_deep(document: &str, max_depth: usize) -> NestingTooDeep {
    let config = ParserConfig::new().with_max_depth(max_depth);
    match parse_lino_to_links_with_config(document, &config) {
        Ok(links) => panic!("expected {document:?} to be too deep, got {links:?}"),
        Err(ParseError::NestingTooDeep(error)) => error,
        Err(other) => panic!("expected {document:?} to be too deep, got {other}"),
    }
}

fn accepted(document: &str, max_depth: usize) -> bool {
    let config = ParserConfig::new().with_max_depth(max_depth);
    parse_lino_to_links_with_config(document, &config).is_ok()
}

#[test]
fn test_default_limit_is_shared_by_every_implementation() {
    assert_eq!(DEFAULT_MAX_DEPTH, 64);
    assert_eq!(ParserConfig::default().max_depth, DEFAULT_MAX_DEPTH);
}

#[test]
fn test_parentheses_up_to_the_limit_are_accepted() {
    assert!(accepted(&parens(3), 3));
    assert!(accepted(&values(3), 3));
    assert!(parse_lino_to_links(&parens(DEFAULT_MAX_DEPTH)).is_ok());
    assert!(parse_lino_to_links(&values(DEFAULT_MAX_DEPTH)).is_ok());
}

#[test]
fn test_parentheses_past_the_limit_are_refused_at_the_group_that_is_too_deep() {
    let error = too_deep(&parens(4), 3);

    assert_eq!(error.max_depth, 3);
    assert_eq!((error.line, error.column, error.offset), (1, 4, 3));
    assert_eq!(
        error.to_string(),
        "line 1, column 4: nesting depth exceeds the maximum of 3\n1 | ((((a))))\n  |    ^"
    );
}

#[test]
fn test_groups_in_value_position_count_like_any_other_group() {
    let error = too_deep(&values(4), 3);

    assert_eq!((error.line, error.column), (1, 10));
}

#[test]
fn test_indentation_up_to_the_limit_is_accepted() {
    assert!(accepted(&indentation(3), 3));
    assert!(parse_lino_to_links(&indentation(DEFAULT_MAX_DEPTH)).is_ok());
}

#[test]
fn test_indentation_past_the_limit_is_refused_at_the_line_that_is_too_deep() {
    let error = too_deep(&indentation(4), 3);

    assert_eq!((error.line, error.column), (5, 5));
    assert_eq!(error.line_text, "    a");
}

#[test]
fn test_groups_and_indentation_add_up() {
    // `(b)` on the line indented once is at level 2.
    assert!(accepted("a\n  (b)\n", 2));
    let error = too_deep("a\n  (b)\n", 1);

    assert_eq!((error.line, error.column), (2, 3));
}

#[test]
fn test_trailing_spaces_on_a_deep_line_are_not_a_deeper_line() {
    assert!(accepted("a\n  b\n    c   \n", 2));
}

#[test]
fn test_refuses_a_document_far_past_the_limit_without_overflowing_the_stack() {
    // Before the limit existed each of these overflowed a 2 MiB stack and
    // aborted the process.
    let outcome = std::thread::Builder::new()
        .stack_size(2 << 20)
        .spawn(|| {
            [parens(100_000), values(100_000), indentation(2_000)]
                .iter()
                .map(|document| match parse_lino_to_links(document) {
                    Err(ParseError::NestingTooDeep(error)) => error.max_depth,
                    other => panic!("expected the nesting to be too deep, got {other:?}"),
                })
                .collect::<Vec<_>>()
        })
        .unwrap()
        .join()
        .unwrap();

    assert_eq!(outcome, vec![DEFAULT_MAX_DEPTH; 3]);
}

#[test]
fn test_stream_parser_reports_where_the_nesting_is_too_deep() {
    let mut stream = StreamParser::with_config(ParserConfig::new().with_max_depth(1));
    stream.write("a\nb ((c))\n").unwrap();
    let error = stream.finish().unwrap_err();
    let location = error.location.expect("the error has a location");

    assert!(matches!(
        error.parse_error.as_deref(),
        Some(ParseError::NestingTooDeep(_))
    ));
    assert_eq!((location.line, location.column, location.offset), (2, 4, 5));
}
