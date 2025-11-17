"""API tests for Lino parser - ported from JS/Rust implementations."""

from links_notation import Parser, Link, format_links


parser = Parser()


def test_is_ref():
    """Test is_ref behavior (Python doesn't have separate Ref type)."""
    # In Python, a Link with no values acts like a reference
    simple_link = Link('some_value')
    assert simple_link.id == 'some_value'
    assert simple_link.values == []


def test_is_link():
    """Test is_link behavior."""
    link = Link('id', [Link('child')])
    assert link.id == 'id'
    assert len(link.values) == 1
    assert link.values[0].id == 'child'


def test_is_ref_equivalent():
    """Test simple link behavior (equivalent to Rust is_ref test)."""
    simple_link = Link('some_value')
    assert simple_link.id == 'some_value'
    assert simple_link.values == []


def test_is_link_equivalent():
    """Test link with values."""
    link = Link('id', [Link('child')])
    assert link.id == 'id'
    assert len(link.values) == 1
    assert link.values[0].id == 'child'


def test_empty_link():
    """Test empty link formatting."""
    link = Link(None, [])
    output = str(link)
    assert output == '()'


def test_simple_link():
    """Test simple link parsing and formatting."""
    input_text = '(1: 1 1)'
    parsed = parser.parse(input_text)

    # Validate regular formatting
    output = parsed[0].format()
    expected = '(1: 1 1)'
    assert output == expected


def test_link_with_source_target():
    """Test link with source and target."""
    input_text = '(index: source target)'
    parsed = parser.parse(input_text)

    # Validate regular formatting
    output = parsed[0].format()
    assert output == input_text


def test_link_with_source_type_target():
    """Test link with source, type, and target."""
    input_text = '(index: source type target)'
    parsed = parser.parse(input_text)

    # Validate regular formatting
    output = parsed[0].format()
    assert output == input_text


def test_single_line_format():
    """Test single-line format parsing."""
    input_text = 'id: value1 value2'
    parsed = parser.parse(input_text)

    # The parser should handle single-line format
    output = parsed[0].format(True)  # less_parentheses mode
    assert 'id' in output
    assert 'value1' in output
    assert 'value2' in output


def test_quoted_references():
    """Test parsing of quoted references."""
    input_text = '("quoted id": "value with spaces")'
    parsed = parser.parse(input_text)

    output = parsed[0].format()
    assert 'quoted id' in output
    assert 'value with spaces' in output


def test_quoted_references_parsing():
    """Test that quoted references are parsed correctly."""
    input_text = '("quoted id": "value with spaces")'
    parsed = parser.parse(input_text)

    # Verify parsing worked correctly
    output = format_links(parsed)
    assert 'quoted id' in output
    assert 'value with spaces' in output


def test_indented_id_syntax_parsing():
    """Test that indented ID syntax is parsed correctly."""
    indented = "id:\n  value1\n  value2"
    inline = "(id: value1 value2)"

    indented_parsed = parser.parse(indented)
    inline_parsed = parser.parse(inline)

    # Both should produce equivalent structures
    indented_output = format_links(indented_parsed)
    inline_output = format_links(inline_parsed)
    assert indented_output == inline_output
    assert indented_output == "(id: value1 value2)"


def test_indented_id_syntax_roundtrip():
    """Test indented ID syntax roundtrip."""
    input_text = "id:\n  value1\n  value2"
    parsed = parser.parse(input_text)

    # Validate structure
    assert len(parsed) > 0
    assert 'id' in format_links(parsed)


def test_multiple_indented_id_syntax_parsing():
    """Test that multiple indented ID links are parsed correctly."""
    indented = "id1:\n  a\n  b\nid2:\n  c\n  d"
    inline = "(id1: a b)\n(id2: c d)"

    indented_parsed = parser.parse(indented)
    inline_parsed = parser.parse(inline)

    # Both should produce equivalent structures
    indented_output = format_links(indented_parsed)
    inline_output = format_links(inline_parsed)
    assert indented_output == inline_output
    assert indented_output == "(id1: a b)\n(id2: c d)"


def test_multiple_indented_id_syntax_roundtrip():
    """Test multiple indented ID syntax roundtrip."""
    input_text = "id1:\n  a\n  b\nid2:\n  c\n  d"
    parsed = parser.parse(input_text)

    # Validate structure
    assert len(parsed) >= 2
    output = format_links(parsed)
    assert 'id1' in output
    assert 'id2' in output
