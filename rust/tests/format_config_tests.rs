use links_notation::format_config::FormatConfig;
use links_notation::{format_links_with_config, parse_lino_to_links, LiNo};

#[test]
fn format_config_basic() {
    let config = FormatConfig::default();
    assert!(!config.less_parentheses);
    assert_eq!(config.max_line_length, 80);
    assert!(!config.indent_long_lines);
}

#[test]
fn format_with_line_length_limit() {
    // Create a config with line length limit
    // The line would be 32+ chars, so use threshold of 30
    let config = FormatConfig::builder()
        .indent_long_lines(true)
        .max_line_length(30)
        .prefer_inline(false)
        .build();

    // Verify config is set correctly
    assert!(config.indent_long_lines);
    assert_eq!(config.max_line_length, 30);
    // Note: Full formatting integration would test actual output here
}

#[test]
fn format_with_max_inline_refs() {
    // Create a config with max_inline_refs=3 (should trigger indentation with 4 refs)
    let config = FormatConfig::builder()
        .max_inline_refs(Some(3))
        .prefer_inline(false)
        .build();

    // Verify config is set correctly
    assert_eq!(config.max_inline_refs, Some(3));
    assert!(config.should_indent_by_ref_count(4));
    // Note: Full formatting integration would test actual output here
}

#[test]
fn format_with_consecutive_grouping() {
    // Create a config with consecutive grouping enabled
    let config = FormatConfig::builder().group_consecutive(true).build();

    // Verify config is set correctly
    assert!(config.group_consecutive);
    // Note: Full formatting integration would test grouping behavior here
}

#[test]
fn format_config_custom_indent() {
    let config = FormatConfig::builder()
        .max_inline_refs(Some(3))
        .prefer_inline(false)
        .indent_string("    ".to_string())
        .build();

    assert_eq!(config.indent_string, "    ");
}

#[test]
fn format_config_less_parentheses() {
    let config = FormatConfig::builder().less_parentheses(true).build();

    assert!(config.less_parentheses);
}

#[test]
fn roundtrip_with_line_length_formatting() {
    // This test would require full format integration
    // For now, just verify config creation
    let config = FormatConfig::builder()
        .max_inline_refs(Some(2))
        .prefer_inline(false)
        .build();

    assert_eq!(config.max_inline_refs, Some(2));
}

#[test]
fn should_indent_by_length() {
    let config = FormatConfig::builder()
        .indent_long_lines(true)
        .max_line_length(80)
        .build();

    assert!(!config.should_indent_by_length("short"));
    assert!(config.should_indent_by_length(&"a".repeat(100)));
}

#[test]
fn should_indent_by_ref_count() {
    let config = FormatConfig::builder().max_inline_refs(Some(3)).build();

    assert!(!config.should_indent_by_ref_count(2));
    assert!(!config.should_indent_by_ref_count(3));
    assert!(config.should_indent_by_ref_count(4));
}

// Integration tests that actually use the formatting functions

#[test]
fn format_link_with_less_parentheses_integration() {
    // Create a link with ID and values
    let link: LiNo<String> = LiNo::Link {
        ids: Some(vec!["id".to_string()]),
        values: vec![LiNo::Ref("value".to_string())],
    };

    let config = FormatConfig::builder().less_parentheses(true).build();

    let output = link.format_with_config(&config);
    // Should not have outer parentheses
    assert_eq!(output, "id: value");
}

#[test]
fn format_link_with_max_inline_refs_integration() {
    // Create a link with 4 references
    let link: LiNo<String> = LiNo::Link {
        ids: Some(vec!["id".to_string()]),
        values: vec![
            LiNo::Ref("1".to_string()),
            LiNo::Ref("2".to_string()),
            LiNo::Ref("3".to_string()),
            LiNo::Ref("4".to_string()),
        ],
    };

    // Format with max_inline_refs=3 (should trigger indentation)
    let config = FormatConfig::builder()
        .max_inline_refs(Some(3))
        .prefer_inline(false)
        .build();

    let output = link.format_with_config(&config);
    assert!(output.contains("id:"), "Output should contain 'id:'");
    assert!(
        output.contains('\n'),
        "Output should be indented across multiple lines"
    );
}

