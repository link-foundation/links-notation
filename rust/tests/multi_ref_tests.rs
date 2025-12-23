//! Multi-Reference Feature Tests (Issue #184)
//!
//! Tests for multi-word references without quotes:
//! - (some example: some example is a link)
//! - ID as multi-word string: "some example"

use links_notation::{format_links, parse_lino_to_links, LiNo};

#[test]
fn test_parses_two_word_multi_reference_id() {
    let result = parse_lino_to_links("(some example: value)").expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, values } => {
            // Multi-word ID is now stored as separate words
            assert_eq!(ids.as_ref().unwrap(), &vec!["some".to_string(), "example".to_string()]);
            assert_eq!(values.len(), 1);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_parses_three_word_multi_reference_id() {
    let result = parse_lino_to_links("(new york city: value)").expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, .. } => {
            assert_eq!(ids.as_ref().unwrap(), &vec!["new".to_string(), "york".to_string(), "city".to_string()]);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_single_word_id_backward_compatible() {
    let result = parse_lino_to_links("(papa: value)").expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, .. } => {
            assert_eq!(ids.as_ref().unwrap(), &vec!["papa".to_string()]);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_quoted_multi_word_id_backward_compatible() {
    let result = parse_lino_to_links("('some example': value)").expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, .. } => {
            // Quoted ID should be preserved as-is
            assert_eq!(ids.as_ref().unwrap(), &vec!["some example".to_string()]);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_format_multi_reference_id() {
    let result = parse_lino_to_links("(some example: value)").expect("Failed to parse");
    let formatted = format_links(&result);
    // Multi-reference IDs are formatted with space-separated words (new behavior)
    // The formatted output may keep them unquoted if the formatter supports it
    assert_eq!(formatted, "(some example: value)");
}

#[test]
fn test_round_trip_multi_reference() {
    let input = "(new york city: great)";
    let result = parse_lino_to_links(input).expect("Failed to parse");
    let formatted = format_links(&result);
    // Round-trip preserves the multi-word ID structure
    assert_eq!(formatted, "(new york city: great)");
}

#[test]
fn test_indented_syntax_multi_reference() {
    let input = "some example:\n  value1\n  value2";
    let result = parse_lino_to_links(input).expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, values } => {
            assert_eq!(ids.as_ref().unwrap(), &vec!["some".to_string(), "example".to_string()]);
            assert_eq!(values.len(), 2);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_values_include_multi_reference_context() {
    // When the same multi-word pattern appears in values,
    // it should be formatted consistently
    let input = "(some example: some example is a link)";
    let result = parse_lino_to_links(input).expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, values } => {
            assert_eq!(ids.as_ref().unwrap(), &vec!["some".to_string(), "example".to_string()]);
            // Values should include "some", "example", "is", "a", "link"
            // (context-aware grouping not implemented in Rust yet)
            assert!(values.len() >= 4);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_backward_compatibility_single_line() {
    let result = parse_lino_to_links("papa: loves mama").expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, values } => {
            assert_eq!(ids.as_ref().unwrap(), &vec!["papa".to_string()]);
            assert_eq!(values.len(), 2);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_backward_compatibility_parenthesized() {
    let result = parse_lino_to_links("(papa: loves mama)").expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, values } => {
            assert_eq!(ids.as_ref().unwrap(), &vec!["papa".to_string()]);
            assert_eq!(values.len(), 2);
        }
        _ => panic!("Expected Link"),
    }
}

#[test]
fn test_backward_compatibility_nested() {
    let result = parse_lino_to_links("(outer: (inner: value))").expect("Failed to parse");
    assert_eq!(result.len(), 1);
    match &result[0] {
        LiNo::Link { ids, values } => {
            assert_eq!(ids.as_ref().unwrap(), &vec!["outer".to_string()]);
            assert_eq!(values.len(), 1);
            match &values[0] {
                LiNo::Link {
                    ids: inner_ids,
                    values: inner_values,
                } => {
                    assert_eq!(inner_ids.as_ref().unwrap(), &vec!["inner".to_string()]);
                    assert_eq!(inner_values.len(), 1);
                }
                _ => panic!("Expected nested Link"),
            }
        }
        _ => panic!("Expected Link"),
    }
}
