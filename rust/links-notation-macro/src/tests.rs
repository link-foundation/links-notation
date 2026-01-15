//! Unit tests for the links-notation-macro internal functions.
//!
//! These tests validate the internal helper functions:
//! - `validate_lino_syntax`: Basic syntax validation
//! - `tokens_to_lino_string`: Token to string conversion

use super::*;

#[test]
fn test_validate_balanced_parens() {
    assert!(validate_lino_syntax("(a b c)").is_ok());
    assert!(validate_lino_syntax("((a) (b))").is_ok());
    assert!(validate_lino_syntax("a b c").is_ok());
}

#[test]
fn test_validate_unbalanced_parens() {
    assert!(validate_lino_syntax("(a b c").is_err());
    assert!(validate_lino_syntax("a b c)").is_err());
    assert!(validate_lino_syntax("((a) (b)").is_err());
}

#[test]
fn test_validate_quotes() {
    assert!(validate_lino_syntax(r#"("quoted" value)"#).is_ok());
    assert!(validate_lino_syntax("('quoted' value)").is_ok());
    assert!(validate_lino_syntax(r#"("unclosed)"#).is_err());
    assert!(validate_lino_syntax("('unclosed)").is_err());
}

#[test]
fn test_validate_nested_quotes() {
    assert!(validate_lino_syntax(r#"("string with (parens)" value)"#).is_ok());
}

#[test]
fn test_validate_empty() {
    assert!(validate_lino_syntax("").is_ok());
    assert!(validate_lino_syntax("   ").is_ok());
}

#[test]
fn test_tokens_to_lino_basic() {
    // Test basic token conversion
    let tokens: proc_macro2::TokenStream = "papa has car".parse().unwrap();
    let mut output = String::new();
    tokens_to_lino_string(tokens, &mut output);
    assert_eq!(output, "papa has car");
}

#[test]
fn test_tokens_to_lino_with_parens() {
    let tokens: proc_macro2::TokenStream = "papa (loves mama)".parse().unwrap();
    let mut output = String::new();
    tokens_to_lino_string(tokens, &mut output);
    assert_eq!(output, "papa (loves mama)");
}

#[test]
fn test_tokens_to_lino_with_colon() {
    let tokens: proc_macro2::TokenStream = "(lovesMama: loves mama)".parse().unwrap();
    let mut output = String::new();
    tokens_to_lino_string(tokens, &mut output);
    assert_eq!(output, "(lovesMama: loves mama)");
}

#[test]
fn test_tokens_to_lino_nested() {
    let tokens: proc_macro2::TokenStream = "(outer (inner value))".parse().unwrap();
    let mut output = String::new();
    tokens_to_lino_string(tokens, &mut output);
    assert_eq!(output, "(outer (inner value))");
}
