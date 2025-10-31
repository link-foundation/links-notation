"""Tests for indentation consistency (issue #135)."""

from links_notation import Parser


def test_leading_spaces_vs_no_leading_spaces():
    """Test that documents with and without leading spaces parse identically."""
    parser = Parser()

    # Example with 2 leading spaces (from issue #135)
    with_leading = """  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
  TELEGRAM_ALLOWED_CHATS:
    -1002975819706
    -1002861722681
  TELEGRAM_HIVE_OVERRIDES:
    --all-issues
    --once
  TELEGRAM_BOT_VERBOSE: true"""

    # Example without leading spaces (from issue #135)
    without_leading = """TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
TELEGRAM_ALLOWED_CHATS:
  -1002975819706
  -1002861722681
TELEGRAM_HIVE_OVERRIDES:
  --all-issues
  --once
TELEGRAM_BOT_VERBOSE: true"""

    result_with = parser.parse(with_leading)
    result_without = parser.parse(without_leading)

    # Both should produce the same number of links
    assert len(result_with) == len(result_without)

    # Both should have the same structure when formatted
    for i in range(len(result_with)):
        assert str(result_with[i]) == str(result_without[i])


def test_simple_two_vs_four_spaces_indentation():
    """Test that 2-space and 4-space indentation produce same structure."""
    parser = Parser()

    # Simple example with 2 spaces
    two_spaces = """parent:
  child1
  child2"""

    # Simple example with 4 spaces
    four_spaces = """parent:
    child1
    child2"""

    result_two = parser.parse(two_spaces)
    result_four = parser.parse(four_spaces)

    assert len(result_two) == len(result_four)
    assert str(result_two[0]) == str(result_four[0])


def test_three_level_nesting_with_different_indentation():
    """Test three-level nesting with different indentation amounts."""
    parser = Parser()

    # Three levels with 2 spaces
    two_spaces = """level1:
  level2:
    level3a
    level3b
  level2b"""

    # Three levels with 4 spaces
    four_spaces = """level1:
    level2:
        level3a
        level3b
    level2b"""

    result_two = parser.parse(two_spaces)
    result_four = parser.parse(four_spaces)

    assert len(result_two) == len(result_four)

    for i in range(len(result_two)):
        assert str(result_two[i]) == str(result_four[i])
