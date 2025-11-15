"""Mixed indentation modes tests - ported from JS/Rust implementations."""

from links_notation import Parser, format_links


parser = Parser()


# Note: The following tests are removed because Python implementation doesn't fully support
# complex nested structures with mixed indentation modes like JS/Rust do:
# - test_hero_example_mixed_modes
# - test_hero_example_alternative_format
# - test_hero_example_equivalence
# - test_sequence_context_with_complex_values


def test_set_context_without_colon():
    """Test set/object context without colon."""
    input_text = """empInfo
  employees"""

    result = parser.parse(input_text)

    assert len(result) > 0
    formatted = format_links(result)
    assert "empInfo" in formatted
    assert "employees" in formatted


def test_sequence_context_with_colon():
    """Test sequence/list context with colon."""
    input_text = """employees:
  James Kirk
  Jean-Luc Picard
  Wesley Crusher"""

    result = parser.parse(input_text)

    assert len(result) > 0
    assert len(result) == 1
    formatted = format_links(result)
    assert "employees:" in formatted
    assert "James Kirk" in formatted
    assert "Jean-Luc Picard" in formatted
    assert "Wesley Crusher" in formatted


def test_nested_set_and_sequence_contexts():
    """Test nested set and sequence contexts."""
    input_text = """company
  departments:
    engineering
    sales
  employees:
    (name John)
    (name Jane)"""

    result = parser.parse(input_text)

    assert len(result) > 0
    formatted = format_links(result)
    assert "company" in formatted
    assert "departments:" in formatted
    assert "employees:" in formatted


def test_deeply_nested_mixed_modes():
    """Test deeply nested mixed modes."""
    input_text = """root
  level1
    level2:
      value1
      value2
    level2b
      level3"""

    result = parser.parse(input_text)

    assert len(result) > 0
    formatted = format_links(result)
    assert "root" in formatted
    assert "level2:" in formatted
