//! A parse error has to say where the document stopped making sense.
//!
//! The positions asserted here are the ones the JavaScript port reports for the
//! same input, so the two implementations can be held to the same contract
//! ([#302](https://github.com/link-foundation/links-notation/issues/302)).

use links_notation::{parse_lino, parse_lino_to_links, ParseError, SyntaxError};

fn syntax_error(document: &str) -> SyntaxError {
    match parse_lino(document) {
        Ok(parsed) => panic!("expected {document:?} not to parse, got {parsed}"),
        Err(ParseError::SyntaxError(error)) => error,
        Err(other) => panic!("expected a syntax error for {document:?}, got {other}"),
    }
}

#[test]
fn test_reports_the_line_and_column_of_the_defect() {
    // The example from the issue: the defect is the colon on line 2, and the
    // two lines after it are fine.
    let error = syntax_error("# ok line\n# break: two\nci_gate x\n  stage rust");

    assert_eq!(error.line, 2);
    assert_eq!(error.column, 8);
    assert_eq!(error.found, Some(':'));
}

#[test]
fn test_offset_agrees_with_the_javascript_port() {
    // JavaScript reports { offset: 17, line: 2, column: 8 } for this document.
    let error = syntax_error("# ok line\n# break: two\n");

    assert_eq!(error.offset, 17);
    assert_eq!(error.line, 2);
    assert_eq!(error.column, 8);
}

#[test]
fn test_points_at_the_defect_rather_than_at_the_line_it_starts_on() {
    // `nom` reports this failure at the start of line 2, because that is where
    // the document last parsed cleanly. The defect is seven characters later.
    let error = syntax_error("# ok line\n# break: two\n");

    assert_ne!(error.column, 1);
    assert_eq!(&error.line_text[error.column - 1..error.column], ":");
}

#[test]
fn test_reports_the_line_a_late_defect_is_on() {
    let error = syntax_error("a\nb\nc\nd\ne: f: g\nh\n");

    assert_eq!(error.line, 5);
    assert_eq!(error.column, 5);
    assert_eq!(error.line_text, "e: f: g");
}

#[test]
fn test_says_what_could_have_stood_there() {
    let error = syntax_error("a: b: c");

    assert_eq!(error.expected, vec!["\"(\"", "a reference", "end of line"]);
}

#[test]
fn test_reports_the_end_of_the_document_when_a_group_is_never_closed() {
    // JavaScript reports { offset: 5, line: 2, column: 1 } for this document.
    let error = syntax_error("a (b\n");

    assert_eq!(error.offset, 5);
    assert_eq!(error.line, 2);
    assert_eq!(error.column, 1);
    assert_eq!(error.found, None);
    assert!(error.expected.contains(&"\")\"".to_string()));
}

#[test]
fn test_reports_an_unmatched_closing_parenthesis() {
    // JavaScript reports { offset: 3, line: 1, column: 4 } for this document.
    let error = syntax_error("a b)\n");

    assert_eq!(error.offset, 3);
    assert_eq!(error.line, 1);
    assert_eq!(error.column, 4);
    assert_eq!(error.found, Some(')'));
}

#[test]
fn test_summary_reads_as_a_sentence() {
    let error = syntax_error("# ok line\n# break: two\n");

    assert_eq!(
        error.summary(),
        r#"line 2, column 8: expected "(", a reference or end of line, found ":""#
    );
}

#[test]
fn test_snippet_points_a_caret_at_the_offending_character() {
    let error = syntax_error("# ok line\n# break: two\n");

    assert_eq!(error.snippet(), "2 | # break: two\n  |        ^");
}

#[test]
fn test_message_quotes_one_line_rather_than_the_rest_of_the_document() {
    // The whole complaint in #302: the message used to carry the entire
    // unconsumed remainder, so it grew with the size of the document.
    let tail = "trailing line\n".repeat(500);
    let document = format!("# ok line\n# break: two\n{tail}");

    let message = format!("{}", parse_lino(&document).unwrap_err());

    assert!(message.contains("line 2, column 8"), "{message}");
    assert!(!message.contains("trailing line"), "{message}");
    assert!(message.len() < 200, "message is {} bytes", message.len());
}

#[test]
fn test_message_of_a_long_line_stays_a_message() {
    let document = format!("{}: {}: c", "a".repeat(400), "b".repeat(400));

    let error = syntax_error(&document);
    let message = format!("{error}");

    assert_eq!(error.line, 1);
    assert_eq!(error.column, 803);
    assert!(message.contains("..."), "{message}");
    assert!(message.len() < 300, "message is {} bytes", message.len());
    // The caret still lands under the character the message is about.
    let caret = message.lines().last().unwrap().find('^').unwrap();
    let quoted = message.lines().nth(1).unwrap();
    assert_eq!(&quoted[caret..caret + 1], ":");
}

#[test]
fn test_error_display_starts_with_the_position() {
    let error = parse_lino("a: b: c").unwrap_err();

    assert!(
        format!("{error}").starts_with("Syntax error at line 1, column 5:"),
        "{error}"
    );
}

#[test]
fn test_nom_internals_stay_out_of_the_message() {
    let message = format!("{}", parse_lino("a: b: c").unwrap_err());

    for internal in ["ErrorKind", "code:", "Eof", "Verify", "TakeWhile1"] {
        assert!(!message.contains(internal), "{message} mentions {internal}");
    }
}

#[test]
fn test_both_entry_points_report_the_same_position() {
    let document = "# ok line\n# break: two\n";

    let one = syntax_error(document);
    let Err(ParseError::SyntaxError(many)) = parse_lino_to_links(document) else {
        panic!("expected a syntax error")
    };

    assert_eq!(one, many);
}

#[test]
fn test_column_counts_characters_rather_than_bytes() {
    // The identifier is six characters wide and twelve bytes long.
    let error = syntax_error("привет: b: c");

    assert_eq!(error.line, 1);
    assert_eq!(error.column, 10);
    assert_eq!(error.offset, 15);
    assert_eq!(error.found, Some(':'));
}

#[test]
fn test_a_document_that_parses_reports_nothing() {
    assert!(parse_lino("a: b\n  c: d\n").is_ok());
}
