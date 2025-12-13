"""
Multi-Reference Feature Tests (Issue #184)

Tests for multi-word references without quotes:
- (some example: some example is a link)
- ID as list: ["some", "example"]
- Context-aware recognition in values
"""

import pytest

from links_notation import Parser, format_links


class TestMultiReferenceParsing:
    """Tests for basic multi-reference ID parsing."""

    def test_parses_two_word_multi_reference_id(self):
        """Test parsing two-word multi-reference ID."""
        parser = Parser()
        result = parser.parse("(some example: value)")
        assert len(result) == 1
        assert isinstance(result[0].id, list)
        assert result[0].id == ["some", "example"]
        assert len(result[0].values) == 1
        assert result[0].values[0].id == "value"

    def test_parses_three_word_multi_reference_id(self):
        """Test parsing three-word multi-reference ID."""
        parser = Parser()
        result = parser.parse("(new york city: value)")
        assert len(result) == 1
        assert result[0].id == ["new", "york", "city"]

    def test_parses_four_word_multi_reference_id(self):
        """Test parsing four-word multi-reference ID."""
        parser = Parser()
        result = parser.parse("(a b c d: value)")
        assert len(result) == 1
        assert result[0].id == ["a", "b", "c", "d"]

    def test_single_word_id_remains_string(self):
        """Test backward compatibility: single-word ID remains string."""
        parser = Parser()
        result = parser.parse("(papa: value)")
        assert len(result) == 1
        assert isinstance(result[0].id, str)
        assert result[0].id == "papa"

    def test_quoted_multi_word_id_remains_string(self):
        """Test backward compatibility: quoted multi-word ID remains string."""
        parser = Parser()
        result = parser.parse("('some example': value)")
        assert len(result) == 1
        assert isinstance(result[0].id, str)
        assert result[0].id == "some example"


class TestContextAwareMultiRefRecognition:
    """Tests for context-aware multi-reference recognition."""

    def test_recognizes_multi_reference_in_values(self):
        """Test recognizing multi-reference in values when same as ID."""
        parser = Parser()
        result = parser.parse("(some example: some example is a link)")
        assert result[0].id == ["some", "example"]
        # First value should be the multi-reference "some example"
        assert result[0].values[0].id == ["some", "example"]
        # Remaining values
        assert result[0].values[1].id == "is"
        assert result[0].values[2].id == "a"
        assert result[0].values[3].id == "link"
        assert len(result[0].values) == 4

    def test_recognizes_three_word_multi_reference_in_values(self):
        """Test recognizing three-word multi-reference in values."""
        parser = Parser()
        result = parser.parse("(new york city: new york city is great)")
        assert result[0].id == ["new", "york", "city"]
        assert result[0].values[0].id == ["new", "york", "city"]
        assert result[0].values[1].id == "is"
        assert result[0].values[2].id == "great"
        assert len(result[0].values) == 3

    def test_does_not_recognize_partial_multi_reference(self):
        """Test that partial matches don't trigger multi-reference recognition."""
        parser = Parser()
        result = parser.parse("(some example: some other example)")
        assert result[0].id == ["some", "example"]
        # "some" should be separate, "other" separate, "example" separate
        assert result[0].values[0].id == "some"
        assert result[0].values[1].id == "other"
        assert result[0].values[2].id == "example"

    def test_greedy_multi_reference_matching(self):
        """Test that longest match is used (greedy matching)."""
        parser = Parser()
        result = parser.parse("(a b c: a b c d)\n(a b: x)")
        assert result[0].id == ["a", "b", "c"]
        # Should recognize "a b c" (3 words) not "a b" (2 words)
        assert result[0].values[0].id == ["a", "b", "c"]
        assert result[0].values[1].id == "d"


