use links_notation::{parse_lino, LiNo};

// Helper to extract the single reference from a parsed result
fn get_single_ref_id(lino: &LiNo<String>) -> Option<&String> {
    match lino {
        LiNo::Ref(id) => Some(id),
        LiNo::Link { id: None, values } if values.len() == 1 => {
            if let LiNo::Ref(id) = &values[0] {
                Some(id)
            } else if let LiNo::Link {
                id: Some(ref_id),
                values: inner_values,
            } = &values[0]
            {
                if inner_values.is_empty() {
                    Some(ref_id)
                } else {
                    None
                }
            } else {
                None
            }
        }
        LiNo::Link {
            id: Some(ref_id),
            values,
        } if values.is_empty() => Some(ref_id),
        _ => None,
    }
}

// Helper to get values from a link
fn get_values(lino: &LiNo<String>) -> Option<&Vec<LiNo<String>>> {
    match lino {
        LiNo::Link { values, .. } => {
            // If it's a wrapper link (outer link)
            if values.len() == 1 {
                if let LiNo::Link {
                    values: inner_values,
                    ..
                } = &values[0]
                {
                    return Some(inner_values);
                }
            }
            Some(values)
        }
        _ => None,
    }
}

// ============================================================================
// Backtick Quote Tests (Single Backtick)
// ============================================================================

#[test]
fn test_backtick_quoted_reference() {
    let result = parse_lino("`backtick quoted`").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"backtick quoted".to_string())
    );
}

#[test]
fn test_backtick_quoted_with_spaces() {
    let result = parse_lino("`text with spaces`").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with spaces".to_string())
    );
}

#[test]
fn test_backtick_quoted_multiline() {
    let result = parse_lino("(`line1\nline2`)").unwrap();
    if let LiNo::Link { values, .. } = &result {
        if let Some(inner) = values.first() {
            if let LiNo::Link {
                values: inner_vals, ..
            } = inner
            {
                if let Some(LiNo::Ref(id)) = inner_vals.first() {
                    assert_eq!(id, "line1\nline2");
                    return;
                }
            }
            if let LiNo::Ref(id) = inner {
                assert_eq!(id, "line1\nline2");
                return;
            }
        }
    }
    panic!("Expected multiline backtick content");
}

#[test]
fn test_backtick_quoted_with_escaped_backtick() {
    let result = parse_lino("`text with `` escaped backtick`").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with ` escaped backtick".to_string())
    );
}

// ============================================================================
// Single Quote Tests (with escaping)
// ============================================================================

#[test]
fn test_single_quote_with_escaped_single_quote() {
    let result = parse_lino("'text with '' escaped quote'").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with ' escaped quote".to_string())
    );
}

// ============================================================================
// Double Quote Tests (with escaping)
// ============================================================================

#[test]
fn test_double_quote_with_escaped_double_quote() {
    let result = parse_lino("\"text with \"\" escaped quote\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with \" escaped quote".to_string())
    );
}

// ============================================================================
// Double Quotes (2 quote chars) Tests
// ============================================================================

#[test]
fn test_double_double_quotes() {
    let result = parse_lino("\"\"double double quotes\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"double double quotes".to_string())
    );
}

#[test]
fn test_double_double_quotes_with_single_quote_inside() {
    let result = parse_lino("\"\"text with \" inside\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with \" inside".to_string())
    );
}

#[test]
fn test_double_double_quotes_with_escape() {
    let result = parse_lino("\"\"text with \"\"\"\" escaped double\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with \"\" escaped double".to_string())
    );
}

#[test]
fn test_double_single_quotes() {
    let result = parse_lino("''double single quotes''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"double single quotes".to_string())
    );
}

#[test]
fn test_double_single_quotes_with_single_quote_inside() {
    let result = parse_lino("''text with ' inside''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with ' inside".to_string())
    );
}

#[test]
fn test_double_single_quotes_with_escape() {
    let result = parse_lino("''text with '''' escaped single''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with '' escaped single".to_string())
    );
}

#[test]
fn test_double_backtick_quotes() {
    let result = parse_lino("``double backtick quotes``").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"double backtick quotes".to_string())
    );
}

#[test]
fn test_double_backtick_quotes_with_backtick_inside() {
    let result = parse_lino("``text with ` inside``").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with ` inside".to_string())
    );
}

#[test]
fn test_double_backtick_quotes_with_escape() {
    let result = parse_lino("``text with ```` escaped backtick``").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with `` escaped backtick".to_string())
    );
}

// ============================================================================
// Triple Quotes (3 quote chars) Tests
// ============================================================================

#[test]
fn test_triple_double_quotes() {
    let result = parse_lino("\"\"\"triple double quotes\"\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"triple double quotes".to_string())
    );
}

#[test]
fn test_triple_double_quotes_with_double_quote_inside() {
    let result = parse_lino("\"\"\"text with \"\" inside\"\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with \"\" inside".to_string())
    );
}

#[test]
fn test_triple_double_quotes_with_escape() {
    let result = parse_lino("\"\"\"text with \"\"\"\"\"\" escaped triple\"\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with \"\"\" escaped triple".to_string())
    );
}

