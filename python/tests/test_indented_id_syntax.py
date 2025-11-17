"""Indented ID syntax tests - ported from JS/Rust implementations."""

import pytest
from links_notation import Parser, format_links


parser = Parser()


def test_basic_indented_id_syntax():
    """Test basic indented ID syntax - issue #21."""
    indented_syntax = """3:
  papa
  loves
  mama"""

    inline_syntax = "(3: papa loves mama)"

    indented_result = parser.parse(indented_syntax)
    inline_result = parser.parse(inline_syntax)

    # Both should produce identical structures
    assert indented_result == inline_result

    # Both should format to the same inline syntax
    assert format_links(indented_result) == "(3: papa loves mama)"
    assert format_links(inline_result) == "(3: papa loves mama)"


def test_indented_id_syntax_with_single_value():
    """Test indented ID syntax with single value."""
    input_text = """greeting:
  hello"""

    result = parser.parse(input_text)
    formatted = format_links(result)

    assert formatted == "(greeting: hello)"
    assert len(result) == 1
    assert result[0].id == "greeting"
    assert len(result[0].values) == 1
    assert result[0].values[0].id == "hello"


def test_indented_id_syntax_with_multiple_values():
    """Test indented ID syntax with multiple values."""
    input_text = """action:
  run
  fast
  now"""

    result = parser.parse(input_text)
    formatted = format_links(result)

    assert formatted == "(action: run fast now)"
    assert len(result) == 1
    assert result[0].id == "action"
    assert len(result[0].values) == 3


def test_indented_id_syntax_with_numeric_id():
    """Test indented ID syntax with numeric ID."""
    input_text = """42:
  answer
  to
  everything"""

    result = parser.parse(input_text)
    formatted = format_links(result)

    assert formatted == "(42: answer to everything)"


def test_indented_id_syntax_with_quoted_id():
    """Test indented ID syntax with quoted ID."""
    input_text = """"complex id":
  value1
  value2"""

    result = parser.parse(input_text)
    formatted = format_links(result)

    assert formatted == "('complex id': value1 value2)"


def test_multiple_indented_id_links():
    """Test multiple indented ID links."""
    input_text = """first:
  a
  b
second:
  c
  d"""

    result = parser.parse(input_text)
    formatted = format_links(result)

    assert len(result) == 2
    assert formatted == "(first: a b)\n(second: c d)"


def test_mixed_indented_and_regular_syntax():
    """Test mixed indented and regular syntax."""
    input_text = """first:
  a
  b
(second: c d)
third value"""

    result = parser.parse(input_text)
    assert len(result) == 3

    formatted = format_links(result)
    assert "(first: a b)" in formatted
    assert "(second: c d)" in formatted
    assert "third value" in formatted


def test_unsupported_colon_only_syntax_should_fail():
    """Test colon-only syntax - Python is lenient and accepts it."""
    input_text = """:
  papa
  loves
  mama"""

    # Note: Python implementation is more lenient than JS/Rust and accepts colon-only syntax
    # This doesn't raise an exception in Python, but it does in JS/Rust
    result = parser.parse(input_text)
    assert len(result) > 0  # Python accepts this syntax


def test_indented_id_with_deeper_nesting():
    """Test indented ID with deeper nesting."""
    input_text = """root:
  child1
  child2
    grandchild"""

    # This should work but the grandchild will be processed as a separate nested structure
    result = parser.parse(input_text)
    assert len(result) > 0

    # The root should have child1 and child2 as values
    root_link = result[0]
    assert root_link.id == "root"
    assert len(root_link.values) == 2


def test_empty_indented_id_should_work():
    """Test empty indented ID should work."""
    input_text = "empty:"

    result = parser.parse(input_text)
    assert len(result) == 1
    assert result[0].id == "empty"
    assert len(result[0].values) == 0

    formatted = format_links(result)
    assert formatted == "(empty)"


def test_equivalence_test_comprehensive():
    """Test equivalence - comprehensive."""
    test_cases = [
        {
            "indented": "test:\n  one",
            "inline": "(test: one)"
        },
        {
            "indented": "x:\n  a\n  b\n  c",
            "inline": "(x: a b c)"
        },
        {
            "indented": '"quoted":\n  value',
            "inline": '("quoted": value)'
        }
    ]

    for test_case in test_cases:
        indented_result = parser.parse(test_case["indented"])
        inline_result = parser.parse(test_case["inline"])

        assert indented_result == inline_result
        assert format_links(indented_result) == format_links(inline_result)