class TestMultiRefFormatting:
    """Tests for multi-reference formatting."""

    def test_formats_multi_reference_id(self):
        """Test formatting multi-reference ID."""
        parser = Parser()
        result = parser.parse("(some example: value)")
        formatted = format_links(result, True)
        assert formatted == "(some example: value)"

    def test_formats_multi_reference_value(self):
        """Test formatting multi-reference value correctly."""
        parser = Parser()
        result = parser.parse("(some example: some example is a link)")
        formatted = format_links(result, True)
        assert formatted == "(some example: some example is a link)"

    def test_round_trip_preserves_structure(self):
        """Test that parse then format preserves structure."""
        parser = Parser()
        input_text = "(new york city: new york city is great)"
        result = parser.parse(input_text)
        formatted = format_links(result, True)
        assert formatted == "(new york city: new york city is great)"


class TestMultiRefIndentedSyntax:
    """Tests for multi-reference with indented syntax."""

    def test_parses_indented_multi_reference_id(self):
        """Test parsing indented multi-reference ID."""
        parser = Parser()
        input_text = """some example:
  value1
  value2"""
        result = parser.parse(input_text)
        assert len(result) == 1
        assert result[0].id == ["some", "example"]
        assert len(result[0].values) == 2


class TestEdgeCases:
    """Edge case tests for multi-reference feature."""

    def test_multi_ref_with_quoted_value(self):
        """Test multi-reference with special characters in quoted parts."""
        parser = Parser()
        result = parser.parse("(some example: 'value:special')")
        assert result[0].id == ["some", "example"]
        assert result[0].values[0].id == "value:special"

    def test_empty_values_with_multi_ref_id(self):
        """Test empty values with multi-reference ID."""
        parser = Parser()
        result = parser.parse("(some example:)")
        assert result[0].id == ["some", "example"]
        assert len(result[0].values) == 0

    def test_multiple_links_same_multi_ref(self):
        """Test multiple links with same multi-reference definition."""
        parser = Parser()
        input_text = """(some example: first)
(some example: second)"""
        result = parser.parse(input_text)
        assert len(result) == 2
        assert result[0].id == ["some", "example"]
        assert result[1].id == ["some", "example"]


class TestParserOptions:
    """Tests for parser options related to multi-reference."""

    def test_disable_multi_ref_context(self):
        """Test disabling multi-reference context with option."""
        parser = Parser(enable_multi_ref_context=False)
        result = parser.parse("(some example: some example is a link)")
        # ID should still be list (parsing change)
        assert result[0].id == ["some", "example"]
        # But values should NOT be grouped (context disabled)
        assert len(result[0].values) == 5  # some, example, is, a, link
        assert result[0].values[0].id == "some"
        assert result[0].values[1].id == "example"


class TestBackwardCompatibility:
    """Backward compatibility tests."""

    def test_existing_single_line_syntax(self):
        """Test existing single-line syntax still works."""
        parser = Parser()
        result = parser.parse("papa: loves mama")
        assert result[0].id == "papa"
        assert result[0].values[0].id == "loves"
        assert result[0].values[1].id == "mama"

    def test_existing_parenthesized_syntax(self):
        """Test existing parenthesized syntax still works."""
        parser = Parser()
        result = parser.parse("(papa: loves mama)")
        assert result[0].id == "papa"
        assert result[0].values[0].id == "loves"
        assert result[0].values[1].id == "mama"

    def test_existing_quoted_id_syntax(self):
        """Test existing quoted ID syntax still works."""
        parser = Parser()
        result = parser.parse("('multi word id': value)")
        assert result[0].id == "multi word id"
        assert result[0].values[0].id == "value"

    def test_existing_nested_links(self):
        """Test existing nested links still work."""
        parser = Parser()
        result = parser.parse("(outer: (inner: value))")
        assert result[0].id == "outer"
        assert result[0].values[0].id == "inner"
        assert result[0].values[0].values[0].id == "value"

    def test_existing_value_only_links(self):
        """Test existing value-only links still work."""
        parser = Parser()
        result = parser.parse("(a b c)")
        assert result[0].id is None
        assert len(result[0].values) == 3