#[test]
fn test_triple_single_quotes() {
    let result = parse_lino("'''triple single quotes'''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"triple single quotes".to_string())
    );
}

#[test]
fn test_triple_single_quotes_with_double_quote_inside() {
    let result = parse_lino("'''text with '' inside'''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with '' inside".to_string())
    );
}

#[test]
fn test_triple_single_quotes_with_escape() {
    let result = parse_lino("'''text with '''''' escaped triple'''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with ''' escaped triple".to_string())
    );
}

#[test]
fn test_triple_backtick_quotes() {
    let result = parse_lino("```triple backtick quotes```").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"triple backtick quotes".to_string())
    );
}

#[test]
fn test_triple_backtick_quotes_with_double_backtick_inside() {
    let result = parse_lino("```text with `` inside```").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with `` inside".to_string())
    );
}

#[test]
fn test_triple_backtick_quotes_with_escape() {
    let result = parse_lino("```text with `````` escaped triple```").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with ``` escaped triple".to_string())
    );
}

// ============================================================================
// Quadruple Quotes (4 quote chars) Tests
// ============================================================================

#[test]
fn test_quadruple_double_quotes() {
    let result = parse_lino("\"\"\"\"quadruple double quotes\"\"\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"quadruple double quotes".to_string())
    );
}

#[test]
fn test_quadruple_double_quotes_with_triple_quote_inside() {
    let result = parse_lino("\"\"\"\"text with \"\"\" inside\"\"\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with \"\"\" inside".to_string())
    );
}

#[test]
fn test_quadruple_single_quotes() {
    let result = parse_lino("''''quadruple single quotes''''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"quadruple single quotes".to_string())
    );
}

#[test]
fn test_quadruple_backtick_quotes() {
    let result = parse_lino("````quadruple backtick quotes````").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"quadruple backtick quotes".to_string())
    );
}

// ============================================================================
// Quintuple Quotes (5 quote chars) Tests
// ============================================================================

#[test]
fn test_quintuple_double_quotes() {
    let result = parse_lino("\"\"\"\"\"quintuple double quotes\"\"\"\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"quintuple double quotes".to_string())
    );
}

#[test]
fn test_quintuple_double_quotes_with_quad_quote_inside() {
    let result = parse_lino("\"\"\"\"\"text with \"\"\"\" inside\"\"\"\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"text with \"\"\"\" inside".to_string())
    );
}

#[test]
fn test_quintuple_single_quotes() {
    let result = parse_lino("'''''quintuple single quotes'''''").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"quintuple single quotes".to_string())
    );
}

#[test]
fn test_quintuple_backtick_quotes() {
    let result = parse_lino("`````quintuple backtick quotes`````").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"quintuple backtick quotes".to_string())
    );
}

// ============================================================================
// Complex Scenarios Tests
// ============================================================================

#[test]
fn test_mixed_quotes_in_link() {
    let result = parse_lino("(\"double\" 'single' `backtick`)").unwrap();
    if let Some(values) = get_values(&result) {
        assert_eq!(values.len(), 3);
        if let LiNo::Ref(id) = &values[0] {
            assert_eq!(id, "double");
        }
        if let LiNo::Ref(id) = &values[1] {
            assert_eq!(id, "single");
        }
        if let LiNo::Ref(id) = &values[2] {
            assert_eq!(id, "backtick");
        }
    } else {
        panic!("Expected values in link");
    }
}

#[test]
fn test_backtick_as_id_in_link() {
    let result = parse_lino("(`myId`: value1 value2)").unwrap();
    if let LiNo::Link { values, .. } = &result {
        if let Some(LiNo::Link {
            id,
            values: inner_values,
        }) = values.first()
        {
            assert_eq!(id.as_deref(), Some("myId"));
            assert_eq!(inner_values.len(), 2);
            return;
        }
    }
    panic!("Expected link with backtick id");
}

#[test]
fn test_code_block_like_content() {
    let result = parse_lino("```const x = 1;```").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"const x = 1;".to_string())
    );
}

#[test]
fn test_nested_quotes_in_markdown() {
    let result = parse_lino("``Use `code` in markdown``").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"Use `code` in markdown".to_string())
    );
}

#[test]
fn test_json_string_with_quotes() {
    let result = parse_lino("\"\"{ \"key\": \"value\"}\"\"").unwrap();
    assert_eq!(
        get_single_ref_id(&result),
        Some(&"{ \"key\": \"value\"}".to_string())
    );
}

// ============================================================================
// Edge Cases
// ============================================================================

#[test]
fn test_whitespace_preserved_in_quotes() {
    let result = parse_lino("\"  spaces  \"").unwrap();
    assert_eq!(get_single_ref_id(&result), Some(&"  spaces  ".to_string()));
}

#[test]
fn test_multiline_in_double_double_quotes() {
    let result = parse_lino("(\"\"line1\nline2\"\")").unwrap();
    if let Some(values) = get_values(&result) {
        if let Some(LiNo::Ref(id)) = values.first() {
            assert_eq!(id, "line1\nline2");
            return;
        }
    }
    panic!("Expected multiline content in double double quotes");
}
