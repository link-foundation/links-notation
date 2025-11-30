//! Tests for punctuation and math symbol tokenization (Issue #148)
//!
//! These tests verify that:
//! 1. Punctuation is tokenized when following alphanumeric characters
//! 2. Math symbols are tokenized only when between digits
//! 3. Hyphenated words are preserved
//! 4. Quoted strings preserve their content
//! 5. Compact formatting can restore human-readable output

use links_notation::{parse_lino_to_links, format_links, format_links_compact, Tokenizer, LiNo};

fn get_values(lino: &LiNo<String>) -> Vec<String> {
    match lino {
        LiNo::Ref(id) => vec![id.clone()],
        LiNo::Link { values, .. } => {
            values.iter().filter_map(|v| {
                match v {
                    LiNo::Ref(id) => Some(id.clone()),
                    LiNo::Link { values: inner, .. } => {
                        inner.iter().filter_map(|iv| {
                            match iv {
                                LiNo::Ref(id) => Some(id.clone()),
                                _ => None
                            }
                        }).next()
                    }
                }
            }).collect()
        }
    }
}

// Test punctuation tokenization
#[test]
fn test_punctuation_comma_separates_numbers() {
    let links = parse_lino_to_links("1, 2 and 3").unwrap();
    assert_eq!(links.len(), 1);
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["1", ",", "2", "and", "3"]);
}

#[test]
fn test_punctuation_comma_without_space() {
    let links = parse_lino_to_links("1,2,3").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["1", ",", "2", ",", "3"]);
}

#[test]
fn test_punctuation_hello_world_with_comma() {
    let links = parse_lino_to_links("hello, world").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["hello", ",", "world"]);
}

// Test math symbol tokenization
#[test]
fn test_math_addition_between_digits() {
    let links = parse_lino_to_links("1+1").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["1", "+", "1"]);
}

#[test]
fn test_math_subtraction_between_digits() {
    let links = parse_lino_to_links("10-20").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["10", "-", "20"]);
}

// Test hyphenated words are preserved
#[test]
fn test_hyphenated_jean_luc_preserved() {
    let links = parse_lino_to_links("Jean-Luc Picard").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["Jean-Luc", "Picard"]);
}

#[test]
fn test_hyphenated_conan_center_index_preserved() {
    let links = parse_lino_to_links("conan-center-index").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["conan-center-index"]);
}

#[test]
fn test_math_symbols_between_letters_preserved() {
    let links = parse_lino_to_links("x+y=z").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["x+y=z"]);
}

// Test quoted strings preserve content
#[test]
fn test_quoted_comma_preserved() {
    let links = parse_lino_to_links("\"1,\"").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["1,"]);
}

#[test]
fn test_quoted_multiple_commas_preserved() {
    let links = parse_lino_to_links("\"1,2,3\"").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["1,2,3"]);
}

// Test base64 strings are preserved
#[test]
fn test_base64_padding_equals_preserved() {
    let links = parse_lino_to_links("bmFtZQ==").unwrap();
    let values = get_values(&links[0]);
    assert_eq!(values, vec!["bmFtZQ=="]);
}

// Test compact formatting
#[test]
fn test_compact_restore_numbers_with_commas() {
    let links = parse_lino_to_links("1,2,3").unwrap();
    let formatted = format_links(&links);
    assert!(formatted.contains("1 , 2 , 3"));

    let compact = format_links_compact(&links);
    assert!(compact.contains("1,2,3"));
}

#[test]
fn test_compact_restore_addition() {
    let links = parse_lino_to_links("1+1").unwrap();
    let formatted = format_links(&links);
    assert!(formatted.contains("1 + 1"));

    let compact = format_links_compact(&links);
    assert!(compact.contains("1+1"));
}

// Test tokenizer directly
#[test]
fn test_tokenizer_tokenize() {
    let tokenizer = Tokenizer::new();
    assert_eq!(tokenizer.tokenize("1,2,3"), "1 , 2 , 3");
    assert_eq!(tokenizer.tokenize("1+1"), "1 + 1");
    assert_eq!(tokenizer.tokenize("Jean-Luc"), "Jean-Luc");
}

#[test]
fn test_tokenizer_compact() {
    let tokenizer = Tokenizer::new();
    assert_eq!(tokenizer.compact("1 , 2 , 3"), "1,2,3");
    assert_eq!(tokenizer.compact("1 + 1"), "1+1");
}

#[test]
fn test_tokenizer_disabled() {
    let tokenizer = Tokenizer::disabled();
    assert_eq!(tokenizer.tokenize("1,2,3"), "1,2,3");
    assert_eq!(tokenizer.tokenize("1+1"), "1+1");
}
