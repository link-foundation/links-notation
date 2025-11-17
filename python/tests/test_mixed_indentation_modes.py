"""Mixed indentation modes tests - ported from JS/Rust implementations."""

from links_notation import Parser, format_links


parser = Parser()


def test_hero_example_mixed_modes():
    """Test hero example with mixed indentation modes."""
    input_text = """empInfo
  employees:
    (
      name (James Kirk)
      age 40
    )
    (
      name (Jean-Luc Picard)
      age 45
    )
    (
      name (Wesley Crusher)
      age 27
    )"""

    result = parser.parse(input_text)

    assert len(result) > 0
    formatted = format_links(result)
    assert "empInfo" in formatted
    assert "employees:" in formatted
    assert "James Kirk" in formatted
    assert "Jean-Luc Picard" in formatted
    assert "Wesley Crusher" in formatted


def test_hero_example_alternative_format():
    """Test hero example with alternative format."""
    input_text = """empInfo
  (
    employees:
      (
        name (James Kirk)
        age 40
      )
      (
        name (Jean-Luc Picard)
        age 45
      )
      (
        name (Wesley Crusher)
        age 27
      )
  )"""

    result = parser.parse(input_text)

    assert len(result) > 0
    formatted = format_links(result)
    assert "empInfo" in formatted
    assert "employees:" in formatted
    assert "James Kirk" in formatted
    assert "Jean-Luc Picard" in formatted
    assert "Wesley Crusher" in formatted


def test_hero_example_equivalence():
    """Test that hero example formats are equivalent."""
    version1 = """empInfo
  employees:
    (
      name (James Kirk)
      age 40
    )
    (
      name (Jean-Luc Picard)
      age 45
    )
    (
      name (Wesley Crusher)
      age 27
    )"""

    version2 = """empInfo
  (
    employees:
      (
        name (James Kirk)
        age 40
      )
      (
        name (Jean-Luc Picard)
        age 45
      )
      (
        name (Wesley Crusher)
        age 27
      )
  )"""

    result1 = parser.parse(version1)
    result2 = parser.parse(version2)

    formatted1 = format_links(result1)
    formatted2 = format_links(result2)

    assert formatted1 == formatted2


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


def test_sequence_context_with_complex_values():
    """Test sequence context with complex values."""
    input_text = """employees:
  (
    name (James Kirk)
    age 40
  )
  (
    name (Jean-Luc Picard)
    age 45
  )"""

    result = parser.parse(input_text)

    assert len(result) > 0
    assert len(result) == 1
    formatted = format_links(result)
    assert "employees:" in formatted
    assert "James Kirk" in formatted
    assert "Jean-Luc Picard" in formatted


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
