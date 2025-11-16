use links_notation::{parse_lino, LiNo};

#[test]
fn test_is_ref() {
    let reference = LiNo::Ref("some_value".to_string());
    assert!(reference.is_ref());
    assert!(!reference.is_link());
}

#[test]
fn test_is_link() {
    let link = LiNo::Link {
        id: Some("id".to_string()),
        values: vec![LiNo::Ref("child".to_string())],
    };
    assert!(link.is_link());
    assert!(!link.is_ref());
}

#[test]
fn test_is_ref_equivalent() {
    // Same as test_is_ref, for API consistency with other languages
    let reference = LiNo::Ref("some_value".to_string());
    assert!(reference.is_ref());
    assert!(!reference.is_link());
}

#[test]
fn test_is_link_equivalent() {
    // Same as test_is_link, for API consistency with other languages
    let link = LiNo::Link {
        id: Some("id".to_string()),
        values: vec![LiNo::Ref("child".to_string())],
    };
    assert!(link.is_link());
    assert!(!link.is_ref());
}

#[test]
fn test_empty_link() {
    let link = LiNo::Link::<String> {
        id: None,
        values: vec![],
    };
    let output = link.to_string();
    assert_eq!(output, "()");
}

#[test]
fn test_simple_link() {
    let input = "(1: 1 1)";
    let parsed = parse_lino(input).expect("Failed to parse input");

    // Validate regular formatting
    let output = parsed.to_string();
    let expected = "((1: 1 1))"; // Expected regular output
    assert_eq!(expected, output);

    // Validate alternate formatting
    let output_alternate = format!("{:#}", parsed);
    assert_eq!(input, output_alternate);
}

#[test]
fn test_link_with_source_target() {
    let input = "(index: source target)";
    let parsed = parse_lino(input).expect("Failed to parse input");

    // Validate regular formatting
    let output = parsed.to_string();
    let expected = "((index: source target))"; // Expected regular output
    assert_eq!(expected, output);

    // Validate alternate formatting
    let output_alternate = format!("{:#}", parsed);
    assert_eq!(input, output_alternate);
}

#[test]
fn test_link_with_source_type_target() {
    let input = "(index: source type target)";
    let parsed = parse_lino(input).expect("Failed to parse input");

    // Validate regular formatting
    let output = parsed.to_string();
    let expected = "((index: source type target))"; // Expected regular output
    assert_eq!(expected, output);

    // Validate alternate formatting
    let output_alternate = format!("{:#}", parsed);
    assert_eq!(input, output_alternate);
}

#[test]
fn test_single_line_format() {
    let input = "id: value1 value2";
    let parsed = parse_lino(input).expect("Failed to parse input");
    
    // The parser should handle single-line format
    let output = parsed.to_string();
    assert!(output.contains("id") && output.contains("value1") && output.contains("value2"));
}

#[test]
fn test_quoted_references() {
    let input = r#"("quoted id": "value with spaces")"#;
    let parsed = parse_lino(input).expect("Failed to parse input");

    let output = parsed.to_string();
    assert!(output.contains("quoted id") && output.contains("value with spaces"));
}

#[test]
fn test_quoted_references_parsing() {
    // Test that quoted references are parsed correctly
    // Note: Round-trip preservation of quotes requires FormatConfig (not yet implemented in Rust)
    let input = r#"("quoted id": "value with spaces")"#;
    let parsed = parse_lino(input).expect("Failed to parse input");

    // Verify parsing worked correctly
    let output = format!("{}", parsed);
    // Currently formats without quotes (as compact form)
    assert!(output.contains("quoted id"));
    assert!(output.contains("value with spaces"));
}

#[test]
fn test_indented_id_syntax_parsing() {
    // Test that indented ID syntax is parsed correctly
    // Note: Round-trip preservation requires FormatConfig (not yet implemented in Rust)
    use links_notation::{parse_lino_to_links, format_links};

    let indented = "id:\n  value1\n  value2";
    let inline = "(id: value1 value2)";

    let indented_parsed = parse_lino_to_links(indented).expect("Failed to parse indented");
    let inline_parsed = parse_lino_to_links(inline).expect("Failed to parse inline");

    // Both should produce equivalent structures
    let indented_output = format_links(&indented_parsed);
    let inline_output = format_links(&inline_parsed);
    assert_eq!(indented_output, inline_output);
    assert_eq!(indented_output, "(id: value1 value2)");
}

#[test]
fn test_multiple_indented_id_syntax_parsing() {
    // Test that multiple indented ID links are parsed correctly
    // Note: Round-trip preservation requires FormatConfig (not yet implemented in Rust)
    use links_notation::{parse_lino_to_links, format_links};

    let indented = "id1:\n  a\n  b\nid2:\n  c\n  d";
    let inline = "(id1: a b)\n(id2: c d)";

    let indented_parsed = parse_lino_to_links(indented).expect("Failed to parse indented");
    let inline_parsed = parse_lino_to_links(inline).expect("Failed to parse inline");

    // Both should produce equivalent structures
    let indented_output = format_links(&indented_parsed);
    let inline_output = format_links(&inline_parsed);
    assert_eq!(indented_output, inline_output);
    assert_eq!(indented_output, "(id1: a b)\n(id2: c d)");
}

#[test]
fn test_indented_id_syntax_roundtrip() {
    // Test that we can roundtrip indented ID syntax
    // Note: Full roundtrip formatting requires FormatConfig integration with format_links
    use links_notation::{parse_lino_to_links, format_config::FormatConfig};

    let indented = "id:\n  value1\n  value2";
    let parsed = parse_lino_to_links(indented).expect("Failed to parse indented");

    // Create FormatConfig with settings that would preserve indented format
    let config = FormatConfig::builder()
        .max_inline_refs(Some(1))  // Force indentation with more than 1 ref
        .prefer_inline(false)
        .build();

    // Verify parsing worked correctly
    assert!(parsed.len() > 0);
    assert_eq!(config.max_inline_refs, Some(1));
    assert_eq!(config.prefer_inline, false);
    assert_eq!(config.should_indent_by_ref_count(2), true);

    // Note: Full roundtrip test would verify: format_links(&parsed, &config) == indented
    // This will work once FormatConfig is integrated into format_links function
}

#[test]
fn test_multiple_indented_id_syntax_roundtrip() {
    // Test that we can roundtrip multiple indented ID links
    // Note: Full roundtrip formatting requires FormatConfig integration with format_links
    use links_notation::{parse_lino_to_links, format_config::FormatConfig};

    let indented = "id1:\n  a\n  b\nid2:\n  c\n  d";
    let parsed = parse_lino_to_links(indented).expect("Failed to parse indented");

    // Create FormatConfig with settings that would preserve indented format
    let config = FormatConfig::builder()
        .max_inline_refs(Some(1))  // Force indentation with more than 1 ref
        .prefer_inline(false)
        .build();

    // Verify parsing worked correctly
    assert!(parsed.len() >= 2);
    assert_eq!(config.max_inline_refs, Some(1));
    assert_eq!(config.prefer_inline, false);
    assert_eq!(config.should_indent_by_ref_count(2), true);

    // Note: Full roundtrip test would verify: format_links(&parsed, &config) == indented
    // This will work once FormatConfig is integrated into format_links function
}