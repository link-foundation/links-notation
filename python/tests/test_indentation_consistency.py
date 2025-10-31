"""Tests for indentation consistency (issue #135)."""

from links_notation import Parser, format_links


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

    # Compare the entire formatted output (complete round trip test)
    assert format_links(result_with) == format_links(result_without)


def test_two_spaces_vs_four_spaces_indentation():
    """Test full example with 2-space vs 4-space indentation."""
    parser = Parser()

    # Example with 2 spaces per level
    two_spaces = """TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
TELEGRAM_ALLOWED_CHATS:
  -1002975819706
  -1002861722681
TELEGRAM_HIVE_OVERRIDES:
  --all-issues
  --once
  --auto-fork
  --skip-issues-with-prs
  --attach-logs
  --verbose
  --no-tool-check
TELEGRAM_SOLVE_OVERRIDES:
  --auto-fork
  --auto-continue
  --attach-logs
  --verbose
  --no-tool-check
TELEGRAM_BOT_VERBOSE: true"""

    # Example with 4 spaces per level
    four_spaces = """TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'
TELEGRAM_ALLOWED_CHATS:
    -1002975819706
    -1002861722681
TELEGRAM_HIVE_OVERRIDES:
    --all-issues
    --once
    --auto-fork
    --skip-issues-with-prs
    --attach-logs
    --verbose
    --no-tool-check
TELEGRAM_SOLVE_OVERRIDES:
    --auto-fork
    --auto-continue
    --attach-logs
    --verbose
    --no-tool-check
TELEGRAM_BOT_VERBOSE: true"""

    result_two = parser.parse(two_spaces)
    result_four = parser.parse(four_spaces)

    # Compare the entire formatted output (complete round trip test)
    assert format_links(result_two) == format_links(result_four)


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

    # Compare the entire formatted output (complete round trip test)
    assert format_links(result_two) == format_links(result_four)


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

    # Compare the entire formatted output (complete round trip test)
    assert format_links(result_two) == format_links(result_four)
