//! Tests for indentation inside parentheses.
//!
//! <https://github.com/link-foundation/links-notation/issues/282>
//!
//! Indentation is structural at the root, so it must be structural inside
//! parentheses too: a parenthesized group opens a nested context that starts
//! fresh at indentation level zero and follows exactly the root's rules.
//!
//! Note: this implementation formats a lone reference as `a`, while the other
//! implementations format it as `(a)`. That difference is older than this
//! suite and is unrelated to indentation, so the expectations below keep it.

use links_notation::{format_links, parse_lino_to_links};

fn format_source(source: &str) -> String {
    let links = parse_lino_to_links(source)
        .unwrap_or_else(|error| panic!("Failed to parse {:?}: {}", source, error));
    format_links(&links)
}

fn assert_format(source: &str, expected: &str) {
    assert_eq!(expected, format_source(source), "Parsing {:?}", source);
}

#[test]
fn parentheses_reproduce_root_indentation() {
    assert_format("a\n  b\nc\n  d", "a\n((a) (b))\nc\n((c) (d))");

    // The same lines inside parentheses keep the same structure, nested under
    // the link the group belongs to.
    assert_format(
        "array (\n  a\n    b\n  c\n    d\n)",
        "(array (a ((a) (b)) c ((c) (d))))",
    );
}

#[test]
fn parentheses_keep_record_boundaries() {
    let source = "value (\n  id \"1\"\n  label \"one\"\n)";
    assert_format(source, "(value ((id 1) (label one)))");

    let links = parse_lino_to_links(source).expect("Failed to parse");
    assert_eq!(1, links.len());

    let values = match &links[0] {
        links_notation::LiNo::Link { values, .. } => values,
        other => panic!("Expected a link, got {:?}", other),
    };
    assert_eq!(2, values.len());

    let records = match &values[1] {
        links_notation::LiNo::Link { id, values } => {
            assert!(id.is_none(), "Expected the group to be anonymous");
            values
        }
        other => panic!("Expected the group to be a link, got {:?}", other),
    };
    assert_eq!(2, records.len(), "Expected 2 records in the group");
    assert_eq!("(id 1)", records[0].to_string());
    assert_eq!("(label one)", records[1].to_string());
}

#[test]
fn parentheses_keep_several_records_separate() {
    assert_format(
        "value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)",
        "(value ((id 1 label one) (id 2 label two)))",
    );
}

#[test]
fn parentheses_nest_deeply() {
    assert_format(
        "outer (\n  inner (\n    x 1\n    y 2\n  )\n  z 3\n)",
        "(outer ((inner ((x 1) (y 2))) (z 3)))",
    );
}

#[test]
fn single_line_parentheses_are_unchanged() {
    assert_format("(a b c)", "(a b c)");
    assert_format("(1: 2 3)", "(1: 2 3)");
    assert_format("(a: b c)", "(a: b c)");
    assert_format("((a b))", "((a b))");
    assert_format("()", "()");
}

#[test]
fn parentheses_with_indented_id_syntax() {
    assert_format("(\n  a:\n    b\n    c\n)", "(a: b c)");
}

#[test]
fn blank_lines_inside_parentheses_are_skipped() {
    assert_format("(\n  a\n\n  b\n)", "(a b)");
}

#[test]
fn employee_records_keep_their_fields() {
    let source = "empInfo\n  employees:\n    (\n      name (James Kirk)\n      age 40\n    )\n    (\n      name (Jean-Luc Picard)\n      age 45\n    )";
    let expected = "empInfo\n((empInfo) (employees: ((name (James Kirk)) (age 40)) ((name (Jean-Luc Picard)) (age 45))))";
    assert_format(source, expected);
}
