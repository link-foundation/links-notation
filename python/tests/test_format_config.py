"""Tests for FormatConfig functionality."""

from links_notation import Parser, Link, format_links, FormatConfig


parser = Parser()


def test_format_config_basic():
    """Test basic FormatConfig usage."""
    config = FormatConfig()
    assert config.less_parentheses == False
    assert config.max_line_length == 80
    assert config.indent_long_lines == False


def test_format_with_line_length_limit():
    """Test formatting with line length limit."""
    # Create a link with many references that exceeds line length
    link = Link('sequence', [Link(str(i)) for i in range(1, 11)])

    # Format with line length limit
    # The line '(sequence: 1 2 3 4 5 6 7 8 9 10)' is 32 chars, so use threshold of 30
    config = FormatConfig(
        indent_long_lines=True,
        max_line_length=30,
        prefer_inline=False
    )

    output = link.format(config)
    assert 'sequence:' in output
    assert '\n' in output  # Should be indented across multiple lines


def test_format_with_max_inline_refs():
    """Test formatting with max inline references."""
    # Create a link with 4 references
    link = Link('id', [Link('1'), Link('2'), Link('3'), Link('4')])

    # Format with max_inline_refs=3 (should trigger indentation)
    config = FormatConfig(
        max_inline_refs=3,
        prefer_inline=False
    )

    output = link.format(config)
    assert 'id:' in output
    assert '\n' in output  # Should be indented


def test_format_with_consecutive_grouping():
    """Test formatting with consecutive link grouping."""
    links = [
        Link('SetA', [Link('a')]),
        Link('SetA', [Link('b')]),
        Link('SetA', [Link('c')])
    ]

    config = FormatConfig(group_consecutive=True)

    output = format_links(links, config)

    # Should group consecutive SetA links
    # The output should have SetA with all values a, b, c
    assert 'SetA' in output
    assert 'a' in output
    assert 'b' in output
    assert 'c' in output


def test_format_config_less_parentheses():
    """Test FormatConfig with less_parentheses option."""
    link = Link('id', [Link('value')])

    config = FormatConfig(less_parentheses=True)

    output = link.format(config)
    # Should not have outer parentheses
    assert output == 'id: value'


def test_format_config_custom_indent():
    """Test FormatConfig with custom indent string."""
    link = Link('id', [Link('1'), Link('2'), Link('3'), Link('4')])

    config = FormatConfig(
        max_inline_refs=3,
        prefer_inline=False,
        indent_string='    '  # 4 spaces
    )

    output = link.format(config)
    # Check for custom indentation
    assert '    ' in output  # Should use 4 spaces


def test_roundtrip_with_line_length_formatting():
    """Test that line-length-based formatting preserves data."""
    # Create a simple link
    original_link = Link('test', [Link('a'), Link('b'), Link('c')])

    # Format with indentation
    config = FormatConfig(
        max_inline_refs=2,
        prefer_inline=False
    )

    formatted = original_link.format(config)

    # Parse it back
    parsed = parser.parse(formatted)

    # Should preserve the structure (though format may differ)
    assert len(parsed) > 0


def test_should_indent_by_length():
    """Test shouldIndentByLength helper method."""
    config = FormatConfig(indent_long_lines=True, max_line_length=80)

    short_line = "short"
    long_line = "a" * 100

    assert config.should_indent_by_length(short_line) == False
    assert config.should_indent_by_length(long_line) == True


def test_should_indent_by_ref_count():
    """Test shouldIndentByRefCount helper method."""
    config = FormatConfig(max_inline_refs=3)

    assert config.should_indent_by_ref_count(2) == False
    assert config.should_indent_by_ref_count(3) == False
    assert config.should_indent_by_ref_count(4) == True
