use links_notation::format_config::FormatConfig;

#[test]
fn format_config_basic() {
    let config = FormatConfig::default();
    assert_eq!(config.less_parentheses, false);
    assert_eq!(config.max_line_length, 80);
    assert_eq!(config.indent_long_lines, false);
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
    assert_eq!(config.indent_long_lines, true);
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
    assert_eq!(config.should_indent_by_ref_count(4), true);
    // Note: Full formatting integration would test actual output here
}

#[test]
fn format_with_consecutive_grouping() {
    // Create a config with consecutive grouping enabled
    let config = FormatConfig::builder().group_consecutive(true).build();

    // Verify config is set correctly
    assert_eq!(config.group_consecutive, true);
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

    assert_eq!(config.less_parentheses, true);
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

    assert_eq!(config.should_indent_by_length("short"), false);
    assert_eq!(config.should_indent_by_length(&"a".repeat(100)), true);
}

#[test]
fn should_indent_by_ref_count() {
    let config = FormatConfig::builder().max_inline_refs(Some(3)).build();

    assert_eq!(config.should_indent_by_ref_count(2), false);
    assert_eq!(config.should_indent_by_ref_count(3), false);
    assert_eq!(config.should_indent_by_ref_count(4), true);
}
