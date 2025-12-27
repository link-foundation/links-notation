"""
Multi-Reference Feature Tests (Issue #184)

Tests for multi-word references without quotes:
- (some example: some example is a link)
- IDs as list: ["some", "example"]
- id property throws for multi-refs, use ids instead
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
        # Use ids property for multi-references
        assert isinstance(result[0].ids, list)
        assert result[0].ids == ["some", "example"]
        assert len(result[0].values) == 1
        assert result[0].values[0].id == "value"

    def test_parses_three_word_multi_reference_id(self):
        """Test parsing three-word multi-reference ID."""
        parser = Parser()
        result = parser.parse("(new york city: value)")
        assert len(result) == 1
        assert result[0].ids == ["new", "york", "city"]

    def test_parses_four_word_multi_reference_id(self):
        """Test parsing four-word multi-reference ID."""
        parser = Parser()
        result = parser.parse("(a b c d: value)")
        assert len(result) == 1
        assert result[0].ids == ["a", "b", "c", "d"]

    def test_single_word_id_accessible_via_id_property(self):
        """Test backward compatibility: single-word ID accessible via id property."""
        parser = Parser()
        result = parser.parse("(papa: value)")
        assert len(result) == 1
        # Single-word: id returns string, ids returns list with single element
        assert isinstance(result[0].id, str)
        assert result[0].id == "papa"
        assert result[0].ids == ["papa"]

    def test_quoted_multi_word_id_remains_string(self):
        """Test backward compatibility: quoted multi-word ID remains string."""
        parser = Parser()
        result = parser.parse("('some example': value)")
        assert len(result) == 1
        # Quoted multi-word is a single reference, so id works
        assert isinstance(result[0].id, str)
        assert result[0].id == "some example"
        assert result[0].ids == ["some example"]

    def test_id_property_throws_for_multi_reference(self):
        """Test that id property throws for multi-reference IDs."""
        parser = Parser()
        result = parser.parse("(some example: value)")
        with pytest.raises(ValueError, match="Use the 'ids' property instead of 'id'"):
            _ = result[0].id


class TestNoContextAwareParsing:
    """Tests that values are NOT context-aware (per issue #184 feedback)."""

    def test_values_parsed_as_separate_references(self):
        """Test that values are parsed as separate references."""
        parser = Parser()
        result = parser.parse("(some example: some example is a link)")
        assert result[0].ids == ["some", "example"]
        # Values should be 5 separate references (no context-aware grouping)
        assert len(result[0].values) == 5
        assert result[0].values[0].id == "some"
        assert result[0].values[1].id == "example"
        assert result[0].values[2].id == "is"
        assert result[0].values[3].id == "a"
        assert result[0].values[4].id == "link"

    def test_three_word_multi_ref_values_separate(self):
        """Test that three-word multi-ref values are separate."""
        parser = Parser()
        result = parser.parse("(new york city: new york city is great)")
        assert result[0].ids == ["new", "york", "city"]
        # Values should be 5 separate references
        assert len(result[0].values) == 5
        assert result[0].values[0].id == "new"
        assert result[0].values[1].id == "york"
        assert result[0].values[2].id == "city"
        assert result[0].values[3].id == "is"
        assert result[0].values[4].id == "great"


class TestMultiRefFormatting:
    """Tests for multi-reference formatting."""

    def test_formats_multi_reference_id(self):
        """Test formatting multi-reference ID."""
        parser = Parser()
        result = parser.parse("(some example: value)")
        formatted = format_links(result, True)
        assert formatted == "(some example: value)"

    def test_round_trip_preserves_structure(self):
        """Test that parse then format preserves structure."""
        parser = Parser()
        input_text = "(new york city: one two three)"
        result = parser.parse(input_text)
        formatted = format_links(result, True)
        assert formatted == "(new york city: one two three)"


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
        assert result[0].ids == ["some", "example"]
        assert len(result[0].values) == 2


class TestEdgeCases:
    """Edge case tests for multi-reference feature."""

    def test_multi_ref_with_quoted_value(self):
        """Test multi-reference with special characters in quoted parts."""
        parser = Parser()
        result = parser.parse("(some example: 'value:special')")
        assert result[0].ids == ["some", "example"]
        assert result[0].values[0].id == "value:special"

    def test_empty_values_with_multi_ref_id(self):
        """Test empty values with multi-reference ID."""
        parser = Parser()
        result = parser.parse("(some example:)")
        assert result[0].ids == ["some", "example"]
        assert len(result[0].values) == 0

    def test_multiple_links_same_multi_ref(self):
        """Test multiple links with same multi-reference definition."""
        parser = Parser()
        input_text = """(some example: first)
(some example: second)"""
        result = parser.parse(input_text)
        assert len(result) == 2
        assert result[0].ids == ["some", "example"]
        assert result[1].ids == ["some", "example"]


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
        assert result[0].ids is None
        assert len(result[0].values) == 3
