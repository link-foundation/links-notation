"""Tests for multiline quoted string functionality."""

from links_notation import Parser

parser = Parser()


def test_multiline_double_quoted_reference():
    """Test multiline double quoted references."""
    input_text = """(
  "long
string literal representing
the reference"

  'another
long string literal
as another reference'
)"""
    result = parser.parse(input_text)

    assert len(result) > 0
    assert len(result) == 1

    link = result[0]
    assert link.id is None
    assert link.values is not None
    assert len(link.values) == 2

    assert link.values[0].id == """long
string literal representing
the reference"""

    assert link.values[1].id == """another
long string literal
as another reference"""


def test_simple_multiline_double_quoted():
    """Test simple multiline double quoted string."""
    input_text = """("line1
line2")"""
    result = parser.parse(input_text)

    assert len(result) > 0
    assert len(result) == 1

    link = result[0]
    assert link.id is None
    assert link.values is not None
    assert len(link.values) == 1
    assert link.values[0].id == "line1\nline2"


def test_simple_multiline_single_quoted():
    """Test simple multiline single quoted string."""
    input_text = """('line1
line2')"""
    result = parser.parse(input_text)

    assert len(result) > 0
    assert len(result) == 1

    link = result[0]
    assert link.id is None
    assert link.values is not None
    assert len(link.values) == 1
    assert link.values[0].id == "line1\nline2"


def test_multiline_quoted_as_id():
    """Test multiline quoted string used as ID."""
    input_text = """("multi
line
id": value1 value2)"""
    result = parser.parse(input_text)

    assert len(result) > 0
    assert len(result) == 1

    link = result[0]
    assert link.id == "multi\nline\nid"
    assert link.values is not None
    assert len(link.values) == 2