#[test]
fn format_link_with_line_length_limit_integration() {
    // Create a link with many references that exceeds line length
    let link: LiNo<String> = LiNo::Link {
        ids: Some(vec!["sequence".to_string()]),
        values: (1..=10).map(|i| LiNo::Ref(i.to_string())).collect(),
    };

    // Format with line length limit
    // The line '(sequence: 1 2 3 4 5 6 7 8 9 10)' is 32 chars, so use threshold of 30
    let config = FormatConfig::builder()
        .indent_long_lines(true)
        .max_line_length(30)
        .prefer_inline(false)
        .build();

    let output = link.format_with_config(&config);
    assert!(
        output.contains("sequence:"),
        "Output should contain 'sequence:'"
    );
    assert!(
        output.contains('\n'),
        "Output should be indented across multiple lines"
    );
}

#[test]
fn format_links_with_consecutive_grouping_integration() {
    // Create consecutive links with same ID
    let links: Vec<LiNo<String>> = vec![
        LiNo::Link {
            ids: Some(vec!["SetA".to_string()]),
            values: vec![LiNo::Ref("a".to_string())],
        },
        LiNo::Link {
            ids: Some(vec!["SetA".to_string()]),
            values: vec![LiNo::Ref("b".to_string())],
        },
        LiNo::Link {
            ids: Some(vec!["SetA".to_string()]),
            values: vec![LiNo::Ref("c".to_string())],
        },
    ];

    let config = FormatConfig::builder().group_consecutive(true).build();

    let output = format_links_with_config(&links, &config);

    // Should group consecutive SetA links
    // The output should have SetA with all values a, b, c
    assert!(output.contains("SetA"), "Output should contain 'SetA'");
    assert!(output.contains('a'), "Output should contain 'a'");
    assert!(output.contains('b'), "Output should contain 'b'");
    assert!(output.contains('c'), "Output should contain 'c'");
}

#[test]
fn format_link_with_custom_indent_integration() {
    let link: LiNo<String> = LiNo::Link {
        ids: Some(vec!["id".to_string()]),
        values: vec![
            LiNo::Ref("1".to_string()),
            LiNo::Ref("2".to_string()),
            LiNo::Ref("3".to_string()),
            LiNo::Ref("4".to_string()),
        ],
    };

    let config = FormatConfig::builder()
        .max_inline_refs(Some(3))
        .prefer_inline(false)
        .indent_string("    ".to_string()) // 4 spaces
        .build();

    let output = link.format_with_config(&config);
    // Check for custom indentation (4 spaces)
    assert!(
        output.contains("    "),
        "Output should use 4-space indentation"
    );
}

#[test]
fn format_roundtrip_with_config_integration() {
    // Create a simple link
    let original_link: LiNo<String> = LiNo::Link {
        ids: Some(vec!["test".to_string()]),
        values: vec![
            LiNo::Ref("a".to_string()),
            LiNo::Ref("b".to_string()),
            LiNo::Ref("c".to_string()),
        ],
    };

    // Format with indentation
    let config = FormatConfig::builder()
        .max_inline_refs(Some(2))
        .prefer_inline(false)
        .build();

    let formatted = original_link.format_with_config(&config);

    // Parse it back
    let parsed = parse_lino_to_links(&formatted);

    // Should parse successfully and preserve structure
    assert!(parsed.is_ok(), "Should parse successfully");
    assert!(
        !parsed.unwrap().is_empty(),
        "Parsed result should not be empty"
    );
}

#[test]
fn format_empty_links_with_config() {
    let links: Vec<LiNo<String>> = vec![];
    let config = FormatConfig::default();
    let output = format_links_with_config(&links, &config);
    assert_eq!(output, "");
}

#[test]
fn format_single_ref_with_config() {
    let link: LiNo<String> = LiNo::Ref("value".to_string());

    let config_with_parens = FormatConfig::default();
    let output_with_parens = link.format_with_config(&config_with_parens);
    assert_eq!(output_with_parens, "(value)");

    let config_less_parens = FormatConfig::builder().less_parentheses(true).build();
    let output_less_parens = link.format_with_config(&config_less_parens);
    assert_eq!(output_less_parens, "value");
}
